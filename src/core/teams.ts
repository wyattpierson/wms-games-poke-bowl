import type { Pokemon, UserStats } from './pokemon';
import type { Position } from '../types';

/**
 * Team/roster data. Pure, no Phaser.
 *
 * 7 on 7, no bench. Each team carries 14 Pokémon: 7 dedicated to offense and 7 to defense
 * (locked decision). The user only plays offense; the defense is shown but always AI-simulated.
 *
 * Roster order is positional:
 *   offense[i] plays OFFENSE_POSITIONS[i]: QB, OL, OL, RB, WR, WR, TE
 *   defense[i] plays DEFENSE_POSITIONS[i]: DL, DL, LB, LB, CB, CB, S
 *
 * The stat values below are DUMMIES (0..99): speed, strength, throwing, awareness,
 * coordination. They are placeholders until the user remaps them; the game derives
 * its internal stats from these (see core/pokemon.ts).
 */

/** The 7 offensive positions, in roster order. */
export const OFFENSE_POSITIONS: readonly Position[] = ['QB', 'OL', 'OL', 'RB', 'WR', 'WR', 'TE'];
/** The 7 defensive positions, in roster order. */
export const DEFENSE_POSITIONS: readonly Position[] = ['DL', 'DL', 'LB', 'LB', 'CB', 'CB', 'S'];

export interface Team {
  id: string;
  name: string;
  /** Sprite tint for this team. */
  color: number;
  /** 7 Pokémon in offense roster order: QB, OL, OL, RB, WR, WR, TE. */
  offense: Pokemon[];
  /** 7 Pokémon in defense roster order: DL, DL, LB, LB, CB, CB, S. */
  defense: Pokemon[];
}

const p = (id: string, name: string, type: Pokemon['type'], stats: UserStats): Pokemon =>
  ({ id, name, type, stats });

export const PLAYER_TEAM: Team = {
  id: 'volt-rush',
  name: 'Volt Rush',
  color: 0x3b82f6,
  offense: [
    p('abra', 'Abra', 'Psychic', { speed: 90, strength: 45, throwing: 70, awareness: 60, coordination: 65 }),
    p('geodude', 'Geodude', 'Rock', { speed: 45, strength: 65, throwing: 30, awareness: 50, coordination: 45 }),
    p('graveler', 'Graveler', 'Rock', { speed: 65, strength: 75, throwing: 35, awareness: 55, coordination: 50 }),
    p('machamp', 'Machamp', 'Fighting', { speed: 70, strength: 88, throwing: 40, awareness: 65, coordination: 72 }),
    p('pikachu', 'Pikachu', 'Electric', { speed: 120, strength: 40, throwing: 45, awareness: 70, coordination: 78 }),
    p('jolteon', 'Jolteon', 'Electric', { speed: 130, strength: 50, throwing: 50, awareness: 75, coordination: 82 }),
    p('raichu', 'Raichu', 'Electric', { speed: 110, strength: 62, throwing: 55, awareness: 70, coordination: 76 }),
  ],
  defense: [
    p('steelix', 'Steelix', 'Steel', { speed: 30, strength: 88, throwing: 25, awareness: 75, coordination: 55 }),
    p('regirock', 'Regirock', 'Rock', { speed: 50, strength: 78, throwing: 25, awareness: 80, coordination: 55 }),
    p('houndoom', 'Houndoom', 'Dark', { speed: 95, strength: 70, throwing: 45, awareness: 78, coordination: 65 }),
    p('tauros', 'Tauros', 'Normal', { speed: 110, strength: 82, throwing: 40, awareness: 70, coordination: 72 }),
    p('falinks', 'Falinks', 'Steel', { speed: 100, strength: 80, throwing: 40, awareness: 80, coordination: 76 }),
    p('umbreon', 'Umbreon', 'Dark', { speed: 55, strength: 50, throwing: 45, awareness: 78, coordination: 65 }),
    p('weavile', 'Weavile', 'Dark', { speed: 125, strength: 88, throwing: 45, awareness: 82, coordination: 80 }),
  ],
};

