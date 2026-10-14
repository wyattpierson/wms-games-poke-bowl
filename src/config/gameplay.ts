/**
 * Tuning knobs for game feel. Speeds are pixels/second, distances are pixels, times are seconds.
 * This is the first file to touch when something feels too fast, too easy, or too slow.
 * (Player movement speed comes from each Pokémon's Speed stat; see core/pokemon.ts.)
 */
import type { CatchTuning } from '../core/resolvers/catch';
import type { Side } from '../types';

export const TEAM_COLORS: Record<Side, number> = { offense: 0x3b82f6, defense: 0xef4444 };
export const PLAYER_SIZE = 28; // fallback square size when a sprite is missing
export const PLAYER_IMAGE_SIZE = 46; // on-screen size of a 96px Pokémon sprite

// Receiving: how fast receivers run their routes, relative to base speed (feel tune)
export const ROUTE_SPEED_FACTOR = 0.8;

// Ball carrier
export const SPRINT_MULTIPLIER = 1.35;
export const JUKE_DURATION = 0.3; // untackleable window
export const JUKE_COOLDOWN = 1.2;
export const JUKE_SPEED_FACTOR = 1.3;
export const DIVE_DISTANCE = 40; // instant lunge forward, then the play ends

// Defense (multipliers on each defender's base speed)
export const PASS_RUSH_SPEED_FACTOR = 0.85;
export const COVER_SPEED_FACTOR = 0.95;
export const COVER_CUSHION_PX = 40; // defenders cover this far ahead of their receiver
export const BALL_CHASE_SPEED_FACTOR = 0.85;
export const PURSUIT_SPEED_FACTOR = 0.95;

// Blocking: a rusher within BLOCK_RADIUS of an OL is slowed to this factor
export const BLOCK_RADIUS = 34;
export const BLOCKED_SPEED_FACTOR = 0.25;

// Tackling and sacks (a defender this close gets one attempt per cooldown;
// the roll itself is tackling vs. avoidance — see core/resolvers/tackle.ts)
export const TACKLE_RADIUS = 24;
export const SACK_RADIUS = 24;
export const TACKLE_ATTEMPT_COOLDOWN = 0.6;
export const SACK_ATTEMPT_COOLDOWN = 0.5;

// Passing
export const DROPBACK_PX = 90;
export const BALL_SPEED = 650;
export const BALL_ARRIVE_RADIUS = 6;
export const CATCH_TUNING: CatchTuning = {
  contestedRadius: 45, // a defender this close to the receiver contests the catch
  cleanCatchChance: 0.95,
  interceptChance: 0.15,
  contestedCatchChance: 0.5,
};

// Aim reticle (hold Space in the pass phase; move with WASD/arrows; release to throw)
export const RETICLE_SPEED = 420; // px/s the reticle moves
export const RETICLE_RADIUS = 20; // reticle ring size, px
export const RETICLE_LOCK_RADIUS = 64; // receiver within this px of the reticle is the throw target

export const POST_PLAY_DELAY = 1.6;

// Difficulty: extra px/s for opponents as the campaign ramps up (0 for now).
// Player movement base speed lives in core/pokemon.ts (speedStatToPxPerSec).
export const DIFFICULTY_SPEED_BONUS = 0;

// Match structure: the user plays offense only; opponent possessions are simulated.
export const HALVES = 2;
export const HALF_SECONDS = 120; // 2 minutes per half
export const TOUCHDOWN_POINTS = 7; // no PAT in the MVP
export const FIELD_GOAL_POINTS = 3; // opponent simulation only
export const SIM_DRIVE_FIRST_DELAY = 1.2; // "opponent has the ball..."
export const SIM_DRIVE_SECOND_DELAY = 1.6; // then the outcome
export const HALF_END_DELAY = 2.0;

// Camera: zoom level (1 = full 1280px world width visible). Higher = closer, more control feel.
// The camera follows the ball and clamps to world bounds, so the play never leaves the frame.
export const CAMERA_ZOOM = 1.2;

// 2.5D pass arc: while flying, the ball is DRAWN along a parabola (rise + scale up,
// shadow stays on the ground). All game logic stays top-down.
export const BALL_ARC_BASE = 40; // px of arc height for a zero-distance throw
export const BALL_ARC_PER_PX = 0.15; // extra arc height per px of throw distance
export const BALL_ARC_MAX = 110;

/**
 * Carrier stamina (playtest #3: catching a pass and running in circles was too easy).
 * While carrying the ball the carrier's stamina drains; speed scales down with it.
 * Sprinting drains much faster. This is what lets converging defenders catch up.
 */
export const STAMINA_DRAIN = 0.14; // per second while carrying (~7 s to empty)
export const SPRINT_STAMINA_MULTIPLIER = 2; // sprint drains this much faster
export const STAMINA_MIN_FACTOR = 0.7; // at zero stamina the carrier keeps 70% speed

/** After a catch the receiver breaks stride briefly, giving defenders a window to close. */
export const CATCH_LAG_TIME = 0.5; // seconds
export const CATCH_LAG_SPEED = 0.55; // speed cap during the lag (fraction of base)
