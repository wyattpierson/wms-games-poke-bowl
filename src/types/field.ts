/** Shared basic shapes. Pure types only, no logic. */

/** Every football position a Pokémon can play. Offense: QB/RB/WR/TE/OL. Defense: DL/LB/CB/S. */
export type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'OL' | 'DL' | 'LB' | 'CB' | 'S';
export type Side = 'offense' | 'defense';

export interface Vec2 {
  x: number;
  y: number;
}

export type Down = 1 | 2 | 3 | 4;

/** Field positions are in YARDS from the offense's own goal line (0 = own goal, 100 = scoring). */
export interface DownState {
  down: Down;
  yardsToGo: number;
  lineOfScrimmage: number;
  firstDownMarker: number;
}
