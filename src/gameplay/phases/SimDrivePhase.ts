import { isHalfOver } from '../../core/rules/clock';
import { simulateDrive } from '../../core/simulation';
import { HALVES, SIM_DRIVE_FIRST_DELAY, SIM_DRIVE_SECOND_DELAY } from '../../config/gameplay';
import type { PlaySession } from '../PlaySession';
import type { Phase } from './Phase';

/**
 * The user only plays offense (locked decision), so opponent possessions are fast-forwarded:
 * "opponent has the ball..." -> a random outcome (score/punt/turnover) that consumes a chunk
 * of game clock -> the user gets a fresh drive.
 */
export class SimDrivePhase implements Phase {
  private timer = 0;
  private resolved = false;
  private readonly opponentName: string;

  constructor(private readonly session: PlaySession) {
    this.opponentName = session.opponent.name;
  }

  enter(): void {
    this.session.hud.setHint('');
    this.session.hud.setMessage(`${this.opponentName} has the ball...`);
  }

  update(dt: number): void {
    this.timer += dt;
    if (this.timer < SIM_DRIVE_FIRST_DELAY) return;

    if (!this.resolved) {
      this.resolved = true;
      this.session.applySimDrive(simulateDrive());
    }
    if (this.timer < SIM_DRIVE_FIRST_DELAY + SIM_DRIVE_SECOND_DELAY) return;

    const clock = this.session.clock;
    if (isHalfOver(clock)) this.session.goTo(clock.half >= HALVES ? { phase: 'matchOver' } : { phase: 'halfEnd' });
    else {
      this.session.startUserDrive();
      this.session.goTo({ phase: 'preSnap' });
    }
  }
}
