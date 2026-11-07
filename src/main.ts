import './style.css';
import { Dex } from '@pkmn/sim';
import type { PokemonSet } from '@pkmn/sim';
import { KANTO, dailyTrainerBuild } from './data';
import { BattleRunner } from './battle';
import { formatLine } from './log';
import { randomBattleSeed, todayKey } from './rng';
import { dailyTeam, parseTeam } from './teams';
import {
  getPlayerStatInfo,
  getOpponentStatEstimate,
  renderPlayerTooltip,
  renderOpponentTooltip,
} from './stats';

// ---- daily state -----------------------------------------------------------
const KEY = todayKey();
const SAVE_KEY = `gauntlet:${KEY}`;
const team = dailyTeam(KEY);
const AVAILABLE = KANTO.length;

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
  `https://play.pokemonshowdown.com/sprites/${back ? 'gen5-back' : 'gen5'}/${spriteId(sp)}.png`;
const spriteFallback = (sp: string, back = false) =>
  `https://play.pokemonshowdown.com/sprites/${back ? 'gen5' : 'dex'}/${spriteId(sp)}.png`;
const hpClass = (pct: number) => (pct > 50 ? 'ok' : pct > 20 ? 'warn' : 'low');
const parseHp = (c: string): number => {
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

// ---- tooltip manager -------------------------------------------------------
const tooltipEl = document.createElement('div');
tooltipEl.id = 'stat-tooltip';
tooltipEl.className = 'stat-tooltip hidden';
document.body.appendChild(tooltipEl);

interface BattleMon { species: string; pct: number; fainted?: boolean }
let currentBattleMons: { p1: BattleMon | null; p2: BattleMon | null } | null = null;
let currentHoveredInspect: HTMLElement | null = null;

function hideTooltip() {
  tooltipEl.classList.add('hidden');
}

function positionTooltip(target: HTMLElement) {
  const rect = target.getBoundingClientRect();
  const tipRect = tooltipEl.getBoundingClientRect();
  const pad = 10;

  // Align above the element by default
  let top = rect.top - tipRect.height - 8;
  let left = rect.left + (rect.width - tipRect.width) / 2;

  // If too close to top edge or offscreen, place below
  if (top < pad) {
    top = rect.bottom + 8;
  }
  // Clamp horizontally
  if (left < pad) left = pad;
  if (left + tipRect.width > window.innerWidth - pad) {
    left = window.innerWidth - tipRect.width - pad;
  }
  // Clamp vertically if needed
  if (top + tipRect.height > window.innerHeight - pad) {
    top = window.innerHeight - tipRect.height - pad;
  }

  tooltipEl.style.top = `${Math.round(top)}px`;
  tooltipEl.style.left = `${Math.round(left)}px`;
}

function showTooltipFor(target: HTMLElement) {
  const type = target.dataset.inspect;
  if (!type) return;

  if (type === 'bench') {
    const idx = Number(target.dataset.benchIndex ?? 0);
    const s = team[idx];
    if (s) {
      tooltipEl.innerHTML = renderPlayerTooltip(getPlayerStatInfo(s));
      tooltipEl.classList.remove('hidden');
      positionTooltip(target);
    }
  } else if (type === 'player') {
    const activeSpecies = currentBattleMons?.p1?.species;
    const s =
      (activeSpecies &&
        team.find((x) => x.species === activeSpecies || x.species.toLowerCase() === activeSpecies.toLowerCase())) ||
      team[0];
    if (s) {
      tooltipEl.innerHTML = renderPlayerTooltip(getPlayerStatInfo(s));
      tooltipEl.classList.remove('hidden');
      positionTooltip(target);
    }
  } else if (type === 'foe') {
    const foeSpecies = currentBattleMons?.p2?.species;
    if (foeSpecies) {
      tooltipEl.innerHTML = renderOpponentTooltip(getOpponentStatEstimate(foeSpecies));
      tooltipEl.classList.remove('hidden');
      positionTooltip(target);
    }
  }
}

document.addEventListener('pointerover', (e) => {
  const target = (e.target as HTMLElement)?.closest?.('[data-inspect]') as HTMLElement | null;
  if (!target) return;
  currentHoveredInspect = target;
  showTooltipFor(target);
});

document.addEventListener('pointerout', (e) => {
  const target = (e.target as HTMLElement)?.closest?.('[data-inspect]') as HTMLElement | null;
  if (target && target === currentHoveredInspect) {
    const related = (e.relatedTarget as HTMLElement)?.closest?.('[data-inspect]');
    if (!related) {
      currentHoveredInspect = null;
      hideTooltip();
    }
  }
});

// ---- home screen -----------------------------------------------------------
function home() {
  currentBattleMons = null;
  hideTooltip();
  const done = save.status === 'lost' || save.status === 'done';
  const next = KANTO[save.cleared];
  const nextBuild = next ? dailyTrainerBuild(next, KEY, save.cleared) : null;
  let action = '';
  if (save.status === 'ready') action = `<button id="go">Begin today's run</button>`;
  else if (save.status === 'between' && next)
    action = `<button id="go">Battle ${next.name} (${nextBuild?.name ?? ''})</button>`;
  else if (save.status === 'lost')
    action = `
      <p class="result lost">Your run ended against ${save.lostTo}. ${save.cleared} of ${KANTO.length} trainers beaten. New team at midnight UTC.</p>
      <div style="margin-top: 1rem;"><button id="retry" class="btn-secondary">Try Again</button></div>`;
  else
    action = `
      <p class="result won">${save.cleared === KANTO.length ? 'Champion! You cleared the whole Kanto league.' : `You beat all ${save.cleared} trainers available so far.`}</p>
      <div style="margin-top: 1rem;"><button id="retry" class="btn-secondary">Play Again</button></div>`;

  const devToolbar = `
    <div class="dev-tools">
      <span style="font-size: .85rem; color: var(--lcd-mid); font-weight: 700;">DEV TOOLS:</span>
      <button id="dev-reset" class="btn-dev">Reset Run (Back to Start)</button>
      ${save.cleared > 0 && save.status !== 'done' ? `<button id="dev-retry-battle" class="btn-dev">Replay Battle ${save.cleared + 1}</button>` : ''}
    </div>`;

  app.innerHTML = `
    <header><h1>Daily Gauntlet</h1><p>Kanto league &middot; ${KEY} &middot; balanced levels, no EVs</p></header>
    <section class="team">${team.map((s, i) => `
      <article class="card" data-inspect="bench" data-bench-index="${i}" title="Hover for stat breakdown">
        <img src="${sprite(s.species)}" alt="${s.species}" onerror="this.onerror=null; this.src='${spriteFallback(s.species)}';" />
        <h3>${s.species}</h3>
        <p class="meta">Lv${s.level} &middot; ${s.item} &middot; ${s.ability}</p>
        <ul>${s.moves.map((m) => `<li>${m}</li>`).join('')}</ul>
      </article>`).join('')}
    </section>
    <section class="roster"><h2>The league</h2><ol>${KANTO.map((t, i) => {
      const state = i < save.cleared ? 'beaten' : i === save.cleared && !done ? 'next' : i >= AVAILABLE ? 'soon' : '';
      const b = dailyTrainerBuild(t, KEY, i);
      return `<li class="${state}"><b>${t.name}</b> <span>${t.title}, ${t.type} &middot; ${b.name}</span></li>`;
    }).join('')}</ol></section>
    <div class="action">${action}</div>
    ${devToolbar}`;

  document.getElementById('go')?.addEventListener('click', () => startBattle(save.cleared));
  document.getElementById('retry')?.addEventListener('click', () => {
    save = { status: 'ready', cleared: 0 };
    persist();
    home();
  });
  document.getElementById('dev-reset')?.addEventListener('click', () => {
    save = { status: 'ready', cleared: 0 };
    persist();
    home();
  });
  document.getElementById('dev-retry-battle')?.addEventListener('click', () => {
    save = { status: 'between', cleared: save.cleared };
    persist();
    home();
  });
}

// ---- battle screen ---------------------------------------------------------
type ActiveAnim =
  | { kind: 'move'; side: 'p1' | 'p2'; moveName: string; isStatus: boolean }
  | { kind: 'damage'; side: 'p1' | 'p2' }
  | { kind: 'faint'; side: 'p1' | 'p2' }
  | { kind: 'heal'; side: 'p1' | 'p2' }
  | null;

type SwitchAnim =
  | { side: 'p1' | 'p2'; phase: 'recall'; species: string }
  | { side: 'p1' | 'p2'; phase: 'throw'; species: string }
  | { side: 'p1' | 'p2'; phase: 'emerge'; species: string }
  | null;

function renderPokeball(side: 'p1' | 'p2'): string {
  return `<div class="ball-actor ${side}">
    <svg viewBox="0 0 32 32" width="28" height="28" class="pokeball-svg">
      <circle cx="16" cy="16" r="14" fill="#1f2a1c" />
      <path d="M 2 16 A 14 14 0 0 1 30 16 Z" fill="#e62829" />
      <path d="M 2 16 A 14 14 0 0 0 30 16 Z" fill="#ffffff" />
      <rect x="2" y="14" width="28" height="4" fill="#1f2a1c" />
      <circle cx="16" cy="16" r="5" fill="#1f2a1c" />
      <circle cx="16" cy="16" r="3.5" fill="#ffffff" />
      <circle cx="16" cy="16" r="2" fill="#1f2a1c" />
    </svg>
  </div>`;
}

function preloadBattleSprites(p1Team: PokemonSet[], p2Team: PokemonSet[]) {
  const urls: string[] = [];
  for (const p of p1Team) {
    urls.push(sprite(p.species, true), spriteFallback(p.species, true));
  }
  for (const p of p2Team) {
    urls.push(sprite(p.species, false), spriteFallback(p.species, false));
  }
  for (const url of urls) {
    const img = new Image();
    img.src = url;
  }
}

function startBattle(index: number) {
  const trainer = KANTO[index];
  const build = dailyTrainerBuild(trainer, KEY, index);
  const foeTeam = parseTeam(build.team);
  save = { status: 'inbattle', cleared: index };
  persist();

  // Warm up both teams' sprite assets to prevent network/decoding stutter
  preloadBattleSprites(team, foeTeam);

  const mons: { p1: BattleMon | null; p2: BattleMon | null } = { p1: null, p2: null };
  currentBattleMons = mons;
  let req: any = null;
  let locked = true;
  let result: boolean | null = null;

  // 1. Initialize persistent layout shell once
  app.innerHTML = `
    <header class="slim">
      <div class="battle-title-row">
        <h1>${trainer.name}</h1>
        <p class="battle-meta">${trainer.title} &middot; ${trainer.type} (${build.name}) &middot; battle ${index + 1} of ${KANTO.length}</p>
      </div>
    </header>
    <div class="battle-viewport">
      <section class="field">
        <div class="field-zone top-left" id="p2-plate-slot"></div>
        <div class="field-zone top-right foe-zone" id="p2-zone">
          <div class="platform foe-platform"></div>
          <div id="p2-sprite-container"></div>
        </div>
        <div class="field-zone bottom-left you-zone" id="p1-zone">
          <div class="platform you-platform"></div>
          <div id="p1-sprite-container"></div>
        </div>
        <div class="field-zone bottom-right" id="p1-plate-slot"></div>
        <div class="field-overlays" style="position: absolute; inset: 0; pointer-events: none; z-index: 10;">
          <div id="move-banner-slot"></div>
          <div id="impact-slot"></div>
          <div id="switch-slot"></div>
        </div>
      </section>
      <aside class="battle-sidebar">
        <div class="log-header">Battle Log</div>
        <section class="log" id="log"></section>
      </aside>
    </div>
    <section class="controls" id="controls"><p class="wait">&nbsp;</p></section>
    <div class="dev-tools" style="margin-top: .75rem; padding-top: .5rem;">
      <span style="font-size: .8rem; color: var(--lcd-mid); font-weight: 700;">DEV TOOLS:</span>
      <button id="dev-test-switch" class="btn-dev">Test Drive Switch Animation</button>
      <button id="dev-test-faint" class="btn-dev">Test Faint &amp; Put Away</button>
    </div>`;

  const logEl = document.getElementById('log') as HTMLElement;
  const p1PlateSlot = document.getElementById('p1-plate-slot') as HTMLElement;
  const p2PlateSlot = document.getElementById('p2-plate-slot') as HTMLElement;
  const p1SpriteContainer = document.getElementById('p1-sprite-container') as HTMLElement;
  const p2SpriteContainer = document.getElementById('p2-sprite-container') as HTMLElement;
  const moveBannerSlot = document.getElementById('move-banner-slot') as HTMLElement;
  const impactSlot = document.getElementById('impact-slot') as HTMLElement;
  const switchSlot = document.getElementById('switch-slot') as HTMLElement;
  const controlsEl = document.getElementById('controls') as HTMLElement;

  // --- Independent, single-responsibility functions ---

  // A. Plate Renderer (smooth HP update without element destruction)
  function updatePlate(side: 'p1' | 'p2', mon: BattleMon | null, isFainting = false) {
    const slot = side === 'p1' ? p1PlateSlot : p2PlateSlot;
    if (!mon || (mon.pct === 0 && !isFainting)) {
      slot.innerHTML = '';
      return;
    }
    const isPlayer = side === 'p1';
    const label = isPlayer ? '' : 'Foe ';
    const inspectType = isPlayer ? 'player' : 'foe';
    const cls = hpClass(mon.pct);

    const existing = slot.querySelector('.plate') as HTMLElement | null;
    if (existing && existing.dataset.species === mon.species) {
      // In-place update: allows CSS transition on the bar to smoothly animate!
      const barInner = existing.querySelector('.bar i') as HTMLElement | null;
      if (barInner) {
        barInner.style.width = `${mon.pct}%`;
        barInner.className = cls;
      }
      const hpText = existing.querySelector('.plate-hp span') as HTMLElement | null;
      if (hpText) {
        hpText.textContent = `${mon.pct}% HP`;
        hpText.className = cls;
      }
    } else {
      const monLevel = isPlayer
        ? (team.find((p) => p.species === mon.species || p.species.toLowerCase() === mon.species.toLowerCase())?.level ?? 85)
        : 85;

      // Mount new plate
      slot.innerHTML = `
        <div class="plate" data-inspect="${inspectType}" data-species="${mon.species}" title="Hover for stat breakdown">
          <b>${label}${mon.species}</b><span>Lv${monLevel}</span>
          <div class="bar"><i class="${cls}" style="width:${mon.pct}%"></i></div>
          <div class="plate-hp"><span class="${cls}">${mon.pct}% HP</span></div>
        </div>`;
    }
  }

  // B. Sprite Renderer (persists image element so layout & textures never flicker)
  function updateSprite(side: 'p1' | 'p2', mon: BattleMon | null, animClass?: string) {
    const container = side === 'p1' ? p1SpriteContainer : p2SpriteContainer;
    if (!mon || (mon.fainted && !animClass?.includes('anim-faint'))) {
      container.innerHTML = '';
      return;
    }
    const isPlayer = side === 'p1';
    const inspectType = isPlayer ? 'player' : 'foe';
    const baseClass = `battle-sprite ${isPlayer ? 'you-sprite' : 'foe-sprite'}`;
    const fullClass = animClass ? `${baseClass} ${animClass}` : baseClass;

    const existingImg = container.querySelector('img') as HTMLImageElement | null;
    if (existingImg && existingImg.alt === mon.species) {
      existingImg.className = fullClass;
    } else {
      container.innerHTML = `<img class="${fullClass}" data-inspect="${inspectType}" title="Hover for stat breakdown" src="${sprite(mon.species, isPlayer)}" alt="${mon.species}" onerror="this.onerror=null; this.src='${spriteFallback(mon.species, isPlayer)}';" />`;
    }
  }

  // C. Visual Effect Modifiers (independent overlays)
  function showMoveVisual(actingSide: 'p1' | 'p2', moveName: string, isStatus: boolean, species: string) {
    const who = actingSide === 'p1' ? species : `Foe ${species}`;
    moveBannerSlot.innerHTML = `<div class="move-banner"><span>${who}</span> used <b>${moveName}</b>!</div>`;
    if (!isStatus) {
      const targetSide = actingSide === 'p1' ? 'p2' : 'p1';
      impactSlot.innerHTML = `<div class="impact-flash ${targetSide}"></div>`;
    }
    const anim = isStatus ? 'anim-status' : (actingSide === 'p1' ? 'anim-lunge-p1' : 'anim-lunge-p2');
    updateSprite(actingSide, mons[actingSide], anim);
  }

  function clearMoveVisual(actingSide: 'p1' | 'p2') {
    moveBannerSlot.innerHTML = '';
    impactSlot.innerHTML = '';
    if (mons[actingSide] && !mons[actingSide]!.fainted) {
      updateSprite(actingSide, mons[actingSide]);
    }
  }

  function showDamageVisual(side: 'p1' | 'p2') {
    impactSlot.innerHTML = `<div class="hit-burst ${side}">💥</div>`;
    updateSprite(side, mons[side], 'anim-hit-shake');
  }

  function clearDamageVisual(side: 'p1' | 'p2') {
    impactSlot.innerHTML = '';
    if (mons[side] && !mons[side]!.fainted) {
      updateSprite(side, mons[side]);
    }
  }

  function showFaintVisual(side: 'p1' | 'p2') {
    clearMoveVisual('p1');
    clearMoveVisual('p2');
    clearDamageVisual('p1');
    clearDamageVisual('p2');
    updateSprite(side, mons[side], 'anim-faint');
  }

  function settleFaint(side: 'p1' | 'p2') {
    updateSprite(side, null);
    updatePlate(side, null);
  }

  function showHealVisual(side: 'p1' | 'p2') {
    updateSprite(side, mons[side], 'anim-heal');
  }

  function setSwitchOverlay(html: string) {
    switchSlot.innerHTML = html;
  }

  // D. Battle Log Appender (appends directly without touching other UI elements)
  function appendLog(line: string) {
    if (!logEl) return;
    const p = document.createElement('p');
    p.textContent = line;
    logEl.appendChild(p);
    logEl.scrollTop = logEl.scrollHeight;
  }

  // E. Controls Renderer (updates action buttons independently)
  function updateControls() {
    if (result !== null) {
      controlsEl.innerHTML = `<div class="result-action"><button id="back" class="btn-result">${result ? 'Continue Run' : 'See Results'}</button></div>`;
      document.getElementById('back')?.addEventListener('click', home);
      return;
    }
    if (!req) {
      controlsEl.innerHTML = `<p class="wait">&nbsp;</p>`;
      return;
    }
    const pk = req.side.pokemon as any[];
    const trapped = !req.forceSwitch && req.active?.[0]?.trapped;
    const switches = pk.map((p, i) => {
      const fnt = p.condition.endsWith(' fnt');
      const off = locked || p.active || fnt || trapped;
      const hp = parseHp(p.condition);
      const name = p.details.split(',')[0];
      return `<button class="sw ${p.active ? 'active-mon' : ''}" data-c="switch ${i + 1}" data-inspect="bench" data-bench-index="${i}" ${off ? 'disabled' : ''} title="${name} (${hp}%) &middot; Hover for stats">
        <span>${name}</span><small class="${hpClass(hp)}">${hp}%</small></button>`;
    }).join('');
    if (req.forceSwitch) {
      controlsEl.innerHTML = `<p class="prompt">Choose your next Pok&eacute;mon</p><div class="switches">${switches}</div>`;
    } else {
      const moves = (req.active[0].moves as any[]).map((m, i) => {
        const mv = Dex.moves.get(m.id);
        return `<button class="mv t-${mv.type.toLowerCase()}" data-c="move ${i + 1}" ${locked || m.disabled ? 'disabled' : ''}>
          <b>${m.move}</b><small>${mv.type} &middot; ${mv.basePower || '&ndash;'} &middot; ${m.pp}/${m.maxpp}</small></button>`;
      }).join('');
      controlsEl.innerHTML = `
        <div class="controls-section">
          <div class="ctrl-header">Moves</div>
          <div class="moves">${moves}</div>
        </div>
        <div class="controls-section">
          <div class="ctrl-header">Team Bench <span style="font-size: .68rem; font-weight: normal; color: var(--lcd-mid);">(hover mon for stats)</span></div>
          <div class="switches">${switches}</div>
        </div>`;
    }
    controlsEl.querySelectorAll<HTMLButtonElement>('[data-c]').forEach((b) =>
      b.addEventListener('click', () => choose(b.dataset.c!)));
  }

  function choose(c: string) {
    locked = true;
    updateControls();
    runner.choose(c);
  }

  // --- Animation Queue Execution Pipeline ---
  const queue: (() => number)[] = [];
  let pumping = false;
  const enqueue = (fn: () => number) => { queue.push(fn); if (!pumping) void pump(); };
  async function pump() {
    pumping = true;
    while (queue.length) {
      const fn = queue.shift()!;
      const delay = fn();
      if (delay > 0) await sleep(delay);
    }
    // Return to resting idle state once animations finish
    clearMoveVisual('p1');
    clearMoveVisual('p2');
    clearDamageVisual('p1');
    clearDamageVisual('p2');
    setSwitchOverlay('');
    pumping = false;
  }

  // --- Showdown Protocol Event Router (Strict Separation, Zero Double-Dipping) ---
  const runner = new BattleRunner({
    playerTeam: team,
    foeTeam,
    foeName: trainer.name,
    seed: randomBattleSeed(),
    events: {
      onLines: (lines) => lines.forEach((l) => {
        const [, kind, who, a, b] = l.split('|');
        const side = who?.startsWith('p1') ? 'p1' : who?.startsWith('p2') ? 'p2' : null;

        if (side && (kind === 'switch' || kind === 'drag' || kind === 'replace')) {
          const newSpecies = a.split(',')[0];
          const newHp = parseHp(b);
          const prevMon = mons[side];
          const hasLiveMon = prevMon && !prevMon.fainted && prevMon.pct > 0;

          if (hasLiveMon) {
            enqueue(() => {
              updateSprite(side, prevMon, 'anim-recall');
              return 320;
            });
          }
          enqueue(() => {
            updateSprite(side, null);
            setSwitchOverlay(renderPokeball(side));
            return 280;
          });
          enqueue(() => {
            mons[side] = { species: newSpecies, pct: newHp, fainted: false };
            setSwitchOverlay(`<div class="ball-burst ${side}"></div>`);
            updateSprite(side, mons[side], 'anim-emerge');
            updatePlate(side, mons[side]);
            const text = formatLine(l);
            if (text) appendLog(text);
            return 360;
          });
          enqueue(() => {
            setSwitchOverlay('');
            updateSprite(side, mons[side]);
            return 0;
          });
        } else if (kind === 'move') {
          enqueue(() => {
            const moveData = Dex.moves.get(a);
            const isStatus = moveData?.category === 'Status';
            const actingSide = side || 'p1';
            const sp = mons[actingSide]?.species || (actingSide === 'p1' ? 'Your Pokémon' : 'Opponent');
            showMoveVisual(actingSide, a, isStatus, sp);
            const text = formatLine(l);
            if (text) appendLog(text);
            return 380;
          });
        } else if (side && (kind === '-damage' || kind === '-sethp')) {
          enqueue(() => {
            // Clear any active move lunge/banner before damage shake begins
            clearMoveVisual('p1');
            clearMoveVisual('p2');

            const hp = parseHp(a);
            if (mons[side]) {
              mons[side]!.pct = hp;
              updatePlate(side, mons[side]);
            }
            // Damage shake strictly handles hit VFX — NEVER triggers faint
            showDamageVisual(side);
            return 300;
          });
        } else if (side && kind === 'faint') {
          // Exclusively handles knockout — single, uninterrupted faint sequence
          enqueue(() => {
            clearDamageVisual('p1');
            clearDamageVisual('p2');
            if (mons[side]) {
              mons[side]!.pct = 0;
              mons[side]!.fainted = true;
              updatePlate(side, mons[side], true);
            }
            showFaintVisual(side);
            const text = formatLine(l);
            if (text) appendLog(text);
            return 480;
          });
          enqueue(() => {
            settleFaint(side);
            return 0;
          });
        } else if (side && kind === '-heal') {
          enqueue(() => {
            const hp = parseHp(a);
            if (mons[side]) {
              mons[side]!.pct = hp;
              mons[side]!.fainted = false;
              updatePlate(side, mons[side]);
            }
            showHealVisual(side);
            return 250;
          });
        } else {
          // Informational / secondary lines: append immediately without artificial 400ms stalls
          const text = formatLine(l);
          if (text) {
            appendLog(text);
          }
        }
      }),
      onRequest: (r) => enqueue(() => {
        req = r;
        locked = false;
        clearMoveVisual('p1');
        clearMoveVisual('p2');
        clearDamageVisual('p1');
        clearDamageVisual('p2');
        setSwitchOverlay('');
        updateControls();
        return 0;
      }),
      onError: (m) => enqueue(() => {
        appendLog(`Can't do that: ${m.replace(/^\[.*?\]\s*/, '')}`);
        locked = false;
        updateControls();
        return 0;
      }),
      onEnd: (won) => enqueue(() => {
        result = won;
        locked = true;
        req = null;
        clearMoveVisual('p1');
        clearMoveVisual('p2');
        clearDamageVisual('p1');
        clearDamageVisual('p2');
        setSwitchOverlay('');
        save = won
          ? { status: index + 1 >= AVAILABLE ? 'done' : 'between', cleared: index + 1 }
          : { status: 'lost', cleared: index, lostTo: trainer.name };
        persist();
        updateControls();
        return 0;
      }),
    },
  });

  // --- Dev Tools Test Drives ---
  document.getElementById('dev-test-switch')?.addEventListener('click', () => {
    const currentSpecies = mons.p1?.species || team[0].species;
    const nextTarget = team.find((s) => s.species !== currentSpecies) || team[1] || team[0];
    const hasLive = mons.p1 && mons.p1.pct > 0 && !mons.p1.fainted;

    if (hasLive) {
      updateSprite('p1', mons.p1, 'anim-recall');
      setTimeout(() => {
        updateSprite('p1', null);
        setSwitchOverlay(renderPokeball('p1'));
        setTimeout(() => {
          mons.p1 = { species: nextTarget.species, pct: 100, fainted: false };
          setSwitchOverlay('<div class="ball-burst p1"></div>');
          updateSprite('p1', mons.p1, 'anim-emerge');
          updatePlate('p1', mons.p1);
          appendLog(`(Test Drive) Go! ${nextTarget.species}`);
          setTimeout(() => {
            setSwitchOverlay('');
            updateSprite('p1', mons.p1);
          }, 360);
        }, 280);
      }, 320);
    } else {
      updateSprite('p1', null);
      setSwitchOverlay(renderPokeball('p1'));
      setTimeout(() => {
        mons.p1 = { species: nextTarget.species, pct: 100, fainted: false };
        setSwitchOverlay('<div class="ball-burst p1"></div>');
        updateSprite('p1', mons.p1, 'anim-emerge');
        updatePlate('p1', mons.p1);
        appendLog(`(Test Drive) Go! ${nextTarget.species}`);
        setTimeout(() => {
          setSwitchOverlay('');
          updateSprite('p1', mons.p1);
        }, 360);
      }, 280);
    }
  });

  document.getElementById('dev-test-faint')?.addEventListener('click', () => {
    if (!mons.p1) return;
    mons.p1.pct = 0;
    mons.p1.fainted = true;
    updatePlate('p1', mons.p1, true);
    showFaintVisual('p1');
    appendLog(`${mons.p1.species} fainted!`);
    setTimeout(() => {
      settleFaint('p1');
    }, 480);
  });

  updateControls();
  runner.start();
}

home();
