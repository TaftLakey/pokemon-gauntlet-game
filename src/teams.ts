import { Dex, Teams } from '@pkmn/sim';
import type { PokemonSet } from '@pkmn/sim';
import sourcePool from './data/pokemon-pool.json';
import { hashString, mulberry32, shuffle } from './rng';

const stats = (n: number) => ({ hp: n, atk: n, def: n, spa: n, spd: n, spe: n });

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

const factoryPokemon = sourcePool.species as FactoryPokemon[];

function pick<T>(options: readonly T[], rand: () => number): T {
  return options[Math.floor(rand() * options.length)];
}

function weightedPick<T extends { weight: number }>(options: readonly T[], rand: () => number): T {
  const total = options.reduce((sum, option) => sum + option.weight, 0);
  let roll = rand() * total;
  for (const option of options) {
    roll -= option.weight;
    if (roll < 0) return option;
  }
  return options[options.length - 1];
}

// Benchmark average stat total across all 234 Kanto computer builds at Level 85
export const OPPONENT_AVG_STAT_TOTAL_LV85 = 1173.5;
export const BALANCE_THRESHOLD_RATIO = 0.95;
export const TARGET_STAT_THRESHOLD = OPPONENT_AVG_STAT_TOTAL_LV85 * BALANCE_THRESHOLD_RATIO; // 1114.825

/** Calculates in-battle stat total with 0 EVs, 31 IVs, and nature multipliers */
export function calculateStatTotal(speciesName: string, level: number, natureName: string): number {
  const sp = Dex.species.get(speciesName);
  const base = sp.baseStats;
  const nat = Dex.natures.get(natureName);

  const hp = sp.name === 'Shedinja'
    ? 1
    : Math.floor(((2 * base.hp + 31) * level) / 100) + level + 10;

  let total = hp;
  for (const s of ['atk', 'def', 'spa', 'spd', 'spe'] as const) {
    let mult = 1.0;
    if (nat.plus === s) mult = 1.1;
    else if (nat.minus === s) mult = 0.9;
    total += Math.floor((Math.floor(((2 * base[s] + 31) * level) / 100) + 5) * mult);
  }
  return total;
}

/** Determines balanced level: starts at 85, increments until reaching >= 95% threshold (max 100) */
export function getBalancedLevel(speciesName: string, natureName: string): number {
  let level = 85;
  while (level < 100) {
    const total = calculateStatTotal(speciesName, level, natureName);
    if (total >= TARGET_STAT_THRESHOLD) break;
    level++;
  }
  return level;
}

function materialize(set: FactorySet, rand: () => number): PokemonSet {
  const item = Array.isArray(set.item) ? pick(set.item, rand) : set.item;
  const ability = Array.isArray(set.ability) ? pick(set.ability, rand) : set.ability;
  const level = getBalancedLevel(set.species, set.nature);

  return {
    name: '',
    species: set.species,
    item,
    ability,
    gender: '',
    nature: set.nature,
    moves: set.moves.map((slot) => pick(slot, rand)),
    level,
    evs: stats(0),
    ivs: stats(31),
  };
}

/** Showdown paste text -> sets forced to level 85, 0 EVs, 31 IVs. */
export function parseTeam(text: string): PokemonSet[] {
  const sets = Teams.import(text) ?? [];
  return sets.map((s) => ({ ...s, level: 85, evs: stats(0), ivs: stats(31) }));
}

/** One weighted Smogon 1v1 set for each eligible species, seeded by UTC date. */
export function dailyPool(key: string): PokemonSet[] {
  const rand = mulberry32(hashString(`smogon-1v1-sets:${key}`));
  return factoryPokemon.map((pokemon) => materialize(weightedPick(pokemon.sets, rand), rand));
}

/** All players get the same six species and set variants on a given day. */
export function dailyTeam(key: string): PokemonSet[] {
  const rand = mulberry32(hashString(`team:${key}`));
  return shuffle(dailyPool(key), rand).slice(0, 6);
}

/** Representative materializations for the existing data validation script. */
export function allFactorySets(): PokemonSet[] {
  return factoryPokemon.flatMap((pokemon) => pokemon.sets.map((set, index) => {
    const rand = mulberry32(hashString(`validate:${pokemon.species}:${index}`));
    return materialize(set, rand);
  }));
}
