import {
  BALL_CHASE_SPEED_FACTOR, BEATEN_COVER_SPEED_FACTOR, BLOCKED_SPEED_FACTOR, BLOCK_RADIUS, COVER_CUSHION_PX,
  COVER_SPEED_FACTOR, PASS_RUSH_SPEED_FACTOR, PURSUIT_SPEED_FACTOR, ZONE_CUSHION_PX, ZONE_RESPONSE_RADIUS,
} from '../config/gameplay';
import { distance, nearestIndex } from '../core/math/vec2';
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

/** How far ahead of the receiver a winning man defender pads up: higher awareness = tighter. */
function coverCushion(awareness: number): number {
  return COVER_CUSHION_PX * (0.6 + 0.8 * awareness / 99);
}

/**
 * Man coverage: stick to the assigned receiver. When the receiver beat the matchup
 * (rolled at the snap) the defender chases slow and the separation grows — the WR gets
 * open. Otherwise the defender stays glued, cushion in front, and the catch is contested.
 */
function updateManCoverage(session: PlaySession, defender: PlayerSprite, slot: number, dt: number): void {
  const receiver = session.receivers[slot];
  if (!receiver) return;
  const beaten = session.coverage.beaten[slot];
  const speed = beaten ? COVER_SPEED_FACTOR * BEATEN_COVER_SPEED_FACTOR : COVER_SPEED_FACTOR;
  const cushion = beaten ? 0 : coverCushion(defender.internal.awareness);
  chase(defender, { x: receiver.x + cushion, y: receiver.y }, speed, dt);
}

/**
 * Zone coverage: hold the home area. A receiver inside the response radius gets chased
 * (small cushion); otherwise the defender walks back to his zone. Running into a part of
 * the field no defender covers is how a WR gets open against zone.
 */
function updateZoneCoverage(session: PlaySession, defender: PlayerSprite, dt: number): void {
  const home = defender.zoneHome ?? defender.pos;
  const receiverPos = session.receivers.map((r) => r.pos);
  const idx = nearestIndex(defender.pos, receiverPos);
  const receiver = idx >= 0 ? receiverPos[idx]! : null;
  if (receiver && distance(defender.pos, receiver) <= ZONE_RESPONSE_RADIUS) {
    // Close from behind (cushion along the defender->receiver line) so the ball is played over his head.
    const dx = defender.x - receiver.x;
    const dy = defender.y - receiver.y;
    const d = Math.max(0.001, Math.hypot(dx, dy));
    chase(defender, { x: receiver.x + (dx / d) * ZONE_CUSHION_PX, y: receiver.y + (dy / d) * ZONE_CUSHION_PX }, COVER_SPEED_FACTOR, dt);
  } else {
    chase(defender, home, COVER_SPEED_FACTOR, dt);
  }
}

/** Before the throw (and while the ball is in the air): linemen rush, blitzers wait then rush
 *  (man only — in zone everyone drops back), others cover. The scheme is rolled per play. */
export function updatePassDefense(session: PlaySession, elapsed: number, dt: number): void {
  const qbPos = session.qb.pos;
  const blockers = offensiveLine(session);
  const zone = session.coverage.scheme === 'zone';

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
        if (zone) updateZoneCoverage(session, defender, dt); // zone: the blitzers drop back
        else if (elapsed >= blitzDelay(role, defender.internal.awareness)) chase(defender, qbPos, PASS_RUSH_SPEED_FACTOR, dt);
        break;
      case 'cover':
        if (zone) updateZoneCoverage(session, defender, dt);
        else updateManCoverage(session, defender, role.receiverSlot, dt);
        break;
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
