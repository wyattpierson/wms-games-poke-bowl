import Phaser from 'phaser';
import {
  AIM_ASSIST_MAX, CATCH_TUNING, DROPBACK_PX, OPEN_RADIUS, PRESSURE_RADIUS, RETICLE_LOCK_RADIUS, RETICLE_SPEED,
  SACK_ATTEMPT_COOLDOWN, SACK_RADIUS, SNAP_HOLD_GRACE,
} from '../../config/gameplay';
import { FIELD_BOTTOM, FIELD_TOP, WORLD_WIDTH } from '../../config/field';
import { clamp, distance, nearestDistance, nearestIndex } from '../../core/math/vec2';
import { catchOdds } from '../../core/resolvers/catch';
import { attemptTackle } from '../../core/resolvers/tackle';
import {
  aimAssist, ballSpeedFor, catchReach, chanceWithinReach, landingSigma, ringRadius, solveIntercept, throwError,
} from '../../core/resolvers/throw';
import { FONT } from '../../ui/theme';
import type { Vec2 } from '../../types';
import { updatePassDefense } from '../defenseBehavior';
import type { PlayerSprite } from '../entities/PlayerSprite';
import type { PlaySession } from '../PlaySession';
import { xToYards } from '../units';
import type { Phase } from './Phase';

/**
 * QB drops back, receivers run routes, defense rushes/covers (man or zone).
 *
 * Throw: HOLD Space -> reticle appears on your best look downfield -> WASD/arrows steer it ->
 * release Space to throw. X cancels (no throw, no down lost). R scrambles.
 *
 * The ball flies to a fixed landing point = aim point + the QB's throwing error, and the
 * reticle RING is that error: about 2 of 3 throws land inside it. A weak QB has a fat ring,
 * an elite one a tight ring; deep throws and a rusher in your face widen it.
 *
 * Near a receiver's MEETING POINT (where he and the ball will be at the same time) the aim is
 * pulled toward it (aim assist) and the reticle locks on: green/amber/red text is the real
 * completion chance (landing within his reach x the catch roll against nearby defenders). The thin
 * outer ring is that receiver's reach: a ball landing inside it can be caught, so good hands
 * rescue an inaccurate QB. Reticle on open field = a spot throw (gray).
 *
 * Tapping Space just to snap does NOT throw: a release within SNAP_HOLD_GRACE of the snap
 * is the snap's own key-up. Keep holding past that and you're aiming.
 */
const LOCK_COLOR_GOOD = 0x22c55e;
const LOCK_COLOR_OK = 0xf59e0b;
const LOCK_COLOR_BAD = 0xef4444;
const SPOT_COLOR = 0x9ca3af;
const GOOD_ODDS = 0.7;
const OK_ODDS = 0.45;

interface Lock {
  receiver: PlayerSprite;
  /** Where the receiver and the ball would meet if thrown right now. */
  meet: Vec2;
}

interface Aim {
  /** Where the throw is aimed (after aim assist). */
  point: Vec2;
  lock: Lock | null;
  /** Std-dev of the landing error for a throw at `point`. */
  sigma: number;
}

export class PassPhase implements Phase {
  private elapsed = 0;
  private aiming = false;
  private sackCooldown = 0;
  /** Space was already down when the ball was snapped: wait to see if it's a tap or a deliberate hold. */
  private snapHoldPending: boolean;
  private snapHoldTime = 0;
  /** Aim was cancelled (X) while Space is still down: ignore Space until it's released. */
  private cancelLatch = false;
  private readonly dropbackTarget: Vec2;
  private readonly reticle: Phaser.GameObjects.Graphics;
  private readonly aimText: Phaser.GameObjects.Text;
  /** The raw cursor you steer (aim assist is applied on top of it). */
  private readonly cursor: Vec2;

  constructor(private readonly session: PlaySession) {
    this.dropbackTarget = { x: session.qb.x - DROPBACK_PX, y: session.qb.y };
    this.reticle = session.scene.add.graphics().setDepth(30);
    this.aimText = session.scene
      .add.text(0, 0, '', { fontFamily: FONT, fontSize: '10px', color: '#ffffff' })
      .setOrigin(0.5)
      .setDepth(31)
      .setVisible(false);
    this.cursor = { x: session.qb.x, y: session.qb.y };
    this.snapHoldPending = session.controls.isHeld('aim');
  }

  enter(): void {
    this.session.hud.setHint('HOLD SPACE: aim (starts on your best look) - release to throw    X: cancel    R: scramble');
  }

