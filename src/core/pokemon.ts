/**
 * Pokémon data + stat mapping. Pure, no Phaser.
 *
 * Two-layer stats (see DESIGN.md "Stat system"):
 *   User-facing (5, displayed, user-editable in teams.ts):
 *     speed, strength, throwing, awareness, coordination (all 0..99)
 *   Internal (what the game actually reads, derived from the user-facing ones):
 *     speed, throwPower, throwAccuracy, catching, blocking, tackling, avoidance, awareness
 *
 * Any Pokémon can play any position; the position only decides which internal
 * stats the game consults. The values in teams.ts are DUMMIES for now — the
 * user will remap them.
 *
 * Pokémon types are COSMETIC for now (flavor only); gameplay effects may be added later.
 */

export type PokemonType =
  | 'Normal' | 'Fire' | 'Water' | 'Electric' | 'Grass' | 'Ice' | 'Fighting'
  | 'Poison' | 'Ground' | 'Flying' | 'Psychic' | 'Bug' | 'Rock' | 'Ghost'
  | 'Dragon' | 'Dark' | 'Steel' | 'Fairy';

/** The five user-facing stats. All 0..99. */
export interface UserStats {
  speed: number;
  strength: number;
  throwing: number;
  awareness: number;
  coordination: number;
}

export interface Pokemon {
  id: string;
  name: string;
  /** Cosmetic for now. */
  type: PokemonType;
  stats: UserStats;
}

/** The stats the game systems actually read. All 0..99. */
export interface InternalStats {
  /** Movement, all positions. */
  speed: number;
  /** Max throw distance / ball speed (QB). */
  throwPower: number;
  /** Throw dispersion / overthrow risk (QB). */
  throwAccuracy: number;
  /** Catch reliability (WR/TE/QB). */
  catching: number;
  /** OL push, RB/WR run blocking (OL/RB/WR/TE). */
  blocking: number;
  /** Tackle chance vs the carrier (DL/LB/CB/S). */
  tackling: number;
  /** Shaking off tackles; juke/dive quality (RB/WR/QB). */
  avoidance: number;
  /** Defensive AI quality: reaction, coverage placement, read timing. */
  awareness: number;
}

const mix = (a: number, wa: number, b: number): number =>
  Math.round(wa * a + (1 - wa) * b);

/** Derive the internal stats the game reads from the five user-facing stats. */
export function deriveStats(s: UserStats): InternalStats {
  return {
    speed: s.speed,
    throwPower: s.throwing,
    throwAccuracy: mix(s.throwing, 0.6, s.coordination),
    catching: s.coordination,
    blocking: mix(s.strength, 0.7, s.speed),
    tackling: mix(s.strength, 0.7, s.awareness),
    avoidance: mix(s.coordination, 0.5, s.speed),
    awareness: s.awareness,
  };
}

/**
 * Map the internal Speed stat (0..99) to on-field px/second.
 *
 * Deliberately on the slow side: playtest #2 said the pace felt fast and the
 * user wanted more control. Speed is also the planned difficulty lever —
 * `difficultyBonus` lets later opponents (or the boss) run faster without
 * touching base balance.
 */
export function speedStatToPxPerSec(internalSpeed: number, difficultyBonus = 0): number {
  return 120 + internalSpeed + difficultyBonus;
}
