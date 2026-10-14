import { describe, expect, it } from 'vitest';
import { CHAMPION_DIFFICULTY_BONUS, DIFFICULTY_PER_WIN } from '../config/campaign';
import { CHAMPION_TEAM, EMBER_BLITZ, PLAYER_TEAM } from './teams';
import {
  applyPoach, availableOpponents, clonePokemon, cloneTeam, difficultyBonus,
  isChampion, newRun, recordResult, runEnded, teamById, wins, type CampaignState,
} from './campaign';

const EMBER = EMBER_BLITZ.id;
const BOSS = CHAMPION_TEAM.id;

describe('campaign run state', () => {
  it('starts with a cloned starter roster and no results', () => {
    const run = newRun();
    expect(run.userTeam.id).toBe(PLAYER_TEAM.id);
    expect(run.userTeam.offense).toHaveLength(7);
    expect(run.userTeam.defense).toHaveLength(7);
    expect(run.results).toEqual({});
    expect(run.gameOver).toBe(false);
    expect(run.victory).toBe(false);
  });

  it('clones the starter roster so the run never mutates PLAYER_TEAM', () => {
    const run = newRun();
    run.userTeam.offense[0]!.stats.speed = 1;
    expect(PLAYER_TEAM.offense[0]!.stats.speed).not.toBe(1);
    expect(cloneTeam(run.userTeam).offense[0]).not.toBe(run.userTeam.offense[0]);
    expect(clonePokemon(PLAYER_TEAM.offense[0]!)).not.toBe(PLAYER_TEAM.offense[0]);
  });

  it('records a win and keeps the run going', () => {
    const after = recordResult(newRun(), EMBER, 'win');
    expect(after.results[EMBER]).toBe('win');
    expect(wins(after)).toBe(1);
    expect(after.gameOver).toBe(false);
    expect(after.victory).toBe(false);
  });

  it('ends the run on a loss', () => {
    const after = recordResult(newRun(), EMBER, 'loss');
    expect(after.gameOver).toBe(true);
    expect(availableOpponents(after)).toHaveLength(0);
  });

  it('treats a tie as consumed-but-not-ending (no reward, no replay)', () => {
    const after = recordResult(newRun(), EMBER, 'tie');
    expect(after.results[EMBER]).toBe('tie');
    expect(after.gameOver).toBe(false);
    expect(availableOpponents(after).map((t) => t.id)).not.toContain(EMBER);
  });

  it('wins the run by beating the champion', () => {
    const after = recordResult(newRun(), BOSS, 'win');
    expect(after.victory).toBe(true);
  });

  it('does not let a team be faced twice', () => {
    const after = recordResult(newRun(), EMBER, 'win');
    expect(() => recordResult(after, EMBER, 'loss')).toThrow();
  });

  it('refuses to record results once the run is over', () => {
    const over = recordResult(newRun(), EMBER, 'loss');
    expect(() => recordResult(over, BOSS, 'win')).toThrow();
  });

  it('ends quietly once every team is consumed with no win or loss', () => {
    let run: CampaignState = newRun();
    for (const t of ['ember-blitz', 'stone-circle', 'tidal-wave', BOSS]) {
      run = recordResult(run, t, 'tie');
    }
    expect(runEnded(run)).toBe(true);
  });

  it('lists the unfaced teams (champion always available) as available', () => {
    const after = recordResult(newRun(), EMBER, 'win');
    expect(availableOpponents(after).map((t) => t.id)).toContain(BOSS);
    expect(availableOpponents(after).map((t) => t.id)).not.toContain(EMBER);
  });
});

describe('poaching', () => {
  it('swaps one of the player\'s Pokémon for one from the just-beaten team', () => {
    const won = recordResult(newRun(), EMBER, 'win');
    const sourceIdx = 0;
    const droppedIdx = 4;
    const after = applyPoach(won, 'offense', EMBER, sourceIdx, droppedIdx);
    const taken = EMBER_BLITZ.offense[sourceIdx]!;
    expect(after.userTeam.offense[droppedIdx]!.id).toBe(taken.id);
    // the original occupant is gone
    expect(after.userTeam.offense.some((p) => p.id === won.userTeam.offense[droppedIdx]!.id)).toBe(false);
    // roster size unchanged, rest of the side untouched
    expect(after.userTeam.offense).toHaveLength(7);
    expect(after.poaches).toHaveLength(1);
    expect(after.poaches[0]!.taken).toBe(taken.name);
  });

  it('keeps the taken Pokémon\'s original stats (cloned, not shared)', () => {
    const won = recordResult(newRun(), EMBER, 'win');
    const after = applyPoach(won, 'defense', EMBER, 1, 1);
    const taken = EMBER_BLITZ.defense[1]!;
    expect(after.userTeam.defense[1]!.stats).toEqual(taken.stats);
    expect(after.userTeam.defense[1]!.stats).not.toBe(taken.stats);
  });

  it('cannot poach from a team that was not just beaten', () => {
    const fresh = newRun();
    expect(() => applyPoach(fresh, 'offense', EMBER, 0, 0)).toThrow();
  });

  it('cannot poach from the champion', () => {
    const won = recordResult(newRun(), BOSS, 'win');
    expect(() => applyPoach(won, 'offense', BOSS, 0, 0)).toThrow();
  });

  it('rejects bad roster indices', () => {
    const won = recordResult(newRun(), EMBER, 'win');
    expect(() => applyPoach(won, 'offense', EMBER, 7, 0)).toThrow();
    expect(() => applyPoach(won, 'offense', EMBER, 0, 7)).toThrow();
  });
});

describe('difficulty ramp', () => {
  it('is 0 at the start of a run vs a regular team', () => {
    expect(difficultyBonus(newRun(), EMBER)).toBe(0);
  });

  it('ramps up by DIFFICULTY_PER_WIN for each win', () => {
    const run = recordResult(newRun(), EMBER, 'win');
    expect(difficultyBonus(run, 'stone-circle')).toBe(DIFFICULTY_PER_WIN);
  });

  it('adds the flat champion bonus on top of the ramp', () => {
    const run = recordResult(newRun(), EMBER, 'win');
    expect(difficultyBonus(run, BOSS)).toBe(CHAMPION_DIFFICULTY_BONUS + DIFFICULTY_PER_WIN);
  });

  it('flags the champion team', () => {
    expect(isChampion(BOSS)).toBe(true);
    expect(isChampion(EMBER)).toBe(false);
  });

  it('teamById resolves every campaign team', () => {
    for (const t of [EMBER_BLITZ, CHAMPION_TEAM]) expect(teamById(t.id).id).toBe(t.id);
    expect(() => teamById('nope')).toThrow();
  });
});
