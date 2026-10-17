/**
 * Stat comparison helpers for the poach screen. Pure, no Phaser, unit-tested.
 * "Taken" = the Pokémon being pulled from the beaten team; "dropped" = the player's
 * Pokémon leaving the roster.
 */
import type { Pokemon, UserStats } from './pokemon';

/** The five user-facing stats in display order. */
export const USER_STATS = [
  { key: 'speed', label: 'SPD' },
  { key: 'strength', label: 'STR' },
  { key: 'throwing', label: 'THR' },
  { key: 'awareness', label: 'AWA' },
  { key: 'coordination', label: 'COO' },
] as const;

export interface StatDelta {
  key: keyof UserStats;
  label: string;
  /** Value on the Pokémon being taken in. */
  taken: number;
  /** Value on the Pokémon being dropped. */
  dropped: number;
  /** taken - dropped; positive = the swap improves this stat. */
  diff: number;
}

export function compareStats(taken: Pokemon, dropped: Pokemon): StatDelta[] {
  return USER_STATS.map(({ key, label }) => ({
    key,
    label,
    taken: taken.stats[key],
    dropped: dropped.stats[key],
    diff: taken.stats[key] - dropped.stats[key],
  }));
}

/** +1 per stat that improves, -1 per stat that gets worse. Positive = net upgrade. */
export function netUpgrade(deltas: StatDelta[]): number {
  return deltas.reduce((n, d) => n + (d.diff > 0 ? 1 : d.diff < 0 ? -1 : 0), 0);
}

/** Compact one-line stat readout, e.g. "SPD 90  STR 45  THR 70  AWA 60  COO 65". */
export function statLine(stats: UserStats): string {
  return USER_STATS.map(({ key, label }) => `${label} ${stats[key]}`).join('  ');
}

/** One Pokémon's overall rating: the mean of its five user-facing stats, rounded. */
export function overall(pokemon: Pokemon): number {
  const total = USER_STATS.reduce((sum, { key }) => sum + pokemon.stats[key], 0);
  return Math.round(total / USER_STATS.length);
}

/** Mean overall rating of a group (e.g. a team's 7 defenders). 0 for an empty group. */
export function averageOverall(group: readonly Pokemon[]): number {
  if (group.length === 0) return 0;
  return Math.round(group.reduce((sum, pokemon) => sum + overall(pokemon), 0) / group.length);
}
