# Daily Gauntlet

Daily Pokémon browser game. Everyone gets the same 6 Pokémon each day (UTC date seed),
then fights through the Kanto league at level 100, 0 EVs, 31 IVs. Full heal between battles,
one attempt per day (stored in localStorage).

    npm install
    npm run dev       # play locally
    npm run smoke     # headless test: random player vs the first two rosters
    npm run build     # type-check + production build into dist/

## Where things live
- `src/data.ts`   player pool + Kanto trainers, in Showdown paste format. Add a trainer's team
                  by filling in its `team` string; the run extends automatically.
- `src/teams.ts`  paste parsing (forces L100 / 0 EV / 31 IV) and the daily team draw.
- `src/battle.ts` wraps @pkmn/sim (gen9customgame) and the foe AI.
- `src/main.ts`   home screen, battle screen, daily save state.

Sprites hot-link play.pokemonshowdown.com for now; self-host before launching publicly.
