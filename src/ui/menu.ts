import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/field';
import { teamById, type CampaignState } from '../core/campaign';
import type { Pokemon } from '../core/pokemon';
import { spriteKey } from '../data/sprites';
import { FADE_MS, FILL, GOLD, GRAY, GREEN, RED, WHITE, textStyle } from './theme';

/**
 * Shared retro-styled widgets for the menu screens (title, opponent select, result,
 * poach, game over, victory). Scenes stay small by building everything from these.
 */

// Re-exported so scenes can import colors and widgets from one place.
export { DIM, GOLD, GRAY, GREEN, RED, WHITE } from './theme';

/** Dark backdrop with faint mowing stripes (echoing the field). Also fades the scene in. */
export function menuBackground(scene: Phaser.Scene): void {
  scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, FILL.background);
  for (let x = 80; x < GAME_WIDTH; x += 160) {
    scene.add.rectangle(x + 40, GAME_HEIGHT / 2, 80, GAME_HEIGHT, 0xffffff, 0.03);
  }
  scene.cameras.main.fadeIn(FADE_MS, 0, 0, 0);
}

/**
 * Fade to black, then start another scene. Works while the fade-IN is still playing (so an early
 * key press isn't lost), but ignores repeat calls once a fade-OUT is underway (no double start).
 */
export function fadeTo(scene: Phaser.Scene, key: string, data?: object): void {
  const camera = scene.cameras.main;
  if (camera.fadeEffect.isRunning && camera.fadeEffect.direction) return;
  camera.fadeOut(FADE_MS, 0, 0, 0);
  camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => scene.scene.start(key, data));
}

export function header(scene: Phaser.Scene, text: string, y = 64): Phaser.GameObjects.Text {
  return scene.add.text(GAME_WIDTH / 2, y, text.toUpperCase(), textStyle(34, GOLD)).setOrigin(0.5);
}

export interface ButtonOptions {
  width?: number;
  height?: number;
  fontSize?: number;
  /** Quieter look (gray border, white text) for secondary actions. */
  secondary?: boolean;
  /** Phaser key names (e.g. 'ENTER', 'SPACE') that also trigger the button. */
  hotkeys?: string[];
  /** Red look for destructive actions. */
  danger?: boolean;
}

/** A clickable retro button: dark plate, border, hover highlight, hand cursor. Centered at (x, y). */
export class MenuButton {
  readonly container: Phaser.GameObjects.Container;
  private readonly plate: Phaser.GameObjects.Rectangle;
  private readonly text: Phaser.GameObjects.Text;
  private enabled = true;
  private active: boolean;
  private readonly danger: boolean;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    options: ButtonOptions = {},
  ) {
    const { width = 260, height = 52, secondary = false, hotkeys = [], danger = false } = options;
    const fontSize = options.fontSize ?? (secondary || danger ? 16 : 20);
    this.active = !secondary;
    this.danger = danger;
    this.plate = scene.add.rectangle(0, 0, width, height, FILL.plate).setInteractive({ useHandCursor: true });
    this.text = scene.add.text(0, 0, label.toUpperCase(), textStyle(fontSize, GOLD)).setOrigin(0.5);
    this.container = scene.add.container(x, y, [this.plate, this.text]).setDepth(10);
    this.restyle(false);

    this.plate.on('pointerover', () => this.restyle(true));
    this.plate.on('pointerout', () => this.restyle(false));
    this.plate.on('pointerdown', () => this.press(onClick));
    for (const key of hotkeys) {
      // Ignore key auto-repeat so holding a key can't fire the button repeatedly.
      scene.input.keyboard?.on(`keydown-${key}`, (event: KeyboardEvent) => {
        if (!event.repeat) this.press(onClick);
      });
    }
  }

  /** Gold = highlighted/selected, gray = idle. Used for toggles (e.g. offense/defense). */
  setActive(on: boolean): void {
    this.active = on;
    this.restyle(false);
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.container.setAlpha(on ? 1 : 0.4);
    this.restyle(false);
  }

  private press(onClick: () => void): void {
    if (this.enabled) onClick();
  }

  private restyle(hover: boolean): void {
    const lit = hover && this.enabled;
    this.plate.setFillStyle(lit ? FILL.plateHover : FILL.plate);
    const border = this.danger ? FILL.red : this.active ? FILL.gold : FILL.borderLight;
    this.plate.setStrokeStyle(lit ? 3 : 2, lit ? 0xffffff : border);
    this.text.setColor(this.danger ? RED : this.active ? GOLD : WHITE);
  }
}

