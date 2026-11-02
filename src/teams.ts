import { Teams } from '@pkmn/sim';
import type { PokemonSet } from '@pkmn/sim';
import sourcePool from './data/smogon-gen9-1v1-pool.json';
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

function materialize(set: FactorySet, rand: () => number): PokemonSet {
  const item = Array.isArray(set.item) ? pick(set.item, rand) : set.item;
  const ability = Array.isArray(set.ability) ? pick(set.ability, rand) : set.ability;
  return {
    name: '',
    species: set.species,
    item,
    ability,
    gender: '',
    nature: set.nature,
    moves: set.moves.map((slot) => pick(slot, rand)),
    level: 100,
    evs: stats(0),
    ivs: stats(31),
  };
}

/** Showdown paste text -> sets forced to level 100, 0 EVs, 31 IVs. */
export function parseTeam(text: string): PokemonSet[] {
  const sets = Teams.import(text) ?? [];
  return sets.map((s) => ({ ...s, level: 100, evs: stats(0), ivs: stats(31) }));
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
