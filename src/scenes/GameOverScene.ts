import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/field';
import { getRun, resetRun } from '../state/runStore';
import { DIM, RED, MenuButton, fadeTo, header, label, menuBackground, rosterStrip, runSummaryPanel } from '../ui/menu';

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
    const mid = GAME_WIDTH / 2;

    menuBackground(this);
    header(this, 'Game Over', 70).setColor(RED);
    const reasonLine =
      reason === 'loss' && opponentName ? `You lost to ${opponentName}. The run is over.`
      : reason === 'forfeit' && opponentName ? `You forfeited against ${opponentName}. The run is over.`
      : 'Every team is gone and the champion still stands. The run ends.';
    label(this, mid, 116, reasonLine, RED, '18px');

    const height = runSummaryPanel(this, mid, 150, state);
    const rosterY = 150 + height + 100;
    label(this, mid, rosterY - 50, 'YOUR FINAL ROSTER', DIM, '12px');
    rosterStrip(this, mid - 250, rosterY, state.userTeam.offense, 56, 66);
    rosterStrip(this, mid + 250, rosterY, state.userTeam.defense, 56, 66);

    // New Run skips the title: a fresh run starts right at the opponent hub.
    new MenuButton(this, mid - 160, 640, 'New Run', () => { resetRun(); fadeTo(this, 'OpponentSelectScene'); }, { width: 260, height: 56, hotkeys: ['ENTER', 'SPACE'] });
    new MenuButton(this, mid + 160, 640, 'Main Menu', () => fadeTo(this, 'TitleScene'), { width: 220, height: 56, secondary: true });
    label(this, mid, 692, 'a new run starts fresh with your original roster', DIM, '13px');
  }
}
