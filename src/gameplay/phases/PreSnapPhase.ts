import Phaser from 'phaser';
import { FIELD_CENTER_Y } from '../../config/field';
import { TEAM_COLORS } from '../../config/gameplay';
import type { Vec2 } from '../../types';
import type { PlaySession } from '../PlaySession';
import { yardsToX } from '../units';
import type { Phase } from './Phase';

/**
 * Teams are lined up; waiting for the player to pick the play:
 *   SPACE = pass (snap into the dropback)
 *   R     = run (handoff to the RB)
 * The receivers' routes are drawn on the field as preview lines.
 */
export class PreSnapPhase implements Phase {
  private readonly preview: Phaser.GameObjects.Graphics;

  constructor(private readonly session: PlaySession) {
    this.preview = session.scene.add.graphics().setDepth(5);
  }

  enter(): void {
    this.session.lineUp();
    this.drawRoutePreview();
    this.session.hud.setMessage('');
    const scheme = this.session.coverage.scheme.toUpperCase();
    this.session.hud.setHint(
      `PLAY: ${this.session.play.name.toUpperCase()}   DEF: ${scheme}    |    SPACE: pass (hold to aim)    R: run`,
    );
  }

  update(): void {
    const c = this.session.controls;
    if (c.justPressed('snap')) this.session.goTo({ phase: 'pass' });
    else if (c.justPressed('run')) this.session.goTo({ phase: 'run', carrier: this.session.rb });
  }

  exit(): void {
    this.preview.destroy();
  }

  /** Draw each receiver's route as a line from the start spot through its waypoints. */
  private drawRoutePreview(): void {
    const g = this.preview;
    const losX = yardsToX(this.session.down.lineOfScrimmage);
    g.lineStyle(3, TEAM_COLORS.offense, 0.55);
    g.fillStyle(TEAM_COLORS.offense, 0.7);

    for (const slot of this.session.play.offense) {
      if (!slot.route) continue;
      const start: Vec2 = { x: losX + slot.offset.x, y: FIELD_CENTER_Y + slot.offset.y };
      let prev = start;
      for (const wp of slot.route) {
        const point: Vec2 = { x: start.x + wp.x, y: start.y + wp.y };
        g.lineBetween(prev.x, prev.y, point.x, point.y);
        prev = point;
      }
      g.fillCircle(prev.x, prev.y, 5);
    }
  }
}
