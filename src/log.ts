const who = (s: string) => (s.startsWith('p2') ? 'Foe ' : '') + (s.split(': ')[1] ?? s);
const clean = (s = '') => s.replace(/^move: |^ability: |^item: /, '');
const STATUS: Record<string, string> = {
  brn: 'was burned', par: 'was paralyzed', slp: 'fell asleep', psn: 'was poisoned',
  tox: 'was badly poisoned', frz: 'was frozen solid',
};

/** Turn one Showdown protocol line into readable text (or null to skip it). */
export function formatLine(line: string): string | null {
  const [, kind, ...a] = line.split('|');
  switch (kind) {
    case 'turn': return `Turn ${a[0]}`;
    case 'switch': case 'drag':
      return `${a[0].startsWith('p2') ? 'Foe sends out' : 'Go!'} ${a[1].split(',')[0]}`;
    case 'move': return `${who(a[0])} used ${a[1]}!`;
    case '-supereffective': return "It's super effective!";
    case '-resisted': return "It's not very effective...";
    case '-immune': return `It doesn't affect ${who(a[0])}...`;
    case '-crit': return 'A critical hit!';
    case '-miss': return `${who(a[0])} missed!`;
    case '-fail': return 'But it failed!';
    case 'faint': return `${who(a[0])} fainted!`;
    case 'cant': return `${who(a[0])} can't move! (${clean(a[1])})`;
    case '-status': return `${who(a[0])} ${STATUS[a[1]] ?? a[1]}`;
    case '-boost': return `${who(a[0])}'s ${a[1]} rose${+a[2] > 1 ? ' sharply' : ''}!`;
    case '-unboost': return `${who(a[0])}'s ${a[1]} fell${+a[2] > 1 ? ' harshly' : ''}!`;
    case '-weather': return a[0] === 'none' ? 'The weather cleared.' : `Weather: ${a[0]}`;
    case '-ability': return `${who(a[0])}'s ${clean(a[1])}!`;
    case '-sidestart':
      return `${clean(a[1])} was set on ${a[0].startsWith('p1') ? 'your' : "the foe's"} side.`;
    case 'win': return `${a[0]} won the battle!`;
    default: return null;
  }
}
