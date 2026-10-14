/**
 * Campaign (roguelike run) state machine. Pure, no Phaser, unit-tested.
 *
 * Rules (see DESIGN.md "Campaign structure"):
 *   - 3 regular teams, fought in any order, each once per run.
 *   - The champion is always available and is the finale; beating it ends the run (victory).
 *   - Losing a match ends the run. A tie consumes the team with no reward (no replay).
 *   - After beating a regular team you may poach 1 of its Pokémon (swap: take 1, drop 1
 *     of your own, same side). The champion grants no Pokémon.
 *
 * State is immutable: every transition returns a NEW CampaignState.
 */
import { CHAMPION_DIFFICULTY_BONUS, DIFFICULTY_PER_WIN } from '../config/campaign';
import type { Side } from '../types';
import type { Pokemon } from './pokemon';
import { CAMPAIGN_TEAMS, CHAMPION_TEAM, PLAYER_TEAM, type Team } from './teams';

/** How a match against a given team ended. */
export type MatchOutcome = 'win' | 'loss' | 'tie';

/** A completed poach, kept for the end-of-run summary. */
export interface Poach {
  fromTeamId: string;
  side: Side;
  taken: string;
  dropped: string;
}

export interface CampaignState {
  /** The player's current roster (cloned — never the original PLAYER_TEAM). */
  userTeam: Team;
  /** Teams already faced this run: teamId -> outcome. */
  results: Record<string, MatchOutcome>;
  poaches: Poach[];
  gameOver: boolean;
  victory: boolean;
}

export function clonePokemon(p: Pokemon): Pokemon {
  return { ...p, stats: { ...p.stats } };
}

export function cloneTeam(t: Team): Team {
  return { ...t, offense: t.offense.map(clonePokemon), defense: t.defense.map(clonePokemon) };
}

/** A fresh run: the starting roster, no results. */
export function newRun(): CampaignState {
  return { userTeam: cloneTeam(PLAYER_TEAM), results: {}, poaches: [], gameOver: false, victory: false };
}

export function teamById(id: string): Team {
  const team = CAMPAIGN_TEAMS.find((t) => t.id === id);
  if (!team) throw new Error(`Unknown team: ${id}`);
  return team;
}

export function isChampion(teamId: string): boolean {
  return teamId === CHAMPION_TEAM.id;
}

/** How many matches the player has won this run. */
export function wins(state: CampaignState): number {
  return Object.values(state.results).filter((r) => r === 'win').length;
}

/** Record a match outcome. A loss ends the run; a champion win is the victory. */
export function recordResult(state: CampaignState, teamId: string, outcome: MatchOutcome): CampaignState {
  if (state.gameOver || state.victory) throw new Error('The run is already over');
  if (state.results[teamId]) throw new Error(`Team ${teamId} was already faced`);
  const next: CampaignState = { ...state, results: { ...state.results, [teamId]: outcome } };
  if (outcome === 'loss') next.gameOver = true;
  if (outcome === 'win' && isChampion(teamId)) next.victory = true;
  return next;
}

/** Teams that can still be challenged: not yet faced (the champion included, always). */
export function availableOpponents(state: CampaignState): Team[] {
  if (state.gameOver || state.victory) return [];
  return CAMPAIGN_TEAMS.filter((t) => !state.results[t.id]);
}

/** The run quietly ends (no win, no loss) once every team has been consumed — e.g. all ties. */
export function runEnded(state: CampaignState): boolean {
  return !state.gameOver && !state.victory && availableOpponents(state).length === 0;
}

/**
 * Swap one of the player's Pokémon for one from the just-beaten team (same side).
 * The taken Pokémon keeps its original stats and plays the position of the dropped slot.
 */
export function applyPoach(
  state: CampaignState,
  side: Side,
  fromTeamId: string,
  takenIndex: number,
  droppedIndex: number,
): CampaignState {
  if (state.results[fromTeamId] !== 'win') throw new Error('Can only poach from a team you just beat');
  if (isChampion(fromTeamId)) throw new Error('The champion grants no Pokémon');
  const source = teamById(fromTeamId)[side];
  const taken = source[takenIndex];
  const target = state.userTeam[side];
  const dropped = target[droppedIndex];
  if (!taken || !dropped) throw new Error('Bad roster index');

  const userTeam = cloneTeam(state.userTeam);
  userTeam[side] = userTeam[side].map((p, i) => (i === droppedIndex ? clonePokemon(taken) : p));
  return {
    ...state,
    userTeam,
    poaches: [...state.poaches, { fromTeamId, side, taken: taken.name, dropped: dropped.name }],
  };
}

/** Extra opponent speed (px/s) for a matchup, from the campaign's difficulty ramp. */
export function difficultyBonus(state: CampaignState, teamId: string): number {
  const base = isChampion(teamId) ? CHAMPION_DIFFICULTY_BONUS : 0;
  return base + wins(state) * DIFFICULTY_PER_WIN;
}
