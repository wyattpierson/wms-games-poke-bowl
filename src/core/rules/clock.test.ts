import { describe, expect, it } from 'vitest';
import { formatClock, isHalfOver, isMatchOver, newMatchClock, nextHalf, tickClock } from './clock';

describe('match clock', () => {
  it('starts at half 1 with a full clock', () => {
    const clock = newMatchClock(2, 120);
    expect(clock.half).toBe(1);
    expect(clock.secondsLeft).toBe(120);
    expect(isHalfOver(clock)).toBe(false);
    expect(isMatchOver(clock)).toBe(false);
  });

  it('ticks down and clamps at zero', () => {
    const clock = newMatchClock(2, 10);
    expect(tickClock(clock, 4).secondsLeft).toBe(6);
    expect(tickClock(clock, 99).secondsLeft).toBe(0);
  });

  it('detects half and match end', () => {
    const clock = newMatchClock(2, 10);
    const atZero = tickClock(clock, 10);
    expect(isHalfOver(atZero)).toBe(true);
    expect(isMatchOver(atZero)).toBe(false); // still half 1
    const half2 = nextHalf(atZero);
    expect(isMatchOver(half2)).toBe(false); // half 2 just started
    expect(isMatchOver(tickClock(half2, 120))).toBe(true);
  });

  it('nextHalf increments and refills the clock', () => {
    const atZero = tickClock(newMatchClock(2, 120), 120);
    const second = nextHalf(atZero);
    expect(second.half).toBe(2);
    expect(second.secondsLeft).toBe(120);
  });

  it('formats time as m:ss', () => {
    expect(formatClock(95)).toBe('1:35');
    expect(formatClock(120)).toBe('2:00');
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(0.4)).toBe('0:01'); // rounds up so "0:00" only shows at true zero
  });
});