  update(dt: number): void {
    const s = this.session;
    this.elapsed += dt;

    s.qb.moveToward(this.dropbackTarget, s.qb.baseSpeed, dt);
    s.receivers.forEach((receiver) => receiver.followRoute(dt));
    updatePassDefense(s, this.elapsed, dt);
    s.ball.attachTo(s.qb);

    this.updateAim(dt);

    if (this.trySack(dt)) return;
    if (s.controls.justPressed('scramble')) {
      s.goTo({ phase: 'run', carrier: s.qb });
    }
  }

  exit(): void {
    this.reticle.destroy();
    this.aimText.destroy();
  }

  /** One sack attempt per cooldown: the closest defender rolls tackling vs. the QB's avoidance. */
  private trySack(dt: number): boolean {
    const s = this.session;
    this.sackCooldown = Math.max(0, this.sackCooldown - dt);
    if (this.sackCooldown > 0) return false;

    const defenderPos = s.defense.map((d) => d.pos);
    const idx = nearestIndex(s.qb.pos, defenderPos);
    if (idx < 0 || distance(s.qb.pos, defenderPos[idx]!) > SACK_RADIUS) return false;

    this.sackCooldown = SACK_ATTEMPT_COOLDOWN;
    if (attemptTackle(s.defense[idx]!.internal.tackling, s.qb.internal.avoidance)) {
      s.qb.flash(); // impact: white flash + spin
      s.qb.spin();
      s.defense[idx]!.hop(); // the defender who got the sack
      s.goTo({ phase: 'postPlay', result: { kind: 'gain', endYard: xToYards(s.qb.x), note: 'Sacked!' } });
      return true;
    }
    return false;
  }

  private hideAim(): void {
    this.reticle.clear();
    this.aimText.setVisible(false);
  }

  /** Manage the reticle lifecycle: appears while Space is held, throws on release, X cancels. */
  private updateAim(dt: number): void {
    const s = this.session;
    const held = s.controls.isHeld('aim');

    // Space was down at the snap: a quick release is just the snap's key-up (not a throw);
    // still down after the grace period means "I'm aiming".
    if (this.snapHoldPending) {
      this.snapHoldTime += dt;
      if (!held) { this.snapHoldPending = false; this.hideAim(); return; } // it was a tap
      if (this.snapHoldTime < SNAP_HOLD_GRACE) { this.hideAim(); return; }
      this.snapHoldPending = false; // still holding: a deliberate aim
    }

    if (this.cancelLatch) {
      if (!held) this.cancelLatch = false;
      this.hideAim();
      return;
    }

    if (!this.aiming && held) {
      this.aiming = true;
      const start = this.bestLook();
      this.cursor.x = start.x;
      this.cursor.y = start.y;
    }
    if (!this.aiming) {
      this.hideAim();
      return;
    }

    if (s.controls.justPressed('cancel')) {
      this.aiming = false;
      this.cancelLatch = held;
      this.hideAim();
      return;
    }

    // Release = throw.
    if (s.controls.justReleased('aim')) {
      this.aiming = false;
      this.hideAim();
      this.throwBall();
      return;
    }

    const move = s.controls.move;
    this.cursor.x = clamp(this.cursor.x + move.x * RETICLE_SPEED * dt, 0, WORLD_WIDTH);
    this.cursor.y = clamp(this.cursor.y + move.y * RETICLE_SPEED * dt, FIELD_TOP, FIELD_BOTTOM);
    this.drawReticle(this.currentAim());
  }

  /** Where a ball thrown right now would meet `receiver` (accounts for the ball's flight time). */
  private meetingPoint(receiver: PlayerSprite): Vec2 {
    const qb = this.session.qb;
    return solveIntercept(qb.pos, receiver.pos, (t) => receiver.predictPosition(t), ballSpeedFor(qb.internal.throwPower));
  }

  /**
   * Where the reticle starts: the deepest receiver with a clear window, else the least-covered one.
   * (Starting on a receiver, not at the QB's feet, means a quick press is a real throw, not a wasted down.)
   */
  private bestLook(): Vec2 {
    const s = this.session;
    const defenderPos = s.defense.map((d) => d.pos);
    const looks = s.receivers.map((r) => ({ meet: this.meetingPoint(r), gap: nearestDistance(r.pos, defenderPos) }));
    if (looks.length === 0) return { x: s.qb.x, y: s.qb.y };
    const open = looks.filter((l) => l.gap > OPEN_RADIUS);
    const best = open.length > 0
      ? open.reduce((a, b) => (b.meet.x > a.meet.x ? b : a))
      : looks.reduce((a, b) => (b.gap > a.gap ? b : a));
    return { x: best.meet.x, y: best.meet.y };
  }

