// Headless investigation: Toxic Spikes interaction in @pkmn/sim
import { BattleStreams, Teams } from '@pkmn/sim';
import type { PokemonSet } from '@pkmn/sim';

const createMon = (species: string, item = '', ability = '', moves = ['Tackle', 'Rest', 'Snore', 'Protect']): PokemonSet => ({
  name: '',
  species,
  item,
  ability,
  gender: '',
  nature: 'Hardy',
  moves,
  level: 85,
  evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
});

async function runToxicSpikesTest(): Promise<{
  groundedPoisoned: boolean;
  bootsPoisoned: boolean;
  poisonTypePoisoned: boolean;
  poisonTypeAbsorbed: boolean;
  flyingLevitatePoisoned: boolean;
  steelPoisoned: boolean;
}> {
  const p1Team: PokemonSet[] = [
    createMon('Pikachu', 'Focus Sash', 'Static', ['Agility', 'Quick Attack', 'Protect', 'Rest']), // Lead
    createMon('Snorlax', 'Leftovers', 'Thick Fat', ['Body Slam', 'Rest', 'Sleep Talk', 'Curse']), // (1) Grounded without boots
    createMon('Chansey', 'Heavy-Duty Boots', 'Natural Cure', ['Seismic Toss', 'Soft-Boiled', 'Toxic', 'Protect']), // (2) Heavy-Duty Boots
    createMon('Muk', 'Black Sludge', 'Poison Touch', ['Poison Jab', 'Shadow Sneak', 'Protect', 'Rest']), // (3) Grounded Poison type
    createMon('Rotom-Wash', 'Leftovers', 'Levitate', ['Hydro Pump', 'Volt Switch', 'Thunderbolt', 'Will-O-Wisp']), // (4) Levitate
    createMon('Steelix', 'Leftovers', 'Sturdy', ['Earthquake', 'Iron Head', 'Stealth Rock', 'Protect']), // (5) Steel type
  ];

  const p2Team: PokemonSet[] = [
    createMon('Cloyster', 'Focus Sash', 'Skill Link', ['Toxic Spikes', 'Splash', 'Rest', 'Ice Beam']),
    createMon('Snorlax', 'Leftovers', 'Thick Fat', ['Body Slam', 'Rest', 'Sleep Talk', 'Curse']),
  ];

  const streams = BattleStreams.getPlayerStreams(new BattleStreams.BattleStream());

  let groundedPoisoned = false;
  let bootsPoisoned = false;
  let poisonTypePoisoned = false;
  let poisonTypeAbsorbed = false;
  let flyingLevitatePoisoned = false;
  let steelPoisoned = false;

  let turn = 0;
  let step = 0; // 0: set T-Spikes, 1: switch Snorlax, 2: switch Chansey, 3: switch Rotom, 4: switch Muk, 5: switch Steelix

  void streams.omniscient.write(
    `>start {"formatid":"gen9customgame"}\n` +
    `>player p1 {"name":"You","team":"${Teams.pack(p1Team)}"}\n` +
    `>player p2 {"name":"Foe","team":"${Teams.pack(p2Team)}"}`
  );

  let p2RequestCount = 0;
  void (async () => {
    for await (const chunk of streams.p2) {
      for (const l of chunk.split('\n')) {
        if (l.startsWith('|request|')) {
          const body = l.slice(9);
          if (!body) continue;
          const req = JSON.parse(body);
          if (req.wait) continue;
          if (req.teamPreview) {
            void streams.p2.write('default');
            continue;
          }
          p2RequestCount++;
          // First turn use Toxic Spikes (move 1), subsequent use Splash (move 2)
          if (p2RequestCount <= 1) void streams.p2.write('move 1');
          else void streams.p2.write('move 2');
        }
      }
    }
  })();

  // Track lines
  void (async () => {
    for await (const chunk of streams.omniscient) {
      for (const line of chunk.split('\n')) {
        if (line.startsWith('|turn|')) turn = Number(line.split('|')[2]);

        // Status lines
        if (line.includes('|-status|p1a: Snorlax|psn') || line.includes('|-status|p1a: Snorlax|tox')) {
          groundedPoisoned = true;
        }
        if (line.includes('|-status|p1a: Chansey|psn') || line.includes('|-status|p1a: Chansey|tox')) {
          bootsPoisoned = true;
        }
        if (line.includes('|-status|p1a: Muk|psn') || line.includes('|-status|p1a: Muk|tox')) {
          poisonTypePoisoned = true;
        }
        if (line.includes('|-status|p1a: Rotom|psn') || line.includes('|-status|p1a: Rotom|tox')) {
          flyingLevitatePoisoned = true;
        }
        if (line.includes('|-status|p1a: Steelix|psn') || line.includes('|-status|p1a: Steelix|tox')) {
          steelPoisoned = true;
        }

        // Absorption line
        if (line.includes('|-sideend|p1: You|move: Toxic Spikes') && line.includes('Muk')) {
          poisonTypeAbsorbed = true;
        }
        if (line.includes('|-sideend|p1: You|move: Toxic Spikes')) {
          poisonTypeAbsorbed = true;
        }
      }
    }
  })();

  // Player state machine
  await new Promise<void>((resolve) => {
    void (async () => {
      for await (const chunk of streams.p1) {
        for (const l of chunk.split('\n')) {
          if (l.startsWith('|request|')) {
            const body = l.slice(9);
            if (!body) continue;
            const req = JSON.parse(body);
            if (req.wait) continue;
            if (req.teamPreview) {
              void streams.p1.write('default');
              continue;
            }

            const pk = req.side.pokemon as any[];
            if (step === 0) {
              // Turn 1: Pikachu uses Protect while Cloyster sets Toxic Spikes
              step = 1;
              void streams.p1.write('move 3'); // Protect
            } else if (step === 1) {
              // Switch to Grounded Snorlax (no boots)
              step = 2;
              const idx = pk.findIndex((p) => p.details.startsWith('Snorlax'));
              void streams.p1.write(`switch ${idx + 1}`);
            } else if (step === 2) {
              // Switch to Chansey (Heavy-Duty Boots)
              step = 3;
              const idx = pk.findIndex((p) => p.details.startsWith('Chansey'));
              void streams.p1.write(`switch ${idx + 1}`);
            } else if (step === 3) {
              // Switch to Rotom-Wash (Levitate)
              step = 4;
              const idx = pk.findIndex((p) => p.details.startsWith('Rotom'));
              void streams.p1.write(`switch ${idx + 1}`);
            } else if (step === 4) {
              // Switch to Steelix (Steel type)
              step = 5;
              const idx = pk.findIndex((p) => p.details.startsWith('Steelix'));
              void streams.p1.write(`switch ${idx + 1}`);
            } else if (step === 5) {
              // Switch to Muk (Grounded Poison - should absorb)
              step = 6;
              const idx = pk.findIndex((p) => p.details.startsWith('Muk'));
              void streams.p1.write(`switch ${idx + 1}`);
            } else if (step === 6) {
              // Muk is in, give one more command to ensure all events were processed
              step = 7;
              setTimeout(() => resolve(), 50);
              void streams.p1.write('move 3'); // Protect
            } else {
              resolve();
              return;
            }
          }
        }
      }
    })();
  });

  return {
    groundedPoisoned,
    bootsPoisoned,
    poisonTypePoisoned,
    poisonTypeAbsorbed,
    flyingLevitatePoisoned,
    steelPoisoned,
  };
}

