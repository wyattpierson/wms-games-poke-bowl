import Phaser from 'phaser';
import {
  DROPBACK_PX, RETICLE_LOCK_RADIUS, RETICLE_RADIUS, RETICLE_SPEED, SACK_ATTEMPT_COOLDOWN, SACK_RADIUS,
} from '../../config/gameplay';
import { FIELD_BOTTOM, FIELD_TOP, WORLD_WIDTH } from '../../config/field';
import { distance, nearestIndex } from '../../core/math/vec2';
import { attemptTackle } from '../../core/resolvers/tackle';
import { throwComesUp } from '../../core/resolvers/throw';
import type { Vec2 } from '../../types';
import { updatePassDefense } from '../defenseBehavior';
import type { PlayerSprite } from '../entities/PlayerSprite';
import type { PlaySession } from '../PlaySession';
import { xToYards } from '../units';
import type { Phase } from './Phase';

/**
 * QB drops back, receivers run routes, defense rushes/covers.
 * Throw: HOLD Space -> reticle appears at the QB -> WASD/arrows steer it -> release Space
 * to throw at the receiver nearest the reticle (within RETICLE_LOCK_RADIUS; falls back
 * to the nearest receiver overall). R: scramble.
 */
export class PassPhase implements Phase {
  private elapsed = 0;
  private aiming = false;
  private sackCooldown = 0;
  private readonly dropbackTarget: Vec2;
  private readonly reticle: Phaser.GameObjects.Graphics;
  private readonly reticlePos: Vec2;

  constructor(private readonly session: PlaySession) {
    this.dropbackTarget = { x: session.qb.x - DROPBACK_PX, y: session.qb.y };
    this.reticle = session.scene.add.graphics().setDepth(30);
    this.reticlePos = { x: session.qb.x, y: session.qb.y };
  }

  enter(): void {
    this.session.hud.setHint('HOLD SPACE: aim (WASD/arrows) - release to throw    R: scramble');
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

  /** Manage the reticle lifecycle: appears while Space is held, throws on release. */
  private updateAim(dt: number): void {
    const s = this.session;

    if (!this.aiming && s.controls.isHeld('aim')) {
      this.aiming = true;
      this.reticlePos.x = s.qb.x;
      this.reticlePos.y = s.qb.y;
    }
    if (!this.aiming) {
      this.reticle.clear();
      return;
    }

    // Release = throw at whatever the reticle is closest to.
    if (s.controls.justReleased('aim')) {
      this.aiming = false;
      this.reticle.clear();
      this.throwAt(this.reticlePos);
      return;
    }

    const move = s.controls.move;
    this.reticlePos.x = Math.min(Math.max(this.reticlePos.x + move.x * RETICLE_SPEED * dt, 0), WORLD_WIDTH);
    this.reticlePos.y = Math.min(Math.max(this.reticlePos.y + move.y * RETICLE_SPEED * dt, FIELD_TOP), FIELD_BOTTOM);
    this.drawReticle(this.pickTarget(this.reticlePos));
  }

  private pickTarget(p: Vec2): PlayerSprite | null {
    let bestLocked: PlayerSprite | null = null;
    let bestLockedD = Infinity;
    let bestOverall: PlayerSprite | null = null;
    let bestOverallD = Infinity;
    for (const receiver of this.session.receivers) {
      const d = distance(p, receiver.pos);
      if (d < bestLockedD) { bestLockedD = d; bestLocked = receiver; }
      if (d < bestOverallD) { bestOverallD = d; bestOverall = receiver; }
    }
    return bestLockedD <= RETICLE_LOCK_RADIUS ? bestLocked : bestOverall;
  }

  private drawReticle(target: PlayerSprite | null): void {
    const r = this.reticle;
    r.clear();
    r.lineStyle(3, 0xfacc15, 1);
    r.strokeCircle(this.reticlePos.x, this.reticlePos.y, RETICLE_RADIUS);
    r.fillStyle(0xfacc15, 1);
    r.fillCircle(this.reticlePos.x, this.reticlePos.y, 3);
    if (target) {
      r.lineStyle(2, 0xffffff, 0.8);
      r.strokeCircle(target.x, target.y, 24);
    }
  }

  private throwAt(p: Vec2): void {
    const target = this.pickTarget(p);
    if (!target) return;
    // Low throwAccuracy can overthrow the receiver: the ball sails past for an incomplete.
    if (!throwComesUp(this.session.qb.internal.throwAccuracy)) {
      this.session.goTo({ phase: 'postPlay', result: { kind: 'incomplete' } });
      return;
    }
    this.session.goTo({ phase: 'ballInAir', target });
  }
}
