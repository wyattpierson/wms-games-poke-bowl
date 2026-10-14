import { newRun, type CampaignState } from '../core/campaign';

/**
 * The single in-memory campaign run, shared across menu scenes (Phaser scenes have
 * no clean shared-state mechanism, so a module singleton is the pragmatic choice).
 *
 * Deliberately NOT persisted: a refresh starts a new run (roguelike). localStorage
 * persistence is a small follow-up if we ever want it.
 */
let state: CampaignState = newRun();

export function getRun(): CampaignState {
  return state;
}

export function setRun(next: CampaignState): void {
  state = next;
}

/** Start a brand-new run (called from the title screen / end-of-run screens). */
export function resetRun(): CampaignState {
  state = newRun();
  return state;
}
