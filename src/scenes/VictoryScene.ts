import Phaser from 'phaser';
import { teamById } from '../core/campaign';
import { getRun, resetRun } from '../state/runStore';
import { GOLD, WHITE, header, label, menuBackground, menuButton, runSummaryLines } from '../ui/menu';

/** The champion is down: the run is a success. */
export class VictoryScene extends Phaser.Scene {
  constructor() {
    super('VictoryScene');
  }

  create(): void {
    const state = getRun();

    menuBackground(this);
    header(this, 'Champion Defeated', 140);
    this.add
      .text(640, 210, 'You are the Pokémon Bowl champion.', {
        fontFamily: 'monospace', fontSize: '24px', color: GOLD,
      })
      .setOrigin(0.5);

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
