import { Teams } from '@pkmn/sim';
import type { PokemonSet } from '@pkmn/sim';
import { POOL_TEXT } from './data';
import { hashString, mulberry32, shuffle } from './rng';

const stats = (n: number) => ({ hp: n, atk: n, def: n, spa: n, spd: n, spe: n });

/** Showdown paste text -> sets forced to level 100, 0 EVs, 31 IVs. */
export function parseTeam(text: string): PokemonSet[] {
  const sets = Teams.import(text) ?? [];
  return sets.map((s) => ({ ...s, level: 100, evs: stats(0), ivs: stats(31) }));
}

export const POOL = parseTeam(POOL_TEXT);

/** Same six Pokemon for everyone on a given day. */
export function dailyTeam(key: string): PokemonSet[] {
  const rand = mulberry32(hashString(`team:${key}`));
  return shuffle([...POOL], rand).slice(0, 6);
}