  /** Resolve the cursor into an aim point (with assist), the locked receiver, and the landing spread. */
  private currentAim(): Aim {
    const s = this.session;
    let lock: Lock | null = null;
    let bestGap = Infinity;
    for (const receiver of s.receivers) {
      const meet = this.meetingPoint(receiver);
      const gap = distance(this.cursor, meet);
      if (gap < bestGap) { bestGap = gap; lock = { receiver, meet }; }
    }
    if (bestGap > RETICLE_LOCK_RADIUS) lock = null;

    const point = lock ? aimAssist(this.cursor, lock.meet, RETICLE_LOCK_RADIUS, AIM_ASSIST_MAX) : { ...this.cursor };
    const rusher = nearestDistance(s.qb.pos, s.defense.map((d) => d.pos));
    const pressure = 1 - clamp(rusher / PRESSURE_RADIUS, 0, 1);
    const sigma = landingSigma(s.qb.internal.throwAccuracy, distance(s.qb.pos, point), pressure);
    return { point, lock, sigma };
  }

  /** The real completion chance for this aim: lands within his reach, then wins the catch roll. */
  private completionOdds(aim: Aim & { lock: Lock }): number {
    const { receiver, meet } = aim.lock;
    const reach = catchReach(receiver.internal.catching);
    const lands = chanceWithinReach({ x: aim.point.x - meet.x, y: aim.point.y - meet.y }, aim.sigma, reach);
    const defenderDistances = this.session.defense.map((d) => distance(meet, d.pos));
    return lands * catchOdds(defenderDistances, CATCH_TUNING, receiver.internal.catching).catch;
  }

  private drawReticle(aim: Aim): void {
    const r = this.reticle;
    const qb = this.session.qb;
    const ring = ringRadius(aim.sigma);
    r.clear();

    let color = SPOT_COLOR;
    let label = 'SPOT';
    if (aim.lock) {
      const odds = this.completionOdds({ ...aim, lock: aim.lock });
      color = odds >= GOOD_ODDS ? LOCK_COLOR_GOOD : odds >= OK_ODDS ? LOCK_COLOR_OK : LOCK_COLOR_BAD;
      label = `${Math.round(odds * 100)}%`;
    }

    // Faint line from the QB to the aim point: this is where the ball is headed.
    r.lineStyle(1, color, 0.35);
    r.lineBetween(qb.x, qb.y, aim.point.x, aim.point.y);

    // The ring = the QB's spread at this distance. Bigger ring = less accurate throw.
    r.lineStyle(3, color, 1);
    r.strokeCircle(aim.point.x, aim.point.y, ring);
    r.fillStyle(color, 1);
    r.fillCircle(aim.point.x, aim.point.y, 3);

    if (aim.lock) {
      const { receiver, meet } = aim.lock;
      // Ring on the receiver where he is NOW, arrow to where he's GOING (the meeting point)...
      r.lineStyle(2, color, 0.9);
      r.strokeCircle(receiver.x, receiver.y, 26);
      r.lineStyle(2, color, 0.6);
      r.lineBetween(receiver.x, receiver.y, meet.x, meet.y);
      // ...and his reach around the meeting point: a ball landing in here can be caught.
      r.lineStyle(1.5, color, 0.5);
      r.strokeCircle(meet.x, meet.y, catchReach(receiver.internal.catching));
    }

    // Faint hollow dot where your cursor really is while the assist is pulling the aim away from it.
    if (distance(this.cursor, aim.point) > 3) {
      r.lineStyle(1, 0xffffff, 0.5);
      r.strokeCircle(this.cursor.x, this.cursor.y, 4);
    }

    this.aimText.setVisible(true);
    this.aimText.setPosition(aim.point.x, aim.point.y - ring - 12);
    this.aimText.setText(label);
    this.aimText.setColor(`#${color.toString(16).padStart(6, '0')}`);
  }

  /** Release: roll the throwing error ONCE, then the ball flies to that fixed point. */
  private throwBall(): void {
    const aim = this.currentAim();
    const error = throwError(aim.sigma);
    const landing: Vec2 = {
      x: clamp(aim.point.x + error.x, 0, WORLD_WIDTH),
      y: clamp(aim.point.y + error.y, FIELD_TOP, FIELD_BOTTOM),
    };
    this.session.goTo({ phase: 'ballInAir', landing, intended: aim.lock?.receiver ?? null });
  }
}
