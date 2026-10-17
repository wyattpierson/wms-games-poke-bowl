/**
 * Campaign difficulty-ramp knobs (used by core/campaign.ts). Speed is px/second.
 */

/** Extra opponent speed for every regular team beaten this run. */
export const DIFFICULTY_PER_WIN = 10;

/** Flat extra opponent speed for the champion, on top of the per-win ramp. */
export const CHAMPION_DIFFICULTY_BONUS = 30;

/**
 * Saved-run rule: if the game is closed or refreshed while a match is being played, is the run
 * over (true: keeps "no retries" honest) or does the match simply restart (false: forgiving)?
 */
export const ABANDONED_MATCH_ENDS_RUN = true;
