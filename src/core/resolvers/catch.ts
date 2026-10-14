import { clamp } from '../math/vec2';

export type CatchResult = 'catch' | 'incomplete' | 'interception';

export interface CatchTuning {
  contestedRadius: number; // a defender within this distance of the receiver contests the ball (at 0 catching)
  cleanCatchChance: number; // 0..1, no defender nearby
  interceptChance: number; // 0..1, contested
  contestedCatchChance: number; // 0..1, contested (at 0 catching)
}

/**
 * Decide what happens when a pass reaches its receiver.
 *
 * The catcher's internal `catching` stat (0..99) does two things:
 *   - shrinks the contested radius (good hands play through nearby pressure)
 *   - raises the contested-catch chance
 * `rand` is injectable so tests are deterministic.
 */
export function resolveCatch(
  defenderDistance: number,
  tuning: CatchTuning,
  catching: number,
  rand: () => number = Math.random,
): CatchResult {
  const hands = clamp(catching, 0, 99) / 99;
  const effectiveContestedRadius = tuning.contestedRadius * (1 - 0.45 * hands);
  const contestedCatchChance = Math.min(0.95, tuning.contestedCatchChance + 0.35 * hands);

  const roll = rand();
  if (defenderDistance > effectiveContestedRadius) {
    return roll < tuning.cleanCatchChance ? 'catch' : 'incomplete';
  }
  if (roll < tuning.interceptChance) return 'interception';
  if (roll < tuning.interceptChance + contestedCatchChance) return 'catch';
  return 'incomplete';
}
