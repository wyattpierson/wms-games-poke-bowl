import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/field';
import { MenuButton, panel } from './menu';
import { FILL, RED, WHITE, textStyle } from './theme';

export interface ConfirmOptions {
  title: string;
  body: string;
  /** The destructive choice (shown red). */
  confirmLabel: string;
  /** The safe choice (shown highlighted). */
  cancelLabel: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

/**
 * A modal "are you sure?" box over a dimmed screen. The dim layer swallows clicks so nothing
 * behind it can be pressed. The owning scene wires keyboard (call `cancel()` on ESC) and must
 * ignore its own hotkeys while a dialog is open.
 */
export class ConfirmDialog {
  private readonly container: Phaser.GameObjects.Container;
  private closed = false;

  constructor(scene: Phaser.Scene, private readonly options: ConfirmOptions) {
    const mid = GAME_WIDTH / 2;
    const dim = scene.add.rectangle(mid, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.75).setInteractive();
    const box = panel(scene, mid, 360, 760, 300, FILL.red);
    const title = scene.add.text(mid, 268, options.title.toUpperCase(), textStyle(28, RED)).setOrigin(0.5);
    const body = scene.add
      .text(mid, 350, options.body, { ...textStyle(16, WHITE), align: 'center', lineSpacing: 12, wordWrap: { width: 680 } })
      .setOrigin(0.5);
    const confirm = new MenuButton(scene, mid - 190, 448, options.confirmLabel, () => this.confirm(), {
      width: 320, height: 52, fontSize: 16, danger: true,
    });
    const cancel = new MenuButton(scene, mid + 190, 448, options.cancelLabel, () => this.cancel(), {
      width: 320, height: 52, fontSize: 16,
    });
    this.container = scene.add.container(0, 0, [dim, box, title, body, confirm.container, cancel.container]).setDepth(200);
  }

  confirm(): void {
    if (this.closed) return;
    this.destroy();
    this.options.onConfirm();
  }

  cancel(): void {
    if (this.closed) return;
    this.destroy();
    this.options.onCancel?.();
  }

  destroy(): void {
    this.closed = true;
    this.container.destroy();
  }
}
