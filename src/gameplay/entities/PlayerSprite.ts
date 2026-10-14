import Phaser from 'phaser';
import { PLAYER_IMAGE_SIZE, PLAYER_SIZE, ROUTE_SPEED_FACTOR } from '../../config/gameplay';
import { deriveStats, speedStatToPxPerSec, type InternalStats, type Pokemon } from '../../core/pokemon';
import { spriteKey } from '../../data/sprites';
import type { DefenseRole, Position, Side, Vec2 } from '../../types';
import { clamp } from '../../core/math/vec2';

/**
 * A player on the field: the Pokémon's sprite (or a team-colored square fallback if the
 * texture failed to load) with the Pokémon's name underneath, plus a team-colored shadow.
 *
 * Everything is in a Container: the container holds the GAME position (x/y/pos), while the
 * body's own offset/rotation/scale are reserved for cosmetic animation (walk-bob, juke spin,
 * tackle flash, catch pulse) so effects never pollute gameplay logic.
 */
export class PlayerSprite {
  readonly side: Side;
  readonly position: Position;
  readonly pokemon: Pokemon;
  /** The internal stats the game systems read (derived, see core/pokemon.ts). */
  readonly internal: InternalStats;
  /** Movement speed from the internal Speed stat (see core/pokemon.ts). */
  readonly baseSpeed: number;
  /** Campaign difficulty ramp: extra px/s (opponents only, 0 for the user's team). */
  role?: DefenseRole;
  receiverSlot?: number;

  /** The visible body: sprite image when available, fallback square otherwise. */
  readonly body: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  /** Holds the game position; children are cosmetic. */
  private readonly container: Phaser.GameObjects.Container;
  /** Team-colored ellipse under the player so sides are readable at a glance. */
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly label: Phaser.GameObjects.Text;
  private readonly scene: Phaser.Scene;
  private route: Vec2[] = [];
  private routeIndex = 0;
  private moving = false;
  private bobT = 0;

  constructor(
    scene: Phaser.Scene,
    side: Side,
    position: Position,
    pokemon: Pokemon,
    color: number,
    difficultyBonus = 0,
  ) {
    this.scene = scene;
    this.side = side;
    this.position = position;
    this.pokemon = pokemon;
    this.internal = deriveStats(pokemon.stats);
    this.baseSpeed = speedStatToPxPerSec(this.internal.speed, difficultyBonus);

    const key = spriteKey(pokemon.id);
    this.body = scene.textures.exists(key)
      ? scene.add.image(0, 0, key).setDisplaySize(PLAYER_IMAGE_SIZE, PLAYER_IMAGE_SIZE).setDepth(10)
      : scene.add.rectangle(0, 0, PLAYER_SIZE, PLAYER_SIZE, color).setStrokeStyle(2, 0xffffff).setDepth(10);
    this.shadow = scene.add
      .ellipse(0, PLAYER_IMAGE_SIZE / 2, PLAYER_IMAGE_SIZE * 0.7, PLAYER_IMAGE_SIZE * 0.28, color, 0.45)
      .setDepth(9);
    this.label = scene.add
      .text(0, 0, pokemon.name, { fontFamily: 'monospace', fontSize: '10px', color: '#ffffff' })
      .setOrigin(0.5)
      .setDepth(11);
    this.label.setPosition(0, PLAYER_IMAGE_SIZE / 2 + 8);

    this.container = scene.add.container(0, 0);
    this.container.add([this.shadow, this.body, this.label]);
  }

  get x(): number { return this.container.x; }
  get y(): number { return this.container.y; }
  get pos(): Vec2 { return { x: this.x, y: this.y }; }

  place(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  /** Walk toward a point at a given speed; stand still once within the step distance. */
  moveToward(target: Vec2, speed: number, dt: number): void {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.5) {
      this.moving = false;
      return;
    }
    this.moving = true;
    if (dist <= speed * dt) {
      this.place(target.x, target.y);
    } else {
      this.place(this.x + (dx / dist) * speed * dt, this.y + (dy / dist) * speed * dt);
    }
  }

  /** Walk the route waypoint by waypoint; stand still once finished. */
  followRoute(dt: number): void {
    const waypoint = this.route[this.routeIndex];
    if (!waypoint) {
      this.moving = false;
      return;
    }
    this.moveToward(waypoint, this.baseSpeed * ROUTE_SPEED_FACTOR, dt);
    if (this.x === waypoint.x && this.y === waypoint.y) this.routeIndex++;
  }

  /**
   * Cosmetic per-frame animation: a gentle walk-bob while moving.
   * `moving` lets user-controlled players (moved via `place`) report their own state.
   */
  update(dt: number, moving?: boolean): void {
    const isMoving = moving ?? this.moving;
    if (isMoving) {
      this.bobT += dt;
      this.body.setY(Math.sin(this.bobT * 13) * 2);
    } else if (this.body.y !== 0) {
      this.body.setY(0);
    }
    this.moving = false;
  }

  setRoute(waypoints: Vec2[]): void {
    this.route = waypoints;
    this.routeIndex = 0;
  }

  setGhost(on: boolean): void {
    const alpha = on ? 0.55 : 1;
    this.body.setAlpha(alpha);
    this.label.setAlpha(alpha);
    this.shadow.setAlpha(on ? 0.2 : 0.45);
  }

  // --- Cosmetic one-shot effects (procedural "animation"; sprites are single-frame) ---

  /** Quick 360° spin — used for jukes and getting tackled. */
  spin(duration = 300): void {
    this.scene.tweens.add({
      targets: this.body,
      angle: 360,
      duration,
      ease: 'Sine.easeOut',
      onComplete: () => this.body.setRotation(0),
    });
  }

  /** White flash — impact feedback (tackle landed / sack / interception). Sprite bodies only. */
  flash(duration = 160): void {
    if (!(this.body instanceof Phaser.GameObjects.Image)) return;
    const body = this.body;
    body.setTintFill(0xffffff);
    this.scene.time.delayedCall(duration, () => body.clearTint());
  }

  /** Scale pulse — celebration (catch, touchdown). */
  pulse(): void {
    this.scene.tweens.add({
      targets: this.body,
      scaleX: 1.35,
      scaleY: 1.35,
      duration: 100,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  /** Little hop — the defender who made the play. */
  hop(): void {
    this.scene.tweens.add({
      targets: this.body,
      y: -12,
      duration: 120,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.body);
    this.container.destroy();
  }
}

export function clampToField(pos: Vec2, minX: number, maxX: number, minY: number, maxY: number): Vec2 {
  return { x: clamp(pos.x, minX, maxX), y: clamp(pos.y, minY, maxY) };
}
