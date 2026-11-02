// Headless check: random player vs the Brock roster, seeded like the real game.
import { BattleRunner } from '../src/battle';
import { dailyTeam, parseTeam } from '../src/teams';
import { KANTO, dailyTrainerBuild } from '../src/data';
import { battleSeed } from '../src/rng';

const key = '2026-10-24';
const team = dailyTeam(key);
console.log('Team:', team.map((s) => s.species).join(', '));

for (let i = 0; i < KANTO.length; i++) {
  const t = KANTO[i];
  const build = dailyTrainerBuild(t, key, i);
  let turns = 0;
  await new Promise<void>((resolve) => {
    const b: BattleRunner = new BattleRunner({
      playerTeam: team, foeTeam: parseTeam(build.team), foeName: t.name, seed: battleSeed(key, i),
      events: {
        onLines: (ls) => ls.forEach((l) => l.startsWith('|turn|') && (turns = +l.split('|')[2])),
        onRequest: (req) => {
          if (req.forceSwitch) {
            const k = req.side.pokemon.findIndex((p: any) => !p.active && !p.condition.endsWith(' fnt'));
            b.choose(`switch ${k + 1}`);
          } else {
            const moves = req.active[0].moves.map((m: any, k: number) => (m.disabled ? 0 : k + 1)).filter(Boolean);
            b.choose(`move ${moves[Math.floor(Math.random() * moves.length)] ?? 1}`);
          }
        },
        onError: (m) => console.log('ERR', m),
        onEnd: (won) => { console.log(`vs ${t.name} (${build.name}): ${won ? 'WON' : 'LOST'} in ${turns} turns`); resolve(); },
      },
    });
    b.start();
  });
}
process.exit(0);
