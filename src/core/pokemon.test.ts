import { describe, expect, it } from 'vitest';
import { deriveStats, speedStatToPxPerSec, type UserStats } from './pokemon';

const s = (over: Partial<UserStats> = {}): UserStats => ({
  speed: 50,
  strength: 50,
  throwing: 50,
  awareness: 50,
  coordination: 50,
  ...over,
});

describe('deriveStats', () => {
  it('passes speed and awareness straight through', () => {
    const d = deriveStats(s({ speed: 90, awareness: 30 }));
    expect(d.speed).toBe(90);
    expect(d.awareness).toBe(30);
  });

  it('passes throwing and coordination to throwPower and catching', () => {
    const d = deriveStats(s({ throwing: 80, coordination: 40 }));
    expect(d.throwPower).toBe(80);
    expect(d.catching).toBe(40);
  });

  it('blends throwAccuracy 60/40 throwing/coordination', () => {
    const d = deriveStats(s({ throwing: 100, coordination: 0 }));
    expect(d.throwAccuracy).toBe(60);
    const d2 = deriveStats(s({ throwing: 0, coordination: 100 }));
    expect(d2.throwAccuracy).toBe(40);
  });

  it('blends blocking 70/30 strength/speed', () => {
    const d = deriveStats(s({ strength: 100, speed: 0 }));
    expect(d.blocking).toBe(70);
  });

  it('blends tackling 70/30 strength/awareness', () => {
    const d = deriveStats(s({ strength: 100, awareness: 0 }));
    expect(d.tackling).toBe(70);
  });

  it('blends avoidance 50/50 coordination/speed', () => {
    const d = deriveStats(s({ coordination: 100, speed: 0 }));
    expect(d.avoidance).toBe(50);
  });

  it('keeps everything in 0..99', () => {
    const max = deriveStats(s({ speed: 99, strength: 99, throwing: 99, awareness: 99, coordination: 99 }));
    const min = deriveStats(s({ speed: 0, strength: 0, throwing: 0, awareness: 0, coordination: 0 }));
    for (const value of Object.values({ ...max, ...min })) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(99);
    }
  });
});

describe('speedStatToPxPerSec', () => {
  it('maps 0..99 to 120..219 px/s', () => {
    expect(speedStatToPxPerSec(0)).toBe(120);
    expect(speedStatToPxPerSec(99)).toBe(219);
    expect(speedStatToPxPerSec(50)).toBe(170);
  });

  it('supports a difficulty bonus for scaling opponents', () => {
    expect(speedStatToPxPerSec(50, 40)).toBe(210);
  });
});
