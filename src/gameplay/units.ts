import { ENDZONE_YARDS, PX_PER_YARD } from '../config/field';

/** Convert between yards-from-own-goal-line (rules) and world x pixels (rendering). */
export const yardsToX = (yards: number): number => (yards + ENDZONE_YARDS) * PX_PER_YARD;
export const xToYards = (x: number): number => x / PX_PER_YARD - ENDZONE_YARDS;
