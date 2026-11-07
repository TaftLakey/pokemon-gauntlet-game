// Headless test for partyFromRequest before and after switches.
import { partyFromRequest } from '../src/party';
import type { PokemonSet } from '@pkmn/sim';

let failures = 0;

const mockTeam: PokemonSet[] = [
  {
    name: '',
    species: 'Pikachu',
    item: 'Light Ball',
    ability: 'Static',
    gender: '',
    nature: 'Jolly',
    moves: ['Thunderbolt', 'Quick Attack', 'Iron Tail', 'Volt Tackle'],
    level: 85,
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
  },
  {
    name: '',
    species: 'Snorlax',
    item: 'Leftovers',
    ability: 'Thick Fat',
    gender: '',
    nature: 'Careful',
    moves: ['Body Slam', 'Rest', 'Sleep Talk', 'Curse'],
    level: 85,
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
  },
  {
    name: '',
    species: 'Gengar',
    item: 'Black Sludge',
    ability: 'Cursed Body',
    gender: '',
    nature: 'Timid',
    moves: ['Shadow Ball', 'Sludge Bomb', 'Focus Blast', 'Thunderbolt'],
    level: 85,
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
  },
];

console.log('Testing partyFromRequest with synthetic battle requests...');

// 1. Initial State: Pikachu active, Snorlax bench, Gengar bench
const initialReq = {
  side: {
    name: 'You',
    id: 'p1',
    pokemon: [
      {
        ident: 'p1: Pikachu',
        details: 'Pikachu, L85',
        condition: '200/200',
        active: true,
        stats: { atk: 158, def: 108, spa: 133, spd: 125, spe: 218 },
        moves: ['thunderbolt', 'quickattack', 'irontail', 'volttackle'],
        ability: 'static',
        item: 'lightball',
      },
      {
        ident: 'p1: Snorlax',
        details: 'Snorlax, L85',
        condition: '360/360',
        active: false,
        stats: { atk: 226, def: 168, spa: 168, spd: 247, spe: 83 },
        moves: ['bodyslam', 'rest', 'sleeptalk', 'curse'],
        ability: 'thickfat',
        item: 'leftovers',
      },
      {
        ident: 'p1: Gengar',
        details: 'Gengar, L85',
        condition: '223/223',
        active: false,
        stats: { atk: 147, def: 147, spa: 268, spd: 177, spe: 247 },
        moves: ['shadowball', 'sludgebomb', 'focusblast', 'thunderbolt'],
        ability: 'cursedbody',
        item: 'blacksludge',
      },
    ],
  },
};

const initialParty = partyFromRequest(initialReq, mockTeam);
if (initialParty.length !== 3) {
  console.error(`[FAIL] Expected 3 members, got ${initialParty.length}`);
  failures++;
}
if (initialParty[0].species !== 'Pikachu' || !initialParty[0].active) {
  console.error(`[FAIL] Slot 0 should be active Pikachu, got ${initialParty[0]?.species}`);
  failures++;
}
if (initialParty[1].species !== 'Snorlax' || initialParty[1].active) {
  console.error(`[FAIL] Slot 1 should be benched Snorlax, got ${initialParty[1]?.species}`);
  failures++;
}

// 2. Switch Pikachu -> Snorlax (Showdown swaps active Pokémon to index 0)
const switchedReq1 = {
  side: {
    name: 'You',
    id: 'p1',
    pokemon: [
      {
        ident: 'p1: Snorlax',
        details: 'Snorlax, L85',
        condition: '320/360', // took a hit
        active: true,
        stats: { atk: 226, def: 168, spa: 168, spd: 247, spe: 83 },
        moves: ['bodyslam', 'rest', 'sleeptalk', 'curse'],
        ability: 'thickfat',
        item: 'leftovers',
      },
      {
        ident: 'p1: Pikachu',
        details: 'Pikachu, L85',
        condition: '150/200',
        active: false,
        stats: { atk: 158, def: 108, spa: 133, spd: 125, spe: 218 },
        moves: ['thunderbolt', 'quickattack', 'irontail', 'volttackle'],
        ability: 'static',
        item: 'lightball',
      },
      {
        ident: 'p1: Gengar',
        details: 'Gengar, L85',
        condition: '223/223',
        active: false,
        stats: { atk: 147, def: 147, spa: 268, spd: 177, spe: 247 },
        moves: ['shadowball', 'sludgebomb', 'focusblast', 'thunderbolt'],
        ability: 'cursedbody',
        item: 'blacksludge',
      },
    ],
  },
};

