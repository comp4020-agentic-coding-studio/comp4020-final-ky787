/**
 * The playable room: player, cube, bridge, cables and the analysis station.
 *
 * It knows the room geometry and which stages exist, but nothing about
 * traces: the bridge only follows `bridgeTarget`, which the game sets from the
 * replay's processed `bridge_open` event. Cables are logical connections
 * between card sockets, not physics ropes — their drawn sag is cosmetic.
 */

import type { SpecimenIndex } from "../data/bundle.ts";
import { BRIDGE, CARRY, PLAYER } from "../engine/constants.ts";
import type { Vec2 } from "../engine/geometry.ts";
import { boxesOverlap } from "../engine/geometry.ts";
import type { InputState, LooseBody, PlayerState, Solid } from "../engine/physics.ts";
import { createPlayer, playerBox, stepBody, stepPlayer } from "../engine/physics.ts";
import type { RoomCard, RoomDef } from "../level/room.ts";
import { cardSockets } from "../level/room.ts";

export type Held = { kind: "cable"; from: string } | { kind: "cube" };

export type StationState = "locked" | "online" | "revealed";

export interface CardRuntime {
  card: RoomCard;
  /** Absent on the entry card (nothing feeds it) and the end card (it returns). */
  in: Vec2 | null;
  out: Vec2 | null;
}

export interface CubeState extends LooseBody {
  carried: boolean;
  socketed: boolean;
}

export type Interactable =
  | { kind: "out"; stageId: string; at: Vec2 }
  | { kind: "in"; stageId: string; at: Vec2 }
  | { kind: "cube"; at: Vec2 }
  | { kind: "run"; at: Vec2 }
  | { kind: "slot"; at: Vec2 }
  | { kind: "station"; at: Vec2 };

export type WorldEvent =
  | { kind: "connected"; from: string; to: string }
  | { kind: "unplugged"; from: string; to: string }
  | { kind: "took_cable"; from: string }
  | { kind: "dropped_cable"; from: string }
  | { kind: "picked_cube" }
  | { kind: "dropped_cube" }
  | { kind: "cube_socketed" }
  | { kind: "cube_respawned" }
  | { kind: "run_requested" }
  | { kind: "analysis_revealed" }
  | { kind: "denied"; message: string }
  | { kind: "landed"; speed: number; x: number; y: number }
  | { kind: "bridge_settled"; open: boolean };

const STATION_REACH = 150;

export class World {
  readonly player: PlayerState;
  readonly cube: CubeState;
  readonly cards = new Map<string, CardRuntime>();
  readonly staticSolids: Solid[];
  readonly bridgeSolid: Solid;
  readonly solids: Solid[];

  /** Set by the game from the replay; the bridge animates toward it. */
  bridgeTarget = false;
  /** 0 = retracted, 1 = fully extended. */
  bridgeExtent = 0;
  held: Held | null = null;
  station: StationState = "locked";
  /** Player's wiring: stage id → the stage its output is plugged into. */
  private connections = new Map<string, string>();
  /** Source stage ids in the order their cables were plugged in. */
  private plugOrder: string[] = [];
  private events: WorldEvent[] = [];

  constructor(
    readonly room: RoomDef,
    readonly specimen: SpecimenIndex,
  ) {
    this.player = createPlayer(room.spawn.x, room.spawn.y);
    this.cube = {
      x: room.cube.x,
      y: room.cube.y,
      vx: 0,
      vy: 0,
      grounded: false,
      groundId: null,
      carried: false,
      socketed: false,
    };
    for (const card of room.cards) {
      const kind = specimen.stage(card.stageId).kind;
      const sockets = cardSockets(card);
      this.cards.set(card.stageId, {
        card,
        in: kind === "entry" ? null : sockets.in,
        out: kind === "end" ? null : sockets.out,
      });
    }
    this.staticSolids = room.solids.map((s) => ({
      id: s.id,
      x: s.x,
      y: s.y,
      w: s.w,
      h: s.h,
      oneWay: s.oneWay,
      enabled: true,
      grappleable: s.kind !== "floor",
    }));
    this.bridgeSolid = {
      id: "bridge",
      x: room.bridge.x,
      y: room.bridge.y,
      w: 0,
      h: BRIDGE.thickness,
      oneWay: true,
      enabled: false,
      grappleable: false,
    };
    this.solids = [...this.staticSolids, this.bridgeSolid];
  }

