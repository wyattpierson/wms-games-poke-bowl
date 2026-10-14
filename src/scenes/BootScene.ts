import Phaser from 'phaser';
import { CAMPAIGN_TEAMS, PLAYER_TEAM } from '../core/teams';
import { POKEMON_DEX_ID, spriteKey, spriteUrl } from '../data/sprites';

/**
 * Entry scene: preloads every roster Pokémon sprite (classic 96x96 from the PokeAPI mirror),
 * then starts the game. Later: menu, audio, etc.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
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
