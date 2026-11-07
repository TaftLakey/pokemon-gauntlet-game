import './style.css';
import { Dex } from '@pkmn/sim';
import type { PokemonSet } from '@pkmn/sim';
import { KANTO, dailyTrainerBuild } from './data';
import { BattleRunner } from './battle';
import { formatLine } from './log';
import { randomBattleSeed, todayKey } from './rng';
import {
  dailyPool10,
  defaultDailySelection,
  validateSelection,
  normalizeSet,
  type TeamSelectionEntry,
  parseTeam,
} from './teams';
import { getLegalMoves } from './legality';
import { partyFromRequest, parseHp, type PartyMemberInfo } from './party';
import {
  getPlayerStatInfo,
  getOpponentStatEstimate,
  renderPlayerTooltip,
  renderOpponentTooltip,
} from './stats';

// ---- daily state -----------------------------------------------------------
const KEY = todayKey();
const SAVE_KEY = `gauntlet:${KEY}`;
const pool10 = dailyPool10(KEY);
const AVAILABLE = KANTO.length;

interface Save {
  version?: number;
  status: 'ready' | 'between' | 'inbattle' | 'lost' | 'done';
  cleared: number;
  lostTo?: string;
  selectedTeam?: TeamSelectionEntry[];
  bench?: TeamSelectionEntry[];
}

function load(): Save {
  let s: Save = { status: 'ready', cleared: 0, version: 1 };
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) s = JSON.parse(raw) as Save;
  } catch {
    /* first visit */
  }
  // Closing the tab mid-battle counts as a forfeit: one attempt per day.
  if (s.status === 'inbattle') s = { status: 'lost', cleared: s.cleared, lostTo: KANTO[s.cleared].name };
  return s;
}

let save = load();

function initRosterFromSave(s: Save): TeamSelectionEntry[] {
  if (s.selectedTeam && Array.isArray(s.selectedTeam) && s.selectedTeam.length === 6) {
    const val = validateSelection(pool10, s.selectedTeam);
    if (val.valid) {
      const active = s.selectedTeam;
      const activeSpecies = new Set(active.map((x) => x.species.toLowerCase()));
      const remainingPool = pool10.filter((p) => !activeSpecies.has(p.species.toLowerCase()));

      let bench: TeamSelectionEntry[] = [];
      if (
        s.bench &&
        Array.isArray(s.bench) &&
        s.bench.length === 4 &&
        s.bench.every((b) => remainingPool.some((rp) => rp.species.toLowerCase() === b.species.toLowerCase()))
      ) {
        bench = s.bench;
      } else {
        bench = remainingPool.map((p) => ({ species: p.species, moves: [...p.moves] }));
      }
      return [...active, ...bench];
    }
  }

  // Fallback to default 10-pool
  return pool10.map((p) => ({ species: p.species, moves: [...p.moves] }));
}

let selectedRoster: TeamSelectionEntry[] = initRosterFromSave(save);

const persist = () => {
  try {
    save.version = 1;
    save.selectedTeam = selectedRoster.slice(0, 6);
    save.bench = selectedRoster.slice(6, 10);
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    /* storage blocked */
  }
};
persist();

function getRosterSets(): PokemonSet[] {
  const map = new Map<string, PokemonSet>();
  for (const p of pool10) map.set(p.species.toLowerCase(), p);
  return selectedRoster.map((entry) => {
    const template = map.get(entry.species.toLowerCase()) || pool10[0];
    return normalizeSet({
      ...template,
      moves: [...entry.moves],
    });
  });
}

function getActiveTeamSets(): PokemonSet[] {
  const val = validateSelection(pool10, selectedRoster.slice(0, 6));
  return val.team;
}

let currentBattlePlayerTeam: PokemonSet[] = getActiveTeamSets();
let latestBattleRequest: any = null;

// ---- helpers ---------------------------------------------------------------
const app = document.getElementById('app')!;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const spriteId = (sp: string) => { const s: any = Dex.species.get(sp); return s.spriteid || s.id; };
const sprite = (sp: string, back = false) =>
  `https://play.pokemonshowdown.com/sprites/${back ? 'gen5-back' : 'gen5'}/${spriteId(sp)}.png`;
const spriteFallback = (sp: string, back = false) =>
  `https://play.pokemonshowdown.com/sprites/${back ? 'gen5' : 'dex'}/${spriteId(sp)}.png`;
