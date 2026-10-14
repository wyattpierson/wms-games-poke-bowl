import { describe, expect, it } from 'vitest';
import { simulateDrive } from './simulation';

describe('simulateDrive', () => {
  it('maps RNG rolls to outcomes', () => {
    const roll = (value: number) => () => value;
    expect(simulateDrive(roll(0.1)).outcome).toBe('touchdown');
    expect(simulateDrive(roll(0.25)).outcome).toBe('fieldGoal');
    expect(simulateDrive(roll(0.5)).outcome).toBe('punt');
    expect(simulateDrive(roll(0.9)).outcome).toBe('turnover');
  });

  it('consumes a plausible chunk of clock (10-30s)', () => {
    for (let i = 0; i < 50; i++) {
      const { seconds } = simulateDrive();
      expect(seconds).toBeGreaterThanOrEqual(10);
      expect(seconds).toBeLessThanOrEqual(30);
    }
  });
});
