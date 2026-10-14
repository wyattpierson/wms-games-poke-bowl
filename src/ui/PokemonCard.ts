import Phaser from 'phaser';
import { statLine } from '../core/poach';
import type { Pokemon } from '../core/pokemon';
import { spriteKey } from '../data/sprites';
import type { Position } from '../types';
import { WHITE } from './menu';

/**
 * One roster entry in the poach screen: sprite, name, position, and the five
 * user-facing stats. Purely presentational; the scene owns the click logic.
 */
export class PokemonCard {
  readonly width = 400;
  readonly height = 66;
  private readonly plate: Phaser.GameObjects.Rectangle;
  readonly container: Phaser.GameObjects.Container;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    pokemon: Pokemon,
    position: Position,
  ) {
    this.plate = scene.add
      .rectangle(0, 0, this.width, this.height, 0x1f2937, 1)
      .setStrokeStyle(1, 0x4b5563)
      .setInteractive();

    const dexKey = spriteKey(pokemon.id);
    const art = scene.textures.exists(dexKey)
      ? scene.add.image(-this.width / 2 + 33, 0, dexKey).setDisplaySize(48, 48)
      : scene.add.rectangle(-this.width / 2 + 33, 0, 48, 48, 0x374151);

    const name = scene.add
      .text(-this.width / 2 + 70, -14, `${pokemon.name}  —  ${position}`, { fontFamily: 'monospace', fontSize: '17px', color: WHITE });
    const stats = scene.add
      .text(-this.width / 2 + 70, 12, statLine(pokemon.stats), { fontFamily: 'monospace', fontSize: '13px', color: '#d1d5db' });

    this.container = scene.add.container(x, y, [this.plate, art, name, stats]);
  }

  get x(): number { return this.container.x; }
  get y(): number { return this.container.y; }

  /** Gold border = selected; dim = not clickable (e.g. wrong side). */
  setSelected(on: boolean): void {
    this.plate.setStrokeStyle(on ? 3 : 1, on ? 0xfacc15 : 0x4b5563);
  }

  setEnabled(on: boolean): void {
    this.container.setAlpha(on ? 1 : 0.4);
    this.plate.setInteractive(on);
  }

  onClick(handler: () => void): void {
    this.plate.on('pointerdown', handler);
  }
}
