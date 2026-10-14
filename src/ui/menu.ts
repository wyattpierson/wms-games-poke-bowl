import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/field';

/**
 * Shared retro-styled widgets for the menu screens (title, opponent select, result,
 * poach, game over, victory). Scenes stay small by building everything from these.
 */

export const MENU_COLOR = 0x121212;
export const GOLD = '#facc15';
export const WHITE = '#f5f5f4';
export const RED = '#f87171';
export const GREEN = '#4ade80';

const FONT = 'monospace';

export function menuBackground(scene: Phaser.Scene): void {
  scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, MENU_COLOR);
}

export function header(scene: Phaser.Scene, text: string, y = 64): Phaser.GameObjects.Text {
  return scene.add
    .text(GAME_WIDTH / 2, y, text.toUpperCase(), { fontFamily: FONT, fontSize: '34px', color: GOLD })
    .setOrigin(0.5);
}

/** A clickable retro button: dark plate, gold border, hover highlight. Centered at (x, y). */
export function menuButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  width = 260,
  height = 52,
): Phaser.GameObjects.Container {
  const plate = scene.add
    .rectangle(0, 0, width, height, 0x1f2937, 1)
    .setStrokeStyle(2, 0xfacc15)
    .setInteractive();
  const text = scene.add
    .text(0, 0, label.toUpperCase(), { fontFamily: FONT, fontSize: '20px', color: GOLD })
    .setOrigin(0.5);

  plate.on('pointerdown', onClick);
  plate.on('pointerover', () => plate.setStrokeStyle(3, 0xffffff));
  plate.on('pointerout', () => plate.setStrokeStyle(2, 0xfacc15));

  const container = scene.add.container(x, y, [plate, text]);
  container.setDepth(10);
  return container;
}

/** Small non-interactive label (hints, footers). */
export function label(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color = WHITE,
  size = '16px',
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, { fontFamily: FONT, fontSize: size, color })
    .setOrigin(0.5);
}

/** Run summary text: match results + poaches. Used on the end-of-run screens. */
export function runSummaryLines(
  results: { teamName: string; outcome: string }[],
  poaches: { taken: string; side: string; dropped: string }[],
): string {
  const lines = results.length
    ? results.map((r) => `${r.teamName}: ${r.outcome.toUpperCase()}`)
    : ['No matches played'];
  for (const p of poaches) lines.push(`Poached ${p.taken} (${p.side}) — dropped ${p.dropped}`);
  return lines.join('\n');
}
