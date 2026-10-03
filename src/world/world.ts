/**
 * The playable chamber: player, cubes, sockets, doors, bridge and wiring.
 *
 * It knows the chamber's geometry and which ports exist, but nothing about
 * traces. The bridge only follows `bridgeTarget`, which the game sets from
 * the replay's processed `bridge_open` event, and `finishedInputs` (for door
 * lamps) is likewise fed in by the game. Wiring is a map from stable output
 * port id to destination stage id: the chamber's fixed pipes plus whatever
 * cables the player plugs into editable jacks. Cables are logical
 * connections, not physics ropes.
 */

import type { SpecimenIndex } from "../data/bundle.ts";
import { BRIDGE, CARRY, PLAYER } from "../engine/constants.ts";
import type { Vec2 } from "../engine/geometry.ts";
import { boxesOverlap } from "../engine/geometry.ts";
import type { InputState, LooseBody, PlayerState, Solid } from "../engine/physics.ts";
import { createPlayer, playerBox, stepBody, stepPlayer } from "../engine/physics.ts";
import type { ChamberCube, ChamberDef, ChamberDoor, ChamberSocket, ChamberStage, SocketKind } from "../level/chamber.ts";
import { inJack, outJack } from "../level/chamber.ts";

export type Held = { kind: "cable"; portId: string } | { kind: "cube"; cubeId: string };

export interface CubeRuntime extends LooseBody {
  def: ChamberCube;
  carried: boolean;
  socketId: string | null;
  everCarried: boolean;
}

export interface SocketRuntime {
  def: ChamberSocket;
  cubeId: string | null;
}

export interface DoorRuntime {
  def: ChamberDoor;
  solid: Solid;
  /** 0 = shut, 1 = fully open. */
  openness: number;
}

/** A jack the player can plug into or take a cable from. */
export interface Jack {
  kind: "in" | "out";
  stageId: string;
  /** For an output jack, the port it carries. */
  portId: string | null;
  at: Vec2;
}

export type Interactable =
  | { kind: "jack"; jack: Jack; at: Vec2 }
  | { kind: "cube"; cubeId: string; at: Vec2 }
  | { kind: "socket"; socketId: string; at: Vec2 };

export type WorldEvent =
  | { kind: "connected"; portId: string; to: string }
  | { kind: "unplugged"; portId: string; to: string }
  | { kind: "took_cable"; portId: string }
  | { kind: "dropped_cable"; portId: string }
  | { kind: "picked_cube"; cubeId: string }
  | { kind: "dropped_cube"; cubeId: string }
  | { kind: "socket_filled"; socketId: string; cubeId: string }
  | { kind: "socket_emptied"; socketId: string; cubeId: string }
  | { kind: "cube_respawned"; cubeId: string }
  | { kind: "denied"; message: string }
  | { kind: "landed"; speed: number; x: number; y: number }
  | { kind: "door_opened"; doorId: string }
  | { kind: "exited" };

const ACCEPTS: Record<SocketKind, ChamberCube["kind"]> = { power: "power", run: "power", input: "input" };
const DOOR_RATE = 1.6;

export class World {
  readonly player: PlayerState;
  readonly cubes = new Map<string, CubeRuntime>();
  readonly sockets = new Map<string, SocketRuntime>();
  readonly doors: DoorRuntime[] = [];
  readonly stagesById = new Map<string, ChamberStage>();
  readonly jacks: Jack[] = [];
  readonly staticSolids: Solid[];
  readonly bridgeSolid: Solid | null;
  readonly solids: Solid[];

  bridgeTarget = false;
  bridgeExtent = 0;
  held: Held | null = null;
  /** Inputs that finished a run on the current editable wiring (door lamps). */
  readonly finishedInputs = new Set<number>();
  exited = false;

  /** Persistent wiring: port id → destination stage id. */
  private connections = new Map<string, string>();
  /** Editable ports in the order their cables were plugged in. */
  private plugOrder: string[] = [];
  private editable: Set<string>;
  private events: WorldEvent[] = [];

