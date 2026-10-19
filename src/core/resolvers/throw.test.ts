import { describe, expect, it } from 'vitest';
import {
  aimAssist, ballSpeedFor, catchReach, chanceWithinReach, landingSigma, missNote, ringRadius, solveIntercept, throwError,
} from './throw';

describe('landingSigma', () => {
  it('is tighter for a more accurate QB', () => {
    expect(landingSigma(90, 190)).toBeLessThan(landingSigma(50, 190));
    expect(landingSigma(50, 190)).toBeLessThan(landingSigma(10, 190));
  });
  it('matches the calibrated reference points at a 6-yard throw', () => {
    expect(landingSigma(0, 190)).toBeCloseTo(27);
    expect(landingSigma(99, 190)).toBeCloseTo(10);
  });
  it('widens with throw distance (about 1.41x for double the distance)', () => {
    expect(landingSigma(50, 380) / landingSigma(50, 190)).toBeCloseTo(Math.SQRT2, 2);
  });
  it('very short throws do not get unrealistically perfect', () => {
    expect(landingSigma(50, 5)).toBeCloseTo(landingSigma(50, 190) * 0.5);
  });
  it('widens under pressure, up to the configured boost', () => {
    expect(landingSigma(50, 190, 1)).toBeCloseTo(landingSigma(50, 190, 0) * 1.6);
    expect(landingSigma(50, 190, 0.5)).toBeGreaterThan(landingSigma(50, 190, 0));
  });
  it('clamps out-of-range stats and pressure', () => {
    expect(landingSigma(500, 190)).toBeCloseTo(landingSigma(99, 190));
    expect(landingSigma(50, 190, 9)).toBeCloseTo(landingSigma(50, 190, 1));
  });
});

describe('ringRadius', () => {
  it('is about 1.5 sigma, clamped to a drawable size', () => {
    expect(ringRadius(20)).toBeCloseTo(30.2);
    expect(ringRadius(1)).toBe(10);
    expect(ringRadius(500)).toBe(90);
  });
});

describe('catchReach', () => {
  it('grows with the Catching stat', () => {
    expect(catchReach(0)).toBe(20);
    expect(catchReach(99)).toBe(56);
    expect(catchReach(80)).toBeGreaterThan(catchReach(50));
  });
});

describe('ballSpeedFor', () => {
  it('scales from 75% to 125% of base with arm strength', () => {
    expect(ballSpeedFor(0)).toBeCloseTo(650 * 0.75);
    expect(ballSpeedFor(99)).toBeCloseTo(650 * 1.25);
  });
});

describe('throwError', () => {
  it('is zero when the QB is perfectly accurate', () => {
    const e = throwError(0, () => 0.3);
    expect(e.x).toBeCloseTo(0);
    expect(e.y).toBeCloseTo(0);
  });
  it('never misses by more than 3 sigma', () => {
    for (let i = 0; i < 2000; i++) {
      const e = throwError(20);
      expect(Math.hypot(e.x, e.y)).toBeLessThanOrEqual(60 + 1e-9);
    }
  });
  it('lands about two-thirds of throws inside the drawn ring', () => {
    const sigma = 20;
    const ring = ringRadius(sigma);
    let inside = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) {
      const e = throwError(sigma);
      if (Math.hypot(e.x, e.y) <= ring) inside++;
    }
    expect(inside / n).toBeGreaterThan(0.64);
    expect(inside / n).toBeLessThan(0.72);
  });
});

describe('chanceWithinReach', () => {
  it('matches the closed form for an on-target aim: 1 - exp(-r^2 / 2s^2)', () => {
    const sigma = 20;
    const reach = 40;
    expect(chanceWithinReach({ x: 0, y: 0 }, sigma, reach)).toBeCloseTo(1 - Math.exp(-(reach * reach) / (2 * sigma * sigma)), 2);
  });
  it('is near 1 with a tight spread and near 0 when aimed far outside reach', () => {
    expect(chanceWithinReach({ x: 0, y: 0 }, 5, 40)).toBeGreaterThan(0.999);
    expect(chanceWithinReach({ x: 200, y: 0 }, 10, 40)).toBeLessThan(0.001);
  });
  it('drops as the aim point drifts off the receiver', () => {
    const on = chanceWithinReach({ x: 0, y: 0 }, 20, 40);
    const off = chanceWithinReach({ x: 30, y: 0 }, 20, 40);
    expect(off).toBeLessThan(on);
  });
  it('is symmetric in the direction of the miss', () => {
    expect(chanceWithinReach({ x: 25, y: 0 }, 20, 40)).toBeCloseTo(chanceWithinReach({ x: 0, y: -25 }, 20, 40), 3);
  });
  it('a larger reach (better hands) raises the chance for the same QB', () => {
    expect(chanceWithinReach({ x: 0, y: 0 }, 25, 50)).toBeGreaterThan(chanceWithinReach({ x: 0, y: 0 }, 25, 35));
  });
  it('handles zero spread', () => {
    expect(chanceWithinReach({ x: 10, y: 0 }, 0, 40)).toBe(1);
    expect(chanceWithinReach({ x: 50, y: 0 }, 0, 40)).toBe(0);
  });
});

