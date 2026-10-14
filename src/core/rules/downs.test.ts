import { describe, expect, it } from 'vitest';
import { newDrive, resolvePlay } from './downs';

describe('newDrive', () => {
  it('sets the first-down marker 10 yards out', () => {
    expect(newDrive(25)).toEqual({ down: 1, yardsToGo: 10, lineOfScrimmage: 25, firstDownMarker: 35 });
  });
  it('caps the marker at the goal line', () => {
    expect(newDrive(95)).toMatchObject({ firstDownMarker: 100, yardsToGo: 5 });
  });
});

describe('resolvePlay', () => {
  const start = newDrive(25);

  it('awards a first down when the marker is reached', () => {
    expect(resolvePlay(start, 40)).toMatchObject({ kind: 'firstDown', state: { down: 1, lineOfScrimmage: 40, firstDownMarker: 50 } });
  });
  it('advances the down on a short gain', () => {
    expect(resolvePlay(start, 30)).toMatchObject({ kind: 'continue', state: { down: 2, yardsToGo: 5, lineOfScrimmage: 30 } });
  });
  it('counts an incomplete pass (no gain) as a used down', () => {
    expect(resolvePlay(start, 25)).toMatchObject({ kind: 'continue', state: { down: 2, yardsToGo: 10 } });
  });
  it('turns the ball over on a failed 4th down', () => {
    expect(resolvePlay({ ...start, down: 4 }, 30)).toEqual({ kind: 'turnoverOnDowns' });
  });
  it('scores a touchdown at the goal line', () => {
    expect(resolvePlay(start, 100)).toEqual({ kind: 'touchdown' });
  });
});
