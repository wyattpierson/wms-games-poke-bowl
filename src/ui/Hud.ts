import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/field';
import { CAMERA_ZOOM } from '../config/gameplay';
import type { DownState } from '../types';
import { GOLD, GRAY, textStyle } from './theme';

const ORDINALS = ['1st', '2nd', '3rd', '4th'];

export function formatYardLine(yard: number): string {
  if (yard === 50) return '50';
  return yard < 50 ? `Own ${yard}` : `Opp ${100 - yard}`;
}

type Pinnable = Phaser.GameObjects.Text | Phaser.GameObjects.Rectangle;

/**
 * Pin an object to a fixed SCREEN position, even though the main camera is zoomed.
 *
 * A scrollFactor-0 object still gets scaled about the camera's center by the zoom, so
 * plain screen coordinates drift off-screen (at zoom 1.2 the whole HUD ended up outside
 * the frame). We counter it: place the object at the world point that the zoom maps back
 * onto the wanted screen point, and shrink it by 1/zoom so it draws at its natural size.
 */
function pin<T extends Pinnable>(object: T, screenX: number, screenY: number): T {
  const cx = GAME_WIDTH / 2;
  const cy = GAME_HEIGHT / 2;
  object.setScrollFactor(0);
  object.setScale(1 / CAMERA_ZOOM);
  object.setPosition(cx + (screenX - cx) / CAMERA_ZOOM, cy + (screenY - cy) / CAMERA_ZOOM);
  return object;
}

/** Screen-fixed overlay: scoreboard + down & distance (top), big center message, controls hint (bottom). */
export class Hud {
  private readonly matchLine: Phaser.GameObjects.Text;
  private readonly status: Phaser.GameObjects.Text;
  private readonly message: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const mid = GAME_WIDTH / 2;

    pin(scene.add.rectangle(0, 0, GAME_WIDTH, 64, 0x000000, 0.7).setOrigin(0, 0), 0, 0).setDepth(100);
    this.matchLine = pin(scene.add.text(0, 0, '', textStyle(16, GOLD)).setOrigin(0.5), mid, 22).setDepth(101);
    this.status = pin(scene.add.text(0, 0, '', textStyle(16)).setOrigin(0.5), mid, 46).setDepth(101);
    pin(scene.add.text(0, 0, 'ESC: PAUSE', textStyle(12, GRAY)).setOrigin(1, 0.5), GAME_WIDTH - 16, 21).setDepth(101);

    this.message = pin(
      scene.add.text(0, 0, '', { ...textStyle(40), align: 'center', lineSpacing: 14, stroke: '#000000', strokeThickness: 6 }).setOrigin(0.5),
      mid,
      130,
    ).setDepth(101);

    // The hint sits on a dark strip so it stays readable over the grass.
    pin(scene.add.rectangle(0, 0, GAME_WIDTH, 36, 0x000000, 0.6).setOrigin(0, 0), 0, GAME_HEIGHT - 36).setDepth(100);
    this.hint = pin(scene.add.text(0, 0, '', textStyle(16, '#e5e7eb')).setOrigin(0.5), mid, GAME_HEIGHT - 18).setDepth(101);
  }

  setDown(d: DownState): void {
    const distance = d.firstDownMarker >= 100 ? 'Goal' : String(Math.ceil(d.yardsToGo));
    this.status.setText(`${ORDINALS[d.down - 1]} & ${distance}   ·   Ball on ${formatYardLine(d.lineOfScrimmage)}`);
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
