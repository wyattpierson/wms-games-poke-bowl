import type { Down, DownState } from '../../types';

export const GOAL_LINE_YARD = 100;
export const FIRST_DOWN_YARDS = 10;

/** A fresh set of downs starting at `startYard` (yards from own goal line). */
export function newDrive(startYard: number): DownState {
  const firstDownMarker = Math.min(startYard + FIRST_DOWN_YARDS, GOAL_LINE_YARD);
  return { down: 1, yardsToGo: firstDownMarker - startYard, lineOfScrimmage: startYard, firstDownMarker };
}

export type DownResult =
  | { kind: 'continue'; state: DownState }
  | { kind: 'firstDown'; state: DownState }
  | { kind: 'touchdown' }
  | { kind: 'turnoverOnDowns' };

/** Apply a finished play, ending at `endYard`, to the current downs. Safeties aren't modeled yet. */
export function resolvePlay(state: DownState, endYard: number): DownResult {
  if (endYard >= GOAL_LINE_YARD) return { kind: 'touchdown' };

  const spot = Math.max(Math.round(endYard), 1);
  if (spot >= state.firstDownMarker) return { kind: 'firstDown', state: newDrive(spot) };
  if (state.down === 4) return { kind: 'turnoverOnDowns' };

  return {
    kind: 'continue',
    state: {
      ...state,
      down: (state.down + 1) as Down,
      lineOfScrimmage: spot,
      yardsToGo: state.firstDownMarker - spot,
    },
  };
}