/** Small non-interactive label (hints, footers), centered on (x, y). */
export function label(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color = WHITE,
  size = '16px',
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, textStyle(parseInt(size, 10), color)).setOrigin(0.5);
}

/** A dark bordered panel centered on (x, y). */
export function panel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  border: number = FILL.border,
): Phaser.GameObjects.Rectangle {
  return scene.add.rectangle(x, y, width, height, FILL.panel).setStrokeStyle(2, border);
}

/** A Pokémon's sprite at (x, y), or a gray square if the sprite failed to load (e.g. offline). */
export function pokemonImage(
  scene: Phaser.Scene,
  pokemon: Pokemon,
  x: number,
  y: number,
  size: number,
): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle {
  const key = spriteKey(pokemon.id);
  return scene.textures.exists(key)
    ? scene.add.image(x, y, key).setDisplaySize(size, size)
    : scene.add.rectangle(x, y, size, size, 0x374151);
}

/** A horizontal row of sprites centered on (x, y). `bob` makes them hop in a staggered wave. */
export function rosterStrip(
  scene: Phaser.Scene,
  x: number,
  y: number,
  group: readonly Pokemon[],
  size = 36,
  gap = 44,
  bob = false,
): void {
  const startX = x - ((group.length - 1) * gap) / 2;
  group.forEach((pokemon, i) => {
    const sprite = pokemonImage(scene, pokemon, startX + i * gap, y, size);
    if (bob) {
      scene.tweens.add({ targets: sprite, y: y - 6, duration: 500, yoyo: true, repeat: -1, delay: i * 90, ease: 'Sine.easeInOut' });
    }
  });
}

const OUTCOME_COLOR: Record<string, string> = { win: GREEN, loss: RED, tie: GRAY };

/**
 * Run recap panel (match results + poaches) for the end-of-run screens.
 * Top edge at `top`, centered on `x`. Returns the panel height so callers can lay out below it.
 */
export function runSummaryPanel(scene: Phaser.Scene, x: number, top: number, state: CampaignState): number {
  const results = Object.entries(state.results);
  const { poaches } = state;
  const lineHeight = 28;
  const width = 640;
  const height = 70 + Math.max(1, results.length) * lineHeight + (poaches.length ? 20 + poaches.length * lineHeight : 0);

  panel(scene, x, top + height / 2, width, height);
  scene.add.text(x, top + 26, 'RUN RECAP', textStyle(16, GOLD)).setOrigin(0.5);

  let y = top + 62;
  if (results.length === 0) {
    scene.add.text(x, y, 'No matches played', textStyle(16, GRAY)).setOrigin(0.5);
    y += lineHeight;
  }
  for (const [teamId, outcome] of results) {
    scene.add.text(x - width / 2 + 28, y, teamById(teamId).name, textStyle(16, WHITE)).setOrigin(0, 0.5);
    scene.add.text(x + width / 2 - 28, y, outcome.toUpperCase(), textStyle(16, OUTCOME_COLOR[outcome] ?? WHITE)).setOrigin(1, 0.5);
    y += lineHeight;
  }
  if (poaches.length) {
    y += 20;
    for (const poach of poaches) {
      const text = `Took ${poach.taken} for ${poach.dropped} (${poach.side === 'offense' ? 'OFF' : 'DEF'})`;
      scene.add.text(x - width / 2 + 28, y, text, textStyle(16, GRAY)).setOrigin(0, 0.5);
      y += lineHeight;
    }
  }
  return height;
}