const hpClass = (pct: number) => (pct > 50 ? 'ok' : pct > 20 ? 'warn' : 'low');

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

  if (type === 'battle-mon') {
    const sp = target.dataset.species;
    if (sp) {
      const party = latestBattleRequest ? partyFromRequest(latestBattleRequest, currentBattlePlayerTeam) : [];
      const member = party.find((m) => m.species.toLowerCase() === sp.toLowerCase());
      const s =
        member?.set ||
        currentBattlePlayerTeam.find((p) => p.species.toLowerCase() === sp.toLowerCase()) ||
        currentBattlePlayerTeam[0];
      if (s) {
        tooltipEl.innerHTML = renderPlayerTooltip(getPlayerStatInfo(s));
        tooltipEl.classList.remove('hidden');
        positionTooltip(target);
      }
    }
  } else if (type === 'battle-move') {
    const moveId = target.dataset.moveId;
    if (moveId) {
      const mv = Dex.moves.get(moveId);
      tooltipEl.innerHTML = `
        <div class="st-header">
          <div class="st-name-row"><span class="st-name">${mv.name}</span><span class="st-level">${mv.category}</span></div>
          <div class="st-types"><span class="st-type t-${mv.type.toLowerCase()}">${mv.type}</span></div>
        </div>
        <div class="st-meta">
          <div><b>Base Power:</b> ${mv.basePower || '&ndash;'}</div>
          <div><b>Accuracy:</b> ${mv.accuracy === true ? '&ndash;' : mv.accuracy + '%'}</div>
          <div><b>Base PP:</b> ${mv.pp}</div>
        </div>
        <div class="st-divider"></div>
        <p style="margin: 0; font-size: .8rem; color: #333;">${mv.shortDesc || 'No additional effect.'}</p>
      `;
      tooltipEl.classList.remove('hidden');
      positionTooltip(target);
    }
  } else if (type === 'bench' || target.dataset.rosterIndex !== undefined) {
    const idx = target.dataset.rosterIndex !== undefined
      ? Number(target.dataset.rosterIndex)
      : Number(target.dataset.benchIndex ?? 0);
    const sets = getRosterSets();
    const s = sets[idx] || currentBattlePlayerTeam[idx];
    if (s) {
      tooltipEl.innerHTML = renderPlayerTooltip(getPlayerStatInfo(s));
      tooltipEl.classList.remove('hidden');
      positionTooltip(target);
    }
  } else if (type === 'player') {
    const activeSpecies = currentBattleMons?.p1?.species;
    const party = latestBattleRequest ? partyFromRequest(latestBattleRequest, currentBattlePlayerTeam) : [];
    const activeMember = party.find((m) => m.active);
    const s =
      activeMember?.set ||
      (activeSpecies &&
        currentBattlePlayerTeam.find(
          (x) => x.species === activeSpecies || x.species.toLowerCase() === activeSpecies.toLowerCase()
        )) ||
      currentBattlePlayerTeam[0];
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

// ---- move modal manager ----------------------------------------------------
const moveModalEl = document.createElement('div');
moveModalEl.id = 'move-modal';
moveModalEl.className = 'move-modal-backdrop hidden';
document.body.appendChild(moveModalEl);

function openMoveModal(rosterIndex: number) {
  const entry = selectedRoster[rosterIndex];
  if (!entry) return;

  const template = pool10.find((p) => p.species.toLowerCase() === entry.species.toLowerCase()) || pool10[0];
  const allLegal = getLegalMoves(template.species);

  // If the template had any legacy factory moves, ensure they are in the available choices
  for (const defMove of template.moves) {
    if (!allLegal.some((m) => m.name.toLowerCase() === defMove.toLowerCase())) {
      const mv = Dex.moves.get(defMove);
      allLegal.unshift({
        id: mv.id,
        name: mv.name,
        type: mv.type,
        category: mv.category as 'Physical' | 'Special' | 'Status',
        basePower: mv.basePower || 0,
        accuracy: mv.accuracy,
        pp: mv.pp,
        shortDesc: mv.shortDesc || '(Factory Move)',
      });
    }
  }

  let currentMoves = [...entry.moves];
  let activeSlot = 0;
  let search = '';

  function renderModal() {
    const q = search.trim().toLowerCase();
    const filteredMoves = allLegal.filter((m) => {
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.type.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.shortDesc.toLowerCase().includes(q)
      );
    });

    moveModalEl.innerHTML = `
      <div class="move-modal-dialog">
        <div class="modal-header">
          <h2>Customize Moves: ${template.species}</h2>
          <button class="modal-close-btn" id="modal-close" title="Close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="modal-slots-section">
            <div class="modal-section-title">
              <span>Current Moves (${currentMoves.length}/4)</span>
              <span style="font-size: .75rem; font-weight: normal; color: var(--lcd-mid);">Click a slot below to choose which move to replace</span>
            </div>
            <div class="current-slots-grid">
              ${currentMoves.map((m, i) => `
                <div class="slot-select-card ${i === activeSlot ? 'active-slot' : ''}" data-slot-idx="${i}">
                  <small>Slot ${i + 1}${i === activeSlot ? ' (Active)' : ''}</small>
                  <b>${m}</b>
                </div>
              `).join('')}
            </div>
          </div>
          <div>
            <input type="text" class="move-search-box" id="move-search-input" placeholder="Search moves by name, type, category, or description..." value="${search.replace(/"/g, '&quot;')}" />
          </div>
          <div class="moves-scroll-list" id="modal-moves-list">
            ${filteredMoves.map((m) => {
              const isEquipped = currentMoves.includes(m.name);
              return `
                <div class="move-choice-item ${isEquipped ? 'equipped' : ''}" data-move-name="${m.name}">
                  <div class="move-choice-main">
                    <div class="move-choice-title-row">
                      <b>${m.name}</b>
                      <span class="st-type t-${m.type.toLowerCase()}">${m.type}</span>
                      <span class="category-badge cat-${m.category.toLowerCase()}">${m.category}</span>
                    </div>
                    <div class="move-stats-row">
                      <span>Power: <b>${m.basePower || '&ndash;'}</b></span>
                      <span>Accuracy: <b>${m.accuracy === true ? '&ndash;' : m.accuracy + '%'}</b></span>
                      <span>PP: <b>${m.pp}</b></span>
                    </div>
                    <p class="move-desc-text">${m.shortDesc}</p>
                  </div>
                  <div>
                    ${isEquipped
                      ? `<span class="btn-equip-move equipped-badge">&check; Learned</span>`
                      : `<button class="btn-equip-move" data-equip-name="${m.name}">Equip Slot ${activeSlot + 1}</button>`
                    }
                  </div>
                </div>
              `;
            }).join('')}
            ${filteredMoves.length === 0 ? `<p style="text-align: center; color: var(--lcd-mid); padding: 1rem 0;">No matching moves found.</p>` : ''}
          </div>
        </div>
        <div class="modal-footer">
          <button id="modal-reset-moves" class="btn-secondary">Reset to Default Moves</button>
          <button id="modal-done-btn">Save Moves</button>
        </div>
      </div>
    `;

    document.getElementById('modal-close')?.addEventListener('click', closeModal);
    document.getElementById('modal-done-btn')?.addEventListener('click', saveAndClose);
    document.getElementById('modal-reset-moves')?.addEventListener('click', () => {
      currentMoves = [...template.moves];
      renderModal();
    });

    const searchInput = document.getElementById('move-search-input') as HTMLInputElement | null;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        search = (e.target as HTMLInputElement).value;
        renderModal();
        const nextInput = document.getElementById('move-search-input') as HTMLInputElement | null;
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
        }
      });
    }

    moveModalEl.querySelectorAll<HTMLElement>('[data-slot-idx]').forEach((el) => {
      el.addEventListener('click', () => {
        activeSlot = Number(el.dataset.slotIdx);
        renderModal();
      });
    });

    moveModalEl.querySelectorAll<HTMLElement>('[data-equip-name]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const moveName = btn.dataset.equipName;
        if (!moveName || currentMoves.includes(moveName)) return;
        currentMoves[activeSlot] = moveName;
        activeSlot = (activeSlot + 1) % 4;
        renderModal();
      });
    });

    moveModalEl.querySelectorAll<HTMLElement>('.move-choice-item').forEach((item) => {
      item.addEventListener('click', () => {
        const moveName = item.dataset.moveName;
        if (!moveName || currentMoves.includes(moveName)) return;
        currentMoves[activeSlot] = moveName;
        activeSlot = (activeSlot + 1) % 4;
        renderModal();
      });
    });
  }

  function closeModal() {
    moveModalEl.classList.add('hidden');
    moveModalEl.innerHTML = '';
  }

  function saveAndClose() {
    selectedRoster[rosterIndex].moves = [...currentMoves];
    persist();
    closeModal();
    home();
  }

  moveModalEl.classList.remove('hidden');
  renderModal();
}

