import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Dex } from '@pkmn/sim';
import type { PokemonSet } from '@pkmn/sim';
import pokedex from '../src/data/modified-pokedex.json';
import existingPool from '../src/data/smogon-gen9-1v1-pool.json';

interface FactorySet {
  species: string;
  item: string | string[];
  ability: string | string[];
  nature: string;
  moves: string[][];
  weight: number;
}

interface FactoryPokemon {
  species: string;
  weight: number;
  sets: FactorySet[];
}

const BAD_ABILITIES = new Set(['truant', 'defeatist', 'slowstart', 'klutz', 'stall', 'normalize']);

const TOP_ABILITIES = new Set([
  'hugepower', 'purepower', 'speedboost', 'sheerforce', 'intimidate', 'magicguard',
  'adaptability', 'technician', 'guts', 'multiscale', 'regenerator', 'toughclaws',
  'moxie', 'unaware', 'purifyingsalt', 'drought', 'drizzle', 'electricsurge',
  'psychicsurge', 'sharpness', 'supremeoverlord', 'protean', 'libero', 'serenegrace',
  'tintedlens', 'magicbounce', 'prankster', 'levitate', 'waterabsorb', 'voltabsorb',
  'flashfire', 'poisonheal', 'solidrock', 'filter', 'thickfat', 'contrary', 'simple',
  'aerilate', 'pixilate', 'refrigerate', 'galvanize', 'compoundeyes', 'naturalcure',
]);

const PHYSICAL_SETUP = [
  'swordsdance', 'dragondance', 'bulkup', 'shiftgear', 'shellsmash',
  'bellydrum', 'coil', 'tidyup', 'curse', 'agility', 'honeclaws'
];

const SPECIAL_SETUP = [
  'nastyplot', 'quiverdance', 'calmmind', 'shellsmash', 'tailglow',
  'rockpolish', 'agility'
];

const RECOVERY = [
  'recover', 'roost', 'softboiled', 'slackoff', 'milkdrink', 'synthesis',
  'moonlight', 'morningsun', 'shoreup', 'leechseed', 'wish', 'strengthsap',
  'painsplit', 'rest'
];

const UTILITY_STATUS = [
  'stealthrock', 'spikes', 'toxicspikes', 'stickyweb', 'willowisp',
  'thunderwave', 'toxic', 'glare', 'spore', 'sleeppowder', 'yawn',
  'taunt', 'encore', 'rapidspin', 'defog', 'substitute', 'protect'
];

const PIVOT = ['uturn', 'voltswitch', 'flipturn', 'partingshot'];

function getFullLearnset(speciesName: string): Set<string> {
  let sp: any = Dex.species.get(speciesName);
  const moves = new Set<string>();
  while (sp && sp.exists) {
    const data = Dex.data.Learnsets[sp.id];
    if (data && data.learnset) {
      for (const m of Object.keys(data.learnset)) moves.add(m);
    }
    if (sp.prevo) {
      sp = Dex.species.get(sp.prevo);
    } else {
      break;
    }
  }
  return moves;
}

function selectAbility(abilitiesObj: Record<string, string>, preferCategory?: 'Physical' | 'Special' | 'Defensive'): string {
  const abilities = Object.values(abilitiesObj).filter((a) => Dex.abilities.get(a).exists);
  const good = abilities.filter((a) => !BAD_ABILITIES.has(Dex.toID(a)));
  const candidates = good.length ? good : abilities;

  for (const a of candidates) {
    if (TOP_ABILITIES.has(Dex.toID(a))) return a;
  }
  return candidates[0] || 'Overgrow';
}

