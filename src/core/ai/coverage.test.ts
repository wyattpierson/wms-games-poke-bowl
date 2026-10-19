import { describe, expect, it } from 'vitest';
import { rollCoveragePlan, rollCoverageScheme, rollManMatchup } from './coverage';

describe('rollCoverageScheme', () => {
  it('rolls zone under 0.45, man above', () => {
    expect(rollCoverageScheme(() => 0.44)).toBe('zone');
    expect(rollCoverageScheme(() => 0.46)).toBe('man');
  });
});

describe('rollManMatchup', () => {
  it('a much faster receiver beats a slower defender on the same roll', () => {
    // speed edge +0.3, no awareness edge -> chance ~0.7
    expect(rollManMatchup(160, 100, 0, () => 0.6)).toBe(true);
    // the reverse: defender is much faster -> chance ~0.1
    expect(rollManMatchup(100, 160, 0, () => 0.6)).toBe(false);
  });
  it('a high-awareness defender wins more often', () => {
    // equal speeds: base 0.4; awareness 0 adds +0.15 -> 0.55 (0.5 rolls true)
    expect(rollManMatchup(100, 100, 0, () => 0.5)).toBe(true);
    // awareness 99 adds nothing -> 0.4 (0.5 rolls false)
    expect(rollManMatchup(100, 100, 99, () => 0.5)).toBe(false);
  });
  it('the chance is clamped to a sane band', () => {
    // clamped to 0.9: chance 0.85
    expect(rollManMatchup(500, 10, 0, () => 0.8)).toBe(true);
    // clamped to 0.05: chance 0.1
    expect(rollManMatchup(10, 500, 99, () => 0.12)).toBe(false);
  });
});

describe('rollCoveragePlan', () => {
  it('rolls one matchup per receiver slot in man, none in zone', () => {
    const matchups = [
      { receiverSpeed: 100, defenderSpeed: 100, defenderAwareness: 50 },
      { receiverSpeed: 100, defenderSpeed: 100, defenderAwareness: 50 },
    ];
    const man = rollCoveragePlan('man', matchups, () => 0.1);
    expect(man.scheme).toBe('man');
    expect(man.beaten).toEqual([true, true]);

    const zone = rollCoveragePlan('zone', matchups, () => 0.1);
    expect(zone.scheme).toBe('zone');
    expect(zone.beaten).toEqual([false, false]);
  });
  it('a slot with no assigned defender (defenderSpeed 0) is never "beaten"', () => {
    const plan = rollCoveragePlan('man', [{ receiverSpeed: 100, defenderSpeed: 0, defenderAwareness: 0 }], () => 0.1);
    expect(plan.beaten).toEqual([false]);
  });
});
