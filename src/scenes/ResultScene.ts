import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/field';
import { recordResult, runEnded, teamById, type MatchOutcome } from '../core/campaign';
import { getRun, setRun } from '../state/runStore';
import { DIM, GOLD, GRAY, GREEN, RED, WHITE, MenuButton, fadeTo, header, label, menuBackground, panel } from '../ui/menu';
import { textStyle } from '../ui/theme';

interface ResultData {
  teamId: string;
  userScore: number;
  opponentScore: number;
}

/**
 * Post-match screen. Records the outcome in the campaign run (once), shows the
 * final score, and routes: win → poach (champion win → victory), loss → game
 * over, tie → back to the hub (team consumed, no reward).
 */
export class ResultScene extends Phaser.Scene {
  private payload!: ResultData;

  constructor() {
    super('ResultScene');
  }

  init(data: ResultData): void {
    this.payload = data;
  }

  create(): void {
    const { teamId, userScore, opponentScore } = this.payload;
    const team = teamById(teamId);
    const userTeam = getRun().userTeam;

    const outcome: MatchOutcome = userScore > opponentScore ? 'win' : userScore < opponentScore ? 'loss' : 'tie';
    const state = recordResult(getRun(), teamId, outcome);
    setRun(state);

    menuBackground(this);
    const mid = GAME_WIDTH / 2;
    header(this, outcome === 'win' ? 'Victory' : outcome === 'loss' ? 'Defeat' : 'Tie', 96)
      .setColor(outcome === 'win' ? GREEN : outcome === 'loss' ? RED : GRAY);
    label(this, mid, 138, 'FINAL SCORE', DIM, '13px');

    // Scoreboard: team color bar, name, big score. Winner's score is gold.
    panel(this, mid, 250, 760, 170);
    const sides = [
      { x: mid - 190, name: userTeam.name, color: userTeam.color, score: userScore, won: outcome === 'win' },
      { x: mid + 190, name: team.name, color: team.color, score: opponentScore, won: outcome === 'loss' },
    ];
    for (const side of sides) {
      this.add.rectangle(side.x, 192, 240, 10, side.color);
      this.add.text(side.x, 220, side.name.toUpperCase(), textStyle(16, WHITE)).setOrigin(0.5);
      this.add.text(side.x, 280, String(side.score), textStyle(72, side.won ? GOLD : outcome === 'tie' ? WHITE : GRAY)).setOrigin(0.5);
    }
    this.add.text(mid, 270, '—', textStyle(40, DIM)).setOrigin(0.5);

    let buttonText: string;
    let action: () => void;
    let note: { text: string; color: string };
    if (state.victory) {
      buttonText = 'Champion Defeated';
      note = { text: 'You toppled the champion!', color: GREEN };
      action = () => fadeTo(this, 'VictoryScene');
    } else if (state.gameOver) {
      buttonText = 'Game Over';
      note = { text: 'The run ends here.', color: RED };
      action = () => fadeTo(this, 'GameOverScene', { reason: 'loss', opponentName: team.name });
    } else if (outcome === 'win') {
      buttonText = 'Take a Pokémon';
      note = { text: `Take one Pokémon from ${team.name} to strengthen your roster.`, color: GRAY };
      action = () => fadeTo(this, 'PoachScene', { teamId });
    } else {
      // Tie: nothing gained, the team is gone.
      buttonText = 'Continue';
      note = { text: 'A tie earns nothing — and that team will not be back.', color: RED };
      action = () =>
        runEnded(state)
          ? fadeTo(this, 'GameOverScene', { reason: 'ended' })
          : fadeTo(this, 'OpponentSelectScene');
    }
    label(this, mid, 380, note.text, note.color, '18px');
    new MenuButton(this, mid, 470, buttonText, action, { width: 400, height: 60, fontSize: 16, hotkeys: ['ENTER', 'SPACE'] });
    label(this, mid, 520, 'press ENTER', DIM, '13px');
  }
}