  // --- wiring -----------------------------------------------------------

  connection(stageId: string): string | null {
    return this.connections.get(stageId) ?? null;
  }

  /** All current connections as [from, to] pairs. */
  wiring(): [string, string][] {
    return [...this.connections.entries()];
  }

  connect(from: string, to: string): void {
    if (!this.cards.get(from)?.out || !this.cards.get(to)?.in || from === to) return;
    this.disconnect(from);
    this.connections.set(from, to);
    this.plugOrder.push(from);
    this.events.push({ kind: "connected", from, to });
  }

  disconnect(from: string): string | null {
    const to = this.connections.get(from);
    if (to === undefined) return null;
    this.connections.delete(from);
    this.plugOrder = this.plugOrder.filter((id) => id !== from);
    return to;
  }

  clearWiring(): void {
    this.connections.clear();
    this.plugOrder = [];
    if (this.held?.kind === "cable") this.held = null;
  }

  // --- simulation -------------------------------------------------------

  step(input: InputState, interact: boolean, dt: number): void {
    this.stepBridge(dt);
    stepPlayer(this.player, input, this.solids, dt);
    if (this.player.justLanded) {
      this.events.push({ kind: "landed", speed: this.player.landingSpeed, x: this.player.x, y: this.player.y });
    }
    if (this.player.y > this.room.world.height + 200) this.respawnPlayer();
    if (interact) this.interact();
    this.stepCube(dt);
  }

  private stepBridge(dt: number): void {
    const before = this.bridgeExtent;
    const rate = dt / BRIDGE.extendTime;
    this.bridgeExtent = this.bridgeTarget
      ? Math.min(1, this.bridgeExtent + rate)
      : Math.max(0, this.bridgeExtent - rate);
    if (before !== this.bridgeExtent && (this.bridgeExtent === 0 || this.bridgeExtent === 1)) {
      this.events.push({ kind: "bridge_settled", open: this.bridgeExtent === 1 });
    }
    this.bridgeSolid.w = this.room.bridge.length * this.bridgeExtent;
    this.bridgeSolid.enabled = this.bridgeSolid.w > 6;
  }

