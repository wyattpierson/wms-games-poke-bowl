import Phaser from 'phaser';
import { DRIVE_START_YARD, FIELD_CENTER_Y, GAME_HEIGHT, WORLD_WIDTH } from '../config/field';
import {
  CAMERA_ZOOM, FIELD_GOAL_POINTS, HALVES, HALF_SECONDS, TOUCHDOWN_POINTS,
} from '../config/gameplay';
import { TEAM_COLORS } from '../config/gameplay';
import {
  formatClock, halfLabel, isHalfOver, newMatchClock, tickClock, type MatchClock,
} from '../core/rules/clock';
import { addPoints, newScore, type Score } from '../core/rules/score';
import { newDrive, resolvePlay as resolveDowns } from '../core/rules/downs';
import type { SimResult } from '../core/simulation';
import type { Team } from '../core/teams';
import type { DownState, Play, PlayResult } from '../types';
import type { Hud } from '../ui/Hud';
import type { Controls } from './controls/Controls';
import { Ball } from './entities/Ball';
import type { Field } from './entities/Field';
import { PlayerSprite } from './entities/PlayerSprite';
import { BallInAirPhase } from './phases/BallInAirPhase';
import type { Phase, PhaseRequest } from './phases/Phase';
import { HalfEndPhase } from './phases/HalfEndPhase';
import { MatchOverPhase } from './phases/MatchOverPhase';
import { PassPhase } from './phases/PassPhase';
import { PostPlayPhase } from './phases/PostPlayPhase';
import { PreSnapPhase } from './phases/PreSnapPhase';
import { RunPhase } from './phases/RunPhase';
import { SimDrivePhase } from './phases/SimDrivePhase';
import { yardsToX } from './units';

/** What happens after a play: keep the ball, give it up, or end the half/match. */
export interface PlayResolution {
  message: string;
  next:
    | { kind: 'continue' }
    | { kind: 'switchPossession' }
    | { kind: 'halfEnd' }
    | { kind: 'matchEnd' };
}

/**
 * Owns everything on the field (players, ball, downs, score, clock) and runs the phase state
 * machine. The user plays offense only; the defense is always AI, and opponent possessions
 * are simulated.
 *
 *   preSnap -> pass -> (ballInAir ->) run -> postPlay -> (preSnap | simDrive | halfEnd | matchOver)
 *   simDrive -> preSnap | halfEnd | matchOver
 *   halfEnd -> preSnap
 */
export class PlaySession {
  readonly offense: PlayerSprite[] = [];
  readonly defense: PlayerSprite[] = [];
  /** Eligible receivers, indexed by their throw slot (0, 1, 2). */
  readonly receivers: PlayerSprite[] = [];
  readonly ball: Ball;
  down: DownState = newDrive(DRIVE_START_YARD);
  clock: MatchClock = newMatchClock(HALVES, HALF_SECONDS);
  score: Score = newScore();
  matchOver = false;
  /** Set when a postPlay phase is requested; consumed by PostPlayPhase. */
  resolution: PlayResolution | null = null;

  private phase: Phase | null = null;
  private lastMatchLine = '';
  /** Invisible ground-level camera target (the ball's drawn position lifts during flight). */
  private readonly camTarget: Phaser.GameObjects.Container;

