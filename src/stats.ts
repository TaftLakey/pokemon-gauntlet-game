import { Dex, PokemonSet } from '@pkmn/sim';

export interface PlayerStatInfo {
  species: string;
  level: number;
  types: string[];
  baseStats: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  exactStats: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  natureMods: Record<string, '+' | '-' | ''>;
  bst: number;
  nature: string;
  ability: string;
  item: string;
  moves: string[];
}

export interface OpponentStatEstimate {
  species: string;
  level: number;
  types: string[];
  baseStats: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  bst: number;
  estimated: Record<string, { base: number; est: string; range: string }>;
}

export function getPlayerStatInfo(set: PokemonSet): PlayerStatInfo {
  const dexSpecies = Dex.species.get(set.species);
  const base = dexSpecies.baseStats;
  const nat = Dex.natures.get(set.nature);
  const level = set.level || 85;

  const natureMods: Record<string, '+' | '-' | ''> = {
    hp: '',
    atk: nat.plus === 'atk' ? '+' : nat.minus === 'atk' ? '-' : '',
    def: nat.plus === 'def' ? '+' : nat.minus === 'def' ? '-' : '',
    spa: nat.plus === 'spa' ? '+' : nat.minus === 'spa' ? '-' : '',
    spd: nat.plus === 'spd' ? '+' : nat.minus === 'spd' ? '-' : '',
    spe: nat.plus === 'spe' ? '+' : nat.minus === 'spe' ? '-' : '',
  };

  const calc = (stat: 'atk' | 'def' | 'spa' | 'spd' | 'spe') => {
    let mult = 1.0;
    if (nat.plus === stat) mult = 1.1;
    else if (nat.minus === stat) mult = 0.9;
    return Math.floor((Math.floor(((2 * base[stat] + 31) * level) / 100) + 5) * mult);
  };

  const hp = set.species === 'Shedinja'
    ? 1
    : Math.floor(((2 * base.hp + 31) * level) / 100) + level + 10;

  return {
    species: dexSpecies.name || set.species,
    level,
    types: dexSpecies.types || ['Normal'],
    baseStats: base,
    exactStats: {
      hp,
      atk: calc('atk'),
      def: calc('def'),
      spa: calc('spa'),
      spd: calc('spd'),
      spe: calc('spe'),
    },
    natureMods,
    bst: base.hp + base.atk + base.def + base.spa + base.spd + base.spe,
    nature: set.nature,
    ability: set.ability,
    item: set.item,
    moves: set.moves,
  };
}

export function getOpponentStatEstimate(speciesName: string, level = 85): OpponentStatEstimate {
  const dexSpecies = Dex.species.get(speciesName);
  const base = dexSpecies.baseStats;

  const estimated: Record<string, { base: number; est: string; range: string }> = {};

  const hp = speciesName === 'Shedinja'
    ? 1
    : Math.floor(((2 * base.hp + 31) * level) / 100) + level + 10;
  estimated.hp = { base: base.hp, est: `${hp}`, range: 'Exact' };

  for (const s of ['atk', 'def', 'spa', 'spd', 'spe'] as const) {
    const neutral = Math.floor(((2 * base[s] + 31) * level) / 100) + 5;
    const min = Math.floor(neutral * 0.9);
    const max = Math.floor(neutral * 1.1);
    estimated[s] = {
      base: base[s],
      est: `~${neutral}`,
      range: `${min}–${max}`,
    };
  }

  return {
    species: dexSpecies.name || speciesName,
    level,
    types: dexSpecies.types || ['Normal'],
    baseStats: base,
    bst: base.hp + base.atk + base.def + base.spa + base.spd + base.spe,
    estimated,
  };
}

const modBadge = (mod: '+' | '-' | '') => {
  if (mod === '+') return `<span class="st-tag plus">+</span>`;
  if (mod === '-') return `<span class="st-tag minus">-</span>`;
  return '';
};

