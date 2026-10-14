import { POST_PLAY_DELAY } from '../../config/gameplay';
import type { PlaySession } from '../PlaySession';
import type { Phase } from './Phase';

/**
 * Shows the play result, then follows the session's decision:
 * keep the ball, switch possession (simulated opponent drive), end the half, or end the match.
 * The session computes the decision when the phase is requested (see PlaySession.resolvePlay).
 */
export class PostPlayPhase implements Phase {
  private timer = 0;

  constructor(private readonly session: PlaySession) {}

  enter(): void {
    const resolution = this.session.resolution;
    if (resolution) this.session.hud.setMessage(resolution.message);
    this.session.hud.setHint('');

    // Touchdown celebration: the offense pulses in a small ripple.
    if (resolution?.message.includes('TOUCHDOWN!')) {
      this.session.offense.forEach((player, i) => {
        this.session.scene.time.delayedCall(i * 70, () => player.pulse());
      });
    }
  }

  update(dt: number): void {
    this.timer += dt;
    if (this.timer < POST_PLAY_DELAY) return;
    const resolution = this.session.resolution;
    if (!resolution) return;
    switch (resolution.next.kind) {
      case 'continue':
        this.session.goTo({ phase: 'preSnap' });
        break;
      case 'switchPossession':
        this.session.goTo({ phase: 'simDrive' });
        break;
      case 'halfEnd':
        this.session.goTo({ phase: 'halfEnd' });
        break;
      case 'matchEnd':
        this.session.goTo({ phase: 'matchOver' });
        break;
    }
  }
}
