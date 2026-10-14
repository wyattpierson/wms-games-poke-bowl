import type { PlaySession } from '../PlaySession';
import type { Phase } from './Phase';

/**
 * The match is over: final score + verdict on the field, then (after a beat) hands off
 * to the ResultScene, which records the outcome in the campaign and routes onward.
 */
export class MatchOverPhase implements Phase {
  constructor(private readonly session: PlaySession) {}

  enter(): void {
    const s = this.session;
    s.matchOver = true;
    s.hud.setHint('');
    const { user, opponent } = s.score;
    const verdict = user > opponent ? 'WIN!' : user < opponent ? 'LOSS' : 'TIE';
    s.hud.setMessage(
      `FINAL: ${s.userTeam.name} ${user} - ${opponent} ${s.opponent.name}\n${verdict}`,
    );
    s.scene.time.delayedCall(2200, () => {
      s.scene.scene.start('ResultScene', { teamId: s.opponent.id, userScore: user, opponentScore: opponent });
    });
  }

  update(): void {
    // waits for the handoff timer
  }
}
