import { describe, expect, it } from 'vitest';
import { catchOdds, resolveCatch, type CatchTuning } from './catch';

const tuning: CatchTuning = {
  contestedRadius: 55,
  doubleCoverRadius: 55,
  cleanCatchChance: 0.95,
  interceptChance: 0.15,
  contestedCatchChance: 0.35,
  doubleInterceptChance: 0.3,
  doubleCatchChance: 0.2,
};

describe('resolveCatch', () => {
  it('catches cleanly when no defender is close', () => {
    expect(resolveCatch([200], tuning, 50, () => 0.5)).toBe('catch');
  });
  it('drops a clean pass on a bad roll', () => {
    expect(resolveCatch([200], tuning, 50, () => 0.96)).toBe('incomplete');
  });
  it('can be intercepted when contested', () => {
    expect(resolveCatch([10], tuning, 50, () => 0.1)).toBe('interception');
  });
  it('can still be caught when contested', () => {
    expect(resolveCatch([10], tuning, 50, () => 0.3)).toBe('catch');
  });
  it('falls incomplete on the rest of the contested rolls', () => {
    expect(resolveCatch([10], tuning, 50, () => 0.9)).toBe('incomplete');
  });
  it('good hands (high catching) treat a nearby defender as uncontested', () => {
    // effective radius = 55 * (1 - 0.45 * 99/99) ≈ 30.25, so 40px is clean
    expect(resolveCatch([40], tuning, 99, () => 0.5)).toBe('catch');
  });
  it('poor hands (0 catching) stay contested at 40px', () => {
    // effective radius = 55, so 40px is contested; roll 0.9 > 0.15 + 0.35
    expect(resolveCatch([40], tuning, 0, () => 0.9)).toBe('incomplete');
  });
  it('high catching raises the contested catch chance', () => {
    // catching 99: contestedCatchChance = 0.70 -> window 0.15..0.85
    expect(resolveCatch([10], tuning, 99, () => 0.8)).toBe('catch');
    // catching 0: window 0.15..0.50, so 0.8 is incomplete
    expect(resolveCatch([10], tuning, 0, () => 0.8)).toBe('incomplete');
  });
  it('double coverage: intercepted on a low roll', () => {
    expect(resolveCatch([20, 30], tuning, 50, () => 0.2)).toBe('interception');
  });
  it('double coverage: can be caught (harder than single)', () => {
    expect(resolveCatch([20, 30], tuning, 50, () => 0.5)).toBe('catch');
  });
  it('double coverage: drops the rest', () => {
    expect(resolveCatch([20, 30], tuning, 50, () => 0.9)).toBe('incomplete');
  });
  it('a second defender beyond the double-cover radius keeps it single-contest', () => {
    // nearest 40 (contested, 0 catching), second 60 (> doubleCoverRadius 55) -> single contest
    // window: 0.15..0.50, so 0.6 is incomplete
    expect(resolveCatch([40, 60], tuning, 0, () => 0.6)).toBe('incomplete');
  });
  it('a lone far defender is irrelevant', () => {
    expect(resolveCatch([100], tuning, 50, () => 0.5)).toBe('catch');
  });
});

describe('catchOdds', () => {
  const sum = (o: { catch: number; interception: number; incomplete: number }) => o.catch + o.interception + o.incomplete;
  it('always sums to 1', () => {
    for (const d of [[200], [10], [20, 30], [40, 60]]) {
      for (const c of [0, 50, 99]) expect(sum(catchOdds(d, tuning, c))).toBeCloseTo(1);
    }
  });
  it('is clean with nobody around', () => {
    expect(catchOdds([200], tuning, 50)).toEqual({ catch: 0.95, interception: 0, incomplete: expect.closeTo(0.05) });
  });
  it('is riskier contested and riskiest double-covered', () => {
    const clean = catchOdds([200], tuning, 50);
    const one = catchOdds([10], tuning, 50);
    const two = catchOdds([10, 20], tuning, 50);
    expect(one.catch).toBeLessThan(clean.catch);
    expect(two.catch).toBeLessThan(one.catch);
    expect(two.interception).toBeGreaterThan(one.interception);
  });
  it('agrees with resolveCatch roll for roll', () => {
    const o = catchOdds([10], tuning, 50);
    expect(resolveCatch([10], tuning, 50, () => o.interception - 1e-6)).toBe('interception');
    expect(resolveCatch([10], tuning, 50, () => o.interception + 1e-6)).toBe('catch');
    expect(resolveCatch([10], tuning, 50, () => o.interception + o.catch + 1e-6)).toBe('incomplete');
  });
});