  constructor(
    readonly chamber: ChamberDef,
    readonly specimen: SpecimenIndex,
  ) {
    this.player = createPlayer(chamber.spawn.x, chamber.spawn.y);
    this.editable = new Set(chamber.editablePorts);
    for (const [port, to] of Object.entries(chamber.prewired)) this.connections.set(port, to);

    for (const s of chamber.stages) this.stagesById.set(s.stageId, s);
    const cablesInPlay = chamber.editablePorts.length > 0;
    for (const s of chamber.stages) {
      if (s.mode !== "machine" || s.wallMounted) continue;
      // Where the player has cables, any floor machine but START accepts one, right or wrong.
      if (cablesInPlay && specimen.stage(s.stageId).kind !== "entry") {
        this.jacks.push({ kind: "in", stageId: s.stageId, portId: null, at: inJack(s) });
      }
      const ports = specimen.stagePorts(s.stageId);
      ports.forEach((port, i) => {
        if (this.editable.has(port.id)) {
          this.jacks.push({ kind: "out", stageId: s.stageId, portId: port.id, at: outJack(s, i, ports.length) });
        }
      });
    }
    for (const c of chamber.cubes) {
      this.cubes.set(c.id, { def: c, x: c.x, y: c.y, vx: 0, vy: 0, grounded: false, groundId: null, carried: false, socketId: null, everCarried: false });
    }
    for (const s of chamber.sockets) this.sockets.set(s.id, { def: s, cubeId: null });

    this.staticSolids = chamber.solids.map((s) => ({
      id: s.id,
      x: s.x,
      y: s.y,
      w: s.w,
      h: s.h,
      oneWay: s.oneWay,
      enabled: true,
      grappleable: s.kind !== "floor",
    }));
    for (const d of chamber.doors) {
      const solid: Solid = { id: d.id, x: d.x, y: d.y, w: d.w, h: d.h, oneWay: false, enabled: true, grappleable: false };
      this.doors.push({ def: d, solid, openness: 0 });
    }
    this.bridgeSolid = chamber.bridge
      ? { id: "bridge", x: chamber.bridge.x, y: chamber.bridge.y, w: 0, h: BRIDGE.thickness, oneWay: true, enabled: false, grappleable: false }
      : null;
    this.solids = [...this.staticSolids, ...this.doors.map((d) => d.solid), ...(this.bridgeSolid ? [this.bridgeSolid] : [])];
  }

  // --- wiring -----------------------------------------------------------

  connection(portId: string): string | null {
    return this.connections.get(portId) ?? null;
  }

  isEditable(portId: string): boolean {
    return this.editable.has(portId);
  }

  /** All connections, fixed and player-made, as [port, destination] pairs. */
  wiring(): [string, string][] {
    return [...this.connections.entries()];
  }

  /** Player cables only. */
  cables(): [string, string][] {
    return this.wiring().filter(([port]) => this.editable.has(port));
  }

  connect(portId: string, to: string): boolean {
    if (!this.editable.has(portId)) return false;
    if (!this.jacks.some((j) => j.kind === "in" && j.stageId === to)) return false;
    if (this.specimen.port(portId).owner_stage_id === to) return false;
    this.disconnect(portId);
    this.connections.set(portId, to);
    this.plugOrder.push(portId);
    this.wiringChanged();
    this.events.push({ kind: "connected", portId, to });
    return true;
  }

  disconnect(portId: string): string | null {
    if (!this.editable.has(portId)) return null;
    const to = this.connections.get(portId);
    if (to === undefined) return null;
    this.connections.delete(portId);
    this.plugOrder = this.plugOrder.filter((id) => id !== portId);
    this.wiringChanged();
    return to;
  }

  clearCables(): void {
    for (const port of [...this.editable]) this.disconnect(port);
    if (this.held?.kind === "cable") this.held = null;
  }

  /** A different circuit has not yet proved anything: door lamps go out. */
  private wiringChanged(): void {
    this.finishedInputs.clear();
  }

  // --- simulation -------------------------------------------------------

  step(input: InputState, interact: boolean, dt: number): void {
    this.stepDoors(dt);
    this.stepBridge(dt);
    stepPlayer(this.player, input, this.solids, dt);
    if (this.player.justLanded) {
      this.events.push({ kind: "landed", speed: this.player.landingSpeed, x: this.player.x, y: this.player.y });
    }
    if (this.player.y > this.chamber.world.height + 200) this.respawnPlayer();
    if (interact) this.interact();
    for (const cube of this.cubes.values()) this.stepCube(cube, dt);
    if (!this.exited && boxesOverlap(playerBox(this.player), this.chamber.exit)) {
      this.exited = true;
      this.events.push({ kind: "exited" });
    }
  }

  doorShouldOpen(door: DoorRuntime): boolean {
    const rule = door.def.rule;
    if (rule.kind === "socket") return this.sockets.get(rule.socketId)?.cubeId != null;
    return rule.inputs.every((n) => this.finishedInputs.has(n));
  }

  private stepDoors(dt: number): void {
    for (const door of this.doors) {
      const open = this.doorShouldOpen(door);
      const before = door.openness;
      door.openness = Math.max(0, Math.min(1, door.openness + (open ? 1 : -1) * DOOR_RATE * dt));
      if (before < 1 && door.openness === 1) this.events.push({ kind: "door_opened", doorId: door.def.id });
      // The panel slides up into the frame; it stops blocking once mostly open.
      door.solid.h = door.def.h * (1 - door.openness);
      door.solid.enabled = door.openness < 0.85;
    }
  }

