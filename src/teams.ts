import { Dex, Teams, toID } from '@pkmn/sim';
import type { PokemonSet } from '@pkmn/sim';
import sourcePool from './data/pokemon-pool.json';
import { hashString, mulberry32, shuffle } from './rng';
import { isMoveLegalForSpecies } from './legality';

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

export const ALL_18_TYPES = [
  'Normal', 'Fire', 'Water', 'Grass', 'Electric', 'Ice',
  'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
  'Rock', 'Ghost', 'Dragon', 'Steel', 'Dark', 'Fairy',
] as const;

export type PokemonType = (typeof ALL_18_TYPES)[number];

/** Returns the set of defending types that this Pokémon set hits super-effectively with STAB and default moves */
export function getSuperEffectiveCoverage(set: { species: string; moves: string[] }): Set<string> {
  const dexSp = Dex.species.get(set.species);
  const stabTypes = dexSp.types || [];
  const moveTypes = set.moves
    .map((m) => Dex.moves.get(m))
    .filter((m) => m && m.category !== 'Status')
    .map((m) => m.type);
  const attackingTypes = new Set<string>([...stabTypes, ...moveTypes]);

  const defendingCovered = new Set<string>();
  for (const atk of attackingTypes) {
    for (const def of ALL_18_TYPES) {
      if (Dex.getEffectiveness(atk, [def]) > 0) {
        defendingCovered.add(def);
      }
    }
  }
  return defendingCovered;
}

/** One weighted Smogon 1v1 set for each eligible species, seeded by UTC date. */
export function dailyPool(key: string): PokemonSet[] {
  const rand = mulberry32(hashString(`smogon-1v1-sets:${key}`));
  return factoryPokemon.map((pokemon) => materialize(weightedPick(pokemon.sets, rand), rand));
}

/**
 * 10 Pokémon drawn deterministically from the player pool for the date key.
 * Coverage-aware: selected using a seeded greedy algorithm to cover all 18 types super-effectively.
 */
export function dailyPool10(key: string): PokemonSet[] {
  const fullCandidates = dailyPool(key);
  let retry = 0;

  while (retry < 50) {
    const rand = mulberry32(hashString(`daily-10-pool:${key}:${retry}`));
    const poolCopy = [...fullCandidates];

    // Seeded shuffle of candidates for deterministic tie-breaking
    for (let i = poolCopy.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [poolCopy[i], poolCopy[j]] = [poolCopy[j], poolCopy[i]];
    }

    const selected: PokemonSet[] = [];
    const covered = new Set<string>();

    for (let step = 0; step < 10; step++) {
      let bestCandidate: PokemonSet | null = null;
      let bestNewCover = -1;
      let bestIndex = -1;

      for (let i = 0; i < poolCopy.length; i++) {
        const c = poolCopy[i];
        const cov = getSuperEffectiveCoverage(c);
        let newCov = 0;
        for (const t of cov) {
          if (!covered.has(t)) newCov++;
        }

        if (newCov > bestNewCover) {
          bestNewCover = newCov;
          bestCandidate = c;
          bestIndex = i;
          if (newCov === 18 - covered.size) break;
        }
      }

      if (bestCandidate) {
        selected.push(bestCandidate);
        poolCopy.splice(bestIndex, 1);
        const cov = getSuperEffectiveCoverage(bestCandidate);
        for (const t of cov) covered.add(t);
      }
    }

    if (covered.size === 18 || retry === 49) {
      return selected;
    }
    retry++;
  }

  return fullCandidates.slice(0, 10);
}

export interface TeamSelectionEntry {
  species: string;
  moves: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  team: PokemonSet[];
}

/** Re-normalizes a set with balanced level, 0 EVs, and 31 IVs. */
export function normalizeSet(set: PokemonSet): PokemonSet {
  const level = getBalancedLevel(set.species, set.nature);
  return {
    ...set,
    level,
    evs: stats(0),
    ivs: stats(31),
  };
}

/** Default selection takes the first 6 Pokémon from the daily 10-pool with their default moves. */
export function defaultDailySelection(pool10: PokemonSet[]): TeamSelectionEntry[] {
  return pool10.slice(0, 6).map((p) => ({
    species: p.species,
    moves: [...p.moves],
  }));
}

/**
 * Pure validator for a user's 6-member team selection from the 10-pool.
 * Checks:
 * - Exactly 6 unique species from today's pool
 * - Exactly 4 unique legal moves per Pokémon
 * - Returns normalized PokemonSets or falls back safely to default selection.
 */
export function validateSelection(pool: PokemonSet[], selection: unknown): ValidationResult {
  const errors: string[] = [];
  const defaultTeam = pool.slice(0, 6).map((p) => normalizeSet(p));

  if (!Array.isArray(selection) || selection.length !== 6) {
    return {
      valid: false,
      errors: ['Team selection must contain exactly 6 Pokémon.'],
      team: defaultTeam,
    };
  }

  const poolSpeciesMap = new Map<string, PokemonSet>();
  for (const p of pool) {
    poolSpeciesMap.set(p.species.toLowerCase(), p);
  }

  const seenSpecies = new Set<string>();
  const validatedTeam: PokemonSet[] = [];

  for (let i = 0; i < selection.length; i++) {
    const entry = selection[i] as TeamSelectionEntry;
    if (!entry || typeof entry.species !== 'string') {
      errors.push(`Slot ${i + 1}: Invalid Pokémon entry.`);
      continue;
    }

    const speciesLower = entry.species.toLowerCase();
    const template = poolSpeciesMap.get(speciesLower);
    if (!template) {
      errors.push(`Slot ${i + 1}: '${entry.species}' is not in today's 10-Pokémon pool.`);
      continue;
    }

    if (seenSpecies.has(speciesLower)) {
      errors.push(`Slot ${i + 1}: Duplicate species '${template.species}' on team.`);
    }
    seenSpecies.add(speciesLower);

    if (!Array.isArray(entry.moves) || entry.moves.length !== 4) {
      errors.push(`Slot ${i + 1} (${template.species}): Must have exactly 4 moves.`);
      continue;
    }

    const seenMoves = new Set<string>();
    const templateMoves = new Set(template.moves.map((m) => toID(m)));
    for (const m of entry.moves) {
      if (typeof m !== 'string' || !m.trim()) {
        errors.push(`Slot ${i + 1} (${template.species}): Invalid move name.`);
        continue;
      }
      const mId = toID(m);
      if (seenMoves.has(mId)) {
        errors.push(`Slot ${i + 1} (${template.species}): Duplicate move '${m}'.`);
      }
      seenMoves.add(mId);

      if (!isMoveLegalForSpecies(template.species, m, templateMoves)) {
        errors.push(`Slot ${i + 1} (${template.species}): Illegal move '${m}'.`);
      }
    }

    validatedTeam.push(
      normalizeSet({
        ...template,
        moves: [...entry.moves],
      })
    );
  }

  if (errors.length > 0 || validatedTeam.length !== 6) {
    return {
      valid: false,
      errors,
      team: defaultTeam,
    };
  }

  return {
    valid: true,
    errors: [],
    team: validatedTeam,
  };
}

/** All players get the same six species and set variants on a given day. */
export function dailyTeam(key: string): PokemonSet[] {
  return dailyPool10(key).slice(0, 6);
}

/** Representative materializations for the existing data validation script. */
export function allFactorySets(): PokemonSet[] {
  return factoryPokemon.flatMap((pokemon) => pokemon.sets.map((set, index) => {
    const rand = mulberry32(hashString(`validate:${pokemon.species}:${index}`));
    return materialize(set, rand);
  }));
}
