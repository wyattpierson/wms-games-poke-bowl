import { describe, expect, it } from 'vitest';
import { attemptTackle, tackleChance } from './tackle';

describe('attemptTackle', () => {
  it('strong tackler vs weak evader almost always tackles', () => {
    expect(attemptTackle(99, 0, () => 0.9)).toBe(true);
  });
  it('weak tackler vs elite evader rarely tackles (15% floor)', () => {
    expect(attemptTackle(0, 99, () => 0.5)).toBe(false); // 50% roll misses a 15% chance
    expect(attemptTackle(0, 99, () => 0.1)).toBe(true); // 10% roll makes the 15% floor
  });
  it('tackleChance scales monotonically with tackling and down with avoidance', () => {
    expect(tackleChance(99, 0)).toBeGreaterThan(tackleChance(50, 50));
    expect(tackleChance(50, 50)).toBeGreaterThan(tackleChance(0, 99));
    expect(tackleChance(99, 99)).toBeGreaterThan(tackleChance(0, 0));
  });
  it('stays within the 10%..95% bounds', () => {
    expect(tackleChance(0, 99)).toBeGreaterThanOrEqual(0.1);
    expect(tackleChance(99, 0)).toBeLessThanOrEqual(0.95);
  });
});
