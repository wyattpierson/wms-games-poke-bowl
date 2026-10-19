import { DEFENSE_POSITIONS, OFFENSE_POSITIONS } from '../core/teams';
import type { Team } from '../core/teams';
import type { DefenseRole, OffenseSlot, Play, Position, Vec2 } from '../types';

/**
 * Formations + playbook. Offsets/routes are in pixels (32 px = 1 yard).
 *
 * 14 Pokémon per team: 7 offense + 7 defense (separate rosters). Roster order is positional:
 *   offTeam.offense[i] plays OFFENSE_POSITIONS[i]: QB, OL, OL, RB, WR, WR, TE
 *   defTeam.defense[i] plays DEFENSE_POSITIONS[i]: DL, DL, LB, LB, CB, CB, S
 *
 * Every play uses the same base alignment; only the receiver ROUTES differ. A new play is
 * rolled for every down (PlaySession.lineUp), so the offense gets variety and the defense
 * (a fixed alignment) reads differently against each route combination.
 *
 * Receiver slots: 0 = top WR (starts near the top sideline), 1 = bottom WR, 2 = TE,
 * 3 = RB (slot). Waypoints are relative to the receiver's STARTING spot.
 */

interface Formation {
  offset: Vec2;
  receiverSlot?: number;
  role?: DefenseRole;
}

/** Base alignment for every play (route-free; routes come from the playbook below). */
const FORMATIONS: Record<Position, Formation | Formation[]> = {
  QB: { offset: { x: -60, y: 0 } },
  OL: [
    { offset: { x: -20, y: -35 } },
    { offset: { x: -20, y: 35 } },
  ],
  // The RB lines up in the slot and is always throwable (receiver slot 3).
  // On run plays the RB is the handoff target.
  RB: { offset: { x: -110, y: 50 }, receiverSlot: 3 },
  WR: [
    { offset: { x: -15, y: -150 }, receiverSlot: 0 },
    { offset: { x: -15, y: 150 }, receiverSlot: 1 },
  ],
  TE: { offset: { x: -20, y: 85 }, receiverSlot: 2 },
  DL: [
    { offset: { x: 25, y: -40 }, role: { kind: 'rush' } },
    { offset: { x: 25, y: 40 }, role: { kind: 'rush' } },
  ],
  LB: [
    { offset: { x: 100, y: 80 }, role: { kind: 'cover', receiverSlot: 2 } },
    { offset: { x: 100, y: -60 }, role: { kind: 'blitz', delay: 1.2 } },
  ],
  CB: [
    { offset: { x: 190, y: -150 }, role: { kind: 'cover', receiverSlot: 0 } },
    { offset: { x: 190, y: 150 }, role: { kind: 'cover', receiverSlot: 1 } },
  ],
  S: { offset: { x: 280, y: 0 }, role: { kind: 'blitz', delay: 1.4 } },
};

// --- The route menu (relative waypoints per receiver slot) -------------------------------
// Kept inside the field strip (y 160..560) from each slot's start position.

const GO_TOP: Vec2[] = [{ x: 380, y: 0 }];
const OUT_TOP: Vec2[] = [{ x: 190, y: -25 }];
const SLANT_TOP: Vec2[] = [{ x: 130, y: 0 }, { x: 175, y: 35 }];
const POST_TOP: Vec2[] = [{ x: 240, y: 0 }, { x: 350, y: 80 }];
const FLAT_TOP: Vec2[] = [{ x: 90, y: -30 }];
const DIG_TOP: Vec2[] = [{ x: 280, y: 0 }, { x: 330, y: 50 }];
const CURL_TOP: Vec2[] = [{ x: 250, y: -10 }];

const GO_BOT: Vec2[] = [{ x: 380, y: 0 }];
const OUT_BOT: Vec2[] = [{ x: 240, y: 30 }];
const SLANT_BOT: Vec2[] = [{ x: 130, y: 0 }, { x: 175, y: -35 }];
const POST_BOT: Vec2[] = [{ x: 240, y: 0 }, { x: 350, y: -80 }];
const FLAT_BOT: Vec2[] = [{ x: 90, y: 30 }];
const DIG_BOT: Vec2[] = [{ x: 280, y: 0 }, { x: 330, y: -50 }];
const CURL_BOT: Vec2[] = [{ x: 250, y: 10 }];

const TE_GO: Vec2[] = [{ x: 300, y: 0 }];
const TE_SLANT: Vec2[] = [{ x: 120, y: 0 }, { x: 160, y: -30 }];
const TE_CURL: Vec2[] = [{ x: 220, y: -15 }];
const TE_DIG: Vec2[] = [{ x: 260, y: 0 }, { x: 310, y: -50 }];
const TE_FLAT: Vec2[] = [{ x: 80, y: 40 }];