function getMoveScore(moveId: string, category: 'Physical' | 'Special', typeBonus: boolean): number {
  const m = Dex.moves.get(moveId);
  if (!m.exists || m.category !== category) return -999;
  if (['explosion', 'selfdestruct', 'finalgambit', 'fling', 'naturalgift', 'lastresort', 'focuspunch'].includes(m.id)) {
    return -999;
  }
  let score = m.basePower || 0;
  if (score <= 0) {
    if (['seismictoss', 'nightshade'].includes(m.id)) score = 80;
    else if (['bodypress', 'foulplay'].includes(m.id)) score = 85;
    else return -999;
  }
  if (typeof m.accuracy === 'number') score *= m.accuracy / 100;
  if (typeBonus) score *= 1.5;
  if (m.priority > 0) score += 20;
  if (m.secondaries && m.secondaries.length > 0) score += 8;
  if (['earthquake', 'closecombat', 'flareblitz', 'bravebird', 'knockoff', 'icebeam', 'thunderbolt', 'flamethrower', 'shadowball', 'moonblast', 'dracometeor'].includes(m.id)) {
    score += 20;
  }
  return score;
}

function findBestMove(
  learnset: Set<string>,
  category: 'Physical' | 'Special',
  filterType?: string,
  excludeMoves: Set<string> = new Set()
): string | null {
  let bestMove: string | null = null;
  let bestScore = -999;

  for (const moveId of learnset) {
    if (excludeMoves.has(moveId)) continue;
    const m = Dex.moves.get(moveId);
    if (!m.exists || m.category !== category) continue;
    if (filterType && m.type !== filterType) continue;

    const score = getMoveScore(moveId, category, !!filterType);
    if (score > bestScore) {
      bestScore = score;
      bestMove = m.name;
    }
  }
  return bestMove;
}

function buildOffensiveSet(
  name: string,
  types: string[],
  category: 'Physical' | 'Special',
  spe: number,
  learnset: Set<string>,
  abilities: Record<string, string>,
  weight: number
): FactorySet {
  const selectedMoves: string[][] = [];
  const chosenIds = new Set<string>();

  // 1. Primary STAB
  const stab1 = findBestMove(learnset, category, types[0], chosenIds);
  if (stab1) {
    selectedMoves.push([stab1]);
    chosenIds.add(Dex.toID(stab1));
  }

  // 2. Secondary STAB or best coverage
  let stab2 = types[1] ? findBestMove(learnset, category, types[1], chosenIds) : null;
  if (!stab2) {
    stab2 = findBestMove(learnset, category, undefined, chosenIds);
  }
  if (stab2) {
    selectedMoves.push([stab2]);
    chosenIds.add(Dex.toID(stab2));
  }

  // 3. Setup move or Pivot or 3rd coverage
  const setups = category === 'Physical' ? PHYSICAL_SETUP : SPECIAL_SETUP;
  const availableSetup = setups.find((s) => learnset.has(s) && !chosenIds.has(s));
  const availablePivot = PIVOT.find((p) => learnset.has(p) && !chosenIds.has(p));

  if (availableSetup) {
    const setupName = Dex.moves.get(availableSetup).name;
    selectedMoves.push([setupName]);
    chosenIds.add(availableSetup);
  } else if (availablePivot) {
    const pivotName = Dex.moves.get(availablePivot).name;
    selectedMoves.push([pivotName]);
    chosenIds.add(availablePivot);
  } else {
    const cov = findBestMove(learnset, category, undefined, chosenIds);
    if (cov) {
      selectedMoves.push([cov]);
      chosenIds.add(Dex.toID(cov));
    }
  }

  // 4. Fourth move: Priority / Recovery / More coverage
  const availableRec = RECOVERY.find((r) => learnset.has(r) && !chosenIds.has(r));
  const cov2 = findBestMove(learnset, category, undefined, chosenIds);

  if (availableRec && !availableSetup) {
    const recName = Dex.moves.get(availableRec).name;
    selectedMoves.push([recName]);
    chosenIds.add(availableRec);
  } else if (cov2) {
    selectedMoves.push([cov2]);
    chosenIds.add(Dex.toID(cov2));
  } else {
    // Fallback to any remaining attacking move
    for (const mId of learnset) {
      if (chosenIds.has(mId)) continue;
      const m = Dex.moves.get(mId);
      if (m.exists && (m.category === 'Physical' || m.category === 'Special')) {
        selectedMoves.push([m.name]);
        chosenIds.add(mId);
        break;
      }
    }
  }

  // Fill up to 4 if still missing
  while (selectedMoves.length < 4) {
    for (const mId of learnset) {
      if (chosenIds.has(mId)) continue;
      const m = Dex.moves.get(mId);
      if (m.exists) {
        selectedMoves.push([m.name]);
        chosenIds.add(mId);
        break;
      }
    }
    if (chosenIds.size >= learnset.size) break;
  }

  const hasSetup = availableSetup && chosenIds.has(availableSetup);
  const items = hasSetup
    ? ['Life Orb', 'Focus Sash', 'Leftovers']
    : category === 'Physical'
      ? ['Choice Band', 'Life Orb', 'Assault Vest']
      : ['Choice Specs', 'Life Orb', 'Assault Vest'];

  const nature = category === 'Physical'
    ? (spe >= 70 ? 'Jolly' : 'Adamant')
    : (spe >= 70 ? 'Timid' : 'Modest');

  return {
    species: name,
    item: items,
    ability: selectAbility(abilities, category),
    nature,
    moves: selectedMoves,
    weight,
  };
}