const switchedParty1 = partyFromRequest(switchedReq1, mockTeam);
// In slot 0, it must be Snorlax (NOT Pikachu!)
if (switchedParty1[0].species !== 'Snorlax' || !switchedParty1[0].active) {
  console.error(`[FAIL] Post-switch slot 0 must be Snorlax, got ${switchedParty1[0].species}`);
  failures++;
}
if (switchedParty1[0].moves[0] !== 'Body Slam') {
  console.error(`[FAIL] Post-switch slot 0 moves must be Snorlax moves, got ${switchedParty1[0].moves[0]}`);
  failures++;
}
if (switchedParty1[0].hpPercent !== 89) {
  console.error(`[FAIL] Post-switch slot 0 HP should be 89%, got ${switchedParty1[0].hpPercent}%`);
  failures++;
}

// In slot 1, it must be benched Pikachu
if (switchedParty1[1].species !== 'Pikachu' || switchedParty1[1].active) {
  console.error(`[FAIL] Post-switch slot 1 must be Pikachu, got ${switchedParty1[1].species}`);
  failures++;
}
if (switchedParty1[1].moves[0] !== 'Thunderbolt') {
  console.error(`[FAIL] Post-switch slot 1 moves must be Pikachu moves, got ${switchedParty1[1].moves[0]}`);
  failures++;
}

// 3. Switch Snorlax -> Gengar, and Snorlax faints
const switchedReq2 = {
  side: {
    name: 'You',
    id: 'p1',
    pokemon: [
      {
        ident: 'p1: Gengar',
        details: 'Gengar, L85',
        condition: '223/223',
        active: true,
        stats: { atk: 147, def: 147, spa: 268, spd: 177, spe: 247 },
        moves: ['shadowball', 'sludgebomb', 'focusblast', 'thunderbolt'],
        ability: 'cursedbody',
        item: 'blacksludge',
      },
      {
        ident: 'p1: Pikachu',
        details: 'Pikachu, L85',
        condition: '150/200',
        active: false,
        stats: { atk: 158, def: 108, spa: 133, spd: 125, spe: 218 },
        moves: ['thunderbolt', 'quickattack', 'irontail', 'volttackle'],
        ability: 'static',
        item: 'lightball',
      },
      {
        ident: 'p1: Snorlax',
        details: 'Snorlax, L85',
        condition: '0 fnt',
        active: false,
        stats: { atk: 226, def: 168, spa: 168, spd: 247, spe: 83 },
        moves: ['bodyslam', 'rest', 'sleeptalk', 'curse'],
        ability: 'thickfat',
        item: 'leftovers',
      },
    ],
  },
};

const switchedParty2 = partyFromRequest(switchedReq2, mockTeam);
if (switchedParty2[0].species !== 'Gengar' || !switchedParty2[0].active) {
  console.error(`[FAIL] Post-switch 2 slot 0 must be Gengar, got ${switchedParty2[0].species}`);
  failures++;
}
if (switchedParty2[2].species !== 'Snorlax' || !switchedParty2[2].fainted || switchedParty2[2].hpPercent !== 0) {
  console.error(`[FAIL] Post-switch 2 slot 2 must be fainted Snorlax (0% HP)`);
  failures++;
}

console.log(failures ? `test:party failed with ${failures} error(s)` : 'All test:party checks PASSED');
process.exit(failures ? 1 : 0);