const RB_GO: Vec2[] = [{ x: 240, y: 0 }];
const RB_SLANT: Vec2[] = [{ x: 110, y: 0 }, { x: 150, y: -30 }];
const RB_DIG: Vec2[] = [{ x: 200, y: 0 }, { x: 250, y: -40 }];

/** One named play = a route for each receiver slot. */
export interface PlayDef {
  name: string;
  /** Route per receiver slot (0 = top WR, 1 = bottom WR, 2 = TE, 3 = RB). */
  routes: Record<number, Vec2[]>;
}

/** The playbook: rolled randomly, one per down. */
export const PLAYBOOK: PlayDef[] = [
  {
    name: 'Go & Slant',
    routes: { 0: GO_TOP, 1: SLANT_BOT, 2: TE_CURL, 3: RB_DIG },
  },
  {
    name: 'Double Out',
    routes: { 0: OUT_TOP, 1: OUT_BOT, 2: TE_SLANT, 3: RB_GO },
  },
  {
    name: 'Deep Post',
    routes: { 0: POST_TOP, 1: GO_BOT, 2: TE_GO, 3: RB_SLANT },
  },
  {
    name: 'Slot Action',
    routes: { 0: FLAT_TOP, 1: CURL_BOT, 2: TE_DIG, 3: RB_GO },
  },
  {
    name: 'Dig & Curl',
    routes: { 0: DIG_TOP, 1: CURL_BOT, 2: TE_FLAT, 3: RB_SLANT },
  },
  {
    name: 'Two Curls',
    routes: { 0: CURL_TOP, 1: POST_BOT, 2: TE_CURL, 3: RB_DIG },
  },
  {
    name: 'Slant Double',
    routes: { 0: SLANT_TOP, 1: SLANT_BOT, 2: TE_SLANT, 3: RB_DIG },
  },
  {
    name: 'Two Flats',
    routes: { 0: FLAT_TOP, 1: FLAT_BOT, 2: TE_CURL, 3: RB_GO },
  },
  {
    name: 'Post & Dig',
    routes: { 0: POST_TOP, 1: DIG_BOT, 2: TE_GO, 3: RB_SLANT },
  },
];

/** Pick a random play from the playbook. */
export function pickPlayDef(rng: () => number = Math.random): PlayDef {
  return PLAYBOOK[Math.floor(rng() * PLAYBOOK.length) % PLAYBOOK.length]!;
}

/**
 * Build a full play (both teams lined up) for the given matchup and play definition.
 * `buildPlay` is the convenience wrapper that rolls a random play from the playbook.
 */
export function buildPlay(offTeam: Team, defTeam: Team, rng: () => number = Math.random): Play {
  return buildPlayWith(offTeam, defTeam, pickPlayDef(rng));
}

export function buildPlayWith(offTeam: Team, defTeam: Team, playDef: PlayDef): Play {
  const offense: OffenseSlot[] = [];
  const defense = [];
  const offenseCounts: Partial<Record<Position, number>> = {};
  const defenseCounts: Partial<Record<Position, number>> = {};

  for (let i = 0; i < 7; i++) {
    const offPos = OFFENSE_POSITIONS[i]!;
    const defPos = DEFENSE_POSITIONS[i]!;

    const nOff = offenseCounts[offPos] ?? 0;
    const nDef = defenseCounts[defPos] ?? 0;
    offenseCounts[offPos] = nOff + 1;
    defenseCounts[defPos] = nDef + 1;

    const offFormation = pick(FORMATIONS[offPos], nOff);
    const receiverSlot = offFormation.receiverSlot;
    offense.push({
      position: offPos,
      pokemon: offTeam.offense[i]!,
      offset: offFormation.offset,
      ...(receiverSlot !== undefined ? { receiverSlot } : {}),
      ...(receiverSlot !== undefined ? { route: playDef.routes[receiverSlot] ?? [] } : {}),
    });

    const defFormation = pick(FORMATIONS[defPos], nDef);
    defense.push({
      position: defPos,
      pokemon: defTeam.defense[i]!,
      offset: defFormation.offset,
      role: defFormation.role ?? { kind: 'rush' },
    });
  }

  return { name: playDef.name, offense, defense };
}

/** Pick a single formation or the nth of a duplicated-position list. */
function pick(formation: Formation | Formation[], occurrence: number): Formation {
  return Array.isArray(formation) ? formation[occurrence]! : formation;
}
