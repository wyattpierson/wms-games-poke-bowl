import Phaser from 'phaser';
import type { Vec2 } from '../../types';
import { ACTION_KEYS, MOVE_KEYS, SPRINT_KEYS, type Action } from './bindings';

/**
 * Turns raw input into game-level questions: "which way is the player steering?",
 * "did they just press snap?", "did they release the throw?". Phases never touch keys directly.
 * Call `update()` once per frame, before the phases run.
 */
export class Controls {
  private readonly keys = new Map<string, Phaser.Input.Keyboard.Key>();
  private pressed = new Set<Action>();
  private released = new Set<Action>();

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input is not available');

    const names = new Set<string>([
      ...Object.values(ACTION_KEYS).flat(),
      ...Object.values(MOVE_KEYS).flat(),
      ...SPRINT_KEYS,
    ]);
    for (const name of names) this.keys.set(name, keyboard.addKey(name));
  }

  /** Snapshot this frame's key presses. Done once per frame so actions sharing a key (SPACE) don't steal from each other. */
  update(): void {
    const justDown = new Set<string>();
    const justUp = new Set<string>();
    for (const [name, key] of this.keys) {
      if (Phaser.Input.Keyboard.JustDown(key)) justDown.add(name);
      if (Phaser.Input.Keyboard.JustUp(key)) justUp.add(name);
    }
    this.pressed.clear();
    this.released.clear();
    for (const [action, names] of Object.entries(ACTION_KEYS) as [Action, string[]][]) {
      if (names.some((n) => justDown.has(n))) this.pressed.add(action);
      if (names.some((n) => justUp.has(n))) this.released.add(action);
    }
  }

  justPressed(action: Action): boolean {
    return this.pressed.has(action);
  }

  /** True while any key for the action is held (used for hold-to-aim throwing). */
  isHeld(action: Action): boolean {
    return this.anyDown(ACTION_KEYS[action]);
  }

  /** True if the action was released this frame (used to fire the throw). */
  justReleased(action: Action): boolean {
    return this.released.has(action);
  }

  /** Steering direction, normalized so diagonals aren't faster. */
  get move(): Vec2 {
    const x = Number(this.anyDown(MOVE_KEYS.right)) - Number(this.anyDown(MOVE_KEYS.left));
    const y = Number(this.anyDown(MOVE_KEYS.down)) - Number(this.anyDown(MOVE_KEYS.up));
    const length = Math.hypot(x, y);
    return length === 0 ? { x: 0, y: 0 } : { x: x / length, y: y / length };
  }

  get sprint(): boolean {
    return this.anyDown(SPRINT_KEYS);
  }

  private anyDown(names: string[]): boolean {
    return names.some((n) => this.keys.get(n)?.isDown === true);
  }
}
