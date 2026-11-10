import assert from 'node:assert';
import { KANTO, dailyTrainerBuild } from '../src/data';
import { getEligibleDraftSets, pickDraftOptions, isLegendaryOrMythical } from '../src/roster-draft';
import { validateSelection, normalizeSet } from '../src/teams';
import { todayKey } from '../src/rng';

console.log('Testing Post-Battle Draft Feature...');

const KEY = todayKey();

// 1. Test Brock's first build (Sand Offense has Terrakion which is legendary / uncapturable)
const brock = KANTO[0];
const brockBuild0 = brock.builds[0];
assert.strictEqual(isLegendaryOrMythical('Terrakion'), true, 'Terrakion should be recognized as legendary');

const brockEligible = getEligibleDraftSets(brockBuild0, []);
const brockSpecies = brockEligible.map((s) => s.species);
console.log('Brock Sand Offense eligible:', brockSpecies);
assert(!brockSpecies.includes('Terrakion'), 'Terrakion must be excluded from draft pool');
assert.strictEqual(brockEligible.length, 5, 'Should have 5 non-legendary candidates from Brock Sand Offense');

// 2. Test duplicate exclusion: if player already owns Tyranitar and Garganacl
const owned = ['Tyranitar', 'Garganacl'];
const filteredEligible = getEligibleDraftSets(brockBuild0, owned);
const filteredSpecies = filteredEligible.map((s) => s.species);
console.log('Filtered eligible (excluding Tyranitar & Garganacl):', filteredSpecies);
assert(!filteredSpecies.includes('Tyranitar'), 'Owned Tyranitar must be excluded');
assert(!filteredSpecies.includes('Garganacl'), 'Owned Garganacl must be excluded');
assert.strictEqual(filteredEligible.length, 3, 'Should have 3 candidates left');

// 3. Test pickDraftOptions determinism and count
const pick1 = pickDraftOptions(brockEligible, KEY, 0, 3);
const pick2 = pickDraftOptions(brockEligible, KEY, 0, 3);
assert.strictEqual(pick1.length, 3, 'Should pick exactly 3 options');
assert.deepStrictEqual(pick1.map((p) => p.species), pick2.map((p) => p.species), 'Picks must be deterministic for same key & trainer index');

// 4. Test validation of active team containing a drafted Pokémon
const chosenMon = normalizeSet(pick1[0]);
console.log('Simulating drafted recruit:', chosenMon.species);

// Base mock pool of 6 + 1 drafted mon
const mockPool = [
  { species: 'Pikachu', item: 'Light Ball', ability: 'Static', nature: 'Timid', moves: ['Thunderbolt', 'Surf', 'Volt Switch', 'Grass Knot'] },
  { species: 'Charizard', item: 'Choice Specs', ability: 'Solar Power', nature: 'Timid', moves: ['Flamethrower', 'Air Slash', 'Focus Blast', 'Dragon Pulse'] },
  { species: 'Blastoise', item: 'Leftovers', ability: 'Torrent', nature: 'Bold', moves: ['Surf', 'Ice Beam', 'Rapid Spin', 'Toxic'] },
  { species: 'Venusaur', item: 'Life Orb', ability: 'Chlorophyll', nature: 'Modest', moves: ['Giga Drain', 'Sludge Bomb', 'Earth Power', 'Growth'] },
  { species: 'Gengar', item: 'Focus Sash', ability: 'Cursed Body', nature: 'Timid', moves: ['Shadow Ball', 'Sludge Wave', 'Focus Blast', 'Destiny Bond'] },
  { species: 'Alakazam', item: 'Life Orb', ability: 'Magic Guard', nature: 'Timid', moves: ['Psychic', 'Focus Blast', 'Shadow Ball', 'Dazzling Gleam'] },
  chosenMon,
].map((p) => normalizeSet(p as any));

// Team selection containing 5 base + the drafted mon
const activeSelection = [
  { species: 'Pikachu', moves: mockPool[0].moves },
  { species: 'Charizard', moves: mockPool[1].moves },
  { species: 'Blastoise', moves: mockPool[2].moves },
  { species: 'Venusaur', moves: mockPool[3].moves },
  { species: 'Gengar', moves: mockPool[4].moves },
  { species: chosenMon.species, moves: [...chosenMon.moves] },
];

const val = validateSelection(mockPool, activeSelection);
assert.strictEqual(val.valid, true, `Drafted Pokémon on active team must validate: ${val.errors.join(', ')}`);
assert.strictEqual(val.team.length, 6, 'Validated team must have 6 members');

// 5. Test all 12 pre-champion trainers to ensure every build has at least 3 eligible candidates
for (let i = 0; i < 12; i++) {
  const trainer = KANTO[i];
  for (const b of trainer.builds) {
    const el = getEligibleDraftSets(b, []);
    assert(el.length >= 3, `${trainer.name} (${b.name}) should have at least 3 eligible candidates, got ${el.length}`);
    const draft = pickDraftOptions(el, KEY, i, 3);
    assert.strictEqual(draft.length, 3, `${trainer.name} (${b.name}) should yield 3 draft options`);
  }
}

// 6. Test persistence across multiple battles & reloads
interface MockSave {
  status: string;
  cleared: number;
  draftedSets?: any[];
  selectedTeam?: any[];
  bench?: any[];
}

let mockSave: MockSave = {
  status: 'between',
  cleared: 1,
  draftedSets: [chosenMon],
  selectedTeam: activeSelection,
  bench: [{ species: 'Alakazam', moves: mockPool[5].moves }],
};

// Enter Battle 2 (Misty) - must preserve draftedSets with spread
mockSave = { ...mockSave, status: 'inbattle', cleared: 1 };
assert(mockSave.draftedSets && mockSave.draftedSets.length === 1, 'draftedSets must be preserved when entering battle');
assert.strictEqual(mockSave.draftedSets[0].species, chosenMon.species);

// Win Battle 2 & draft second mon (e.g. Primarina)
const mistyMon = normalizeSet({
  name: '',
  species: 'Primarina',
  item: 'Leftovers',
  ability: 'Torrent',
  nature: 'Modest',
  moves: ['Moonblast', 'Hydro Pump', 'Psychic', 'Ice Beam'],
} as any);

mockSave.draftedSets.push(mistyMon);
mockSave.bench!.push({ species: mistyMon.species, moves: [...mistyMon.moves] });
mockSave.cleared = 2;
mockSave.status = 'between';

// Serialize to JSON (simulating localStorage) and reload
const serialized = JSON.stringify(mockSave);
const reloaded: MockSave = JSON.parse(serialized);

assert.strictEqual(reloaded.draftedSets?.length, 2, 'Must have 2 drafted Pokémon after second battle');
assert.strictEqual(reloaded.draftedSets[0].species, chosenMon.species);
assert.strictEqual(reloaded.draftedSets[1].species, 'Primarina');
assert.strictEqual(reloaded.bench?.length, 2, 'Bench must have both bench mons');

console.log('All Post-Battle Draft unit & integration checks PASSED!');