function buildDefensiveSet(
  name: string,
  types: string[],
  learnset: Set<string>,
  abilities: Record<string, string>,
  weight: number
): FactorySet {
  const selectedMoves: string[][] = [];
  const chosenIds = new Set<string>();

  // 1. STAB / Reliable damage
  const physStab = findBestMove(learnset, 'Physical', types[0], chosenIds);
  const specStab = findBestMove(learnset, 'Special', types[0], chosenIds);
  const mainAtk = physStab || specStab || 'Body Press';
  selectedMoves.push([mainAtk]);
  chosenIds.add(Dex.toID(mainAtk));

  // 2. Recovery move
  const availableRec = RECOVERY.find((r) => learnset.has(r) && !chosenIds.has(r));
  if (availableRec) {
    selectedMoves.push([Dex.moves.get(availableRec).name]);
    chosenIds.add(availableRec);
  } else {
    const altAtk = findBestMove(learnset, 'Physical', types[1], chosenIds) ||
                   findBestMove(learnset, 'Special', types[1], chosenIds) ||
                   findBestMove(learnset, 'Physical', undefined, chosenIds) ||
                   'Toxic';
    selectedMoves.push([altAtk]);
    chosenIds.add(Dex.toID(altAtk));
  }

  // 3. Status / Disruption
  const statusMove = UTILITY_STATUS.find((u) => learnset.has(u) && !chosenIds.has(u));
  if (statusMove) {
    selectedMoves.push([Dex.moves.get(statusMove).name]);
    chosenIds.add(statusMove);
  } else {
    const cov = findBestMove(learnset, 'Physical', undefined, chosenIds) ||
                findBestMove(learnset, 'Special', undefined, chosenIds) ||
                'Protect';
    selectedMoves.push([cov]);
    chosenIds.add(Dex.toID(cov));
  }

  // 4. Utility / Hazard / Pivot
  const hazardOrPivot = [...PIVOT, 'stealthrock', 'spikes', 'toxicspikes', 'stickyweb', 'rapidspin', 'defog', 'substitute', 'protect']
    .find((m) => learnset.has(m) && !chosenIds.has(m));

  if (hazardOrPivot) {
    selectedMoves.push([Dex.moves.get(hazardOrPivot).name]);
    chosenIds.add(hazardOrPivot);
  } else {
    for (const mId of learnset) {
      if (chosenIds.has(mId)) continue;
      const m = Dex.moves.get(mId);
      if (m.exists) {
        selectedMoves.push([m.name]);
        chosenIds.add(mId);
        break;
      }
    }
  }

  while (selectedMoves.length < 4 && chosenIds.size < learnset.size) {
    for (const mId of learnset) {
      if (chosenIds.has(mId)) continue;
      const m = Dex.moves.get(mId);
      if (m.exists) {
        selectedMoves.push([m.name]);
        chosenIds.add(mId);
        break;
      }
    }
  }

  return {
    species: name,
    item: ['Leftovers', 'Heavy-Duty Boots', 'Rocky Helmet'],
    ability: selectAbility(abilities, 'Defensive'),
    nature: 'Bold',
    moves: selectedMoves,
    weight,
  };
}

