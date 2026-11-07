import { Dex, toID } from '@pkmn/sim';

export const BANNED_MOVE_IDS: ReadonlySet<string> = new Set([
  'fissure',
  'guillotine',
  'horndrill',
  'sheercold',
  'doubleteam',
  'minimize',
  'batonpass',
  'shedtail',
]);

export interface LegalMoveInfo {
  id: string;
  name: string;
  type: string;
  category: 'Physical' | 'Special' | 'Status';
  basePower: number;
  accuracy: number | true;
  pp: number;
  shortDesc: string;
}

/**
 * Traverses base species, prevos, and forme chains to collect all learnset move IDs.
 */
export function getSpeciesLearnsetIds(speciesName: string): Set<string> {
  const allMoveIds = new Set<string>();
  const queue = [Dex.species.get(speciesName)];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const sp = queue.shift();
    if (!sp || !sp.exists || visited.has(sp.id)) continue;
    visited.add(sp.id);

    const ls = (Dex.data.Learnsets as Record<string, { learnset?: Record<string, string[]> }>)[sp.id];
    if (ls && ls.learnset) {
      for (const m of Object.keys(ls.learnset)) {
        allMoveIds.add(m);
      }
    }
    if (sp.baseSpecies && sp.baseSpecies !== sp.name) {
      queue.push(Dex.species.get(sp.baseSpecies));
    }
    if (sp.prevo) {
      queue.push(Dex.species.get(sp.prevo));
    }
    if (sp.changesFrom) {
      queue.push(Dex.species.get(sp.changesFrom));
    }
  }

  return allMoveIds;
}

/**
 * Returns all Gen 9 standard, non-banned legal moves for a species.
 */
export function getLegalMoves(speciesName: string): LegalMoveInfo[] {
  const rawIds = getSpeciesLearnsetIds(speciesName);
  const legal: LegalMoveInfo[] = [];

  for (const id of rawIds) {
    if (BANNED_MOVE_IDS.has(id)) continue;
    const mv = Dex.moves.get(id);
    if (!mv.exists || mv.isNonstandard) continue;

    legal.push({
      id: mv.id,
      name: mv.name,
      type: mv.type,
      category: mv.category as 'Physical' | 'Special' | 'Status',
      basePower: mv.basePower || 0,
      accuracy: mv.accuracy,
      pp: mv.pp,
      shortDesc: mv.shortDesc || '',
    });
  }

  // Sort alphabetically by name
  return legal.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Checks whether a move is legal in Gen 9 for the specified species.
 * Allows default factory moves as legacy exceptions if they were in the pool.
 */
export function isMoveLegalForSpecies(speciesName: string, moveNameOrId: string, allowedExceptions?: Set<string>): boolean {
  const id = toID(moveNameOrId);
  if (BANNED_MOVE_IDS.has(id)) return false;
  if (allowedExceptions && allowedExceptions.has(id)) return true;

  const mv = Dex.moves.get(id);
  if (!mv.exists || mv.isNonstandard) return false;

  const legalIds = getSpeciesLearnsetIds(speciesName);
  return legalIds.has(id);
}
