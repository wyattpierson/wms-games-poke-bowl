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
export const COVER_CUSHION_PX = 24; // man: a won matchup sticks this close (contested)
export const BEATEN_COVER_SPEED_FACTOR = 0.65; // man: a beaten CB chases at this × cover speed (WR pulls away)
export const BALL_CHASE_SPEED_FACTOR = 0.85;
export const PURSUIT_SPEED_FACTOR = 0.95;

// Zone coverage: cover defenders hold a home spot and only react when a receiver
// comes within the response radius (then they close with a small cushion).
export const ZONE_RESPONSE_RADIUS = 110;
export const ZONE_CUSHION_PX = 12;

// Open/covered indicator rings on receivers (live separation, any scheme)
export const OPEN_RADIUS = 70; // no defender within this = open (green ring)
export const COVERED_RADIUS = 45; // a defender within this = covered (red ring)

// Coverage schemes: the defense rolls man or zone every play.
export const ZONE_COVERAGE_CHANCE = 0.45;

// Man-coverage matchup roll: base chance a WR beats their defender before speed matters.
export const MATCHUP_BASE_CHANCE = 0.4;

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
  contestedRadius: 55, // a defender this close to the receiver contests the catch
  doubleCoverRadius: 55, // a SECOND defender this close = double coverage
  cleanCatchChance: 0.95,
  interceptChance: 0.15, // contested (one defender)
  contestedCatchChance: 0.35,
  doubleInterceptChance: 0.3, // double-covered
  doubleCatchChance: 0.2, // double-covered
};

// Aim reticle (hold Space in the pass phase; move with WASD/arrows; release to throw; X cancels)
export const RETICLE_SPEED = 420; // px/s the reticle moves
export const RETICLE_LOCK_RADIUS = 64; // aim assist reaches this far from a receiver's meeting point
export const AIM_ASSIST_MAX = 0.8; // fraction of the gap to the meeting point the assist closes (at zero gap)
export const SNAP_HOLD_GRACE = 0.25; // s: Space still held this long after the snap counts as "hold to aim"

/**
 * Throw accuracy model (core/resolvers/throw.ts). The ball flies to a FIXED landing point =
 * aim point + Gaussian error. Nothing is rolled at release; accuracy only decides how far
 * off the ball lands, and the reticle ring shows that spread before you throw.
 *   sigma = (DISPERSION_BASE_PX - DISPERSION_ACCURACY_PX * accuracy/99)
 *           * (throwDistance / REF_THROW_PX) ^ DISPERSION_DISTANCE_EXPONENT
 *           * (1 + PRESSURE_DISPERSION_BOOST * pressure)
 */
export const DISPERSION_BASE_PX = 27; // sigma of a 0-accuracy QB on a REF_THROW_PX throw
export const DISPERSION_ACCURACY_PX = 17; // how much a 99-accuracy QB shaves off that
export const REF_THROW_PX = 190; // ~6 yards
export const DISPERSION_DISTANCE_EXPONENT = 0.5; // deep balls are less accurate
export const PRESSURE_RADIUS = 120; // nearest rusher inside this px starts widening the spread
export const PRESSURE_DISPERSION_BOOST = 0.6; // spread multiplier added at full pressure
export const RING_SIGMA_MULT = 1.51; // ring drawn at 1.51 sigma = where ~2 of 3 throws land
export const RING_MIN_PX = 10;
export const RING_MAX_PX = 90;
export const MAX_ERROR_SIGMAS = 3; // cap on a single throw's miss, in sigmas

/**
 * Receiver hands: a receiver can adjust to any ball that lands within this many px of him.
 * Scales with the Catching stat, so great hands rescue an inaccurate QB.
 */
export const CATCH_REACH_MIN = 20; // 0 catching
export const CATCH_REACH_MAX = 56; // 99 catching

// A ball that lands where no receiver can reach it: a defender this close may pick it off.
export const LOOSE_BALL_INTERCEPT_RADIUS = 40;
export const LOOSE_BALL_INTERCEPT_CHANCE = 0.25;

export const POST_PLAY_DELAY = 1.2; // dead time between plays (trimmed: games felt long)

// Match structure: the user plays offense only; opponent possessions are simulated.
export const HALVES = 2;
export const HALF_SECONDS = 60; // 1 minute per half (playtest #5: 2:00 felt too long)
export const TOUCHDOWN_POINTS = 7; // no PAT in the MVP
export const FIELD_GOAL_POINTS = 3; // opponent simulation only
export const SIM_DRIVE_FIRST_DELAY = 0.9; // "opponent has the ball..."
export const SIM_DRIVE_SECOND_DELAY = 1.2; // then the outcome
export const HALF_END_DELAY = 1.5;

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
