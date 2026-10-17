/**
 * Save-file format for a campaign run. Pure (no localStorage, no Phaser): turns a
 * CampaignState into a string and back, validating everything on the way in so a corrupt,
 * hand-edited, or out-of-date save is simply ignored instead of crashing the game.
 * (state/runStore.ts does the actual browser storage.)
 */
import type { CampaignState, MatchOutcome } from './campaign';
import { USER_STATS } from './poach';
import { CAMPAIGN_TEAMS, OFFENSE_POSITIONS, DEFENSE_POSITIONS } from './teams';

/** Bump when CampaignState (or Pokémon/Team) changes shape; older saves are then discarded. */
export const SAVE_VERSION = 1;

const OUTCOMES: readonly string[] = ['win', 'loss', 'tie'] satisfies MatchOutcome[];
const TEAM_IDS: readonly string[] = CAMPAIGN_TEAMS.map((t) => t.id);

export function serializeRun(state: CampaignState): string {
  return JSON.stringify({ version: SAVE_VERSION, run: state });
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === 'string';
const isOptionalTeamId = (v: unknown): boolean => v === undefined || v === null || (isString(v) && TEAM_IDS.includes(v));

function isPokemon(v: unknown): boolean {
  if (!isRecord(v) || !isString(v.id) || !isString(v.name) || !isString(v.type) || !isRecord(v.stats)) return false;
  const stats = v.stats;
  return USER_STATS.every(({ key }) => typeof stats[key] === 'number' && Number.isFinite(stats[key]));
}

function isRoster(v: unknown, size: number): boolean {
  return Array.isArray(v) && v.length === size && v.every(isPokemon);
}

function isPoach(v: unknown): boolean {
  return (
    isRecord(v) &&
    isString(v.fromTeamId) && isString(v.taken) && isString(v.dropped) &&
    (v.side === 'offense' || v.side === 'defense')
  );
}

/** Parse a saved run. Returns null for anything missing, corrupt, or from another save version. */
export function parseRun(raw: string | null): CampaignState | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(data) || data.version !== SAVE_VERSION || !isRecord(data.run)) return null;

  const run = data.run;
  const team = run.userTeam;
  const results = run.results;
  if (!isRecord(team) || !isString(team.id) || !isString(team.name) || typeof team.color !== 'number') return null;
  if (!isRoster(team.offense, OFFENSE_POSITIONS.length) || !isRoster(team.defense, DEFENSE_POSITIONS.length)) return null;
  if (!isRecord(results) || !Object.entries(results).every(([id, outcome]) => TEAM_IDS.includes(id) && OUTCOMES.includes(outcome as string))) return null;
  if (!Array.isArray(run.poaches) || !run.poaches.every(isPoach)) return null;
  if (typeof run.gameOver !== 'boolean' || typeof run.victory !== 'boolean') return null;
  if (!isOptionalTeamId(run.matchInProgress) || !isOptionalTeamId(run.pendingPoach)) return null;

  return run as unknown as CampaignState;
}
