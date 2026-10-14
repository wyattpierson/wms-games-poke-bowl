import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/field';
import type { DownState } from '../types';

const STYLE: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: 'monospace', fontSize: '22px', color: '#ffffff' };
const ORDINALS = ['1st', '2nd', '3rd', '4th'];

export function formatYardLine(yard: number): string {
  if (yard === 50) return '50';
  return yard < 50 ? `Own ${yard}` : `Opp ${100 - yard}`;
}

/** Fixed-to-screen overlay: down & distance bar, big center message, controls hint. */
export class Hud {
  private readonly matchLine: Phaser.GameObjects.Text;
  private readonly status: Phaser.GameObjects.Text;
  private readonly message: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    scene.add.rectangle(0, 0, GAME_WIDTH, 64, 0x000000, 0.65).setOrigin(0, 0).setScrollFactor(0).setDepth(100);
    this.matchLine = scene.add
      .text(24, 10, '', { ...STYLE, fontSize: '20px', color: '#facc15' })
      .setScrollFactor(0)
      .setDepth(101);
    this.status = scene.add.text(24, 38, '', STYLE).setScrollFactor(0).setDepth(101);
    this.message = scene.add
      .text(GAME_WIDTH / 2, 112, '', { ...STYLE, fontSize: '40px', stroke: '#000000', strokeThickness: 6 })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);
    this.hint = scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 36, '', { ...STYLE, fontSize: '18px', color: '#e5e7eb' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);
  }

  setDown(d: DownState): void {
    const distance = d.firstDownMarker >= 100 ? 'Goal' : String(Math.ceil(d.yardsToGo));
    this.status.setText(`${ORDINALS[d.down - 1]} & ${distance}    Ball on ${formatYardLine(d.lineOfScrimmage)}`);
  }

  setMatchLine(text: string): void {
    this.matchLine.setText(text);
  }

  setMessage(text: string): void {
    this.message.setText(text);
  }
  setHint(text: string): void {
    this.hint.setText(text);
  }
}
