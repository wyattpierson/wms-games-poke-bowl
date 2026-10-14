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
  | { phase: 'ballInAir'; target: PlayerSprite }
  | { phase: 'run'; carrier: PlayerSprite; lag?: number } // lag: seconds of post-catch slow-down
  | { phase: 'postPlay'; result: PlayResult }
  | { phase: 'simDrive' }
  | { phase: 'halfEnd' }
  | { phase: 'matchOver' };