  private stepBridge(dt: number): void {
    const bridge = this.chamber.bridge;
    if (!bridge || !this.bridgeSolid) return;
    const rate = dt / BRIDGE.extendTime;
    this.bridgeExtent = this.bridgeTarget ? Math.min(1, this.bridgeExtent + rate) : Math.max(0, this.bridgeExtent - rate);
    this.bridgeSolid.w = bridge.length * this.bridgeExtent;
    this.bridgeSolid.enabled = this.bridgeSolid.w > 6;
  }

  private stepCube(cube: CubeRuntime, dt: number): void {
    const size = CARRY.cubeSize;
    if (cube.socketId) {
      const socket = this.sockets.get(cube.socketId);
      if (socket) {
        cube.x = socket.def.x;
        cube.y = socket.def.floorY - size / 2;
      }
      return;
    }
    if (cube.carried) {
      const p = this.player;
      cube.x = p.x;
      cube.y = p.y - PLAYER.height / 2 - CARRY.holdGap - size / 2;
      cube.vx = 0;
      cube.vy = 0;
      cube.grounded = false;
      return;
    }
    stepBody(cube, size, this.solids, CARRY.cubeGravity, CARRY.cubeMaxFall, dt);
    if (cube.y > this.chamber.world.height + 200) {
      this.placeCube(cube, { x: cube.def.x, y: cube.def.y });
      this.events.push({ kind: "cube_respawned", cubeId: cube.def.id });
    }
    // A cube put down on its socket seats itself without a second press.
    if (cube.grounded) {
      for (const socket of this.sockets.values()) {
        if (socket.cubeId || ACCEPTS[socket.def.kind] !== cube.def.kind) continue;
        // Only a cube landing squarely on it: one put down beside it stays put.
        if (Math.abs(cube.x - socket.def.x) < 14 && Math.abs(cube.y + size / 2 - socket.def.floorY) < 6) {
          this.seat(cube, socket);
          break;
        }
      }
    }
  }

  private placeCube(cube: CubeRuntime, at: Vec2): void {
    Object.assign(cube, { x: at.x, y: at.y, vx: 0, vy: 0, carried: false, grounded: false });
  }

  respawnPlayer(): void {
    const p = this.player;
    p.x = this.chamber.spawn.x;
    p.y = this.chamber.spawn.y;
    p.vx = 0;
    p.vy = 0;
  }

  /** Every cube back where the chamber put it; sockets empty. Wiring is kept. */
  resetCubes(): void {
    if (this.held?.kind === "cube") this.held = null;
    for (const socket of this.sockets.values()) {
      if (socket.cubeId) this.unseat(socket);
    }
    for (const cube of this.cubes.values()) this.placeCube(cube, { x: cube.def.x, y: cube.def.y });
  }

  /** Seats a cube (developer shortcut and tests); false if it doesn't fit. */
  insert(cubeId: string, socketId: string): boolean {
    const cube = this.cubes.get(cubeId);
    const socket = this.sockets.get(socketId);
    if (!cube || !socket || socket.cubeId || ACCEPTS[socket.def.kind] !== cube.def.kind) return false;
    if (cube.socketId) this.unseat(this.sockets.get(cube.socketId) as SocketRuntime);
    if (this.held?.kind === "cube" && this.held.cubeId === cubeId) this.held = null;
    this.seat(cube, socket);
    return true;
  }

  private seat(cube: CubeRuntime, socket: SocketRuntime): void {
    cube.carried = false;
    cube.socketId = socket.def.id;
    socket.cubeId = cube.def.id;
    this.events.push({ kind: "socket_filled", socketId: socket.def.id, cubeId: cube.def.id });
  }

  private unseat(socket: SocketRuntime): CubeRuntime | null {
    const cube = socket.cubeId ? this.cubes.get(socket.cubeId) : undefined;
    socket.cubeId = null;
    if (!cube) return null;
    cube.socketId = null;
    this.events.push({ kind: "socket_emptied", socketId: socket.def.id, cubeId: cube.def.id });
    return cube;
  }

  /** The cube seated in a socket, if any. */
  socketCube(socketId: string): CubeRuntime | null {
    const id = this.sockets.get(socketId)?.cubeId;
    return id ? (this.cubes.get(id) ?? null) : null;
  }

  // --- interaction ------------------------------------------------------

