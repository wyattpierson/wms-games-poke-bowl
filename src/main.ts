import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config/field';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';
import { OpponentSelectScene } from './scenes/OpponentSelectScene';
import { PoachScene } from './scenes/PoachScene';
import { ResultScene } from './scenes/ResultScene';
import { TitleScene } from './scenes/TitleScene';
import { VictoryScene } from './scenes/VictoryScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1b1b1b',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  // Campaign flow: Title → OpponentSelect → Game → Result → (Poach | GameOver | Victory) → …
  scene: [BootScene, TitleScene, OpponentSelectScene, GameScene, ResultScene, PoachScene, GameOverScene, VictoryScene],
});
