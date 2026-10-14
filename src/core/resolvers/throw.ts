import { clamp } from '../math/vec2';

/**
 * Did the throw actually come up at the receiver, or is it an overthrow?
 * `throwAccuracy` is the QB's internal stat (0..99).
 * Chance = 0.5 + 0.5 * accuracy/99  (50% at 0, 100% at 99).
 * `rand` is injectable for tests.
 */
export function throwComesUp(throwAccuracy: number, rand: () => number = Math.random): boolean {
  const chance = 0.5 + 0.5 * clamp(throwAccuracy, 0, 99) / 99;
  return rand() < chance;
}
