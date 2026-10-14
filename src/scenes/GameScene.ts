import Phaser from 'phaser';
import { recordResult } from '../core/campaign';
import type { MatchConfig } from '../types';
import { buildPlay } from '../data/playbook';
import { getRun, setRun } from '../state/runStore';
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
    // Clamp dt so a background tab or hiccup can't teleport players.
    this.session.update(Math.min(delta, 50) / 1000);
    // ESC forfeits the match (a loss: the run is over). No other way out mid-match.
    if (!this.session.matchOver && this.controls.justPressed('forfeit')) this.forfeit();
  }

  private forfeit(): void {
    setRun(recordResult(getRun(), this.config.opponent.id, 'loss'));
    this.scene.start('GameOverScene', { reason: 'forfeit', opponentName: this.config.opponent.name });
  }
}
