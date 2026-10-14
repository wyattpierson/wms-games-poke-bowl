import Phaser from 'phaser';
import { recordResult, runEnded, teamById, type MatchOutcome } from '../core/campaign';
import { getRun, setRun } from '../state/runStore';
import { RED, WHITE, header, label, menuBackground, menuButton, GREEN } from '../ui/menu';

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
    const userTeamName = getRun().userTeam.name;

    const outcome: MatchOutcome = userScore > opponentScore ? 'win' : userScore < opponentScore ? 'loss' : 'tie';
    const state = recordResult(getRun(), teamId, outcome);
    setRun(state);

    menuBackground(this);
    header(this, outcome === 'win' ? 'Victory' : outcome === 'loss' ? 'Defeat' : 'Tie', 120);
    this.add
      .text(640, 200, `${userTeamName}  ${userScore} — ${opponentScore}  ${team.name}`, {
        fontFamily: 'monospace', fontSize: '40px', color: WHITE,
      })
      .setOrigin(0.5);

    let buttonText: string;
    let action: () => void;
    if (state.victory) {
      buttonText = 'Champion Defeated';
      action = () => this.scene.start('VictoryScene');
    } else if (state.gameOver) {
      buttonText = 'Game Over';
      action = () => this.scene.start('GameOverScene', { reason: 'loss', opponentName: team.name });
    } else if (outcome === 'win') {
      buttonText = 'Take a Pokémon';
      action = () => this.scene.start('PoachScene', { teamId });
    } else {
      // Tie: nothing gained, the team is gone.
      this.add
        .text(640, 280, 'A tie earns nothing — and that team will not be back.', {
          fontFamily: 'monospace', fontSize: '18px', color: RED,
        })
        .setOrigin(0.5);
      const done = runEnded(state);
      buttonText = 'Continue';
      action = () =>
        done
          ? this.scene.start('GameOverScene', { reason: 'ended' })
          : this.scene.start('OpponentSelectScene');
    }
    menuButton(this, 640, 420, buttonText, action, 320, 60);
    label(this, 640, 500, state.victory ? 'you are the champion' : '', GREEN, '16px');
  }
}
