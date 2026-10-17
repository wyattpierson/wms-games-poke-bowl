import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/field';
import { getRun, resetRun } from '../state/runStore';
import { DIM, GOLD, MenuButton, fadeTo, header, label, menuBackground, rosterStrip, runSummaryPanel } from '../ui/menu';

/** The champion is down: the run is a success. Your roster takes a bow. */
export class VictoryScene extends Phaser.Scene {
  constructor() {
    super('VictoryScene');
  }

  create(): void {
    const state = getRun();
    const mid = GAME_WIDTH / 2;

    menuBackground(this);
    header(this, 'Champion Defeated', 70);
    label(this, mid, 116, 'You are the Pokémon Bowl champion.', GOLD, '22px');

    const height = runSummaryPanel(this, mid, 150, state);
    const rosterY = 150 + height + 100;
    label(this, mid, rosterY - 50, 'YOUR CHAMPIONSHIP ROSTER', DIM, '12px');
    rosterStrip(this, mid - 250, rosterY, state.userTeam.offense, 56, 66, true);
    rosterStrip(this, mid + 250, rosterY, state.userTeam.defense, 56, 66, true);

    new MenuButton(this, mid - 160, 640, 'New Run', () => { resetRun(); fadeTo(this, 'OpponentSelectScene'); }, { width: 260, height: 56, hotkeys: ['ENTER', 'SPACE'] });
    new MenuButton(this, mid + 160, 640, 'Main Menu', () => fadeTo(this, 'TitleScene'), { width: 220, height: 56, secondary: true });
    label(this, mid, 692, 'a new run starts fresh with your original roster', DIM, '13px');
  }
}
