import Phaser from 'phaser';
import {
  ENDZONE_YARDS, FIELD_BOTTOM, FIELD_CENTER_Y, FIELD_HEIGHT, FIELD_TOP, GAME_HEIGHT, PX_PER_YARD, WORLD_WIDTH,
} from '../../config/field';
import { GOAL_LINE_YARD } from '../../core/rules/downs';
import type { DownState } from '../../types';
import { yardsToX } from '../units';

/** Draws the (static) field and the two moving markers: line of scrimmage and first-down line. */
export class Field {
  private readonly losLine: Phaser.GameObjects.Rectangle;
  private readonly firstDownLine: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene) {
    this.drawStatic(scene);
    this.losLine = scene.add.rectangle(0, FIELD_CENTER_Y, 4, FIELD_HEIGHT, 0x3b82f6, 0.9).setDepth(2);
    this.firstDownLine = scene.add.rectangle(0, FIELD_CENTER_Y, 4, FIELD_HEIGHT, 0xfacc15, 0.9).setDepth(2);
  }

  setMarkers(down: DownState): void {
    this.losLine.x = yardsToX(down.lineOfScrimmage);
    this.firstDownLine.x = yardsToX(down.firstDownMarker);
    this.firstDownLine.setVisible(down.firstDownMarker < GOAL_LINE_YARD);
  }

  private drawStatic(scene: Phaser.Scene): void {
    const g = scene.add.graphics().setDepth(0);
    const endzoneWidth = ENDZONE_YARDS * PX_PER_YARD;

    g.fillStyle(0x1c4a20).fillRect(0, 0, WORLD_WIDTH, GAME_HEIGHT); // surroundings
    g.fillStyle(0x2c3e94).fillRect(0, FIELD_TOP, endzoneWidth, FIELD_HEIGHT);
    g.fillStyle(0x942c2c).fillRect(yardsToX(GOAL_LINE_YARD), FIELD_TOP, endzoneWidth, FIELD_HEIGHT);

    // Alternating 5-yard mowing stripes
    for (let i = 0; i < GOAL_LINE_YARD / 5; i++) {
      g.fillStyle(i % 2 === 0 ? 0x34853a : 0x3a8f3f).fillRect(yardsToX(i * 5), FIELD_TOP, 5 * PX_PER_YARD, FIELD_HEIGHT);
    }

    g.lineStyle(2, 0xffffff, 0.8);
    for (let yard = 0; yard <= GOAL_LINE_YARD; yard += 5) {
      g.lineBetween(yardsToX(yard), FIELD_TOP, yardsToX(yard), FIELD_BOTTOM);
    }
    g.lineBetween(0, FIELD_TOP, WORLD_WIDTH, FIELD_TOP);
    g.lineBetween(0, FIELD_BOTTOM, WORLD_WIDTH, FIELD_BOTTOM);

    // Yard numbers every 10 yards, counting up to 50 then back down
    const style = { fontFamily: 'monospace', fontSize: '28px', color: '#ffffff' };
    for (let yard = 10; yard <= 90; yard += 10) {
      const label = String(yard <= 50 ? yard : 100 - yard);
      scene.add.text(yardsToX(yard), FIELD_TOP + 28, label, style).setOrigin(0.5).setAlpha(0.6).setDepth(1);
      scene.add.text(yardsToX(yard), FIELD_BOTTOM - 28, label, style).setOrigin(0.5).setAlpha(0.6).setDepth(1);
    }
  }
}
