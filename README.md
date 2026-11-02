# Daily Gauntlet

Daily Pokémon browser game. Everyone gets the same 6 Pokémon each day (UTC date seed),
then fights through the Kanto league at level 100, 0 EVs, 31 IVs. Full heal between battles,
one attempt per day (stored in localStorage).

    npm install
    npm run dev       # play locally
    npm run smoke     # headless test: random player vs every finished roster
    npm run validate  # check every set (species, items, abilities, moves) against the sim data
    npm run build     # type-check + production build into dist/

## Where things live
- `src/data.ts`   all 13 Kanto trainers (8 Gym Leaders + Elite Four + Champion), each
                  with 3 distinct competitive builds deterministically selected by daily seed.
- `src/teams.ts`  Smogon 1v1 pool integration and daily team draw (forces L100 / 0 EV / 31 IV).
- `src/battle.ts` wraps @pkmn/sim (gen9customgame) and the foe AI.
- `src/main.ts`   home screen, battle screen, daily save state.

Sprites hot-link play.pokemonshowdown.com for now; self-host before launching publicly.
