import Phaser from 'phaser';
import {
  BALL_ARC_BASE, BALL_ARC_MAX, BALL_ARC_PER_PX, BALL_ARRIVE_RADIUS, CATCH_LAG_TIME, CATCH_TUNING,
  LOOSE_BALL_INTERCEPT_CHANCE, LOOSE_BALL_INTERCEPT_RADIUS,
} from '../../config/gameplay';
import { distance, nearestIndex, stepToward } from '../../core/math/vec2';
import { resolveCatch } from '../../core/resolvers/catch';
import { ballSpeedFor, catchReach, missNote } from '../../core/resolvers/throw';
import type { Vec2 } from '../../types';
import { updatePassDefense } from '../defenseBehavior';
import type { PlayerSprite } from '../entities/PlayerSprite';
import type { PlaySession } from '../PlaySession';
import type { Phase } from './Phase';

/**
 * The ball flies in a straight line to a FIXED landing point (marked with an X). It does not
 * home in on anyone: where it lands was decided at release (aim + the QB's throwing error).
 * On arrival:
 *   1. A receiver within his own catch reach of the landing point (reach grows with his Catching
 *      stat) adjusts to it and gets the normal contested-catch roll.
 *   2. Otherwise a defender close to the landing point may pick it off or bat it down.
 *   3. Otherwise it's incomplete, and the note says what the ball actually did
 *      (Overthrown! / Short! / Wide!), judged from where it landed relative to the intended receiver.
 */
export class BallInAirPhase implements Phase {
  private elapsed = 0;
  /** Distance at release, used to map travel into flight progress (the 2.5D arc). */
  private startDist = 0;
  /** Where the QB released the ball (for describing a miss). */
  private releasePos: Vec2 = { x: 0, y: 0 };
  private marker: Phaser.GameObjects.Graphics | null = null;

  constructor(
    private readonly session: PlaySession,
    private readonly landing: Vec2,
    private readonly intended: PlayerSprite | null,
  ) {}

  enter(): void {
    const s = this.session;
    s.hud.setHint('');
    this.releasePos = { x: s.qb.x, y: s.qb.y };
    this.startDist = Math.max(1, distance(s.ball.pos, this.landing));
    // Longer throws arc higher (deeper throw = higher lob), capped for readability.
    s.ball.beginFlight(Math.min(BALL_ARC_MAX, BALL_ARC_BASE + this.startDist * BALL_ARC_PER_PX));

    // Show where the ball is going to land.
    const g = s.scene.add.graphics().setDepth(12);
    const p = this.landing;
    g.lineStyle(3, 0xfacc15, 0.9);
    g.lineBetween(p.x - 8, p.y - 8, p.x + 8, p.y + 8);
    g.lineBetween(p.x - 8, p.y + 8, p.x + 8, p.y - 8);
    this.marker = g;
  }

  update(dt: number): void {
    const s = this.session;
    this.elapsed += dt;
    s.receivers.forEach((receiver) => receiver.followRoute(dt));

    const next = stepToward(s.ball.pos, this.landing, ballSpeedFor(s.qb.internal.throwPower) * dt);
    s.ball.place(next.x, next.y);
    // Flight progress: 0 at release, 1 on arrival; drives the drawn arc + scale.
    s.ball.setFlight(1 - distance(next, this.landing) / this.startDist);
    updatePassDefense(s, this.elapsed, dt);

    if (distance(next, this.landing) <= BALL_ARRIVE_RADIUS) this.resolve();
  }

  exit(): void {
    this.marker?.destroy();
    this.marker = null;
  }

  /** The receiver best placed to reach the ball: inside his own reach, closest relative to it. */
  private receiverWhoCanReach(): PlayerSprite | null {
    let best: PlayerSprite | null = null;
    let bestRatio = Infinity;
    for (const receiver of this.session.receivers) {
      const reach = catchReach(receiver.internal.catching);
      const ratio = distance(this.landing, receiver.pos) / reach;
      if (ratio <= 1 && ratio < bestRatio) {
        bestRatio = ratio;
        best = receiver;
      }
    }
    return best;
  }

  private resolve(): void {
    const s = this.session;
    const defenders = s.defense.map((d) => d.pos);

    const receiver = this.receiverWhoCanReach();
    if (receiver) {
      const outcome = resolveCatch(defenders.map((d) => distance(receiver.pos, d)), CATCH_TUNING, receiver.internal.catching);
      if (outcome === 'catch') {
        receiver.hop(); // the receiver jumps for the ball
        // The receiver breaks stride after the catch: defenders get a window to close.
        s.goTo({ phase: 'run', carrier: receiver, lag: CATCH_LAG_TIME });
      } else if (outcome === 'interception') {
        const idx = nearestIndex(receiver.pos, defenders);
        if (idx >= 0) s.defense[idx]!.flash(); // the defender who picked it off
        s.goTo({ phase: 'postPlay', result: { kind: 'interception' } });
      } else {
        s.goTo({ phase: 'postPlay', result: { kind: 'incomplete', note: 'Bobbled!' } });
      }
      return;
    }

    const dIdx = nearestIndex(this.landing, defenders);
    const defender = dIdx >= 0 ? s.defense[dIdx] : null;
    if (defender && distance(this.landing, defender.pos) <= LOOSE_BALL_INTERCEPT_RADIUS) {
      // A defender is on the ball: he can pick it off.
      if (Math.random() < LOOSE_BALL_INTERCEPT_CHANCE) {
        defender.flash();
        s.goTo({ phase: 'postPlay', result: { kind: 'interception' } });
        return;
      }
      s.goTo({ phase: 'postPlay', result: { kind: 'incomplete', note: 'Bat down!' } });
      return;
    }

    const note = this.intended
      ? missNote(this.releasePos, this.intended.pos, this.landing)
      : 'No receiver there!';
    s.goTo({ phase: 'postPlay', result: { kind: 'incomplete', note } });
  }
}
