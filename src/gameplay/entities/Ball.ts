import Phaser from 'phaser';
import type { Vec2 } from '../../types';
import type { PlayerSprite } from './PlayerSprite';
import { clamp } from '../../core/math/vec2';

/**
 * The football. `pos` is the GROUND position (what game logic uses). While in flight the
 * visible shape is drawn above the ground point along a parabola (2.5D arc) and a shadow
 * stays on the ground — so passes read as arcing without any change to the top-down logic.
 */
export class Ball {
  readonly shape: Phaser.GameObjects.Ellipse;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private groundX = 0;
  private groundY = 0;
  private flightT = 0; // 0..1 progress through the arc
  private arcHeight = 0; // px of peak height for this throw

  constructor(scene: Phaser.Scene) {
    this.shape = scene.add.ellipse(0, 0, 16, 10, 0x8b5a2b).setStrokeStyle(1, 0xffffff).setDepth(20);
    this.shadow = scene.add.ellipse(0, 0, 14, 6, 0x000000, 0.35).setDepth(9);
  }

  /** The ground position — game logic (targeting, catching) always uses this. */
  get pos(): Vec2 { return { x: this.groundX, y: this.groundY }; }

  place(x: number, y: number): void {
    this.groundX = x;
    this.groundY = y;
    this.render();
  }

  /** Start a flight with a given peak height; call `setFlight(t)` each frame. */
  beginFlight(arcHeight: number): void {
    this.arcHeight = arcHeight;
    this.flightT = 0;
    this.render();
  }

  /** Update flight progress (0 = release, 1 = arrival). */
  setFlight(t: number): void {
    this.flightT = clamp(t, 0, 1);
    this.render();
  }

  /** End flight (catch, incomplete) and hold the ball just above a player. */
  attachTo(player: PlayerSprite): void {
    this.arcHeight = 0;
    this.flightT = 0;
    this.place(player.x, player.y - 18);
  }

  private render(): void {
    const flying = this.flightT > 0.001 && this.flightT < 0.999 && this.arcHeight > 0;
    const h = flying ? Math.sin(Math.PI * this.flightT) * this.arcHeight : 0;
    this.shape.setPosition(this.groundX, this.groundY - h);
    this.shape.setScale(flying ? 1 + 0.5 * (h / this.arcHeight) : 1);
    this.shadow.setPosition(this.groundX, this.groundY + 14);
    this.shadow.setScale(flying ? 1 - 0.4 * (h / this.arcHeight) : 1);
    this.shadow.setAlpha(flying ? 0.35 : 0);
  }
}