  constructor(
    readonly scene: Phaser.Scene,
    readonly play: Play,
    private readonly field: Field,
    readonly controls: Controls,
    readonly hud: Hud,
    readonly userTeam: Team,
    readonly opponent: Team,
  ) {
    for (const slot of play.offense) {
      const player = new PlayerSprite(scene, 'offense', slot.position, slot.pokemon, TEAM_COLORS.offense);
      if (slot.receiverSlot !== undefined) {
        player.receiverSlot = slot.receiverSlot;
        this.receivers[slot.receiverSlot] = player;
      }
      this.offense.push(player);
    }
    for (const slot of play.defense) {
      const player = new PlayerSprite(scene, 'defense', slot.position, slot.pokemon, TEAM_COLORS.defense);
      player.role = slot.role;
      this.defense.push(player);
    }

    this.ball = new Ball(scene);
    this.camTarget = scene.add.container(0, 0);
    // Camera shows more of the field ahead (to the right) of the action, zoomed in a bit.
    scene.cameras.main
      .setZoom(CAMERA_ZOOM)
      .setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT)
      .startFollow(this.camTarget, true, 0.08, 0.08, -200, 0);
  }

  get qb(): PlayerSprite {
    const qb = this.offense.find((p) => p.position === 'QB');
    if (!qb) throw new Error('Play has no QB');
    return qb;
  }

  get rb(): PlayerSprite {
    const rb = this.offense.find((p) => p.position === 'RB');
    if (!rb) throw new Error('Play has no RB');
    return rb;
  }

  /** Put everyone in formation at the current line of scrimmage and reset per-play state. */
  lineUp(): void {
    const losX = yardsToX(this.down.lineOfScrimmage);

    this.play.offense.forEach((slot, i) => {
      const player = this.offense[i]!;
      const x = losX + slot.offset.x;
      const y = FIELD_CENTER_Y + slot.offset.y;
      player.place(x, y);
      player.setGhost(false);
      player.setRoute((slot.route ?? []).map((r) => ({ x: x + r.x, y: y + r.y })));
    });
    this.play.defense.forEach((slot, i) => {
      this.defense[i]!.place(losX + slot.offset.x, FIELD_CENTER_Y + slot.offset.y);
    });

    this.ball.attachTo(this.qb);
    this.field.setMarkers(this.down);
    this.hud.setDown(this.down);
  }

  /** The user gets a fresh drive at the own 25 (prototype: all possessions start here). */
  startUserDrive(): void {
    this.down = newDrive(DRIVE_START_YARD);
  }

  /** Apply a simulated opponent drive: score, clock, and the on-screen message. */
  applySimDrive(sim: SimResult): void {
    this.clock = tickClock(this.clock, sim.seconds);
    let message: string;
    switch (sim.outcome) {
      case 'touchdown':
        this.score = addPoints(this.score, 'opponent', TOUCHDOWN_POINTS);
        message = `${this.opponent.name} scores! TOUCHDOWN`;
        break;
      case 'fieldGoal':
        this.score = addPoints(this.score, 'opponent', FIELD_GOAL_POINTS);
        message = `${this.opponent.name} drills a field goal`;
        break;
      case 'punt':
        message = `${this.opponent.name} punts the ball back`;
        break;
      case 'turnover':
        message = `${this.opponent.name} gives the ball up!`;
        break;
    }
    this.hud.setMessage(message);
  }

  goTo(request: PhaseRequest): void {
    if (request.phase === 'postPlay') this.resolution = this.resolvePlay(request.result);
    this.phase?.exit?.();
    this.phase = this.createPhase(request);
    this.phase.enter();
  }

  update(dt: number): void {
    // The clock only runs while the ball is live.
    if (this.phase instanceof PassPhase || this.phase instanceof BallInAirPhase || this.phase instanceof RunPhase) {
      this.clock = tickClock(this.clock, dt);
    }
    this.updateMatchLine();
    // Keep the camera target on the ball's GROUND position (not the flight offset).
    this.camTarget.setPosition(this.ball.pos.x, this.ball.pos.y);
    // Per-frame cosmetic animation (walk-bob) for every player on the field.
    for (const p of [...this.offense, ...this.defense]) p.update(dt);
    this.phase?.update(dt);
  }

  private createPhase(request: PhaseRequest): Phase {
    switch (request.phase) {
      case 'preSnap': return new PreSnapPhase(this);
      case 'pass': return new PassPhase(this);
      case 'ballInAir': return new BallInAirPhase(this, request.target);
      case 'run': return new RunPhase(this, request.carrier, request.lag ?? 0);
      case 'postPlay': return new PostPlayPhase(this);
      case 'simDrive': return new SimDrivePhase(this);
      case 'halfEnd': return new HalfEndPhase(this);
      case 'matchOver': return new MatchOverPhase(this);
    }
  }

  /**
   * Decide the consequence of a finished play: apply score/downs, and pick the next step.
   * If the clock hit zero during the play, the half (or match) ends regardless of outcome.
   */
  private resolvePlay(result: PlayResult): PlayResolution {
    const clockOut = isHalfOver(this.clock);
    const endKind = this.clock.half >= HALVES ? ({ kind: 'matchEnd' } as const) : ({ kind: 'halfEnd' } as const);
    const endSuffix = clockOut ? (this.clock.half >= HALVES ? '\nEnd of match' : '\nEnd of 1st half') : '';

    switch (result.kind) {
      case 'incomplete': {
        if (clockOut) return { message: `Incomplete pass${endSuffix}`, next: endKind };
        const res = resolveDowns(this.down, this.down.lineOfScrimmage);
        switch (res.kind) {
          case 'turnoverOnDowns':
            return { message: 'Turnover on downs.', next: { kind: 'switchPossession' } };
          case 'touchdown':
            throw new Error('unreachable: an incomplete play cannot gain a touchdown');
          case 'firstDown':
          case 'continue':
            this.down = res.state;
            return { message: 'Incomplete pass', next: { kind: 'continue' } };
        }
      }
      case 'interception':
        if (clockOut) return { message: `Intercepted!${endSuffix}`, next: endKind };
        return { message: 'INTERCEPTED!', next: { kind: 'switchPossession' } };
      case 'gain': {
        const yards = Math.round(result.endYard - this.down.lineOfScrimmage);
        const note = `${result.note} (${yards >= 0 ? '+' : ''}${yards} yds)`;
        const res = resolveDowns(this.down, result.endYard);
        if (res.kind === 'touchdown') {
          this.score = addPoints(this.score, 'user', TOUCHDOWN_POINTS);
          return { message: `${note}\nTOUCHDOWN! +${TOUCHDOWN_POINTS}`, next: { kind: 'switchPossession' } };
        }
        if (res.kind === 'firstDown' || res.kind === 'continue') this.down = res.state;
        if (clockOut) return { message: note + endSuffix, next: endKind };
        return {
          message: res.kind === 'firstDown' ? `${note}\nFirst down!` : note,
          next: { kind: 'continue' },
        };
      }
    }
  }

  /** Score + clock readout in the HUD, refreshed only when it visibly changes. */
  private updateMatchLine(): void {
    const text = `${this.userTeam.name} ${this.score.user}   ${formatClock(this.clock.secondsLeft)} ${halfLabel(this.clock)}   ${this.opponent.name} ${this.score.opponent}`;
    if (text !== this.lastMatchLine) {
      this.lastMatchLine = text;
      this.hud.setMatchLine(text);
    }
  }
}
