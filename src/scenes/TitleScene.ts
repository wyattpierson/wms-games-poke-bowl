import Phaser from 'phaser';
import { difficultyBonus } from '../core/campaign';
import { CAMPAIGN_TEAMS } from '../core/teams';
import { getRun, resetRun } from '../state/runStore';
import type { MatchConfig } from '../types';
import { GOLD, WHITE, label, menuBackground, menuButton } from '../ui/menu';

/** Title screen: the only entry point into a run. */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create(): void {
    // Dev deep-link: ?match=<teamId> jumps straight into a match (useful for playtests).
    const teamId = new URLSearchParams(window.location.search).get('match');
    const team = CAMPAIGN_TEAMS.find((t) => t.id === teamId);
    if (team) {
      resetRun();
      const config: MatchConfig = {
        userTeam: getRun().userTeam,
        opponent: team,
        difficultyBonus: difficultyBonus(getRun(), team.id),
      };
      this.scene.start('GameScene', config);
      return;
    }

    menuBackground(this);
    this.add
      .text(640, 230, 'POKÉMON BOWL', { fontFamily: 'monospace', fontSize: '72px', color: GOLD })
      .setOrigin(0.5);
    label(this, 640, 310, 'beat the gauntlet · poach their pokémon · topple the champion', WHITE, '18px');
    label(this, 640, 345, 'lose a match and the run is over — no retries', '#9ca3af', '14px');
    menuButton(this, 640, 450, 'New Run', () => {
      resetRun();
      this.scene.start('OpponentSelectScene');
    }, 320, 60);
  }
}
