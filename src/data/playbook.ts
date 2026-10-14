import { DEFENSE_POSITIONS, OFFENSE_POSITIONS } from '../core/teams';
import type { Team } from '../core/teams';
import type { DefenseRole, OffenseSlot, Play, Position, Vec2 } from '../types';

/**
 * Formation data. Offsets/routes are in pixels (32 px = 1 yard).
 *
 * 14 Pokémon per team: 7 offense + 7 defense (separate rosters). Roster order is positional:
 *   offTeam.offense[i] plays OFFENSE_POSITIONS[i]: QB, OL, OL, RB, WR, WR, TE
 *   defTeam.defense[i] plays DEFENSE_POSITIONS[i]: DL, DL, LB, LB, CB, CB, S
 */

interface Formation {
  offset: Vec2;
  receiverSlot?: number;
  route?: Vec2[];
  role?: DefenseRole;
}

/** Formations by position; duplicated positions (2x OL/WR/DL/LB/CB) are arrays, indexed by occurrence. */
const FORMATIONS: Record<Position, Formation | Formation[]> = {
  QB: { offset: { x: -60, y: 0 } },
  OL: [
    { offset: { x: -20, y: -35 } },
    { offset: { x: -20, y: 35 } },
  ],
  // The RB runs a slot route out of the backfield (throwable as receiver slot 3;
  // uncovered by design — the LB shadows the TE). On run plays the RB is the handoff target.
  RB: { offset: { x: -110, y: 50 }, receiverSlot: 3, route: [{ x: 60, y: -30 }, { x: 140, y: -5 }] },
  WR: [
    { offset: { x: -15, y: -150 }, receiverSlot: 0, route: [{ x: 300, y: 0 }, { x: 380, y: 70 }] },
    { offset: { x: -15, y: 150 }, receiverSlot: 1, route: [{ x: 200, y: -40 }, { x: 260, y: -120 }] },
  ],
  TE: { offset: { x: -20, y: 85 }, receiverSlot: 2, route: [{ x: 130, y: 0 }, { x: 160, y: -60 }] },
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

/**
 * Build the one MVP play for a matchup: `offTeam` lines up on offense, `defTeam` on defense.
 * Single dropback with a 3-receiver route game, against a 2-man rush, man coverage,
 * a delayed LB blitz and a late safety blitz.
 */
export function buildPlay(offTeam: Team, defTeam: Team): Play {
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
    offense.push({
      position: offPos,
      pokemon: offTeam.offense[i]!,
      offset: offFormation.offset,
      ...(offFormation.receiverSlot !== undefined ? { receiverSlot: offFormation.receiverSlot } : {}),
      ...(offFormation.route !== undefined ? { route: offFormation.route } : {}),
    });

    const defFormation = pick(FORMATIONS[defPos], nDef);
    defense.push({
      position: defPos,
      pokemon: defTeam.defense[i]!,
      offset: defFormation.offset,
      role: defFormation.role ?? { kind: 'rush' },
    });
  }

  return { name: `${offTeam.name} @ ${defTeam.name}`, offense, defense };
}

/** Pick a single formation or the nth of a duplicated-position list. */
function pick(formation: Formation | Formation[], occurrence: number): Formation {
  return Array.isArray(formation) ? formation[occurrence]! : formation;
}
