import { clamp } from '../math/vec2';

export type CatchResult = 'catch' | 'incomplete' | 'interception';

export interface CatchTuning {
  contestedRadius: number; // a defender within this distance of the receiver contests the ball (at 0 catching)
  doubleCoverRadius: number; // a SECOND defender within this = double coverage
  cleanCatchChance: number; // 0..1, no defender nearby
  interceptChance: number; // 0..1, contested (one defender)
  contestedCatchChance: number; // 0..1, contested (one defender, at 0 catching)
  doubleInterceptChance: number; // 0..1, double-covered
  doubleCatchChance: number; // 0..1, double-covered
}

/** The odds of each outcome. They sum to 1. */
export interface CatchOdds {
  catch: number;
  interception: number;
  incomplete: number;
}

/**
 * The odds of each outcome when a pass reaches its receiver, given every defender's distance
 * to the receiver at that moment. (resolveCatch rolls against exactly these numbers, and the
 * aim reticle shows them, so what you see is what you get.)
 *
 * Pressure levels:
 *   0 defenders within `contestedRadius` -> clean (high catch chance)
 *   1 defender within it                 -> contested (real risk of drop or pick)
 *   2+ defenders within `doubleCoverRadius` -> double-covered (worst odds, easiest pick)
 *
 * The catcher's internal `catching` stat (0..99) does two things:
 *   - shrinks the contested radius (good hands play through nearby pressure)
 *   - raises the contested-catch chance
 */
export function catchOdds(defenderDistances: number[], tuning: CatchTuning, catching: number): CatchOdds {
  const hands = clamp(catching, 0, 99) / 99;
  const sorted = [...defenderDistances].sort((a, b) => a - b);
  const nearest = sorted[0] ?? Infinity;
  const secondNearest = sorted[1] ?? Infinity;

  const contestedRadius = tuning.contestedRadius * (1 - 0.45 * hands);
  const doubleRadius = tuning.doubleCoverRadius * (1 - 0.3 * hands);

  if (nearest > contestedRadius) {
    // Clean: no one around. Good hands still drop the occasional ball.
    return { catch: tuning.cleanCatchChance, interception: 0, incomplete: 1 - tuning.cleanCatchChance };
  }

  if (secondNearest > doubleRadius) {
    // Contested by one defender.
    const catchChance = Math.min(0.9, tuning.contestedCatchChance + 0.35 * hands);
    return {
      catch: catchChance,
      interception: tuning.interceptChance,
      incomplete: 1 - catchChance - tuning.interceptChance,
    };
  }

  // Double-covered: two defenders on the ball.
  const catchChance = Math.min(0.75, tuning.doubleCatchChance + 0.25 * hands);
  return {
    catch: catchChance,
    interception: tuning.doubleInterceptChance,
    incomplete: 1 - catchChance - tuning.doubleInterceptChance,
  };
}

/** Decide what happens when a pass reaches its receiver. `rand` is injectable so tests are deterministic. */
export function resolveCatch(
  defenderDistances: number[],
  tuning: CatchTuning,
  catching: number,
  rand: () => number = Math.random,
): CatchResult {
  const odds = catchOdds(defenderDistances, tuning, catching);
  const roll = rand();
  if (roll < odds.interception) return 'interception';
  if (roll < odds.interception + odds.catch) return 'catch';
  return 'incomplete';
}
