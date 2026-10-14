import Phaser from 'phaser';
import { availableOpponents, difficultyBonus, isChampion, wins, type CampaignState } from '../core/campaign';
import { CAMPAIGN_TEAMS, type Team } from '../core/teams';
import type { MatchConfig } from '../types';
import { getRun } from '../state/runStore';
import { GOLD, RED, WHITE, header, label, menuBackground, menuButton } from '../ui/menu';

/**
 * Campaign hub: pick which team to face next. Regular teams dim out once faced
 * (beaten or tied); the champion is always available with a warning.
 */
export class OpponentSelectScene extends Phaser.Scene {
  constructor() {
    super('OpponentSelectScene');
  }

  create(): void {
    menuBackground(this);
    header(this, 'Choose your opponent');
    const state = getRun();

    const available = new Set(availableOpponents(state).map((t) => t.id));
    let x = 170;
    for (const team of CAMPAIGN_TEAMS) {
      this.buildCard(team, x, available.has(team.id), state);
      x += 270;
    }

    label(this, 430, 620, `Your team: ${state.userTeam.name} — ${wins(state)} wins, ${state.poaches.length} poached`, GOLD, '18px');
    menuButton(this, 1060, 620, 'Quit Run', () => this.scene.start('TitleScene'), 180, 44);
    label(this, 1060, 670, 'quitting abandons the run', '#6b7280', '13px');
  }

  private buildCard(team: Team, x: number, isAvailable: boolean, state: CampaignState): void {
    const { results } = state;
    const outcome = results[team.id];
    const isBoss = isChampion(team.id);

    const plate = this.add
      .rectangle(x, 330, 240, 380, 0x1f2937, 1)
      .setStrokeStyle(2, isBoss ? 0xef4444 : 0x4b5563)
      .setInteractive();
    this.add.rectangle(x, 175, 200, 80, team.color, isAvailable ? 1 : 0.3);
    this.add.text(x, 300, team.name.toUpperCase(), { fontFamily: 'monospace', fontSize: '20px', color: WHITE }).setOrigin(0.5);
    this.add
      .text(x, 350, `speed +${difficultyBonus(state, team.id)}`, { fontFamily: 'monospace', fontSize: '15px', color: '#d1d5db' })
      .setOrigin(0.5);

    const status =
      outcome === 'win' ? { text: 'DEFEATED', color: GOLD }
      : outcome === 'loss' ? { text: 'DEFEATED', color: RED }
      : outcome === 'tie' ? { text: 'TIED — GONE', color: '#9ca3af' }
      : isBoss ? { text: '⚠ NEARLY IMPOSSIBLE', color: RED }
      : { text: 'READY', color: GOLD };
    this.add.text(x, 430, status.text, { fontFamily: 'monospace', fontSize: '17px', color: status.color }).setOrigin(0.5);

    if (!isAvailable) return;
    plate.on('pointerover', () => plate.setStrokeStyle(3, 0xfacc15));
    plate.on('pointerout', () => plate.setStrokeStyle(2, isBoss ? 0xef4444 : 0x4b5563));
    plate.on('pointerdown', () => {
      const config: MatchConfig = {
        userTeam: getRun().userTeam,
        opponent: team,
        difficultyBonus: difficultyBonus(getRun(), team.id),
      };
      this.scene.start('GameScene', config);
    });
  }
}
