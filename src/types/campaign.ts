import type { Team } from '../core/teams';

/** Everything GameScene needs to run one match (see scenes/OpponentSelectScene.ts). */
export interface MatchConfig {
  userTeam: Team;
  opponent: Team;
  /** Extra opponent speed (px/s) from the campaign difficulty ramp. */
  difficultyBonus: number;
}
