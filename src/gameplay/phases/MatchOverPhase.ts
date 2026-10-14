import type { PlaySession } from '../PlaySession';
import type { Phase } from './Phase';

/** The match is over: final score, win/loss, and how to play again. GameScene restarts on R. */
export class MatchOverPhase implements Phase {
  constructor(private readonly session: PlaySession) {}

  enter(): void {
    const s = this.session;
    s.matchOver = true;
    s.hud.setHint('');
    const { user, opponent } = s.score;
    const verdict = user > opponent ? 'WIN!' : user < opponent ? 'LOSS' : 'TIE';
    s.hud.setMessage(
      `FINAL: ${s.userTeam.name} ${user} - ${opponent} ${s.opponent.name}\n${verdict}\nPress R to play again`,
    );
  }

  update(): void {
    // waits forever; GameScene handles the restart
  }
}
