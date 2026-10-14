import { HALF_END_DELAY } from '../../config/gameplay';
import { nextHalf } from '../../core/rules/clock';
import type { PlaySession } from '../PlaySession';
import type { Phase } from './Phase';

/** End of the first half: show the score, then start the second half with a fresh drive. */
export class HalfEndPhase implements Phase {
  private timer = 0;

  constructor(private readonly session: PlaySession) {}

  enter(): void {
    const s = this.session;
    s.hud.setHint('');
    s.hud.setMessage(`HALFTIME\n${s.userTeam.name} ${s.score.user} - ${s.score.opponent} ${s.opponent.name}`);
  }

  update(dt: number): void {
    this.timer += dt;
    if (this.timer < HALF_END_DELAY) return;
    this.session.clock = nextHalf(this.session.clock);
    this.session.startUserDrive();
    this.session.goTo({ phase: 'preSnap' });
  }
}
