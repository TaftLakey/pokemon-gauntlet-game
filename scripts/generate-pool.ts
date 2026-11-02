import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const SOURCE_URL =
  'https://raw.githubusercontent.com/smogon/pokemon-showdown/master/data/random-battles/gen9/1v1-factory-sets.json';
const MIN_SPECIES_WEIGHT = 0.5;

interface FactorySet {
  species: string;
  item: string | string[];
  ability: string;
  nature: string;
  moves: string[][];
  weight: number;
}

interface FactoryPokemon {
  weight: number;
  sets: FactorySet[];
}

const response = await fetch(SOURCE_URL);
if (!response.ok) throw new Error(`Smogon source returned HTTP ${response.status}`);
const source = await response.json() as Record<string, FactoryPokemon>;

const species = Object.entries(source)
  .filter(([, pokemon]) => pokemon.weight >= MIN_SPECIES_WEIGHT)
  .map(([name, pokemon]) => ({
    species: name,
    weight: pokemon.weight,
    sets: pokemon.sets.map(({ species: setSpecies, item, ability, nature, moves, weight }) => ({
      species: setSpecies,
      item,
      ability,
      nature,
      moves,
      weight,
    })),
  }));

const output = {
  source: 'smogon/pokemon-showdown:data/random-battles/gen9/1v1-factory-sets.json',
  sourceUrl: SOURCE_URL,
  sourceRef: 'master',
  speciesWeightCutoff: MIN_SPECIES_WEIGHT,
  generatedAt: new Date().toISOString(),
  species,
};

const outputPath = fileURLToPath(new URL('../src/data/smogon-gen9-1v1-pool.json', import.meta.url));
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${species.length} Pokémon from Smogon 1v1 Factory data to ${outputPath}`);
