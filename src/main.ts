import '@fontsource/press-start-2p'; // self-hosted pixel font (OFL license) — bundled by Vite, works offline
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config/field';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';
import { OpponentSelectScene } from './scenes/OpponentSelectScene';
import { PauseScene } from './scenes/PauseScene';
import { PoachScene } from './scenes/PoachScene';
import { ResultScene } from './scenes/ResultScene';
import { TitleScene } from './scenes/TitleScene';
import { VictoryScene } from './scenes/VictoryScene';
import { FONT_FACE } from './ui/theme';

function startGame(): void {
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#1b1b1b',
    pixelArt: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    // Campaign flow: Title → OpponentSelect → Game (⇄ Pause) → Result → (Poach | GameOver | Victory) → …
    // PauseScene is listed last so it draws on top of the match.
    scene: [BootScene, TitleScene, OpponentSelectScene, GameScene, ResultScene, PoachScene, GameOverScene, VictoryScene, PauseScene],
  });
}

// Phaser bakes text into canvas textures, so the font must be loaded BEFORE any text is created.
// If it fails to load, start anyway: the font stack falls back to monospace.
document.fonts.load(`16px ${FONT_FACE}`).then(startGame, startGame);
