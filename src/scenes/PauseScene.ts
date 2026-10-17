import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/field';
import { recordResult } from '../core/campaign';
import { getRun, setRun } from '../state/runStore';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { DIM, GOLD, GRAY, MenuButton, label, panel } from '../ui/menu';
import { FILL, textStyle } from '../ui/theme';

interface PauseData {
  opponentId: string;
  opponentName: string;
}

/**
 * Pause menu, launched on top of a paused GameScene (so it has its own camera, unaffected by
 * the match zoom). Resume, or forfeit — which counts as a loss and ends the run, so it asks
 * first. ESC resumes (or backs out of the forfeit question); ENTER also resumes.
 */
export class PauseScene extends Phaser.Scene {
  private payload!: PauseData;
  private dialog: ConfirmDialog | null = null;

  constructor() {
    super('PauseScene');
  }

  init(data: PauseData): void {
    this.payload = data;
  }

  create(): void {
    this.dialog = null;
    const mid = GAME_WIDTH / 2;

    this.add.rectangle(mid, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.72).setInteractive();
    panel(this, mid, 360, 520, 360, FILL.gold);
    this.add.text(mid, 240, 'PAUSED', textStyle(40, GOLD)).setOrigin(0.5);
    label(this, mid, 290, `vs ${this.payload.opponentName}`, GRAY, '18px');

    new MenuButton(this, mid, 365, 'Resume', () => this.resume(), { width: 320, height: 56 });
    new MenuButton(this, mid, 441, 'Forfeit Match', () => this.askForfeit(), { width: 320, height: 44, fontSize: 16, secondary: true });
    label(this, mid, 500, 'ESC or ENTER to resume', DIM, '13px');

    this.input.keyboard?.on('keydown-ESC', (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (this.dialog) this.dialog.cancel();
      else this.resume();
    });
    this.input.keyboard?.on('keydown-ENTER', (event: KeyboardEvent) => {
      if (!event.repeat && !this.dialog) this.resume();
    });
  }

  private resume(): void {
    this.scene.resume('GameScene');
    this.scene.stop();
  }

  private askForfeit(): void {
    if (this.dialog) return;
    this.dialog = new ConfirmDialog(this, {
      title: 'Forfeit match?',
      body: `This counts as a loss against ${this.payload.opponentName} and ends your run.`,
      confirmLabel: 'Yes, forfeit',
      cancelLabel: 'Keep playing',
      onConfirm: () => this.forfeit(),
      onCancel: () => { this.dialog = null; },
    });
  }

  private forfeit(): void {
    setRun(recordResult(getRun(), this.payload.opponentId, 'loss'));
    this.scene.stop('GameScene');
    this.scene.start('GameOverScene', { reason: 'forfeit', opponentName: this.payload.opponentName });
  }
}
