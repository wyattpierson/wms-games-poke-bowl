import type { Vec2 } from '../../types';
import { distance } from '../math/vec2';

/** An OL's block: position plus the reach of the block (scaled by the blocker's blocking stat). */
export interface Blocker {
  pos: Vec2;
  radius: number;
}

/** True if any blocker's reach covers the rusher. */
export function isBlocked(rusher: Vec2, blockers: Blocker[]): boolean {
  return blockers.some((b) => distance(rusher, b.pos) <= b.radius);
}

/** A blocked rusher is slowed to `blockedFactor`, else 1. */
export function blockedSpeedFactor(rusher: Vec2, blockers: Blocker[], blockedFactor: number): number {
  return isBlocked(rusher, blockers) ? blockedFactor : 1;
}
