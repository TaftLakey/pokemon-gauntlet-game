import './style.css';
import { Dex } from '@pkmn/sim';
import { KANTO } from './data';
import { BattleRunner } from './battle';
import { formatLine } from './log';
import { battleSeed, todayKey } from './rng';
import { dailyTeam, parseTeam } from './teams';

// ---- daily state -----------------------------------------------------------
const KEY = todayKey();
const SAVE_KEY = `gauntlet:${KEY}`;
const team = dailyTeam(KEY);
const firstEmpty = KANTO.findIndex((t) => !t.team.trim());
const AVAILABLE = firstEmpty === -1 ? KANTO.length : firstEmpty;

interface Save { status: 'ready' | 'between' | 'inbattle' | 'lost' | 'done'; cleared: number; lostTo?: string }

function load(): Save {
  let s: Save = { status: 'ready', cleared: 0 };
  try { s = JSON.parse(localStorage.getItem(SAVE_KEY) ?? '') as Save; } catch { /* first visit */ }
  // Closing the tab mid-battle counts as a forfeit: one attempt per day.
  if (s.status === 'inbattle') s = { status: 'lost', cleared: s.cleared, lostTo: KANTO[s.cleared].name };
  return s;
}
let save = load();
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* storage blocked */ } };
persist();

// ---- helpers ---------------------------------------------------------------
const app = document.getElementById('app')!;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const spriteId = (sp: string) => { const s: any = Dex.species.get(sp); return s.spriteid || s.id; };
const sprite = (sp: string, back = false) =>
  `https://play.pokemonshowdown.com/sprites/${back ? 'ani-back' : 'ani'}/${spriteId(sp)}.gif`;
const hpClass = (pct: number) => (pct > 50 ? 'ok' : pct > 20 ? 'warn' : 'low');
const parseHp = (c: string): number => {
  if (c.includes('fnt')) return 0;
  const [cur, max] = c.split(' ')[0].split('/').map(Number);
  return max ? Math.round((cur / max) * 100) : 100;
};

// ---- home screen -----------------------------------------------------------
function home() {
  const done = save.status === 'lost' || save.status === 'done';
  const next = KANTO[save.cleared];
  let action = '';
  if (save.status === 'ready') action = `<button id="go">Begin today's run</button>`;
  else if (save.status === 'between') action = `<button id="go">Battle ${next.name}</button>`;
  else if (save.status === 'lost')
    action = `<p class="result lost">Your run ended against ${save.lostTo}. ${save.cleared} of ${KANTO.length} trainers beaten. New team at midnight UTC.</p>`;
  else
    action = `<p class="result won">${save.cleared === KANTO.length ? 'Champion! You cleared the whole Kanto league.' : `You beat all ${save.cleared} trainers available so far. More rosters are on the way.`}</p>`;

  app.innerHTML = `
    <header><h1>Daily Gauntlet</h1><p>Kanto league &middot; ${KEY} &middot; level 100, no EVs</p></header>
    <section class="team">${team.map((s) => `
      <article class="card">
        <img src="${sprite(s.species)}" alt="${s.species}" />
        <h3>${s.species}</h3>
        <p class="meta">${s.item} &middot; ${s.ability}</p>
        <ul>${s.moves.map((m) => `<li>${m}</li>`).join('')}</ul>
      </article>`).join('')}
    </section>
    <section class="roster"><h2>The league</h2><ol>${KANTO.map((t, i) => {
      const state = i < save.cleared ? 'beaten' : i === save.cleared && !done ? 'next' : i >= AVAILABLE ? 'soon' : '';
      return `<li class="${state}"><b>${t.name}</b> <span>${t.title}, ${t.type}</span></li>`;
    }).join('')}</ol></section>
    <div class="action">${action}</div>`;
  document.getElementById('go')?.addEventListener('click', () => startBattle(save.cleared));
}

// ---- battle screen ---------------------------------------------------------
interface Mon { species: string; pct: number }

