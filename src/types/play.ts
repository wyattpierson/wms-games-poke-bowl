import type { Pokemon } from '../core/pokemon';
import type { Position, Vec2 } from './field';

/** What a defender does on a pass play. */
export type DefenseRole =
  | { kind: 'rush' } // pass rush the QB (can be slowed by blockers)
  | { kind: 'blitz'; delay: number } // hold, then rush after `delay` seconds
  | { kind: 'cover'; receiverSlot: number }; // shadow a receiver

/** `offset` is in pixels relative to the line of scrimmage (x) and field center (y). Offense moves toward +x. */
export interface OffenseSlot {
  position: Position;
  pokemon: Pokemon;
  offset: Vec2;
  /** Which receiver the reticle can target (0, 1, 2...). Omit for non-receivers. */
  receiverSlot?: number;
  /** Waypoints in pixels, each relative to the player's STARTING spot (not the previous waypoint). */
  route?: Vec2[];
}

export interface DefenseSlot {
  position: Position;
  pokemon: Pokemon;
  offset: Vec2;
  role: DefenseRole;
}

/** One play: where all 7 offense and 7 defense Pokémon line up. The same 7 play both sides. */
export interface Play {
  name: string;
  offense: OffenseSlot[];
  defense: DefenseSlot[];
}

/** How a play ended. The post-play phase turns this into the next down state. */
export type PlayResult =
  | { kind: 'gain'; endYard: number; note: string } // tackle, sack, out of bounds, dive, touchdown run...
  | { kind: 'incomplete'; note?: string } // note: 'Overthrown!', 'Short!', 'No receiver there!'...
  | { kind: 'interception' };
