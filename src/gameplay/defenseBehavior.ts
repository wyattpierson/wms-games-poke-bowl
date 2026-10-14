import {
  BALL_CHASE_SPEED_FACTOR, BLOCKED_SPEED_FACTOR, BLOCK_RADIUS, COVER_CUSHION_PX, COVER_SPEED_FACTOR,
  PASS_RUSH_SPEED_FACTOR, PURSUIT_SPEED_FACTOR,
} from '../config/gameplay';
import { blockedSpeedFactor, type Blocker } from '../core/ai/defenseAI';
import type { Vec2 } from '../types';
import type { PlayerSprite } from './entities/PlayerSprite';
import type { PlaySession } from './PlaySession';

function chase(defender: PlayerSprite, target: Vec2, speedFactor: number, dt: number): void {
  defender.moveToward(target, defender.baseSpeed * speedFactor, dt);
}

/** An OL's block, with reach scaled by their internal blocking stat. */
function blocker(p: PlayerSprite): Blocker {
  return { pos: p.pos, radius: BLOCK_RADIUS * (0.6 + 0.8 * p.internal.blocking / 99) };
}

function offensiveLine(session: PlaySession): Blocker[] {
  return session.offense.filter((p) => p.position === 'OL').map(blocker);
}

/** How quickly a defender's blitz comes: higher awareness = earlier pressure. */
function blitzDelay(role: { delay: number }, awareness: number): number {
  return role.delay * (1.35 - 0.7 * awareness / 99);
}

/** How far ahead of the receiver a cover defender pads up: higher awareness = tighter. */
function coverCushion(awareness: number): number {
  return COVER_CUSHION_PX * (0.6 + 0.8 * awareness / 99);
}

/** Before the throw (and while the ball is in the air): linemen rush, blitzers wait then rush,
 *  others cover their assigned receiver. */
export function updatePassDefense(session: PlaySession, elapsed: number, dt: number): void {
  const qbPos = session.qb.pos;
  const blockers = offensiveLine(session);

  for (const defender of session.defense) {
    const role = defender.role;
    if (!role) continue;
    switch (role.kind) {
      case 'rush': {
        const blocked = blockedSpeedFactor(defender.pos, blockers, BLOCKED_SPEED_FACTOR);
        chase(defender, qbPos, PASS_RUSH_SPEED_FACTOR * blocked, dt);
        break;
      }
      case 'blitz':
        if (elapsed >= blitzDelay(role, defender.internal.awareness)) chase(defender, qbPos, PASS_RUSH_SPEED_FACTOR, dt);
        break;
      case 'cover': {
        const receiver = session.receivers[role.receiverSlot];
        if (receiver) {
          const cushion = coverCushion(defender.internal.awareness);
          chase(defender, { x: receiver.x + cushion, y: receiver.y }, COVER_SPEED_FACTOR, dt);
        }
        break;
      }
    }
  }
}

/** Ball is in the air: everyone breaks on it. (Kept for possible future use; the ball-in-air
 *  phase currently holds coverage instead.) */
export function updateBallDefense(session: PlaySession, ballPos: Vec2, dt: number): void {
  for (const defender of session.defense) chase(defender, ballPos, BALL_CHASE_SPEED_FACTOR, dt);
}

/** Someone has the ball and is running: everyone pursues; the DL get blocked by the OL. */
export function updatePursuit(session: PlaySession, carrierPos: Vec2, dt: number): void {
  const blockers = offensiveLine(session);
  for (const defender of session.defense) {
    let factor = PURSUIT_SPEED_FACTOR;
    if (defender.position === 'DL') factor *= blockedSpeedFactor(defender.pos, blockers, BLOCKED_SPEED_FACTOR);
    chase(defender, carrierPos, factor, dt);
  }
}