function startBattle(index: number) {
  const trainer = KANTO[index];
  save = { status: 'inbattle', cleared: index };
  persist();

  const mons: { p1: Mon | null; p2: Mon | null } = { p1: null, p2: null };
  const log: string[] = [];
  let req: any = null;
  let locked = true;
  let result: boolean | null = null;

  const queue: (() => number)[] = [];
  let pumping = false;
  const enqueue = (fn: () => number) => { queue.push(fn); if (!pumping) void pump(); };
  async function pump() {
    pumping = true;
    while (queue.length) await sleep(queue.shift()!());
    pumping = false;
  }

  const runner = new BattleRunner({
    playerTeam: team,
    foeTeam: parseTeam(trainer.team),
    foeName: trainer.name,
    seed: battleSeed(KEY, index),
    events: {
      onLines: (lines) => lines.forEach((l) => enqueue(() => {
        const [, kind, who, a, b] = l.split('|');
        const side = who?.startsWith('p1') ? 'p1' : who?.startsWith('p2') ? 'p2' : null;
        if (side && (kind === 'switch' || kind === 'drag' || kind === 'replace'))
          mons[side] = { species: a.split(',')[0], pct: parseHp(b) };
        else if (side && mons[side] && (kind === '-damage' || kind === '-heal' || kind === '-sethp'))
          mons[side]!.pct = parseHp(a);
        else if (side && mons[side] && kind === 'faint') mons[side]!.pct = 0;
        const text = formatLine(l);
        if (text) log.push(text);
        draw();
        return text ? 450 : 0;
      })),
      onRequest: (r) => enqueue(() => { req = r; locked = false; draw(); return 0; }),
      onError: (m) => enqueue(() => { log.push(`Can't do that: ${m.replace(/^\[.*?\]\s*/, '')}`); locked = false; draw(); return 0; }),
      onEnd: (won) => enqueue(() => {
        result = won; locked = true; req = null;
        save = won
          ? { status: index + 1 >= AVAILABLE ? 'done' : 'between', cleared: index + 1 }
          : { status: 'lost', cleared: index, lostTo: trainer.name };
        persist(); draw();
        return 0;
      }),
    },
  });

  function choose(c: string) { locked = true; draw(); runner.choose(c); }

  function plate(m: Mon | null, label: string) {
    if (!m) return '';
    return `<div class="plate"><b>${label}${m.species}</b><span>Lv100</span>
      <div class="bar"><i class="${hpClass(m.pct)}" style="width:${m.pct}%"></i></div></div>`;
  }

  function controls(): string {
    if (result !== null)
      return `<button id="back">${result ? 'Continue' : 'See results'}</button>`;
    if (!req) return `<p class="wait">&nbsp;</p>`;
    const pk = req.side.pokemon as any[];
    const trapped = !req.forceSwitch && req.active?.[0]?.trapped;
    const switches = pk.map((p, i) => {
      const fnt = p.condition.endsWith(' fnt');
      const off = locked || p.active || fnt || trapped;
      return `<button class="sw" data-c="switch ${i + 1}" ${off ? 'disabled' : ''}>
        ${p.details.split(',')[0]}<small>${parseHp(p.condition)}%</small></button>`;
    }).join('');
    if (req.forceSwitch) return `<p class="prompt">Choose your next Pok&eacute;mon</p><div class="switches">${switches}</div>`;
    const moves = (req.active[0].moves as any[]).map((m, i) => {
      const mv = Dex.moves.get(m.id);
      return `<button class="mv t-${mv.type.toLowerCase()}" data-c="move ${i + 1}" ${locked || m.disabled ? 'disabled' : ''}>
        ${m.move}<small>${mv.type} &middot; ${mv.basePower || '&ndash;'} &middot; ${m.pp}/${m.maxpp}</small></button>`;
    }).join('');
    return `<div class="moves">${moves}</div><div class="switches">${switches}</div>`;
  }

  function draw() {
    app.innerHTML = `
      <header class="slim"><h1>${trainer.name}</h1><p>${trainer.title} &middot; ${trainer.type} &middot; battle ${index + 1} of ${KANTO.length}</p></header>
      <section class="field">
        <div class="side foe">${plate(mons.p2, 'Foe ')}${mons.p2 ? `<img src="${sprite(mons.p2.species)}" alt="" />` : ''}</div>
        <div class="side you">${mons.p1 ? `<img src="${sprite(mons.p1.species, true)}" alt="" />` : ''}${plate(mons.p1, '')}</div>
      </section>
      <section class="log" id="log">${log.slice(-40).map((t) => `<p>${t}</p>`).join('')}</section>
      <section class="controls">${controls()}</section>`;
    const l = document.getElementById('log')!;
    l.scrollTop = l.scrollHeight;
    app.querySelectorAll<HTMLButtonElement>('[data-c]').forEach((b) =>
      b.addEventListener('click', () => choose(b.dataset.c!)));
    document.getElementById('back')?.addEventListener('click', home);
  }

  draw();
  runner.start();
}

home();
