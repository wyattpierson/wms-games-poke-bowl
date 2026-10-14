/** Match clock. Pure, no Phaser. Time is in seconds (floats); the HUD formats it. */

export interface MatchClock {
  half: number;
  /** Total number of halves in the match. */
  halves: number;
  /** Length of each half in seconds. */
  halfSeconds: number;
  secondsLeft: number;
}

export function newMatchClock(halves: number, halfSeconds: number): MatchClock {
  return { half: 1, halves, halfSeconds, secondsLeft: halfSeconds };
}

export function tickClock(clock: MatchClock, dt: number): MatchClock {
  return { ...clock, secondsLeft: Math.max(0, clock.secondsLeft - dt) };
}

export function isHalfOver(clock: MatchClock): boolean {
  return clock.secondsLeft <= 0;
}

export function isMatchOver(clock: MatchClock): boolean {
  return isHalfOver(clock) && clock.half >= clock.halves;
}

export function nextHalf(clock: MatchClock): MatchClock {
  return { ...clock, half: clock.half + 1, secondsLeft: clock.halfSeconds };
}

export function halfLabel(clock: MatchClock): string {
  return clock.half === 1 ? '1st' : `${clock.half}nd`;
}

/** 95 -> "1:35" */
export function formatClock(secondsLeft: number): string {
  const total = Math.ceil(secondsLeft);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
