import Phaser from 'phaser';
import type { MatchConfig } from '../types';
import { buildPlay } from '../data/playbook';
import { Controls } from '../gameplay/controls/Controls';
import { Field } from '../gameplay/entities/Field';
import { PlaySession } from '../gameplay/PlaySession';
import { Hud } from '../ui/Hud';

/**
 * The on-field screen. Receives a MatchConfig (teams + difficulty ramp) via init(),
 * wires the pieces together (all the logic lives in PlaySession and its phases), and
 * routes the outcome back into the campaign once the match ends.
 */
export class GameScene extends Phaser.Scene {
  private controls!: Controls;
  private session!: PlaySession;
  private config!: MatchConfig;

  constructor() {
    super('GameScene');
  }

  init(config: MatchConfig): void {
    if (!config?.opponent) throw new Error('GameScene needs a MatchConfig (see OpponentSelectScene)');
    this.config = config;
  }

  create(): void {
    const field = new Field(this);
    const hud = new Hud(this);
    this.controls = new Controls(this);
    const play = buildPlay(this.config.userTeam, this.config.opponent);
    this.session = new PlaySession(
      this, play, field, this.controls, hud,
      this.config.userTeam, this.config.opponent, this.config.difficultyBonus,
    );
    this.session.goTo({ phase: 'preSnap' });
  }

  update(_time: number, delta: number): void {
    this.controls.update();
    // ESC opens the pause menu (forfeiting happens there, behind a confirmation).
    if (!this.session.matchOver && this.controls.justPressed('pause')) {
      this.pause();
      return;
    }
    // Clamp dt so a background tab or hiccup can't teleport players.
    this.session.update(Math.min(delta, 50) / 1000);
  }

  /** The pause menu is its own scene (own un-zoomed camera); this scene just freezes until it resumes. */
  private pause(): void {
    this.scene.launch('PauseScene', { opponentId: this.config.opponent.id, opponentName: this.config.opponent.name });
    this.scene.pause();
    // Keys released while paused would otherwise stay "held" after resuming.
    this.events.once(Phaser.Scenes.Events.RESUME, () => this.input.keyboard?.resetKeys());
  }
}