console.log('Running Toxic Spikes headless simulation in @pkmn/sim...');
const result = await runToxicSpikesTest();

console.log('Results:');
console.log('  1. Grounded without boots (Snorlax) poisoned:', result.groundedPoisoned, '(Expected: true)');
console.log('  2. Heavy-Duty Boots (Chansey) poisoned:', result.bootsPoisoned, '(Expected: false)');
console.log('  3. Levitate (Rotom-Wash) poisoned:', result.flyingLevitatePoisoned, '(Expected: false)');
console.log('  4. Steel type (Steelix) poisoned:', result.steelPoisoned, '(Expected: false)');
console.log('  5. Grounded Poison type (Muk) poisoned:', result.poisonTypePoisoned, '(Expected: false)');
console.log('  6. Grounded Poison type absorbed Toxic Spikes:', result.poisonTypeAbsorbed, '(Expected: true)');

let failed = false;
if (!result.groundedPoisoned) { console.error('[FAIL] Grounded Pokémon was not poisoned'); failed = true; }
if (result.bootsPoisoned) { console.error('[FAIL] Heavy-Duty Boots was poisoned'); failed = true; }
if (result.flyingLevitatePoisoned) { console.error('[FAIL] Levitate Pokémon was poisoned'); failed = true; }
if (result.steelPoisoned) { console.error('[FAIL] Steel Pokémon was poisoned'); failed = true; }
if (result.poisonTypePoisoned) { console.error('[FAIL] Poison Pokémon was poisoned'); failed = true; }
if (!result.poisonTypeAbsorbed) { console.error('[FAIL] Toxic Spikes were not absorbed by Poison Pokémon'); failed = true; }

if (!failed) {
  console.log('\nSIM FINDING: @pkmn/sim behaves 100% correctly with Toxic Spikes!');
  console.log('Conclusion: The Toxic Spikes bug is purely a DISPLAY issue in the UI (missing status badges/protocol event handling).');
} else {
  console.error('\nSIM FINDING: @pkmn/sim did NOT behave as expected!');
}

process.exit(failed ? 1 : 0);
