/**
 * Pokédex IDs for every Pokémon on the rosters (resolved via the PokeAPI species endpoint).
 * Sprites are the official 96x96 sprites from the PokeAPI sprites mirror (classic/retro look,
 * small file size) — see BOOT_SPRITE_BASE.
 */
export const POKEMON_DEX_ID: Record<string, number> = {
  abra: 63, aggron: 306, alakazam: 65, arcanine: 59, bastiodon: 411, blaziken: 257,
  braviary: 628, breloom: 286, cloyster: 91, conkeldurr: 534, cubone: 104, deoxys: 386,
  dodrio: 85, dragonite: 149, drapion: 452, emboar: 500, falinks: 870, flareon: 136,
  floatzel: 419, forretress: 205, geodude: 74, golem: 76, graveler: 75, gyarados: 130,
  hippowdon: 450, houndoom: 229, jolteon: 135, kingdra: 230, krokorok: 552, lapras: 131,
  lucario: 448, machamp: 68, magby: 240, magmar: 126, mamoswine: 473, marowak: 105,
  mawile: 303, metagross: 376, mewtwo: 150, milotic: 350, octillery: 224, onix: 95,
  pelipper: 279, persian: 53, pikachu: 25, raichu: 26, rapidash: 78, raticate: 20,
  regirock: 377, registeel: 379, rhydon: 112, rhyhorn: 111, rhyperior: 464, sandshrew: 27,
  scizor: 212, simipour: 516, skarmory: 227, slowbro: 80, staraptor: 398, starmie: 121,
  steelix: 208, swampert: 260, swanna: 581, tauros: 128, torkoal: 324, tyranitar: 248,
  umbreon: 197, vulpix: 37, weavile: 461, whiscash: 340,
};

export const BOOT_SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

/** Texture key for a Pokémon by its data id. */
export const spriteKey = (id: string): string => `pokemon-${id}`;

export const spriteUrl = (dexId: number): string => `${BOOT_SPRITE_BASE}/${dexId}.png`;