describe('WR hands vs QB accuracy (the roguelike trade-off)', () => {
  const deep = 380;
  const odds = (accuracy: number, catching: number) =>
    chanceWithinReach({ x: 0, y: 0 }, landingSigma(accuracy, deep), catchReach(catching));

  it('great hands rescue an inaccurate QB', () => {
    expect(odds(20, 90)).toBeGreaterThan(odds(20, 40) + 0.25);
  });
  it('great hands on a poor QB roughly match a good QB throwing to poor hands', () => {
    expect(Math.abs(odds(20, 99) - odds(80, 30))).toBeLessThan(0.1);
  });
  it('an elite QB and elite hands is close to automatic, even deep', () => {
    expect(odds(99, 99)).toBeGreaterThan(0.97);
  });
});

describe('aimAssist', () => {
  const meet = { x: 100, y: 100 };
  it('does nothing outside the lock radius', () => {
    expect(aimAssist({ x: 200, y: 100 }, meet, 64)).toEqual({ x: 200, y: 100 });
  });
  it('pulls toward the meeting point inside the radius, more strongly the closer you are', () => {
    const far = aimAssist({ x: 150, y: 100 }, meet, 64, 0.8);
    const near = aimAssist({ x: 110, y: 100 }, meet, 64, 0.8);
    expect(far.x).toBeLessThan(150);
    expect(far.x).toBeGreaterThan(100);
    expect(Math.abs(near.x - 100) / 10).toBeLessThan(Math.abs(far.x - 100) / 50);
  });
  it('never overshoots the meeting point', () => {
    const p = aimAssist({ x: 105, y: 100 }, meet, 64, 1);
    expect(p.x).toBeGreaterThanOrEqual(100);
  });
  it('is continuous at the edge of the radius', () => {
    const p = aimAssist({ x: 100 + 63.99, y: 100 }, meet, 64, 0.8);
    expect(p.x).toBeCloseTo(163.99, 1);
  });
});

describe('solveIntercept', () => {
  it('meets a receiver running straight away from the QB where ball and receiver arrive together', () => {
    const qb = { x: 0, y: 0 };
    const start = { x: 200, y: 0 };
    const recvSpeed = 160;
    const ballSpeed = 700;
    const predict = (t: number) => ({ x: start.x + recvSpeed * t, y: 0 });
    const meet = solveIntercept(qb, start, predict, ballSpeed);
    const flight = Math.hypot(meet.x - qb.x, meet.y - qb.y) / ballSpeed;
    expect(meet.x).toBeCloseTo(start.x + recvSpeed * flight, 1);
  });
  it('leads further than the receiver stands now, and further for a faster receiver', () => {
    const qb = { x: 0, y: 0 };
    const start = { x: 200, y: 0 };
    const make = (v: number) => (t: number) => ({ x: start.x + v * t, y: 0 });
    const slow = solveIntercept(qb, start, make(100), 700);
    const fast = solveIntercept(qb, start, make(200), 700);
    expect(slow.x).toBeGreaterThan(start.x);
    expect(fast.x).toBeGreaterThan(slow.x);
  });
  it('is the receiver spot for a stationary receiver', () => {
    const start = { x: 200, y: 50 };
    expect(solveIntercept({ x: 0, y: 0 }, start, () => start, 700)).toEqual(start);
  });
});

describe('missNote', () => {
  const qb = { x: 0, y: 0 };
  const receiver = { x: 300, y: 0 };
  it('reads Overthrown when the ball lands past the receiver', () => {
    expect(missNote(qb, receiver, { x: 380, y: 10 })).toBe('Overthrown!');
  });
  it('reads Short when it lands in front of him', () => {
    expect(missNote(qb, receiver, { x: 230, y: -10 })).toBe('Short!');
  });
  it('reads Wide when it lands off to the side', () => {
    expect(missNote(qb, receiver, { x: 305, y: 70 })).toBe('Wide!');
    expect(missNote(qb, receiver, { x: 295, y: -70 })).toBe('Wide!');
  });
  it('judges by the receiver\u2019s actual position, so a ball that led him properly is not blamed on the aim', () => {
    // Receiver ran to x=300 by arrival; the ball landed at x=290 (a hair short) rather than "overthrown".
    expect(missNote(qb, receiver, { x: 290, y: 5 })).toBe('Short!');
  });
  it('works for routes that are not along the x axis', () => {
    expect(missNote({ x: 0, y: 0 }, { x: 0, y: 300 }, { x: 0, y: 380 })).toBe('Overthrown!');
    expect(missNote({ x: 0, y: 0 }, { x: 0, y: 300 }, { x: 0, y: 220 })).toBe('Short!');
  });
  it('does not blow up when the receiver is on top of the QB', () => {
    expect(missNote(qb, qb, { x: 10, y: 0 })).toBe('Off target!');
  });
});
