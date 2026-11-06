import { findGrappleTarget, grappleBox, type GrappleTarget, type PlayerState, type Solid } from './physics.ts';

/** Rank actual hook rays, not decorative text, cubes or hypothetical powered code. */
export function assistedGrappleTarget(player: PlayerState, solids: readonly Solid[], previousId?: string | null): GrappleTarget | null {
  const candidates: { target: GrappleTarget; score: number }[] = [];
  for (const solid of solids) {
    if (!solid.enabled || !solid.grappleable || solid.id === player.groundId) continue;
    const box = grappleBox(solid);
    const points = solid.grapplePoint ? [solid.grapplePoint] : [
      { x: box.x + box.w / 2, y: box.y + box.h / 2 },
      { x: Math.max(box.x, Math.min(box.x + box.w, player.x + player.facing * 160)), y: box.y + box.h / 2 },
    ];
    for (const point of points) {
      const target = findGrappleTarget(player, point, solids, player.groundId);
      if (!target || target.solid.id !== solid.id) continue;
      const dx = (target.point.x - player.x) * player.facing;
      const rise = player.y - target.point.y;
      // Useful forward/overhead transfers beat merely close anchors. Used
      // anchors remain available for recovery but cannot offer another jump.
      const score = dx * .6 + Math.min(260, rise) * .45 - target.distance * .2
        - Math.max(0, -rise) * .8 - (player.ropeJumpAnchors.includes(solid.id) ? 120 : 0);
      candidates.push({ target, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score || a.target.solid.id.localeCompare(b.target.solid.id));
  const best = candidates[0];
  if (!best) return null;
  const previous = candidates.find(c => c.target.solid.id === previousId);
  // Hysteresis holds nearby alternatives steady; a disabled/out-of-range
  // anchor disappears immediately because it cannot enter the candidate list.
  return previous && previous.score + 60 >= best.score ? previous.target : best.target;
}
