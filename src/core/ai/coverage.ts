import { MATCHUP_BASE_CHANCE, ZONE_COVERAGE_CHANCE } from '../../config/gameplay';
import { clamp } from '../math/vec2';

/**
 * Per-play coverage rolls (pure; `rand` injectable for tests).
 *
 * The defense picks a scheme every play:
 *   - man: each WR has a matchup vs their defender; a "beaten" defender chases slow,
 *     so the receiver pulls away (open), a winning defender sticks close (contested).
 *   - zone: cover defenders hold their area; a WR is open when he runs into a part of
 *     the field no defender covers (see gameplay/defenseBehavior.ts for the behavior).
 *
 * Matchup rolls compare the receiver's speed to the defender's speed and add a base
 * randomness on top — faster receivers beat more often, and a good defender (awareness)
 * wins more often.
 */

export type CoverageScheme = 'man' | 'zone';

export interface CoveragePlan {
  scheme: CoverageScheme;
  /**
   * Man coverage only: `beaten[slot]` is true when the receiver in that slot beat his
   * defender on this play (defender chases slow). Unused in zone.
   */
  beaten: boolean[];
}

/** Roll this play's coverage scheme (default: 55% man / 45% zone). */
export function rollCoverageScheme(rand: () => number = Math.random): CoverageScheme {
  return rand() < ZONE_COVERAGE_CHANCE ? 'zone' : 'man';
}

/**
 * Man-coverage matchup: does the receiver beat his defender this play?
 * Base chance (default 0.4) shifts with the speed difference (faster WR wins more) and
 * the defender's awareness (sharper defender wins more).
 */
export function rollManMatchup(
  receiverSpeed: number,
  defenderSpeed: number,
  defenderAwareness: number,
  rand: () => number = Math.random,
): boolean {
  const speedEdge = clamp((receiverSpeed - defenderSpeed) / Math.max(1, defenderSpeed), -0.3, 0.3);
  const awarenessEdge = 0.15 * (1 - clamp(defenderAwareness, 0, 99) / 99); // 0.15 vs a 0-awareness defender
  const chance = clamp(MATCHUP_BASE_CHANCE + speedEdge + awarenessEdge, 0.05, 0.9);
  return rand() < chance;
}

/**
 * Build this play's coverage plan: the scheme, plus (for man) one matchup roll per
 * receiver slot. `matchups` is a per-slot lookup: defender of slot i vs receiver i.
 */
export function rollCoveragePlan(
  scheme: CoverageScheme,
  matchups: { receiverSpeed: number; defenderSpeed: number; defenderAwareness: number }[],
  rand: () => number = Math.random,
): CoveragePlan {
  const beaten = matchups.map((m) =>
    scheme === 'man' && m.defenderSpeed > 0 ? rollManMatchup(m.receiverSpeed, m.defenderSpeed, m.defenderAwareness, rand) : false,
  );
  return { scheme, beaten };
}
