import {
  BALL_ARC_BASE, BALL_ARC_MAX, BALL_ARC_PER_PX, BALL_ARRIVE_RADIUS, BALL_SPEED, CATCH_LAG_TIME, CATCH_TUNING,
} from '../../config/gameplay';
import { distance, nearestDistance, nearestIndex, stepToward } from '../../core/math/vec2';
import { resolveCatch } from '../../core/resolvers/catch';
import { updatePassDefense } from '../defenseBehavior';
import type { PlayerSprite } from '../entities/PlayerSprite';
import type { PlaySession } from '../PlaySession';
import type { Phase } from './Phase';

/**
 * The ball flies to the target. It homes in on the receiver's current position,
 * which gives the "auto-lead" feel without any ball physics. Defenders hold their
 * coverage assignments while the ball is in the air (no ball-chasing).
 */
export class BallInAirPhase implements Phase {
  private elapsed = 0;
  /** Distance at release — used to map travel into flight progress (the 2.5D arc). */
  private startDist = 0;

  constructor(
    private readonly session: PlaySession,
    private readonly target: PlayerSprite,
  ) {}

  enter(): void {
    const s = this.session;
    this.session.hud.setHint('');
    this.startDist = Math.max(1, distance(s.ball.pos, this.target.pos));
    // Longer throws arc higher (deeper throw = higher lob), capped for readability.
    s.ball.beginFlight(Math.min(BALL_ARC_MAX, BALL_ARC_BASE + this.startDist * BALL_ARC_PER_PX));
  }

  update(dt: number): void {
    const s = this.session;
    this.elapsed += dt;
    s.receivers.forEach((receiver) => receiver.followRoute(dt));

    // Ball speed scales with the QB's throwPower (a deeper, faster throw).
    const ballSpeed = BALL_SPEED * (0.75 + 0.5 * s.qb.internal.throwPower / 99);
    const next = stepToward(s.ball.pos, this.target.pos, ballSpeed * dt);
    s.ball.place(next.x, next.y);
    // Flight progress: 0 at release, 1 on arrival — drives the drawn arc + scale.
    s.ball.setFlight(1 - distance(next, this.target.pos) / this.startDist);
    updatePassDefense(s, this.elapsed, dt);

    if (distance(next, this.target.pos) <= BALL_ARRIVE_RADIUS) this.resolve();
  }

  private resolve(): void {
    const s = this.session;
    const defenders = s.defense.map((d) => d.pos);
    const defenderDistance = nearestDistance(this.target.pos, defenders);
    const outcome = resolveCatch(defenderDistance, CATCH_TUNING, this.target.internal.catching);

    if (outcome === 'catch') {
      this.target.hop(); // the receiver jumps for the ball
      // The receiver breaks stride after the catch — defenders get a window to close.
      s.goTo({ phase: 'run', carrier: this.target, lag: CATCH_LAG_TIME });
    } else if (outcome === 'interception') {
      const idx = nearestIndex(this.target.pos, defenders);
      if (idx >= 0) s.defense[idx]!.flash(); // the defender who picked it off
      s.goTo({ phase: 'postPlay', result: { kind: 'interception' } });
    } else {
      s.goTo({ phase: 'postPlay', result: { kind: 'incomplete' } });
    }
  }
}
