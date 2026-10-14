import type { Vec2 } from '../../types';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Move from `from` toward `to` by at most `maxStep`, never overshooting. */
export function stepToward(from: Vec2, to: Vec2, maxStep: number): Vec2 {
  const d = distance(from, to);
  if (d <= maxStep || d === 0) return { x: to.x, y: to.y };
  const k = maxStep / d;
  return { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
}

/** Distance to the closest point, or Infinity if there are none. */
export function nearestDistance(from: Vec2, points: Vec2[]): number {
  let best = Infinity;
  for (const p of points) best = Math.min(best, distance(from, p));
  return best;
}

/** Index of the closest point, or -1 if there are none. */
export function nearestIndex(from: Vec2, points: Vec2[]): number {
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < points.length; i++) {
    const d = distance(from, points[i]!);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}
