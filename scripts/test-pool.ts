// Headless test for daily 10-pool generation, type coverage, and validateSelection.
import { dailyPool10, defaultDailySelection, validateSelection, getSuperEffectiveCoverage, ALL_18_TYPES } from '../src/teams';

let failures = 0;
const DATES_TO_TEST = 60;
const startDate = new Date('2026-10-01T00:00:00Z');

console.log(`Testing daily 10-pool over ${DATES_TO_TEST} consecutive dates...`);

let minCoverage = 18;
let maxCoverage = 0;
let totalCoverage = 0;

for (let i = 0; i < DATES_TO_TEST; i++) {
  const d = new Date(startDate.getTime() + i * 86400000);
  const key = d.toISOString().slice(0, 10);
  const pool = dailyPool10(key);

  if (pool.length !== 10) {
    console.error(`[FAIL] ${key}: Expected 10 Pokémon in pool, got ${pool.length}`);
    failures++;
  }

  const uniqueSpecies = new Set(pool.map((p) => p.species.toLowerCase()));
  if (uniqueSpecies.size !== 10) {
    console.error(`[FAIL] ${key}: Expected 10 unique species, got ${uniqueSpecies.size}`);
    failures++;
  }

  const combinedCoverage = new Set<string>();
  for (const p of pool) {
    const cov = getSuperEffectiveCoverage(p);
    for (const t of cov) combinedCoverage.add(t);
  }

  const covCount = combinedCoverage.size;
  minCoverage = Math.min(minCoverage, covCount);
  maxCoverage = Math.max(maxCoverage, covCount);
  totalCoverage += covCount;

  if (covCount < 18) {
    const missing = ALL_18_TYPES.filter((t) => !combinedCoverage.has(t));
    console.warn(`[WARN] ${key}: Covered ${covCount}/18 types. Missing: ${missing.join(', ')}`);
  }
}

const avgCoverage = (totalCoverage / DATES_TO_TEST).toFixed(2);
console.log(`Pool Coverage over ${DATES_TO_TEST} days: Min = ${minCoverage}/18, Max = ${maxCoverage}/18, Avg = ${avgCoverage}/18`);

// ---- Test validateSelection ----
console.log('Testing validateSelection pure function...');
const sampleKey = '2026-11-07';
const pool = dailyPool10(sampleKey);

// 1. Default selection should be 100% valid
const defaultSel = defaultDailySelection(pool);
const resDefault = validateSelection(pool, defaultSel);
if (!resDefault.valid || resDefault.team.length !== 6) {
  console.error('[FAIL] Default selection should be valid, got errors:', resDefault.errors);
  failures++;
}

// 2. Reject team with only 5 Pokémon
const shortSel = defaultSel.slice(0, 5);
const resShort = validateSelection(pool, shortSel);
if (resShort.valid) {
  console.error('[FAIL] validateSelection should reject 5 Pokémon');
  failures++;
}

// 3. Reject duplicate species
const dupSpeciesSel = [defaultSel[0], defaultSel[0], ...defaultSel.slice(2)];
const resDupSpecies = validateSelection(pool, dupSpeciesSel);
if (resDupSpecies.valid) {
  console.error('[FAIL] validateSelection should reject duplicate species');
  failures++;
}

// 4. Reject species not in pool
const nonPoolSel = [{ species: 'Mewtwo', moves: ['Psychic', 'Shadow Ball', 'Aura Sphere', 'Ice Beam'] }, ...defaultSel.slice(1)];
const resNonPool = validateSelection(pool, nonPoolSel);
if (resNonPool.valid) {
  console.error('[FAIL] validateSelection should reject species not in pool');
  failures++;
}

// 5. Reject Pokémon with 3 moves
const threeMovesSel = [{ species: defaultSel[0].species, moves: defaultSel[0].moves.slice(0, 3) }, ...defaultSel.slice(1)];
const resThreeMoves = validateSelection(pool, threeMovesSel);
if (resThreeMoves.valid) {
  console.error('[FAIL] validateSelection should reject < 4 moves');
  failures++;
}

// 6. Reject duplicate moves on a Pokémon
const dupMoveSel = [
  { species: defaultSel[0].species, moves: [defaultSel[0].moves[0], defaultSel[0].moves[0], defaultSel[0].moves[1], defaultSel[0].moves[2]] },
  ...defaultSel.slice(1),
];
const resDupMove = validateSelection(pool, dupMoveSel);
if (resDupMove.valid) {
  console.error('[FAIL] validateSelection should reject duplicate moves');
  failures++;
}

// 7. Reject banned moves (e.g. Fissure)
const bannedMoveSel = [
  { species: defaultSel[0].species, moves: ['Fissure', defaultSel[0].moves[1], defaultSel[0].moves[2], defaultSel[0].moves[3]] },
  ...defaultSel.slice(1),
];
const resBanned = validateSelection(pool, bannedMoveSel);
if (resBanned.valid) {
  console.error('[FAIL] validateSelection should reject banned move Fissure');
  failures++;
}

// 8. Confirm fallback team is returned on failure
if (resBanned.team.length !== 6 || resBanned.team[0].species !== pool[0].species) {
  console.error('[FAIL] validateSelection did not return safe fallback team');
  failures++;
}

console.log(failures ? `test:pool failed with ${failures} error(s)` : 'All test:pool checks PASSED');
process.exit(failures ? 1 : 0);