// ---- home screen -----------------------------------------------------------
function home() {
  currentBattleMons = null;
  hideTooltip();
  const done = save.status === 'lost' || save.status === 'done';
  const canEdit = save.status === 'ready' || save.status === 'between';
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

  const rosterSets = getRosterSets();
  const activeSets = rosterSets.slice(0, 6);
  const benchSets = rosterSets.slice(6, 10);

  function renderCard(s: PokemonSet, rosterIdx: number, isActive: boolean) {
    const isLead = rosterIdx === 0;
    const badgeText = isLead ? 'LEAD' : isActive ? `Slot ${rosterIdx + 1}` : `Bench ${rosterIdx - 5}`;
    const badgeClass = isLead ? 'slot-badge lead-badge' : 'slot-badge';
    const cardClass = `card builder-card ${isLead ? 'slot-lead' : ''}`;

    const controls = canEdit
      ? `<div class="card-btn-row">
          ${isActive && rosterIdx > 0 ? `<button class="btn-card-action" data-action="shift-left" data-slot="${rosterIdx}" title="Move earlier in team">&larr;</button>` : ''}
          ${isActive && rosterIdx < 5 ? `<button class="btn-card-action" data-action="shift-right" data-slot="${rosterIdx}" title="Move later in team">&rarr;</button>` : ''}
          ${isActive ? `<button class="btn-card-action" data-action="bench-swap" data-slot="${rosterIdx}" title="Swap with bench">Bench &darr;</button>` : ''}
          ${!isActive ? `<button class="btn-card-action" data-action="team-swap" data-slot="${rosterIdx}" title="Swap into active team">&uarr; To Team</button>` : ''}
          <button class="btn-edit-moves" data-action="edit-moves" data-slot="${rosterIdx}" title="Customize moves">Moves &#9998;</button>
        </div>`
      : '';

    return `
      <article class="${cardClass}" draggable="${canEdit ? 'true' : 'false'}" data-roster-index="${rosterIdx}" data-inspect="bench" title="Drag to swap / reorder &middot; Hover for stats">
        <span class="${badgeClass}">${badgeText}</span>
        <img src="${sprite(s.species)}" alt="${s.species}" onerror="this.onerror=null; this.src='${spriteFallback(s.species)}';" />
        <div class="card-header-row">
          <h3>${s.species}</h3>
        </div>
        <p class="meta">Lv${s.level} &middot; ${s.item} &middot; ${s.ability}</p>
        <ul>${s.moves.map((m) => `<li>${m}</li>`).join('')}</ul>
        ${controls}
      </article>
    `;
  }

  const teamSection = canEdit
    ? `
      <div class="team-builder-container">
        <div>
          <div class="team-group-header">
            <h2>Active Team (6 / 6)</h2>
            <span class="subtext">Slot 1 is your Lead &middot; Drag cards to swap or reorder</span>
          </div>
          <section class="team-grid">${activeSets.map((s, i) => renderCard(s, i, true)).join('')}</section>
        </div>
        <div>
          <div class="team-group-header">
            <h2>Bench Reserves (4)</h2>
            <span class="subtext">Drag bench Pokémon into active team to swap</span>
          </div>
          <section class="team-grid">${benchSets.map((s, i) => renderCard(s, i + 6, false)).join('')}</section>
        </div>
        <div class="builder-actions-bar">
          <button id="reset-team" class="btn-secondary">Reset to Default Team &amp; Moves</button>
        </div>
      </div>
    `
    : `
      <div class="team-builder-container">
        <div class="team-group-header">
          <h2>Active Team</h2>
          <span class="subtext">Your 6 Pokémon for the daily gauntlet</span>
        </div>
        <section class="team-grid">${activeSets.map((s, i) => renderCard(s, i, true)).join('')}</section>
      </div>
    `;

  app.innerHTML = `
    <header><h1>Daily Gauntlet</h1><p>Kanto league &middot; ${KEY} &middot; balanced levels, no EVs</p></header>
    ${teamSection}
    <section class="roster"><h2>The league</h2><ol>${KANTO.map((t, i) => {
      const state = i < save.cleared ? 'beaten' : i === save.cleared && !done ? 'next' : i >= AVAILABLE ? 'soon' : '';
      const b = dailyTrainerBuild(t, KEY, i);
      return `<li class="${state}"><b>${t.name}</b> <span>${t.title}, ${t.type} &middot; ${b.name}</span></li>`;
    }).join('')}</ol></section>
    <div class="action">${action}</div>
    ${devToolbar}`;

  // Attach drag-and-drop
  if (canEdit) {
    let dragSrc: number | null = null;
    const cards = app.querySelectorAll<HTMLElement>('.card.builder-card');
    cards.forEach((card) => {
      card.addEventListener('dragstart', (e) => {
        dragSrc = Number(card.dataset.rosterIndex);
        card.classList.add('dragging');
        e.dataTransfer?.setData('text/plain', dragSrc.toString());
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        cards.forEach((c) => c.classList.remove('drop-target'));
      });
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        card.classList.add('drop-target');
      });
      card.addEventListener('dragleave', () => {
        card.classList.remove('drop-target');
      });
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('drop-target');
        const dest = Number(card.dataset.rosterIndex);
        if (dragSrc !== null && !isNaN(dragSrc) && !isNaN(dest) && dragSrc !== dest) {
          const tmp = selectedRoster[dragSrc];
          selectedRoster[dragSrc] = selectedRoster[dest];
          selectedRoster[dest] = tmp;
          persist();
          home();
        }
      });
    });

    // Button controls
    app.querySelectorAll<HTMLElement>('[data-action]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const actionType = btn.dataset.action;
        const slot = Number(btn.dataset.slot);
        if (isNaN(slot)) return;

        if (actionType === 'shift-left' && slot > 0) {
          const tmp = selectedRoster[slot];
          selectedRoster[slot] = selectedRoster[slot - 1];
          selectedRoster[slot - 1] = tmp;
          persist();
          home();
        } else if (actionType === 'shift-right' && slot < 5) {
          const tmp = selectedRoster[slot];
          selectedRoster[slot] = selectedRoster[slot + 1];
          selectedRoster[slot + 1] = tmp;
          persist();
          home();
        } else if (actionType === 'bench-swap') {
          // Swap active slot with first bench slot (index 6)
          const tmp = selectedRoster[slot];
          selectedRoster[slot] = selectedRoster[6];
          selectedRoster[6] = tmp;
          persist();
          home();
        } else if (actionType === 'team-swap') {
          // Swap bench slot with last active slot (index 5)
          const tmp = selectedRoster[slot];
          selectedRoster[slot] = selectedRoster[5];
          selectedRoster[5] = tmp;
          persist();
          home();
        } else if (actionType === 'edit-moves') {
          openMoveModal(slot);
        }
      });
    });

    document.getElementById('reset-team')?.addEventListener('click', () => {
      selectedRoster = pool10.map((p) => ({ species: p.species, moves: [...p.moves] }));
      persist();
      home();
    });
  }

  document.getElementById('go')?.addEventListener('click', () => startBattle(save.cleared));
  document.getElementById('retry')?.addEventListener('click', () => {
    save = { status: 'ready', cleared: 0, version: 1 };
    persist();
    home();
  });
  document.getElementById('dev-reset')?.addEventListener('click', () => {
    save = { status: 'ready', cleared: 0, version: 1 };
    persist();
    home();
  });
  document.getElementById('dev-retry-battle')?.addEventListener('click', () => {
    save = { status: 'between', cleared: save.cleared, version: 1 };
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
  const playerTeam = getActiveTeamSets();
  currentBattlePlayerTeam = playerTeam;
  save = { status: 'inbattle', cleared: index };
  persist();

  // Warm up both teams' sprite assets to prevent network/decoding stutter
  preloadBattleSprites(playerTeam, foeTeam);

  const mons: { p1: BattleMon | null; p2: BattleMon | null } = { p1: null, p2: null };
  currentBattleMons = mons;
  let req: any = null;
  let locked = true;
  let result: boolean | null = null;

  // --- Visual and Protocol State Trackers ---
  const activeStatuses: { p1: string | null; p2: string | null } = { p1: null, p2: null };

  type StatStageKey = 'atk' | 'def' | 'spa' | 'spd' | 'spe' | 'accuracy' | 'evasion';
  type StatStages = Record<StatStageKey, number>;
  const defaultStages = (): StatStages => ({
    atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0,
  });
  const stages: { p1: StatStages; p2: StatStages } = {
    p1: defaultStages(),
    p2: defaultStages(),
  };

  interface SideHazards {
    stealthRock: boolean;
    spikes: number;
    toxicSpikes: number;
    stickyWeb: boolean;
  }
  const defaultHazards = (): SideHazards => ({
    stealthRock: false,
    spikes: 0,
    toxicSpikes: 0,
    stickyWeb: false,
  });
  const hazards: { p1: SideHazards; p2: SideHazards } = {
    p1: defaultHazards(),
    p2: defaultHazards(),
  };

  function renderStatusBadge(side: 'p1' | 'p2'): string {
    const st = activeStatuses[side];
    if (!st) return '';
    return `<span class="status-badge status-${st.toLowerCase()}">${st.toUpperCase()}</span>`;
  }

  function renderStatStages(side: 'p1' | 'p2'): string {
    const st = stages[side];
    const keys: StatStageKey[] = ['atk', 'def', 'spa', 'spd', 'spe', 'accuracy', 'evasion'];
    const labels: Record<StatStageKey, string> = {
      atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe', accuracy: 'Acc', evasion: 'Eva'
    };
    const chips: string[] = [];
    for (const k of keys) {
      const val = st[k];
      if (val !== 0) {
        chips.push(`<span class="stat-stage-chip ${val > 0 ? 'boost-pos' : 'boost-neg'}">${labels[k]} ${val > 0 ? '+' + val : val}</span>`);
      }
    }
    return chips.length ? `<div class="stat-stages-row">${chips.join('')}</div>` : '';
  }

  function renderHazards(side: 'p1' | 'p2'): string {
    const hz = hazards[side];
    const chips: string[] = [];
    if (hz.stealthRock) chips.push(`<span class="hazard-chip">Stealth Rock</span>`);
    if (hz.spikes > 0) chips.push(`<span class="hazard-chip">Spikes (${hz.spikes})</span>`);
    if (hz.toxicSpikes > 0) chips.push(`<span class="hazard-chip">Toxic Spikes (${hz.toxicSpikes})</span>`);
    if (hz.stickyWeb) chips.push(`<span class="hazard-chip">Sticky Web</span>`);
    return chips.length ? `<div class="hazard-zone">${chips.join('')}</div>` : '';
  }

  function showFloatingStat(side: 'p1' | 'p2', stat: string, amount: number) {
    const labels: Record<string, string> = {
      atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe', accuracy: 'Acc', evasion: 'Eva'
    };
    const name = labels[stat] || stat;
    const arrows = amount > 0 ? '▲'.repeat(Math.min(3, Math.abs(amount))) : '▼'.repeat(Math.min(3, Math.abs(amount)));
    const el = document.createElement('div');
    el.className = `floating-stat ${side} ${amount > 0 ? 'stat-up' : 'stat-down'}`;
    el.textContent = `${name} ${arrows}`;
    impactSlot.appendChild(el);
    setTimeout(() => el.remove(), 700);
  }

  function showStatusAppliedVisual(side: 'p1' | 'p2', statusName: string) {
    activeStatuses[side] = statusName;
    if (mons[side]) {
      updatePlate(side, mons[side]);
      updateSprite(side, mons[side], 'anim-status-flash');
      setTimeout(() => {
        if (mons[side] && !mons[side]!.fainted) {
          updateSprite(side, mons[side]);
        }
      }, 450);
    }
  }

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
    const monLevel = isPlayer
      ? (playerTeam.find((p) => p.species === mon.species || p.species.toLowerCase() === mon.species.toLowerCase())?.level ?? 85)
      : 85;

    const existing = slot.querySelector('.plate') as HTMLElement | null;
    if (existing && existing.dataset.species === mon.species) {
      // In-place update: allows CSS transition on the bar to smoothly animate!
      const barInner = existing.querySelector('.bar i') as HTMLElement | null;
      if (barInner) {
        barInner.style.width = `${mon.pct}%`;
        barInner.className = cls;
      }
      const nameEl = existing.querySelector('b') as HTMLElement | null;
      if (nameEl) {
        nameEl.innerHTML = `${label}${mon.species}${renderStatusBadge(side)}`;
      }
      const metaRow = existing.querySelector('.plate-meta-row') as HTMLElement | null;
      if (metaRow) {
        metaRow.innerHTML = `
          ${renderStatStages(side)}
          <div class="plate-hp"><span class="${cls}">${mon.pct}% HP</span></div>
        `;
      }
      const existingHz = existing.querySelector('.hazard-zone') as HTMLElement | null;
      if (existingHz) {
        existingHz.outerHTML = renderHazards(side);
      } else if (renderHazards(side)) {
        existing.insertAdjacentHTML('beforeend', renderHazards(side));
      }
    } else {
      // Mount new plate
      slot.innerHTML = `
        <div class="plate" data-inspect="${inspectType}" data-species="${mon.species}" title="Hover for stat breakdown">
          <b>${label}${mon.species}${renderStatusBadge(side)}</b><span>Lv${monLevel}</span>
          <div class="bar"><i class="${cls}" style="width:${mon.pct}%"></i></div>
          <div class="plate-meta-row">
            ${renderStatStages(side)}
            <div class="plate-hp"><span class="${cls}">${mon.pct}% HP</span></div>
          </div>
          ${renderHazards(side)}
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
    const slot = side === 'p1' ? p1PlateSlot : p2PlateSlot;
    const plateEl = slot.querySelector('.plate');
    if (plateEl) {
      plateEl.classList.remove('anim-plate-flash');
      void (plateEl as HTMLElement).offsetWidth;
      plateEl.classList.add('anim-plate-flash');
      setTimeout(() => plateEl?.classList.remove('anim-plate-flash'), 350);
    }
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
    const party = partyFromRequest(req, playerTeam);
    const trapped = !req.forceSwitch && req.active?.[0]?.trapped;
    const switches = party.map((member) => {
      const off = locked || member.active || member.fainted || trapped;
      const memberStatus = member.active ? activeStatuses['p1'] : (member.condition.split(' ')[1] || null);
      const statusBadgeHtml = memberStatus && !memberStatus.includes('fnt')
        ? `<span class="status-badge status-${memberStatus.toLowerCase()}">${memberStatus.toUpperCase()}</span>`
        : '';
      return `<button class="sw ${member.active ? 'active-mon' : ''}" data-c="switch ${member.slotIndex + 1}" data-inspect="battle-mon" data-species="${member.species}" ${off ? 'disabled' : ''} title="${member.species} (${member.hpPercent}%) &middot; Hover for stats">
        <span>${member.species}${statusBadgeHtml}</span><small class="${hpClass(member.hpPercent)}">${member.hpPercent}%</small></button>`;
    }).join('');
    if (req.forceSwitch) {
      controlsEl.innerHTML = `<p class="prompt">Choose your next Pok&eacute;mon</p><div class="switches">${switches}</div>`;
    } else {
      const moves = (req.active[0].moves as any[]).map((m, i) => {
        const mv = Dex.moves.get(m.id);
        return `<button class="mv t-${mv.type.toLowerCase()}" data-c="move ${i + 1}" data-inspect="battle-move" data-move-id="${m.id}" ${locked || m.disabled ? 'disabled' : ''} title="${m.move} &middot; ${mv.category} &middot; BP ${mv.basePower || '—'} &middot; ${m.pp}/${m.maxpp} PP">
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
    playerTeam,
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

          // Reset stat stages on switch-out
          stages[side] = defaultStages();

          // Condition suffix for status
          const condParts = (b || '').split(' ');
          if (condParts.length > 1 && !condParts[1].includes('fnt')) {
            activeStatuses[side] = condParts[1];
          } else {
            activeStatuses[side] = null;
          }

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
            showDamageVisual(side);
            return 300;
          });
        } else if (side && kind === 'faint') {
          stages[side] = defaultStages();
          activeStatuses[side] = null;
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
        } else if (side && kind === '-status') {
          enqueue(() => {
            showStatusAppliedVisual(side, a);
            const text = formatLine(l);
            if (text) appendLog(text);
            return 300;
          });
        } else if (side && kind === '-curestatus') {
          enqueue(() => {
            activeStatuses[side] = null;
            if (mons[side]) updatePlate(side, mons[side]);
            const text = formatLine(l);
            if (text) appendLog(text);
            return 0;
          });
        } else if (kind === '-cureteam') {
          const teamSide = who?.startsWith('p1') ? 'p1' : who?.startsWith('p2') ? 'p2' : null;
          if (teamSide) {
            enqueue(() => {
              activeStatuses[teamSide] = null;
              if (mons[teamSide]) updatePlate(teamSide, mons[teamSide]);
              const text = formatLine(l);
              if (text) appendLog(text);
              return 0;
            });
          }
        } else if (side && kind === '-boost') {
          const stat = a as StatStageKey;
          const amt = Number(b || 1);
          enqueue(() => {
            stages[side][stat] = Math.max(-6, Math.min(6, (stages[side][stat] || 0) + amt));
            showFloatingStat(side, stat, amt);
            if (mons[side]) updatePlate(side, mons[side]);
            const text = formatLine(l);
            if (text) appendLog(text);
            return 280;
          });
        } else if (side && kind === '-unboost') {
          const stat = a as StatStageKey;
          const amt = Number(b || 1);
          enqueue(() => {
            stages[side][stat] = Math.max(-6, Math.min(6, (stages[side][stat] || 0) - amt));
            showFloatingStat(side, stat, -amt);
            if (mons[side]) updatePlate(side, mons[side]);
            const text = formatLine(l);
            if (text) appendLog(text);
            return 280;
          });
        } else if (side && kind === '-setboost') {
          const stat = a as StatStageKey;
          const amt = Number(b || 0);
          enqueue(() => {
            stages[side][stat] = amt;
            if (mons[side]) updatePlate(side, mons[side]);
            const text = formatLine(l);
            if (text) appendLog(text);
            return 0;
          });
        } else if (side && kind === '-clearboost') {
          enqueue(() => {
            stages[side] = defaultStages();
            if (mons[side]) updatePlate(side, mons[side]);
            const text = formatLine(l);
            if (text) appendLog(text);
            return 0;
          });
        } else if (kind === '-clearallboost') {
          enqueue(() => {
            stages.p1 = defaultStages();
            stages.p2 = defaultStages();
            if (mons.p1) updatePlate('p1', mons.p1);
            if (mons.p2) updatePlate('p2', mons.p2);
            const text = formatLine(l);
            if (text) appendLog(text);
            return 0;
          });
        } else if (side && kind === '-clearnegativeboost') {
          enqueue(() => {
            for (const k of Object.keys(stages[side]) as StatStageKey[]) {
              if (stages[side][k] < 0) stages[side][k] = 0;
            }
            if (mons[side]) updatePlate(side, mons[side]);
            const text = formatLine(l);
            if (text) appendLog(text);
            return 0;
          });
        } else if (side && kind === '-invertboost') {
          enqueue(() => {
            for (const k of Object.keys(stages[side]) as StatStageKey[]) {
              stages[side][k] = -stages[side][k];
            }
            if (mons[side]) updatePlate(side, mons[side]);
            const text = formatLine(l);
            if (text) appendLog(text);
            return 0;
          });
        } else if (side && kind === '-copyboost') {
          const fromSide = b?.startsWith('p1') ? 'p1' : 'p2';
          enqueue(() => {
            stages[side] = { ...stages[fromSide] };
            if (mons[side]) updatePlate(side, mons[side]);
            const text = formatLine(l);
            if (text) appendLog(text);
            return 0;
          });
        } else if (kind === '-swapboost') {
          enqueue(() => {
            const tmp = { ...stages.p1 };
            stages.p1 = { ...stages.p2 };
            stages.p2 = tmp;
            if (mons.p1) updatePlate('p1', mons.p1);
            if (mons.p2) updatePlate('p2', mons.p2);
            const text = formatLine(l);
            if (text) appendLog(text);
            return 0;
          });
        } else if (kind === '-sidestart') {
          const hzSide = who?.startsWith('p1') ? 'p1' : who?.startsWith('p2') ? 'p2' : null;
          if (hzSide) {
            enqueue(() => {
              const hzName = a || '';
              if (hzName.includes('Stealth Rock')) hazards[hzSide].stealthRock = true;
              if (hzName.includes('Toxic Spikes')) hazards[hzSide].toxicSpikes = Math.min(2, hazards[hzSide].toxicSpikes + 1);
              if (hzName.includes('Spikes')) hazards[hzSide].spikes = Math.min(3, hazards[hzSide].spikes + 1);
              if (hzName.includes('Sticky Web')) hazards[hzSide].stickyWeb = true;
              if (mons[hzSide]) updatePlate(hzSide, mons[hzSide]);
              const text = formatLine(l);
              if (text) appendLog(text);
              return 200;
            });
          }
        } else if (kind === '-sideend') {
          const hzSide = who?.startsWith('p1') ? 'p1' : who?.startsWith('p2') ? 'p2' : null;
          if (hzSide) {
            enqueue(() => {
              const hzName = a || '';
              if (hzName.includes('Stealth Rock')) hazards[hzSide].stealthRock = false;
              if (hzName.includes('Toxic Spikes')) hazards[hzSide].toxicSpikes = 0;
              if (hzName.includes('Spikes')) hazards[hzSide].spikes = 0;
              if (hzName.includes('Sticky Web')) hazards[hzSide].stickyWeb = false;
              if (mons[hzSide]) updatePlate(hzSide, mons[hzSide]);
              const text = formatLine(l);
              if (text) appendLog(text);
              return 150;
            });
          }
        } else {
          // Informational / secondary lines: append immediately without artificial 400ms stalls
          const text = formatLine(l);
          if (text) {
            appendLog(text);
          }
        }
      }),
      onRequest: (r) => enqueue(() => {
        latestBattleRequest = r;
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
    const currentSpecies = mons.p1?.species || playerTeam[0].species;
    const nextTarget = playerTeam.find((s) => s.species !== currentSpecies) || playerTeam[1] || playerTeam[0];
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
