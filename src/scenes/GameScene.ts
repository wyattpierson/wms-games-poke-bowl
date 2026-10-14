import Phaser from 'phaser';
import { EMBER_BLITZ, PLAYER_TEAM } from '../core/teams';
import { buildPlay } from '../data/playbook';
import { Controls } from '../gameplay/controls/Controls';
import { Field } from '../gameplay/entities/Field';
import { PlaySession } from '../gameplay/PlaySession';
import { Hud } from '../ui/Hud';

/** The on-field screen. Wires the pieces together; all the logic lives in PlaySession and its phases. */
export class GameScene extends Phaser.Scene {
  private controls!: Controls;
  private session!: PlaySession;

  constructor() {
    super('GameScene');
  }

  create(): void {
    const field = new Field(this);
    const hud = new Hud(this);
    this.controls = new Controls(this);
    // MVP: one fixed matchup — player team offense vs. the first regular gauntlet team's defense.
    const play = buildPlay(PLAYER_TEAM, EMBER_BLITZ);
    this.session = new PlaySession(this, play, field, this.controls, hud, PLAYER_TEAM, EMBER_BLITZ);
    this.session.goTo({ phase: 'preSnap' });
  }

  update(_time: number, delta: number): void {
    this.controls.update();
    // Clamp dt so a background tab or hiccup can't teleport players.
    this.session.update(Math.min(delta, 50) / 1000);
    if (this.session.matchOver && this.controls.justPressed('scramble')) this.scene.restart();
  }
}