export const EMBER_BLITZ: Team = {
  id: 'ember-blitz',
  name: 'Ember Blitz',
  color: 0xf97316,
  offense: [
    p('magby', 'Magby', 'Fire', { speed: 85, strength: 70, throwing: 60, awareness: 60, coordination: 65 }),
    p('torkoal', 'Torkoal', 'Fire', { speed: 40, strength: 62, throwing: 30, awareness: 58, coordination: 50 }),
    p('magmar', 'Magmar', 'Fire', { speed: 75, strength: 66, throwing: 55, awareness: 60, coordination: 65 }),
    p('arcanine', 'Arcanine', 'Fire', { speed: 95, strength: 80, throwing: 50, awareness: 76, coordination: 75 }),
    p('flareon', 'Flareon', 'Fire', { speed: 115, strength: 55, throwing: 45, awareness: 70, coordination: 72 }),
    p('vulpix', 'Vulpix', 'Fire', { speed: 80, strength: 45, throwing: 45, awareness: 72, coordination: 65 }),
    p('rapidash', 'Rapidash', 'Fire', { speed: 105, strength: 65, throwing: 45, awareness: 65, coordination: 72 }),
  ],
  defense: [
    p('emboar', 'Emboar', 'Fire', { speed: 65, strength: 92, throwing: 35, awareness: 60, coordination: 62 }),
    p('rhyhorn', 'Rhyhorn', 'Ground', { speed: 25, strength: 72, throwing: 28, awareness: 55, coordination: 50 }),
    p('krokorok', 'Krokorok', 'Ground', { speed: 75, strength: 70, throwing: 40, awareness: 66, coordination: 60 }),
    p('mawile', 'Mawile', 'Steel', { speed: 50, strength: 66, throwing: 45, awareness: 65, coordination: 62 }),
    p('skarmory', 'Skarmory', 'Steel', { speed: 70, strength: 55, throwing: 40, awareness: 82, coordination: 65 }),
    p('dodrio', 'Dodrio', 'Flying', { speed: 110, strength: 85, throwing: 50, awareness: 76, coordination: 75 }),
    p('blaziken', 'Blaziken', 'Fire', { speed: 80, strength: 90, throwing: 60, awareness: 80, coordination: 80 }),
  ],
};

export const STONE_CIRCLE: Team = {
  id: 'stone-circle',
  name: 'Stone Circle',
  color: 0x84cc16,
  offense: [
    p('onix', 'Onix', 'Rock', { speed: 70, strength: 72, throwing: 30, awareness: 60, coordination: 55 }),
    p('cubone', 'Cubone', 'Ground', { speed: 75, strength: 75, throwing: 45, awareness: 65, coordination: 62 }),
    p('golem', 'Golem', 'Rock', { speed: 45, strength: 80, throwing: 35, awareness: 60, coordination: 55 }),
    p('raticate', 'Raticate', 'Normal', { speed: 105, strength: 70, throwing: 40, awareness: 70, coordination: 72 }),
    p('marowak', 'Marowak', 'Ground', { speed: 90, strength: 85, throwing: 58, awareness: 70, coordination: 70 }),
    p('sandshrew', 'Sandshrew', 'Ground', { speed: 55, strength: 65, throwing: 40, awareness: 65, coordination: 60 }),
    p('persian', 'Persian', 'Normal', { speed: 115, strength: 65, throwing: 45, awareness: 76, coordination: 80 }),
  ],
  defense: [
    p('forretress', 'Forretress', 'Bug', { speed: 40, strength: 76, throwing: 45, awareness: 75, coordination: 65 }),
    p('bastiodon', 'Bastiodon', 'Rock', { speed: 45, strength: 55, throwing: 20, awareness: 70, coordination: 50 }),
    p('hippowdon', 'Hippowdon', 'Ground', { speed: 47, strength: 70, throwing: 38, awareness: 65, coordination: 55 }),
    p('rhyperior', 'Rhyperior', 'Ground', { speed: 50, strength: 95, throwing: 45, awareness: 70, coordination: 65 }),
    p('staraptor', 'Staraptor', 'Flying', { speed: 100, strength: 85, throwing: 50, awareness: 70, coordination: 72 }),
    p('breloom', 'Breloom', 'Fighting', { speed: 70, strength: 88, throwing: 50, awareness: 70, coordination: 72 }),
    p('lucario', 'Lucario', 'Fighting', { speed: 90, strength: 80, throwing: 58, awareness: 82, coordination: 76 }),
  ],
};

