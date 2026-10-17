import { describe, expect, it } from 'vitest';
import { applyPoach, newRun, recordResult, startMatch } from './campaign';
import { parseRun, serializeRun } from './runSave';

describe('run save format', () => {
  it('round-trips a run with results, a poach, and a match in progress', () => {
    let run = recordResult(newRun(), 'ember-blitz', 'win');
    run = applyPoach(run, 'offense', 'ember-blitz', 4, 4);
    run = startMatch(run, 'stone-circle');
    expect(parseRun(serializeRun(run))).toEqual(run);
  });

  it('ignores missing, corrupt, and wrong-version data', () => {
    expect(parseRun(null)).toBeNull();
    expect(parseRun('')).toBeNull();
    expect(parseRun('{not json')).toBeNull();
    expect(parseRun(JSON.stringify({ version: 999, run: newRun() }))).toBeNull();
    expect(parseRun(JSON.stringify({ run: newRun() }))).toBeNull();
  });

  it('rejects structurally invalid runs', () => {
    const wrap = (run: unknown) => JSON.stringify({ version: 1, run });
    const good = JSON.parse(serializeRun(newRun())).run;
    expect(parseRun(wrap({ ...good, userTeam: { ...good.userTeam, offense: good.userTeam.offense.slice(1) } }))).toBeNull();
    expect(parseRun(wrap({ ...good, results: { 'no-such-team': 'win' } }))).toBeNull();
    expect(parseRun(wrap({ ...good, results: { 'ember-blitz': 'maybe' } }))).toBeNull();
    expect(parseRun(wrap({ ...good, gameOver: 'no' }))).toBeNull();
    expect(parseRun(wrap({ ...good, pendingPoach: 'no-such-team' }))).toBeNull();
    const badStat = structuredClone(good);
    badStat.userTeam.defense[0].stats.speed = 'fast';
    expect(parseRun(wrap(badStat))).toBeNull();
  });
});
