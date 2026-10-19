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

/**
 * Project a point moving along waypoints (starting at `waypointIndex`) forward in time.
 * Returns `start` unchanged when the route is done or the speed is 0.
 * Used to lead moving receivers: where will they be when the ball arrives?
 */
export function predictAlongRoute(
  start: Vec2, waypoints: Vec2[], waypointIndex: number, speed: number, seconds: number,
): Vec2 {
  let t = Math.max(0, seconds);
  if (speed <= 0) return { x: start.x, y: start.y };
  let x = start.x;
  let y = start.y;
  for (let i = waypointIndex; i < waypoints.length && t > 0; i++) {
    const wp = waypoints[i]!;
    const d = distance({ x, y }, wp);
    if (d <= speed * t) {
      x = wp.x; y = wp.y; t -= d / speed;
    } else {
      x += ((wp.x - x) / d) * speed * t;
      y += ((wp.y - y) / d) * speed * t;
      t = 0;
    }
  }
  return { x, y };
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
