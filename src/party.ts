import { Dex } from '@pkmn/sim';
import type { PokemonSet } from '@pkmn/sim';
import { getPlayerStatInfo, renderPlayerTooltip, type PlayerStatInfo } from './stats';

export interface PartyMemberInfo {
  slotIndex: number; // 0-based index in the current request (for switch commands: switch slotIndex + 1)
  ident: string;
  species: string;
  nickname?: string;
  level: number;
  hpPercent: number;
  condition: string;
  active: boolean;
  fainted: boolean;
  stats?: { atk: number; def: number; spa: number; spd: number; spe: number; hp?: number };
  moves: string[];
  item: string;
  ability: string;
  set: PokemonSet;
}

export const parseHp = (c: string): number => {
  if (!c || c.includes('fnt')) return 0;
  const token = c.split(' ')[0];
  if (token.includes('/')) {
    const [cur, max] = token.split('/').map(Number);
    if (!cur || isNaN(cur) || cur <= 0) return 0;
    if (!max || isNaN(max)) return 100;
    return Math.max(1, Math.round((cur / max) * 100));
  }
  const n = Number(token);
  if (isNaN(n) || n <= 0) return 0;
  return Math.min(100, Math.max(1, Math.round(n)));
};

/**
 * Pure function: extracts party members from the current Showdown request.
 * Resolves each member by identity/details against the player's team sets,
 * ensuring hover and battle state never desync after switches.
 */
export function partyFromRequest(req: any, playerTeam: PokemonSet[]): PartyMemberInfo[] {
  if (!req || !req.side || !Array.isArray(req.side.pokemon)) {
    return [];
  }

  const teamMap = new Map<string, PokemonSet>();
  for (const s of playerTeam) {
    teamMap.set(s.species.toLowerCase(), s);
    if (s.name) teamMap.set(s.name.toLowerCase(), s);
  }

  return (req.side.pokemon as any[]).map((p, slotIndex) => {
    const details = p.details || '';
    const rawName = details.split(',')[0].trim();
    // Parse level from details (e.g. "Pikachu, L85, M" or "Snorlax, L85")
    const lvlMatch = details.match(/L(\d+)/);
    const parsedLevel = lvlMatch ? Number(lvlMatch[1]) : 85;

    // Find matching PokemonSet
    const matchedSet = teamMap.get(rawName.toLowerCase()) ||
      playerTeam.find((s) => s.species.toLowerCase() === rawName.toLowerCase()) ||
      playerTeam[slotIndex] ||
      playerTeam[0];

    const fainted = typeof p.condition === 'string' && p.condition.includes('fnt');
    const hpPercent = parseHp(p.condition);

    // Moves from request (convert IDs to canonical names), falling back to set moves
    const moveNames = Array.isArray(p.moves) && p.moves.length > 0
      ? p.moves.map((mId: string) => Dex.moves.get(mId).name || mId)
      : [...matchedSet.moves];

    const memberSet: PokemonSet = {
      ...matchedSet,
      species: matchedSet.species || rawName,
      level: parsedLevel || matchedSet.level || 85,
      moves: moveNames,
    };

    return {
      slotIndex,
      ident: p.ident || `p1: ${rawName}`,
      species: matchedSet.species || rawName,
      nickname: rawName !== matchedSet.species ? rawName : undefined,
      level: memberSet.level,
      hpPercent,
      condition: p.condition || '100/100',
      active: !!p.active,
      fainted,
      stats: p.stats,
      moves: moveNames,
      item: p.item || matchedSet.item || '',
      ability: p.ability || p.baseAbility || matchedSet.ability || '',
      set: memberSet,
    };
  });
}
