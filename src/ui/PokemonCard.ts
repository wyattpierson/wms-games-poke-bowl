import Phaser from 'phaser';
import { statLine } from '../core/poach';
import type { Pokemon } from '../core/pokemon';
import type { Position } from '../types';
import { pokemonImage } from './menu';
import { FILL, GRAY, WHITE, textStyle } from './theme';

/**
 * One roster entry in the poach screen: sprite, name, position, and the five
 * user-facing stats. Purely presentational; the scene owns the click logic.
 */
export class PokemonCard {
  readonly width: number;
  readonly height = 58;
  readonly container: Phaser.GameObjects.Container;
  private readonly plate: Phaser.GameObjects.Rectangle;
  private selected = false;
  private enabled = true;

  constructor(scene: Phaser.Scene, x: number, y: number, pokemon: Pokemon, position: Position, width = 372) {
    this.width = width;
    const left = -width / 2;

    this.plate = scene.add.rectangle(0, 0, width, this.height, FILL.plate).setInteractive({ useHandCursor: true });
    const art = pokemonImage(scene, pokemon, left + 34, 0, 44);
    const name = scene.add.text(left + 66, -12, pokemon.name, textStyle(16, WHITE)).setOrigin(0, 0.5);
    const slot = scene.add.text(width / 2 - 12, -12, position, textStyle(13, GRAY)).setOrigin(1, 0.5);
    const stats = scene.add.text(left + 66, 12, statLine(pokemon.stats).replace(/ {2,}/g, ' '), textStyle(12, '#d1d5db')).setOrigin(0, 0.5);

    this.container = scene.add.container(x, y, [this.plate, art, name, slot, stats]);
    this.plate.on('pointerover', () => this.restyle(true));
    this.plate.on('pointerout', () => this.restyle(false));
    this.restyle(false);
  }

  get x(): number { return this.container.x; }
  get y(): number { return this.container.y; }

  /** Gold border = selected. */
  setSelected(on: boolean): void {
    this.selected = on;
    this.restyle(false);
  }

  /** Dimmed and unclickable (e.g. the wrong side). */
  setEnabled(on: boolean): void {
    this.enabled = on;
    this.container.setAlpha(on ? 1 : 0.4);
    if (on) this.plate.setInteractive({ useHandCursor: true });
    else this.plate.disableInteractive();
  }

  onClick(handler: () => void): void {
    this.plate.on('pointerdown', () => {
      if (this.enabled) handler();
    });
  }

  private restyle(hover: boolean): void {
    this.plate.setFillStyle(this.selected ? 0x2b3547 : FILL.plate);
    if (this.selected) this.plate.setStrokeStyle(3, FILL.gold);
    else if (hover) this.plate.setStrokeStyle(2, FILL.borderLight);
    else this.plate.setStrokeStyle(1, FILL.border);
  }
}