export function renderPlayerTooltip(info: PlayerStatInfo): string {
  const typesHtml = info.types
    .map((t) => `<span class="st-type t-${t.toLowerCase()}">${t}</span>`)
    .join('');

  return `
    <div class="st-header">
      <div class="st-name-row">
        <span class="st-name">${info.species}</span>
        <span class="st-level">Lv${info.level} (Your Mon)</span>
      </div>
      <div class="st-types">${typesHtml}</div>
    </div>
    <div class="st-meta">
      <div><b>Ability:</b> ${info.ability}</div>
      <div><b>Held Item:</b> ${info.item || 'None'}</div>
      <div><b>Nature:</b> ${info.nature}</div>
    </div>
    <div class="st-divider"></div>
    <table class="st-table">
      <thead>
        <tr>
          <th>Stat</th>
          <th style="text-align: right;">Base</th>
          <th style="text-align: right;">Exact</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>HP</td><td style="text-align: right;">${info.baseStats.hp}</td><td style="text-align: right;"><b>${info.exactStats.hp}</b></td></tr>
        <tr><td>Atk</td><td style="text-align: right;">${info.baseStats.atk}</td><td style="text-align: right;"><b>${info.exactStats.atk}</b> ${modBadge(info.natureMods.atk)}</td></tr>
        <tr><td>Def</td><td style="text-align: right;">${info.baseStats.def}</td><td style="text-align: right;"><b>${info.exactStats.def}</b> ${modBadge(info.natureMods.def)}</td></tr>
        <tr><td>SpA</td><td style="text-align: right;">${info.baseStats.spa}</td><td style="text-align: right;"><b>${info.exactStats.spa}</b> ${modBadge(info.natureMods.spa)}</td></tr>
        <tr><td>SpD</td><td style="text-align: right;">${info.baseStats.spd}</td><td style="text-align: right;"><b>${info.exactStats.spd}</b> ${modBadge(info.natureMods.spd)}</td></tr>
        <tr><td>Spe</td><td style="text-align: right;">${info.baseStats.spe}</td><td style="text-align: right;"><b>${info.exactStats.spe}</b> ${modBadge(info.natureMods.spe)}</td></tr>
      </tbody>
    </table>
    <div class="st-footer">BST: <b>${info.bst}</b> &middot; 31 IVs / 0 EVs</div>
  `;
}

export function renderOpponentTooltip(est: OpponentStatEstimate): string {
  const typesHtml = est.types
    .map((t) => `<span class="st-type t-${t.toLowerCase()}">${t}</span>`)
    .join('');

  return `
    <div class="st-header">
      <div class="st-name-row">
        <span class="st-name">Foe ${est.species}</span>
        <span class="st-level">Lv${est.level} (Foe)</span>
      </div>
      <div class="st-types">${typesHtml}</div>
    </div>
    <div class="st-sub">Estimated Stats (Lv${est.level} &middot; 0 EVs)</div>
    <div class="st-divider"></div>
    <table class="st-table">
      <thead>
        <tr>
          <th>Stat</th>
          <th style="text-align: right;">Base</th>
          <th style="text-align: right;">Est.</th>
          <th style="text-align: right;">Range</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>HP</td><td style="text-align: right;">${est.baseStats.hp}</td><td style="text-align: right;"><b>${est.estimated.hp.est}</b></td><td style="text-align: right;" class="st-dim">Exact</td></tr>
        <tr><td>Atk</td><td style="text-align: right;">${est.baseStats.atk}</td><td style="text-align: right;"><b>${est.estimated.atk.est}</b></td><td style="text-align: right;">${est.estimated.atk.range}</td></tr>
        <tr><td>Def</td><td style="text-align: right;">${est.baseStats.def}</td><td style="text-align: right;"><b>${est.estimated.def.est}</b></td><td style="text-align: right;">${est.estimated.def.range}</td></tr>
        <tr><td>SpA</td><td style="text-align: right;">${est.baseStats.spa}</td><td style="text-align: right;"><b>${est.estimated.spa.est}</b></td><td style="text-align: right;">${est.estimated.spa.range}</td></tr>
        <tr><td>SpD</td><td style="text-align: right;">${est.baseStats.spd}</td><td style="text-align: right;"><b>${est.estimated.spd.est}</b></td><td style="text-align: right;">${est.estimated.spd.range}</td></tr>
        <tr><td>Spe</td><td style="text-align: right;">${est.baseStats.spe}</td><td style="text-align: right;"><b>${est.estimated.spe.est}</b></td><td style="text-align: right;">${est.estimated.spe.range}</td></tr>
      </tbody>
    </table>
    <div class="st-footer">BST: <b>${est.bst}</b> &middot; Nature: Unknown</div>
  `;
}
