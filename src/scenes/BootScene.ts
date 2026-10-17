import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/field';
import { CAMPAIGN_TEAMS, PLAYER_TEAM } from '../core/teams';
import { POKEMON_DEX_ID, spriteKey, spriteUrl } from '../data/sprites';
import { menuBackground } from '../ui/menu';
import { FILL, GOLD, GRAY, textStyle } from '../ui/theme';

const BAR_WIDTH = 420;

/**
 * Entry scene: preloads every roster Pokémon sprite (classic 96x96 from the PokeAPI mirror)
 * behind a loading bar, then goes to the title. Later: audio, fonts, etc.
 * A sprite that fails to load (offline, blocked) just falls back to a gray square.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    menuBackground(this);
    const mid = GAME_WIDTH / 2;
    const midY = GAME_HEIGHT / 2;
    this.add.text(mid, midY - 70, 'POKÉMON BOWL', textStyle(48, GOLD)).setOrigin(0.5);
    this.add.rectangle(mid, midY, BAR_WIDTH, 24, FILL.plate).setStrokeStyle(2, FILL.border);
    const bar = this.add.rectangle(mid - BAR_WIDTH / 2 + 4, midY, 0, 14, FILL.gold).setOrigin(0, 0.5);
    const percent = this.add.text(mid, midY + 44, 'loading sprites... 0%', textStyle(14, GRAY)).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      bar.width = (BAR_WIDTH - 8) * value;
      percent.setText(`loading sprites... ${Math.round(value * 100)}%`);
    });

    const teams = [PLAYER_TEAM, ...CAMPAIGN_TEAMS];
    for (const team of teams) {
      for (const pokemon of [...team.offense, ...team.defense]) {
        const dexId = POKEMON_DEX_ID[pokemon.id];
        if (dexId) this.load.image(spriteKey(pokemon.id), spriteUrl(dexId));
      }
    }
  }

  create(): void {
    // Everything is loaded; into the campaign (title → opponent select → matches).
    this.scene.start('TitleScene');
  }
}
