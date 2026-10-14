/**
 * Simulated opponent possessions. The user only ever plays offense (locked decision),
 * so when the user turns the ball over (or scores), the opponent's drive is simulated:
 * a random outcome plus a chunk of game clock consumed. Pure + injectable RNG for tests.
 */

export type SimOutcome = 'touchdown' | 'fieldGoal' | 'punt' | 'turnover';

export interface SimResult {
  outcome: SimOutcome;
  /** Seconds of game clock consumed by the possession. */
  seconds: number;
}

export function simulateDrive(rng: () => number = Math.random): SimResult {
  const roll = rng();
  const outcome: SimOutcome =
    roll < 0.2 ? 'touchdown' : roll < 0.3 ? 'fieldGoal' : roll < 0.7 ? 'punt' : 'turnover';
  return { outcome, seconds: 10 + rng() * 20 };
}
