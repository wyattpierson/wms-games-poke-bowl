import { describe, expect, it } from 'vitest';
import { distance, predictAlongRoute } from './vec2';

describe('predictAlongRoute', () => {
  it('returns the start unchanged when the route is finished', () => {
    const start = { x: 100, y: 100 };
    const p = predictAlongRoute(start, [{ x: 0, y: 0 }], 1, 100, 1);
    expect(p).toEqual(start);
  });

  it('returns the start unchanged when speed is 0', () => {
    const start = { x: 100, y: 100 };
    const p = predictAlongRoute(start, [{ x: 200, y: 100 }], 0, 0, 5);
    expect(p).toEqual(start);
  });

  it('projects straight toward the next waypoint', () => {
    const p = predictAlongRoute({ x: 0, y: 0 }, [{ x: 100, y: 0 }], 0, 100, 0.5);
    expect(p).toEqual({ x: 50, y: 0 });
  });

  it('stops at the end of the route (receiver breaks stride, keeps standing)', () => {
    // 100 px at 100 px/s takes 1 s; 2 s of prediction should land on the waypoint.
    const p = predictAlongRoute({ x: 0, y: 0 }, [{ x: 100, y: 0 }], 0, 100, 2);
    expect(p).toEqual({ x: 100, y: 0 });
  });

  it('follows multiple legs in order', () => {
    const route = [
      { x: 0, y: 100 }, // 100 px leg
      { x: 100, y: 100 }, // 100 px leg
      { x: 100, y: 0 }, // 100 px leg
    ];
    // 300 px of route at 100 px/s: 0.5 s = halfway down leg 1;
    // 1.25 s = a quarter down leg 2; 2.5 s = halfway down leg 3; 3 s = end of route.
    expect(predictAlongRoute({ x: 0, y: 0 }, route, 0, 100, 0.5)).toEqual({ x: 0, y: 50 });
    expect(predictAlongRoute({ x: 0, y: 0 }, route, 0, 100, 1.25)).toEqual({ x: 25, y: 100 });
    expect(predictAlongRoute({ x: 0, y: 0 }, route, 0, 100, 2.5)).toEqual({ x: 100, y: 50 });
    expect(predictAlongRoute({ x: 0, y: 0 }, route, 0, 100, 3)).toEqual({ x: 100, y: 0 });
    // Past the end of the route: stays at the final waypoint.
    expect(predictAlongRoute({ x: 0, y: 0 }, route, 0, 100, 10)).toEqual({ x: 100, y: 0 });
  });

  it('respects a mid-route starting index', () => {
    const route = [
      { x: 0, y: 100 },
      { x: 100, y: 100 },
    ];
    const p = predictAlongRoute({ x: 0, y: 100 }, route, 1, 100, 0.5);
    expect(p).toEqual({ x: 50, y: 100 });
  });

  it('never lands further from the final waypoint than the waypoint itself', () => {
    const route = [{ x: 30, y: 40 }]; // 50 px
    const p = predictAlongRoute({ x: 0, y: 0 }, route, 0, 100, 1);
    expect(distance(p, { x: 30, y: 40 })).toBe(0);
  });
});
