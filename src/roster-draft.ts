import { Dex } from '@pkmn/sim';
import type { PokemonSet } from '@pkmn/sim';
import type { TrainerBuild } from './data';
import { parseTeam } from './teams';
import { hashString, mulberry32 } from './rng';

/**
 * First-pass Kanto opponent roster drafts.
 *
 * Each build has six species and an archetype label. This is kept separate
 * from data.ts until the roster choices are ready to receive full Showdown
 * sets and be wired into the daily build/capture flow.
 *
 * `uncapturable` lists legendary/mythical members. All other members are
 * eligible for a post-win offer. Paradox Pokémon are treated as ordinary
 * eligible Pokémon, consistent with the project discussion.
 */
export interface TrainerBuildDraft {
  name: string;
  theme: string;
  team: readonly string[];
  uncapturable?: readonly string[];
}

export interface TrainerRosterDraft {
  name: string;
  type: string;
  builds: readonly [TrainerBuildDraft, TrainerBuildDraft, TrainerBuildDraft];
}

const build = (
  name: string,
  theme: string,
  team: readonly string[],
  uncapturable: readonly string[] = [],
): TrainerBuildDraft => ({ name, theme, team, ...(uncapturable.length ? { uncapturable } : {}) });

export const KANTO_ROSTER_DRAFT: readonly TrainerRosterDraft[] = [
  {
    name: 'Brock', type: 'Rock', builds: [
      build('Sand Offense', 'Sand', ['Tyranitar', 'Rhyperior', 'Lycanroc-Dusk', 'Garganacl', 'Gigalith', 'Terrakion'], ['Terrakion']),
      build('Hazard Balance', 'Entry hazards', ['Aerodactyl', 'Glimmora', 'Cradily', 'Kleavor', 'Coalossal', 'Tyrantrum']),
      build('Trick Room', 'Trick Room', ['Carbink', 'Rhyperior', 'Gigalith', 'Minior', 'Omastar', 'Drednaw']),
    ],
  },
  {
    name: 'Misty', type: 'Water', builds: [
      build('Rain Offense', 'Rain', ['Pelipper', 'Barraskewda', 'Kingdra', 'Basculegion-Male', 'Floatzel', 'Manaphy'], ['Manaphy']),
      build('Bulky Waters', 'Balance', ['Toxapex', 'Slowbro', 'Gastrodon', 'Rotom-Wash', 'Primarina', 'Suicune'], ['Suicune']),
      build('Rain Sweepers', 'Rain', ['Politoed', 'Drednaw', 'Ludicolo', 'Swampert', 'Greninja', 'Urshifu-Rapid-Strike'], ['Urshifu-Rapid-Strike']),
    ],
  },
  {
    name: 'Lt. Surge', type: 'Electric', builds: [
      build('Electric Terrain', 'Electric Terrain', ['Tapu Koko', 'Iron Hands', 'Pawmot', 'Kilowattrel', 'Magnezone', 'Heliolisk'], ['Tapu Koko']),
      build('VoltTurn', 'Pivot offense', ['Rotom-Wash', 'Eelektross', 'Raikou', 'Vikavolt', 'Luxray', 'Jolteon'], ['Raikou']),
      build('Slow Control', 'Bulky offense', ['Ampharos', 'Bellibolt', 'Eelektross', 'Magnezone', 'Sandy Shocks', 'Regieleki'], ['Regieleki']),
    ],
  },
  {
    name: 'Erika', type: 'Grass', builds: [
      build('Sun Bloom', 'Sun', ['Whimsicott', 'Venusaur', 'Lilligant-Hisui', 'Sawsbuck', 'Scovillain', 'Ogerpon-Hearthflame'], ['Ogerpon-Hearthflame']),
      build('Grassy Offense', 'Grassy Terrain', ['Rillaboom', 'Breloom', 'Meowscarada', 'Serperior', 'Brute Bonnet', 'Ogerpon-Wellspring'], ['Ogerpon-Wellspring']),
      build('Regenerator Balance', 'Bulky balance', ['Amoonguss', 'Ferrothorn', 'Hydrapple', 'Cradily', 'Appletun', 'Tangrowth']),
    ],
  },
  {
    name: 'Koga', type: 'Poison', builds: [
      build('Hazard Stack', 'Hazards and offense', ['Glimmora', 'Gengar', 'Sneasler', 'Toxtricity', 'Iron Moth', 'Nidoking']),
      build('Toxic Control', 'Status balance', ['Toxapex', 'Clodsire', 'Amoonguss', 'Weezing-Galar', 'Muk-Alola', 'Tentacruel']),
      build('Venom Rush', 'Fast offense', ['Crobat', 'Overqwil', 'Salazzle', 'Dragalge', 'Gengar', 'Sneasler']),
    ],
  },
  {
    name: 'Sabrina', type: 'Psychic', builds: [
      build('Psychic Terrain', 'Psychic Terrain', ['Indeedee-Female', 'Armarouge', 'Hatterene', 'Gallade', 'Espathra', 'Tapu Lele'], ['Tapu Lele']),
      build('Trick Room', 'Trick Room', ['Reuniclus', 'Bronzong', 'Hatterene', 'Farigiraf', 'Slowking-Galar', 'Iron Crown']),
      build('Mind Games', 'Setup offense', ['Espeon', 'Gothitelle', 'Malamar', 'Alakazam', 'Latias', 'Scream Tail'], ['Latias']),
    ],
  },
  {
    name: 'Blaine', type: 'Fire', builds: [
      build('Sun Flare', 'Sun', ['Torkoal', 'Cinderace', 'Chi-Yu', 'Scovillain', 'Volcarona', 'Gouging Fire'], ['Chi-Yu']),
      build('Fire Balance', 'Bulky offense', ['Heatran', 'Arcanine-Hisui', 'Skeledirge', 'Rotom-Heat', 'Incineroar', 'Ceruledge'], ['Heatran']),
      build('Trick Room', 'Trick Room', ['Torkoal', 'Camerupt', 'Coalossal', 'Chandelure', 'Houndoom', 'Magmortar']),
    ],
  },
  {
    name: 'Giovanni', type: 'Ground', builds: [
      build('Desert Sand', 'Sand', ['Hippowdon', 'Garchomp', 'Gliscor', 'Mamoswine', 'Excadrill', 'Ting-Lu'], ['Ting-Lu']),
      build('Trick Room', 'Trick Room', ['Ursaluna', 'Rhyperior', 'Gastrodon', 'Clodsire', 'Runerigus', 'Groudon'], ['Groudon']),
      build('Ground Assault', 'Fast offense', ['Great Tusk', 'Krookodile', 'Landorus-Therian', 'Garchomp', 'Mamoswine', 'Toedscruel'], ['Landorus-Therian']),
    ],
  },
  {
    name: 'Lorelei', type: 'Ice', builds: [
      build('Snow Sweep', 'Snow', ['Ninetales-Alola', 'Baxcalibur', 'Weavile', 'Cetitan', 'Froslass', 'Chien-Pao'], ['Chien-Pao']),
      build('Frozen Trick Room', 'Trick Room', ['Jynx', 'Walrein', 'Abomasnow', 'Aurorus', 'Glastrier', 'Cloyster'], ['Glastrier']),
      build('Ice Breakers', 'Mixed offense', ['Frosmoth', 'Mamoswine', 'Iron Bundle', 'Weavile', 'Cloyster', 'Kyurem'], ['Kyurem']),
    ],
  },
  {
    name: 'Bruno', type: 'Fighting', builds: [
      build('Sun Combat', 'Sun', ['Koraidon', 'Annihilape', 'Pawmot', 'Great Tusk', 'Blaziken', 'Hawlucha'], ['Koraidon']),
      build('Bulk Up', 'Setup balance', ['Iron Hands', 'Gallade', 'Lucario', 'Conkeldurr', 'Kommo-o', 'Zamazenta'], ['Zamazenta']),
      build('Priority Assault', 'Hyper offense', ['Breloom', 'Sneasler', 'Iron Valiant', 'Mienshao', 'Hawlucha', 'Urshifu-Single-Strike'], ['Urshifu-Single-Strike']),
    ],
  },
  {
    name: 'Agatha', type: 'Ghost', builds: [
      build('Ghost Trick Room', 'Trick Room', ['Dusknoir', 'Golurk', 'Jellicent', 'Mimikyu', 'Aegislash', 'Giratina'], ['Giratina']),
      build('Shadow Setup', 'Special setup', ['Gengar', 'Chandelure', 'Flutter Mane', 'Dragapult', 'Mismagius', 'Lunala'], ['Lunala']),
      build('Haunted Status', 'Status balance', ['Sableye', 'Cofagrigus', 'Jellicent', 'Trevenant', 'Spiritomb', 'Gholdengo']),
    ],
  },
  {
    name: 'Lance', type: 'Dragon', builds: [
      build('Dragon Dance', 'Setup offense', ['Dragonite', 'Haxorus', 'Salamence', 'Kommo-o', 'Roaring Moon', 'Rayquaza'], ['Rayquaza']),
      build('Electric Flight', 'Electric Terrain', ['Miraidon', 'Dragapult', 'Hydreigon', 'Archaludon', 'Cyclizar', 'Dracozolt'], ['Miraidon']),
      build('Dragon Bulwark', 'Bulky balance', ['Goodra', 'Dragalge', 'Drampa', 'Duraludon', 'Hydrapple', 'Zygarde'], ['Zygarde']),
    ],
  },
  {
    name: 'Blue', type: 'Mixed', builds: [
      build('Champion Sun', 'Sun', ['Groudon', 'Venusaur', 'Arcanine-Hisui', 'Rhyperior', 'Blastoise', 'Charizard'], ['Groudon']),
      build('Champion Rain', 'Rain', ['Pelipper', 'Kingdra', 'Gyarados', 'Metagross', 'Serperior', 'Zapdos'], ['Zapdos']),
      build('Ace Offense', 'Setup offense', ['Pidgeot', 'Charizard', 'Machamp', 'Arcanine-Hisui', 'Alakazam', 'Mewtwo'], ['Mewtwo']),
    ],
  },
] as const;

