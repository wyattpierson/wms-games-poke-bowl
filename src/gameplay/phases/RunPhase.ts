import { FIELD_BOTTOM, FIELD_TOP, WORLD_WIDTH } from '../../config/field';
import {
  CATCH_LAG_SPEED, DIVE_DISTANCE, JUKE_COOLDOWN, JUKE_DURATION, JUKE_SPEED_FACTOR,
  SPRINT_MULTIPLIER, SPRINT_STAMINA_MULTIPLIER, STAMINA_DRAIN, STAMINA_MIN_FACTOR,
  TACKLE_ATTEMPT_COOLDOWN, TACKLE_RADIUS,
} from '../../config/gameplay';
import { distance, nearestIndex } from '../../core/math/vec2';
import { attemptTackle } from '../../core/resolvers/tackle';
import { GOAL_LINE_YARD } from '../../core/rules/downs';
import { updatePursuit } from '../defenseBehavior';
import type { PlayerSprite } from '../entities/PlayerSprite';
import type { PlaySession } from '../PlaySession';
import { xToYards } from '../units';
import type { Phase } from './Phase';

/** Player steers the ball carrier (a receiver after a catch, or the QB after a scramble) until the play ends. */
export class RunPhase implements Phase {
  private jukeTimer = 0;
  private jukeCooldown = 0;
  private tackleCooldown = 0;
  private stamina = 1;
  private lag: number;

  constructor(
    private readonly session: PlaySession,
    private readonly carrier: PlayerSprite,
    lag = 0, // seconds of post-catch slow-down (catch lag), 0 for handoffs/scrambles
  ) {
    this.lag = lag;
  }

  enter(): void {
    this.session.hud.setHint('WASD / arrows: move    SHIFT: sprint    SPACE: juke    E: dive');
  }

  update(dt: number): void {
    const s = this.session;
    const c = s.controls;
    const carrier = this.carrier;

    this.jukeTimer = Math.max(0, this.jukeTimer - dt);
    this.jukeCooldown = Math.max(0, this.jukeCooldown - dt);
    if (c.justPressed('juke') && this.jukeCooldown === 0) {
      this.jukeTimer = JUKE_DURATION;
      this.jukeCooldown = JUKE_COOLDOWN;
      carrier.spin(); // juke visual: quick 360°
    }
    const juking = this.jukeTimer > 0;
    carrier.setGhost(juking);

    // Stamina: carrying the ball is tiring, so defenders can catch up over time.
    const sprinting = c.sprint;
    this.lag = Math.max(0, this.lag - dt);
    this.stamina = Math.max(0, this.stamina - dt * STAMINA_DRAIN * (sprinting ? SPRINT_STAMINA_MULTIPLIER : 1));
    let speed = carrier.baseSpeed * (STAMINA_MIN_FACTOR + (1 - STAMINA_MIN_FACTOR) * this.stamina);
    if (sprinting) speed *= SPRINT_MULTIPLIER;
    if (juking) speed *= JUKE_SPEED_FACTOR;
    if (this.lag > 0) speed = Math.min(speed, carrier.baseSpeed * CATCH_LAG_SPEED);
    const move = c.move;
    const moving = move.x !== 0 || move.y !== 0;
    carrier.place(
      Math.min(Math.max(carrier.x + move.x * speed * dt, 0), WORLD_WIDTH),
      carrier.y + move.y * speed * dt,
    );
    carrier.update(dt, moving);
    s.ball.attachTo(carrier);
    updatePursuit(s, carrier.pos, dt);

    if (xToYards(carrier.x) >= GOAL_LINE_YARD) return this.end('Touchdown run!');
    if (carrier.y <= FIELD_TOP || carrier.y >= FIELD_BOTTOM) return this.end('Out of bounds');
    if (c.justPressed('dive')) {
      carrier.place(carrier.x + DIVE_DISTANCE, carrier.y);
      return this.end('Dive!');
    }
    if (!juking && this.tryTackle(dt)) return this.end('Tackled');
  }

  /**
   * One tackle attempt per cooldown: the closest defender rolls their tackling stat
   * against the carrier's avoidance. A juke window is un-tackleable (the skill expression);
   * avoidance makes attempts fail (the stat expression) — together they make running viable.
   */
  private tryTackle(dt: number): boolean {
    const s = this.session;
    this.tackleCooldown = Math.max(0, this.tackleCooldown - dt);
    if (this.tackleCooldown > 0) return false;

    const defenderPos = s.defense.map((d) => d.pos);
    const idx = nearestIndex(this.carrier.pos, defenderPos);
    if (idx < 0 || distance(this.carrier.pos, defenderPos[idx]!) > TACKLE_RADIUS) return false;

    this.tackleCooldown = TACKLE_ATTEMPT_COOLDOWN;
    const landed = attemptTackle(s.defense[idx]!.internal.tackling, this.carrier.internal.avoidance);
    if (landed) {
      this.carrier.flash(); // impact: white flash + spin
      this.carrier.spin();
      s.defense[idx]!.hop(); // the defender who made the play
    }
    return landed;
  }

  exit(): void {
    this.carrier.setGhost(false);
  }

  private end(note: string): void {
    this.session.goTo({ phase: 'postPlay', result: { kind: 'gain', endYard: xToYards(this.carrier.x), note } });
  }
}
