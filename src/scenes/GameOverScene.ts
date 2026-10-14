import Phaser from 'phaser';
import { teamById } from '../core/campaign';
import { getRun, resetRun } from '../state/runStore';
import { RED, WHITE, header, label, menuBackground, menuButton, runSummaryLines } from '../ui/menu';

interface OverData {
  reason: 'loss' | 'forfeit' | 'ended';
  opponentName?: string;
}

/** The run is over (a loss, a forfeit, or every team consumed without a win). */
export class GameOverScene extends Phaser.Scene {
  private payload!: OverData;

  constructor() {
    super('GameOverScene');
  }

  init(data: OverData): void {
    this.payload = data;
  }

  create(): void {
    const { reason, opponentName } = this.payload;
    const state = getRun();

    menuBackground(this);
    header(this, 'Game Over', 140);
    const reasonLine =
      reason === 'loss' && opponentName ? `You lost to ${opponentName}. The run is over.`
      : reason === 'forfeit' && opponentName ? `You forfeited against ${opponentName}. The run is over.`
      : 'Every team is gone and the champion still stands. The run ends.';
    this.add.text(640, 210, reasonLine, { fontFamily: 'monospace', fontSize: '20px', color: RED }).setOrigin(0.5);

    const results = Object.entries(state.results).map(([id, outcome]) => ({ teamName: teamById(id).name, outcome }));
    this.add
      .text(640, 300, runSummaryLines(results, state.poaches), {
        fontFamily: 'monospace', fontSize: '16px', color: WHITE, align: 'center', lineSpacing: 8,
      })
      .setOrigin(0.5);

    menuButton(this, 640, 560, 'New Run', () => {
      resetRun();
      this.scene.start('TitleScene');
    }, 280, 56);
    label(this, 640, 640, 'a new run starts fresh with your original roster', '#6b7280', '13px');
  }
}
