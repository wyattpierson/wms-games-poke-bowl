/**
 * Campaign difficulty-ramp knobs (used by core/campaign.ts). Speed is px/second.
 */

/** Extra opponent speed for every regular team beaten this run. */
export const DIFFICULTY_PER_WIN = 10;

/** Flat extra opponent speed for the champion, on top of the per-win ramp. */
export const CHAMPION_DIFFICULTY_BONUS = 30;
