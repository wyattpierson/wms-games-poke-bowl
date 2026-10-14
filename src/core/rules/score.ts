/** Score. Pure, no Phaser. */

export type Scorer = 'user' | 'opponent';

export interface Score {
  user: number;
  opponent: number;
}

export function newScore(): Score {
  return { user: 0, opponent: 0 };
}

export function addPoints(score: Score, scorer: Scorer, points: number): Score {
  return { ...score, [scorer]: score[scorer] + points };
}
