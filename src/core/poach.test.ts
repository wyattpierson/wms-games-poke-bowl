import { describe, expect, it } from 'vitest';
import type { Pokemon } from './pokemon';
import { averageOverall, compareStats, netUpgrade, overall, statLine, USER_STATS } from './poach';

const p = (id: string, stats: Pokemon['stats']): Pokemon => ({
  id, name: id.toUpperCase(), type: 'Normal', stats,
});

const A = p('a', { speed: 90, strength: 40, throwing: 70, awareness: 60, coordination: 50 });
const B = p('b', { speed: 60, strength: 70, throwing: 70, awareness: 60, coordination: 80 });

describe('poach stat comparison', () => {
  it('produces one delta per user-facing stat', () => {
    const deltas = compareStats(A, B);
    expect(deltas).toHaveLength(5);
    expect(deltas.map((d) => d.label)).toEqual(USER_STATS.map((s) => s.label));
  });

  it('computes diff as taken - dropped', () => {
    const [spd, str, , , coo] = compareStats(A, B);
    expect(spd!.diff).toBe(30); // 90 - 60, the swap improves speed
    expect(str!.diff).toBe(-30); // 40 - 70, the swap hurts strength
    expect(coo!.diff).toBe(-30); // 50 - 80
  });

  it('scores a net upgrade from the sign of each delta', () => {
    // A vs B: speed +, strength -, throwing =, awareness =, coordination -  =>  +1 -2 = -1
    expect(netUpgrade(compareStats(A, B))).toBe(-1);
    // comparing a Pokémon against itself is a wash
    expect(netUpgrade(compareStats(A, A))).toBe(0);
  });

  it('formats a compact stat line', () => {
    expect(statLine(A.stats)).toBe('SPD 90  STR 40  THR 70  AWA 60  COO 50');
  });
});

describe('overall ratings', () => {
  it('is the rounded mean of the five stats', () => {
    expect(overall(A)).toBe(62); // (90+40+70+60+50) / 5
    expect(overall(B)).toBe(68); // (60+70+70+60+80) / 5
  });

  it('averages a group, and is 0 for an empty one', () => {
    expect(averageOverall([A, B])).toBe(65);
    expect(averageOverall([])).toBe(0);
  });
});
