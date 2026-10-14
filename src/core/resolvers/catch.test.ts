import { describe, expect, it } from 'vitest';
import { resolveCatch, type CatchTuning } from './catch';

const tuning: CatchTuning = { contestedRadius: 45, cleanCatchChance: 0.9, interceptChance: 0.2, contestedCatchChance: 0.5 };

describe('resolveCatch', () => {
  it('catches cleanly when no defender is close', () => {
    expect(resolveCatch(200, tuning, 50, () => 0.5)).toBe('catch');
  });
  it('drops a clean pass on a bad roll', () => {
    expect(resolveCatch(200, tuning, 50, () => 0.95)).toBe('incomplete');
  });
  it('can be intercepted when contested', () => {
    expect(resolveCatch(10, tuning, 50, () => 0.1)).toBe('interception');
  });
  it('can still be caught when contested', () => {
    expect(resolveCatch(10, tuning, 50, () => 0.4)).toBe('catch');
  });
  it('falls incomplete on the rest of the contested rolls', () => {
    expect(resolveCatch(10, tuning, 50, () => 0.9)).toBe('incomplete');
  });
  it('good hands (high catching) treat a 40px defender as uncontested', () => {
    // effective radius = 45 * (1 - 0.45 * 99/99) ≈ 24.75, so 40px is clean
    expect(resolveCatch(40, tuning, 99, () => 0.5)).toBe('catch');
  });
  it('poor hands (0 catching) stay contested at 40px', () => {
    // effective radius = 45, so 40px is contested; roll 0.9 > 0.2 + 0.5
    expect(resolveCatch(40, tuning, 0, () => 0.9)).toBe('incomplete');
  });
  it('high catching raises the contested catch chance', () => {
    // catching 99: contestedCatchChance = min(0.95, 0.85) = 0.85 -> window 0.2..1.05
    expect(resolveCatch(10, tuning, 99, () => 0.8)).toBe('catch');
    // catching 0: window 0.2..0.7, so 0.8 is incomplete
    expect(resolveCatch(10, tuning, 0, () => 0.8)).toBe('incomplete');
  });
});