  /** Everything usable right now, given what the player is holding. */
  interactables(): Interactable[] {
    const out: Interactable[] = [];
    const held = this.held;
    if (held?.kind === "cube") {
      // Any matching socket: an empty one takes the cube, a full one swaps.
      const cube = this.cubes.get(held.cubeId);
      for (const socket of this.sockets.values()) {
        if (cube && ACCEPTS[socket.def.kind] === cube.def.kind) {
          out.push({ kind: "socket", socketId: socket.def.id, at: this.socketPoint(socket.def) });
        }
      }
      return out;
    }
    if (held?.kind === "cable") {
      for (const jack of this.jacks) if (jack.kind === "in") out.push({ kind: "jack", jack, at: jack.at });
      return out;
    }
    const fed = new Set(this.cables().map(([, to]) => to));
    for (const jack of this.jacks) {
      if (jack.kind === "out" || fed.has(jack.stageId)) out.push({ kind: "jack", jack, at: jack.at });
    }
    for (const cube of this.cubes.values()) {
      if (!cube.socketId && !cube.carried) out.push({ kind: "cube", cubeId: cube.def.id, at: { x: cube.x, y: cube.y } });
    }
    for (const socket of this.sockets.values()) {
      if (socket.cubeId) out.push({ kind: "socket", socketId: socket.def.id, at: this.socketPoint(socket.def) });
    }
    return out;
  }

  socketPoint(def: ChamberSocket): Vec2 {
    return { x: def.x, y: def.floorY - CARRY.cubeSize / 2 };
  }

  /** The interactable E would use now, if any. */
  focus(): Interactable | null {
    const p = this.player;
    let best: Interactable | null = null;
    let bestDist = Infinity;
    for (const it of this.interactables()) {
      const reach = it.kind === "socket" ? CARRY.socketReach : CARRY.reach;
      const d = Math.hypot(it.at.x - p.x, it.at.y - p.y);
      if (d <= reach && d < bestDist) {
        best = it;
        bestDist = d;
      }
    }
    return best;
  }

  interact(): void {
    const target = this.focus();
    const held = this.held;

    if (held?.kind === "cube") {
      const cube = this.cubes.get(held.cubeId);
      if (!cube) return;
      if (target?.kind === "socket") {
        const socket = this.sockets.get(target.socketId);
        if (socket) {
          // Swap: the seated cube comes out into the player's hands.
          const old = socket.cubeId ? this.unseat(socket) : null;
          this.held = null;
          this.seat(cube, socket);
          if (old) {
            old.carried = true;
            old.everCarried = true;
            this.held = { kind: "cube", cubeId: old.def.id };
            this.events.push({ kind: "picked_cube", cubeId: old.def.id });
          }
        }
      } else {
        this.dropCube(cube);
      }
      return;
    }

    if (held?.kind === "cable") {
      if (target?.kind === "jack" && target.jack.kind === "in") {
        const owner = this.specimen.port(held.portId).owner_stage_id;
        if (target.jack.stageId === owner) {
          this.events.push({ kind: "denied", message: "A machine can't feed itself here." });
          return;
        }
        this.held = null;
        this.connect(held.portId, target.jack.stageId);
      } else {
        this.held = null;
        this.events.push({ kind: "dropped_cable", portId: held.portId });
      }
      return;
    }

    if (!target) return;
    switch (target.kind) {
      case "jack": {
        const jack = target.jack;
        let portId = jack.portId;
        if (jack.kind === "in") {
          // Pull out the most recently plugged cable feeding this machine.
          portId = [...this.plugOrder].reverse().find((id) => this.connections.get(id) === jack.stageId) ?? null;
        }
        if (!portId) return;
        const to = this.disconnect(portId);
        if (to !== null) this.events.push({ kind: "unplugged", portId, to });
        this.held = { kind: "cable", portId };
        this.events.push({ kind: "took_cable", portId });
        break;
      }
      case "cube": {
        const cube = this.cubes.get(target.cubeId);
        if (!cube) return;
        cube.carried = true;
        cube.everCarried = true;
        this.held = { kind: "cube", cubeId: cube.def.id };
        this.events.push({ kind: "picked_cube", cubeId: cube.def.id });
        break;
      }
      case "socket": {
        const socket = this.sockets.get(target.socketId);
        const cube = socket ? this.unseat(socket) : null;
        if (!cube) return;
        cube.carried = true;
        cube.everCarried = true;
        this.held = { kind: "cube", cubeId: cube.def.id };
        this.events.push({ kind: "picked_cube", cubeId: cube.def.id });
        break;
      }
    }
  }

  private dropCube(cube: CubeRuntime): void {
    const p = this.player;
    const size = CARRY.cubeSize;
    const ahead = p.x + p.facing * (PLAYER.width / 2 + size / 2 + CARRY.dropAhead / 3);
    // Set down resting on the player's floor, never sunk into it.
    const y = p.y + PLAYER.height / 2 - size / 2 - 0.5;
    const box = { x: ahead - size / 2, y: y - size / 2, w: size, h: size };
    const blocked = this.solids.some((s) => s.enabled && !s.oneWay && boxesOverlap(box, s));
    this.placeCube(cube, { x: blocked ? p.x : ahead, y });
    this.held = null;
    this.events.push({ kind: "dropped_cube", cubeId: cube.def.id });
  }

  drainEvents(): WorldEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }
}