  private stepCube(dt: number): void {
    const cube = this.cube;
    const size = CARRY.cubeSize;
    if (cube.socketed) {
      cube.x = this.room.station.slot.x;
      cube.y = this.room.station.slot.y;
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
    if (cube.y > this.room.world.height + 200) {
      this.placeCube(this.room.cube);
      this.events.push({ kind: "cube_respawned" });
    }
    // A cube put down on the slot powers the station without a second press.
    const slot = this.room.station.slot;
    if (this.station === "locked" && cube.grounded && Math.hypot(cube.x - slot.x, cube.y - slot.y) < 40) {
      this.socketCube();
    }
  }

  private placeCube(at: Vec2): void {
    Object.assign(this.cube, { x: at.x, y: at.y, vx: 0, vy: 0, carried: false, socketed: false, grounded: false });
  }

  respawnPlayer(): void {
    const p = this.player;
    p.x = this.room.spawn.x;
    p.y = this.room.spawn.y;
    p.vx = 0;
    p.vy = 0;
  }

  resetCube(): void {
    if (this.held?.kind === "cube") this.held = null;
    this.placeCube(this.room.cube);
    if (this.station === "online") this.station = "locked";
  }

  /** Developer shortcut: power the station without delivering the cube. */
  forceStationOnline(): void {
    if (this.station === "locked") this.station = "online";
  }

  private socketCube(): void {
    this.cube.carried = false;
    this.cube.socketed = true;
    this.held = null;
    this.station = "online";
    this.events.push({ kind: "cube_socketed" });
  }

  // --- interaction ------------------------------------------------------

  /** Everything usable right now, given what the player is holding. */
  interactables(): Interactable[] {
    const out: Interactable[] = [];
    const held = this.held;
    if (held?.kind === "cube") {
      if (this.station === "locked") out.push({ kind: "slot", at: this.room.station.slot });
      return out;
    }
    if (held?.kind === "cable") {
      for (const [stageId, c] of this.cards) {
        if (c.in) out.push({ kind: "in", stageId, at: c.in });
      }
      return out;
    }
    const fed = new Set(this.connections.values());
    for (const [stageId, c] of this.cards) {
      if (c.out) out.push({ kind: "out", stageId, at: c.out });
      if (c.in && fed.has(stageId)) out.push({ kind: "in", stageId, at: c.in });
      if (this.specimen.stage(stageId).kind === "entry") {
        out.push({ kind: "run", at: { x: c.card.x + c.card.width / 2, y: c.card.floorY - 26 } });
      }
    }
    if (!this.cube.socketed) out.push({ kind: "cube", at: { x: this.cube.x, y: this.cube.y } });
    const st = this.room.station;
    out.push({ kind: "station", at: { x: st.x + st.width / 2, y: st.floorY - 26 } });
    return out;
  }

  /** The interactable E would use now, if any. */
  focus(): Interactable | null {
    const p = this.player;
    let best: Interactable | null = null;
    let bestDist = Infinity;
    for (const it of this.interactables()) {
      const reach = it.kind === "station" ? STATION_REACH : CARRY.reach;
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
      if (target?.kind === "slot") this.socketCube();
      else this.dropCube();
      return;
    }

    if (held?.kind === "cable") {
      if (target?.kind === "in") {
        if (target.stageId === held.from) {
          this.events.push({ kind: "denied", message: "A card can't feed its own input here." });
          return;
        }
        this.held = null;
        this.connect(held.from, target.stageId);
      } else {
        this.held = null;
        this.events.push({ kind: "dropped_cable", from: held.from });
      }
      return;
    }

    if (!target) return;
    switch (target.kind) {
      case "out": {
        const to = this.disconnect(target.stageId);
        if (to !== null) this.events.push({ kind: "unplugged", from: target.stageId, to });
        this.held = { kind: "cable", from: target.stageId };
        this.events.push({ kind: "took_cable", from: target.stageId });
        break;
      }
      case "in": {
        // Pick up the most recently plugged cable feeding this socket.
        const from = [...this.plugOrder].reverse().find((id) => this.connections.get(id) === target.stageId);
        if (!from) return;
        this.disconnect(from);
        this.events.push({ kind: "unplugged", from, to: target.stageId });
        this.held = { kind: "cable", from };
        this.events.push({ kind: "took_cable", from });
        break;
      }
      case "cube":
        this.cube.carried = true;
        this.held = { kind: "cube" };
        this.events.push({ kind: "picked_cube" });
        break;
      case "run":
        this.events.push({ kind: "run_requested" });
        break;
      case "station":
        if (this.station === "online") {
          this.station = "revealed";
          this.events.push({ kind: "analysis_revealed" });
        } else if (this.station === "locked") {
          this.events.push({ kind: "denied", message: "Analysis station is locked: it needs the power cube." });
        }
        break;
      case "slot":
        break;
    }
  }

  private dropCube(): void {
    const p = this.player;
    const size = CARRY.cubeSize;
    const ahead = p.x + p.facing * (PLAYER.width / 2 + size / 2 + CARRY.dropAhead / 3);
    const box = { x: ahead - size / 2, y: p.y - size / 2, w: size, h: size };
    const blocked = this.solids.some((s) => s.enabled && !s.oneWay && boxesOverlap(box, s));
    this.cube.x = blocked ? p.x : ahead;
    this.cube.y = p.y;
    this.cube.vx = 0;
    this.cube.vy = 0;
    this.cube.carried = false;
    this.cube.grounded = false;
    this.held = null;
    this.events.push({ kind: "dropped_cube" });
  }

  /** True once the player stands across the bridge. */
  playerOnFarSide(): boolean {
    return boxesOverlap(playerBox(this.player), this.room.farSide);
  }

  drainEvents(): WorldEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }
}
