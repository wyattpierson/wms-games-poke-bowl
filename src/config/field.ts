/** Field and screen geometry. World units are pixels; the field runs left-to-right. */

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const PX_PER_YARD = 32;
export const ENDZONE_YARDS = 10;
export const FIELD_YARDS = 100;
export const WORLD_WIDTH = (FIELD_YARDS + 2 * ENDZONE_YARDS) * PX_PER_YARD;

// Playable strip (sidelines). The space above is reserved for the HUD.
export const FIELD_TOP = 160;
export const FIELD_HEIGHT = 400;
export const FIELD_BOTTOM = FIELD_TOP + FIELD_HEIGHT;
export const FIELD_CENTER_Y = FIELD_TOP + FIELD_HEIGHT / 2;

/** Where each drive starts (yards from own goal line). */
export const DRIVE_START_YARD = 25;
