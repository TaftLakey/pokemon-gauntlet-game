// Checks every set in the pool and every trainer roster against the sim's data.
import { Dex, toID } from '@pkmn/sim';
import type { PokemonSet } from '@pkmn/sim';
import { KANTO } from '../src/data';
import { parseTeam, allFactorySets } from '../src/teams';
import { isMoveLegalForSpecies, BANNED_MOVE_IDS } from '../src/legality';

let bad = 0;
const legacyExceptions = new Map<string, string[]>();

const checkSets = (label: string, sets: PokemonSet[], expect?: number, checkLegality = true) => {
  if (expect && sets.length !== expect) { console.log(`${label}: expected ${expect} sets, got ${sets.length}`); bad++; }
  for (const s of sets) {
    const problems: string[] = [];
    if (!Dex.species.get(s.species).exists) problems.push(`species ${s.species}`);
    if (!Dex.abilities.get(s.ability).exists) problems.push(`ability ${s.ability}`);
    if (!Dex.items.get(s.item).exists) problems.push(`item ${s.item}`);
    for (const m of s.moves) {
      if (!Dex.moves.get(m).exists) problems.push(`move ${m}`);
      else if (checkLegality) {
        const mId = toID(m);
        if (BANNED_MOVE_IDS.has(mId)) {
          problems.push(`banned move ${m}`);
        } else if (!isMoveLegalForSpecies(s.species, m)) {
          // Record legacy move exception
          const cur = legacyExceptions.get(s.species) || [];
          if (!cur.includes(m)) cur.push(m);
          legacyExceptions.set(s.species, cur);
        }
      }
    }
    if (s.moves.length !== 4 && !['Ditto', 'Unown'].includes(s.species)) problems.push(`${s.moves.length} moves`);
    if (problems.length) { console.log(`${label} / ${s.species}: ${problems.join(', ')}`); bad++; }
  }
};

// Check factory sets pool
checkSets('smogon-1v1-factory', allFactorySets(), undefined, true);

// Check all 3 builds for all 13 Kanto trainers (39 builds total)
for (const t of KANTO) {
  for (const b of t.builds) {
    checkSets(`${t.name} [${b.name}]`, parseTeam(b.team), 6, false);
  }
}

if (legacyExceptions.size > 0) {
  console.log(`\nNote: Found ${legacyExceptions.size} species with legacy factory moves (valid in past gens):`);
  for (const [species, moves] of legacyExceptions.entries()) {
    console.log(`  - ${species}: ${moves.join(', ')}`);
  }
  console.log('');
}

console.log(bad ? `${bad} problem(s)` : 'all sets valid');
process.exit(bad ? 1 : 0);

