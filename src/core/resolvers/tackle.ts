import { clamp } from '../math/vec2';

/**
 * Roll a single tackle attempt.
 *
 * `tackling` (defender) and `avoidance` (carrier) are internal stats, 0..99.
 * The chance scales from ~10% (weak tackler vs. elite evader) to ~95%
 * (elite tackler vs. weak evader). `rand` is injectable for tests.
 */
export function attemptTackle(tackling: number, avoidance: number, rand: () => number = Math.random): boolean {
  const chance = clamp(0.5 + 0.5 * clamp(tackling, 0, 99) / 99 - 0.35 * clamp(avoidance, 0, 99) / 99, 0.1, 0.95);
  return rand() < chance;
}

/** The probability used by `attemptTackle` (exported for tuning/tests). */
export function tackleChance(tackling: number, avoidance: number): number {
  return clamp(0.5 + 0.5 * clamp(tackling, 0, 99) / 99 - 0.35 * clamp(avoidance, 0, 99) / 99, 0.1, 0.95);
}
