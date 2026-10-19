import {
  AIM_ASSIST_MAX, BALL_SPEED, CATCH_REACH_MAX, CATCH_REACH_MIN, DISPERSION_ACCURACY_PX, DISPERSION_BASE_PX,
  DISPERSION_DISTANCE_EXPONENT, MAX_ERROR_SIGMAS, PRESSURE_DISPERSION_BOOST, REF_THROW_PX, RING_MAX_PX,
  RING_MIN_PX, RING_SIGMA_MULT,
} from '../../config/gameplay';
import type { Vec2 } from '../../types';
import { clamp, distance } from '../math/vec2';

/**
 * The throw model. Nothing is rolled at release: the ball flies to a fixed landing point
 * (aim point + Gaussian error). The QB's accuracy sets how big that error is, the receiver's
 * catching sets how far he can reach to adjust to it, and both are drawn on the reticle.
 */

/** Ball flight speed in px/s. Arm strength (throwPower) buys a faster ball. */
export function ballSpeedFor(throwPower: number): number {
  return BALL_SPEED * (0.75 + (0.5 * clamp(throwPower, 0, 99)) / 99);
}

/**
 * Standard deviation (px, per axis) of where the ball lands relative to the aim point.
 *  - better accuracy -> tighter
 *  - longer throws   -> looser (sqrt of distance; a 12-yard pass spreads ~1.4x a 6-yard one)
 *  - pressure (0..1: rusher in the QB's face) -> looser
 */
export function landingSigma(accuracy: number, throwDistance: number, pressure = 0): number {
  const acc = clamp(accuracy, 0, 99) / 99;
  const base = DISPERSION_BASE_PX - DISPERSION_ACCURACY_PX * acc;
  const distFactor = Math.max(0.5, Math.pow(Math.max(throwDistance, 0) / REF_THROW_PX, DISPERSION_DISTANCE_EXPONENT));
  return base * distFactor * (1 + PRESSURE_DISPERSION_BOOST * clamp(pressure, 0, 1));
}

/** Radius of the reticle ring: about two of every three throws land inside it. */
export function ringRadius(sigma: number): number {
  return clamp(RING_SIGMA_MULT * sigma, RING_MIN_PX, RING_MAX_PX);
}

/** How far (px) a receiver can adjust to a ball that is off target. Scales with his Catching stat. */
export function catchReach(catching: number): number {
  return CATCH_REACH_MIN + ((CATCH_REACH_MAX - CATCH_REACH_MIN) * clamp(catching, 0, 99)) / 99;
}

/** One throw's miss: a 2D Gaussian offset (Box-Muller), capped so a freak throw can't leave the stadium. */
export function throwError(sigma: number, rand: () => number = Math.random): Vec2 {
  const u = Math.max(rand(), 1e-9);
  const angle = 2 * Math.PI * rand();
  const radius = Math.min(sigma * Math.sqrt(-2 * Math.log(u)), sigma * MAX_ERROR_SIGMAS);
  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
}

/**
 * Chance the ball lands within `reach` of the receiver, given where the aim point sits relative
 * to him (`offset` = aim - receiver). Integrates the landing distribution over the reach disc,
 * so the number on the reticle is exact rather than rolled.
 */
export function chanceWithinReach(offset: Vec2, sigma: number, reach: number): number {
  if (sigma <= 0) return Math.hypot(offset.x, offset.y) <= reach ? 1 : 0;
  const RADIAL = 16;
  const ANGULAR = 32;
  const dr = reach / RADIAL;
  const dTheta = (2 * Math.PI) / ANGULAR;
  const norm = 1 / (2 * Math.PI * sigma * sigma);
  let total = 0;
  for (let i = 0; i < RADIAL; i++) {
    const r = (i + 0.5) * dr;
    for (let j = 0; j < ANGULAR; j++) {
      const theta = (j + 0.5) * dTheta;
      const dx = r * Math.cos(theta) - offset.x;
      const dy = r * Math.sin(theta) - offset.y;
      total += Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma)) * norm * r * dr * dTheta;
    }
  }
  return clamp(total, 0, 1);
}

/**
 * Aim assist: inside `lockRadius` of a receiver's meeting point the aim point is pulled toward
 * it. The pull is strongest (maxAssist) right on top of the point and fades to nothing at the
 * edge, so you still have to aim, but you don't have to be a pixel-perfect lead artist.
 */
export function aimAssist(cursor: Vec2, meetingPoint: Vec2, lockRadius: number, maxAssist: number = AIM_ASSIST_MAX): Vec2 {
  const gap = distance(cursor, meetingPoint);
  if (gap >= lockRadius) return { ...cursor };
  const t = gap / lockRadius;
  const pull = maxAssist * (1 - t * t); // smooth at the edge, so the reticle never pops when it enters the lock
  return { x: cursor.x + (meetingPoint.x - cursor.x) * pull, y: cursor.y + (meetingPoint.y - cursor.y) * pull };
}

/**
 * Where a ball thrown from `from` at `ballSpeed` meets a moving receiver. The flight time depends
 * on the point and the point depends on the flight time, so iterate until they agree (converges
 * fast because the ball is much faster than any receiver). `predict(t)` = receiver position t s from now.
 */
export function solveIntercept(from: Vec2, receiverNow: Vec2, predict: (seconds: number) => Vec2, ballSpeed: number, iterations = 5): Vec2 {
  let point = receiverNow;
  for (let i = 0; i < iterations; i++) point = predict(distance(from, point) / ballSpeed);
  return point;
}

/**
 * Why a throw missed, judged from where the ball ACTUALLY landed relative to the receiver
 * (his position when the ball got there): past him, in front of him, or off to the side.
 */
export function missNote(qb: Vec2, receiver: Vec2, landing: Vec2): string {
  const dx = receiver.x - qb.x;
  const dy = receiver.y - qb.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return 'Off target!';
  const ux = dx / len;
  const uy = dy / len;
  const ox = landing.x - receiver.x;
  const oy = landing.y - receiver.y;
  const along = ox * ux + oy * uy; // + = past the receiver, - = in front of him
  const across = -ox * uy + oy * ux;
  if (Math.abs(across) > Math.abs(along)) return 'Wide!';
  return along > 0 ? 'Overthrown!' : 'Short!';
}
