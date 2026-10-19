import type { Vec2 } from '../../types';
import type { PlayerSprite } from '../entities/PlayerSprite';
import type { PlayResult } from '../../types';

/** One stage of a play. PlaySession runs exactly one phase at a time. */
export interface Phase {
  enter(): void;
  update(dt: number): void;
  exit?(): void;
}

/** A request to move to another phase, with whatever data that phase needs. */
export type PhaseRequest =
  | { phase: 'preSnap' }
  | { phase: 'pass' }
  /**
   * A thrown ball. `landing` is the fixed point it flies to (aim point + the QB's throwing error);
   * `intended` is the receiver the throw was aimed at (null for a spot throw), used to describe a miss.
   */
  | { phase: 'ballInAir'; landing: Vec2; intended: PlayerSprite | null }
  | { phase: 'run'; carrier: PlayerSprite; lag?: number } // lag: seconds of post-catch slow-down
  | { phase: 'postPlay'; result: PlayResult }
  | { phase: 'simDrive' }
  | { phase: 'halfEnd' }
  | { phase: 'matchOver' };