export const TIDAL_WAVE: Team = {
  id: 'tidal-wave',
  name: 'Tidal Wave',
  color: 0x06b6d4,
  offense: [
    p('starmie', 'Starmie', 'Water', { speed: 115, strength: 60, throwing: 75, awareness: 80, coordination: 75 }),
    p('slowbro', 'Slowbro', 'Water', { speed: 30, strength: 55, throwing: 75, awareness: 85, coordination: 55 }),
    p('lapras', 'Lapras', 'Water', { speed: 60, strength: 65, throwing: 60, awareness: 75, coordination: 70 }),
    p('swampert', 'Swampert', 'Water', { speed: 70, strength: 76, throwing: 45, awareness: 70, coordination: 65 }),
    p('gyarados', 'Gyarados', 'Water', { speed: 81, strength: 90, throwing: 50, awareness: 65, coordination: 65 }),
    p('octillery', 'Octillery', 'Water', { speed: 65, strength: 80, throwing: 78, awareness: 65, coordination: 70 }),
    p('cloyster', 'Cloyster', 'Water', { speed: 70, strength: 72, throwing: 82, awareness: 75, coordination: 70 }),
  ],
  defense: [
    p('milotic', 'Milotic', 'Water', { speed: 81, strength: 75, throwing: 80, awareness: 85, coordination: 75 }),
    p('whiscash', 'Whiscash', 'Water', { speed: 60, strength: 62, throwing: 50, awareness: 65, coordination: 55 }),
    p('pelipper', 'Pelipper', 'Water', { speed: 65, strength: 45, throwing: 55, awareness: 72, coordination: 65 }),
    p('floatzel', 'Floatzel', 'Water', { speed: 70, strength: 60, throwing: 50, awareness: 70, coordination: 72 }),
    p('swanna', 'Swanna', 'Water', { speed: 98, strength: 65, throwing: 65, awareness: 70, coordination: 72 }),
    p('kingdra', 'Kingdra', 'Water', { speed: 85, strength: 70, throwing: 76, awareness: 80, coordination: 75 }),
    p('simipour', 'Simipour', 'Water', { speed: 101, strength: 75, throwing: 60, awareness: 70, coordination: 75 }),
  ],
};

/** The boss / finale team. Challengeable at any time; meant to be near-impossible without a stronger roster. */
export const CHAMPIONS_PRIDE: Team = {
  id: 'champions-pride',
  name: "Champion's Pride",
  color: 0xa855f7,
  offense: [
    p('alakazam', 'Alakazam', 'Psychic', { speed: 120, strength: 60, throwing: 90, awareness: 95, coordination: 72 }),
    p('rhydon', 'Rhydon', 'Ground', { speed: 40, strength: 90, throwing: 35, awareness: 65, coordination: 60 }),
    p('aggron', 'Aggron', 'Steel', { speed: 50, strength: 95, throwing: 35, awareness: 75, coordination: 65 }),
    p('tyranitar', 'Tyranitar', 'Rock', { speed: 61, strength: 95, throwing: 45, awareness: 82, coordination: 70 }),
    p('scizor', 'Scizor', 'Bug', { speed: 65, strength: 85, throwing: 45, awareness: 70, coordination: 72 }),
    p('dragonite', 'Dragonite', 'Dragon', { speed: 80, strength: 76, throwing: 60, awareness: 75, coordination: 82 }),
    p('mewtwo', 'Mewtwo', 'Psychic', { speed: 130, strength: 90, throwing: 95, awareness: 99, coordination: 82 }),
  ],
  defense: [
    p('registeel', 'Registeel', 'Steel', { speed: 50, strength: 60, throwing: 25, awareness: 85, coordination: 60 }),
    p('metagross', 'Metagross', 'Steel', { speed: 70, strength: 90, throwing: 58, awareness: 88, coordination: 82 }),
    p('mamoswine', 'Mamoswine', 'Ice', { speed: 80, strength: 90, throwing: 40, awareness: 75, coordination: 72 }),
    p('conkeldurr', 'Conkeldurr', 'Fighting', { speed: 45, strength: 88, throwing: 45, awareness: 65, coordination: 65 }),
    p('drapion', 'Drapion', 'Dark', { speed: 95, strength: 65, throwing: 50, awareness: 76, coordination: 70 }),
    p('braviary', 'Braviary', 'Flying', { speed: 80, strength: 85, throwing: 55, awareness: 75, coordination: 70 }),
    p('deoxys', 'Deoxys', 'Psychic', { speed: 99, strength: 90, throwing: 70, awareness: 85, coordination: 92 }),
  ],
};

/** The three regular gauntlet teams (choose your order to face them). */
export const REGULAR_TEAMS: readonly Team[] = [EMBER_BLITZ, STONE_CIRCLE, TIDAL_WAVE];

/** The finale boss team. */
export const CHAMPION_TEAM: Team = CHAMPIONS_PRIDE;

/** All 4 campaign teams (3 regular + 1 champion). */
export const CAMPAIGN_TEAMS: readonly Team[] = [...REGULAR_TEAMS, CHAMPION_TEAM];
