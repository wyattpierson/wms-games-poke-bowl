import Phaser from 'phaser';

/**
 * Look-and-feel constants shared by every menu and the HUD.
 * Want a different font (e.g. a pixel font)? Change FONT here; every screen follows.
 */
export const FONT_FACE = '"Press Start 2P"';
export const FONT = `${FONT_FACE}, monospace`;

// Text colors (CSS strings, for Phaser text)
export const GOLD = '#facc15';
export const WHITE = '#f5f5f4';
export const RED = '#f87171';
export const GREEN = '#4ade80';
export const GRAY = '#9ca3af';
export const DIM = '#6b7280';

// Fill and border colors (numbers, for Phaser shapes)
export const FILL = {
  background: 0x101418,
  plate: 0x1f2937,
  plateHover: 0x374151,
  panel: 0x111827,
  border: 0x4b5563,
  borderLight: 0x9ca3af,
  gold: 0xfacc15,
  red: 0xef4444,
} as const;

/** Screen fade duration (ms) for menu transitions. */
export const FADE_MS = 180;

/**
 * Press Start 2P is drawn on an 8px grid, so it is only crisp at multiples of 8.
 * Scenes ask for a rough size and this snaps it to the nearest step of the scale:
 *   ≤13 → 8 (captions, hints)   14–19 → 16 (body, buttons)   20–30 → 24 (sub-headers)
 *   31–44 → 32 (headers)   45–60 → 48 (big labels)   larger → nearest multiple of 8.
 * (If you ever swap FONT for a normal font, return `size` unchanged here.)
 */
export function pixelSize(size: number): number {
  if (size <= 13) return 8;
  if (size <= 19) return 16;
  if (size <= 30) return 24;
  if (size <= 44) return 32;
  if (size <= 60) return 48;
  return Math.round(size / 8) * 8;
}

export function textStyle(size: number, color: string = WHITE): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: FONT, fontSize: `${pixelSize(size)}px`, color };
}