// Special cases: Ditto and Unown
function handleSpecialPokemon(name: string): FactorySet[] {
  if (name === 'Ditto') {
    return [{
      species: 'Ditto',
      item: 'Choice Scarf',
      ability: 'Imposter',
      nature: 'Impish',
      moves: [['Transform']],
      weight: 100,
    }];
  }
  if (name === 'Unown') {
    return [{
      species: 'Unown',
      item: 'Choice Specs',
      ability: 'Levitate',
      nature: 'Modest',
      moves: [['Hidden Power']],
      weight: 100,
    }];
  }
  return [];
}

// Map of species from existing smogon 1v1 pool
const existingSpeciesMap = new Map<string, FactoryPokemon>();
for (const sp of (existingPool.species as FactoryPokemon[])) {
  existingSpeciesMap.set(sp.species.toLowerCase().replace(/[^a-z0-9]/g, ''), sp);
}

const finalSpeciesList: FactoryPokemon[] = [];

for (const [key, mon] of Object.entries(pokedex)) {
  const { atk, spa, def, spd, hp, spe } = mon.baseStats;
  const bst = hp + atk + def + spa + spd + spe;
  if (bst < 425) continue;

  const normKey = mon.name.toLowerCase().replace(/[^a-z0-9]/g, '');

  // 1. If we have existing vetted Smogon 1v1 sets for this species, keep them!
  if (existingSpeciesMap.has(normKey)) {
    const existing = existingSpeciesMap.get(normKey)!;
    finalSpeciesList.push({
      species: mon.name,
      weight: existing.weight || 1,
      sets: existing.sets.map((s) => ({ ...s, species: mon.name })),
    });
    continue;
  }

  // 2. Special single-move Pokémon (Ditto, Unown)
  const specialSets = handleSpecialPokemon(mon.name);
  if (specialSets.length > 0) {
    finalSpeciesList.push({
      species: mon.name,
      weight: 1,
      sets: specialSets,
    });
    continue;
  }

  // 3. Algorithmic hybrid generation
  const learnset = getFullLearnset(mon.name);
  const sets: FactorySet[] = [];

  const isPhysical = atk >= 75 || atk >= spa;
  const isSpecial = spa >= 75 || spa >= atk;
  const isBulky = hp + def + spd >= 240;

  if (isPhysical) {
    sets.push(buildOffensiveSet(mon.name, mon.types, 'Physical', spe, learnset, mon.abilities, 50));
  }
  if (isSpecial) {
    sets.push(buildOffensiveSet(mon.name, mon.types, 'Special', spe, learnset, mon.abilities, 50));
  }
  if (isBulky || sets.length === 0) {
    sets.push(buildDefensiveSet(mon.name, mon.types, learnset, mon.abilities, 35));
  }

  finalSpeciesList.push({
    species: mon.name,
    weight: 1,
    sets,
  });
}

const output = {
  source: 'hybrid:smogon-1v1+dex-heuristics',
  generatedAt: new Date().toISOString(),
  speciesCount: finalSpeciesList.length,
  species: finalSpeciesList,
};

const outputPath1 = fileURLToPath(new URL('../src/data/pokemon-pool.json', import.meta.url));
const outputPath2 = fileURLToPath(new URL('../src/data/smogon-gen9-1v1-pool.json', import.meta.url));

await writeFile(outputPath1, `${JSON.stringify(output, null, 2)}\n`);
await writeFile(outputPath2, `${JSON.stringify(output, null, 2)}\n`);

console.log(`Successfully generated pool of ${finalSpeciesList.length} species with competitive sets.`);