/** Return only species that may appear in a post-win capture offer. */
export function capturableMembers(roster: TrainerBuildDraft | TrainerBuild): string[] {
  const blocked = new Set(roster.uncapturable ?? []);
  const list = typeof roster.team === 'string'
    ? parseTeam(roster.team).map((s) => s.species)
    : roster.team;
  return list.filter((species) => !blocked.has(species));
}

/** Check if a Pokémon is a legendary, sub-legendary, or mythical species. */
export function isLegendaryOrMythical(species: string): boolean {
  const sp = Dex.species.get(species);
  const tags = sp.tags || [];
  return tags.includes('Restricted Legendary') || tags.includes('Sub-Legendary') || tags.includes('Mythical');
}

/**
 * Returns all parsed Pokémon sets from a trainer's build that are eligible
 * for drafting: not legendary/mythical, not in uncapturable, and not already
 * in the player's active team or bench reserves.
 */
export function getEligibleDraftSets(
  build: TrainerBuild,
  ownedSpecies: Iterable<string>
): PokemonSet[] {
  const blocked = new Set((build.uncapturable ?? []).map((s) => s.toLowerCase()));
  const owned = new Set(Array.from(ownedSpecies).map((s) => s.toLowerCase()));
  const teamSets = parseTeam(build.team);

  return teamSets.filter((s) => {
    const spLower = s.species.toLowerCase();
    if (blocked.has(spLower)) return false;
    if (isLegendaryOrMythical(s.species)) return false;
    if (owned.has(spLower)) return false;
    return true;
  });
}

/**
 * Deterministically picks up to `count` (default 3) sets from eligibleSets
 * using mulberry32 keyed by day and trainer index.
 */
export function pickDraftOptions(
  eligibleSets: PokemonSet[],
  key: string,
  trainerIndex: number,
  count = 3
): PokemonSet[] {
  if (eligibleSets.length <= count) return [...eligibleSets];
  const rand = mulberry32(hashString(`draft-offer:${key}:${trainerIndex}`));
  const pool = [...eligibleSets];
  const chosen: PokemonSet[] = [];
  while (chosen.length < count && pool.length > 0) {
    const idx = Math.floor(rand() * pool.length);
    chosen.push(pool.splice(idx, 1)[0]);
  }
  return chosen;
}
