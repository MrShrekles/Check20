/* The initiative strip across the top of the stage.

   A combatant can be loose (a name typed in) or tied to something on the map:
   a character by `charId`, a monster token by `itemId`. Tied ones show what
   they have left, or what they have taken, and clicking the chip brings the
   view to them. */

import { state, ui } from './state.js';
import { markCombatEnded } from './recovery.js';
import { $, esc, toast } from './dom.js';
import { addMsg, now } from './chat.js';
import { view, requestDraw } from './view.js';
import { woundsMax, checkTotal } from './character.js';
import { isPlayerMode, PLAYER_CHAR_ID } from './session.js';
import { d20 } from './dice.js';
import { monsterCheck, allMonsters } from './monsters.js';
import { revealWin } from './dock.js';

/** The item on the map for a combatant, if it is still there. */
function itemFor(c) {
  if (c.itemId) return state.items.find(i => i.id === c.itemId) || null;
  if (c.charId) return state.items.find(i => i.charId === c.charId) || null;
  return null;
}

/** What the chip shows beside the name: wounds left, or damage taken. */
/* The colour beside a name, so the order and the map agree at a glance. */
function dotFor(c, it) {
  if (it?.color) return it.color;
  if (c.charId) {
    const ch = state.chars.find(x => x.id === c.charId);
    if (ch?.color) return ch.color;
  }
  return 'var(--theme-3)';
}

/* The same rule the hover plate follows: a player reads their own character
   and nobody else's health. The order is on screen for everyone, so a wound
   count here would hand out exactly what the hover refuses. */
function statusPill(c) {
  // Player view is a preview, so it hides what a player session hides.
  const asPlayer = isPlayerMode() || state.playerView;
  if (c.charId) {
    if (asPlayer && c.charId !== PLAYER_CHAR_ID) return '';
    const ch = state.chars.find(x => x.id === c.charId);
    if (!ch?.res?.hp) return '';
    const left = ch.res.hp.current;
    return `<span class="ipill${left <= 0 ? ' out' : ''}" title="Wounds">${left}/${woundsMax(ch)}</span>`;
  }
  if (asPlayer) return '';
  const it = itemFor(c);
  if (it && it.taken) return `<span class="ipill hurt" title="Damage taken">−${it.taken}</span>`;
  return '';
}

/* ---- ending a turn ----

   Two things a character does as they finish: drop Prone, or take Cover.
   Prone is a real Check20 condition and goes on the sheet. Cover is not in
   conditions.json at all, so it lives on the token as a flag rather than being
   invented as a condition — a made-up condition would show up in the picker,
   in the clearing rules and in Press On, all of which would be lying.

   Both are toggles, because a turn that ends standing up is as common as one
   that ends going down. */

/** Is this combatant prone, and can it be? */
function proneOf(c) {
  const ch = c.charId ? state.chars.find(x => x.id === c.charId) : null;
  if (ch) return (ch.conditions || []).includes('Prone');
  const it = itemFor(c);
  return !!it && (it.conditions || []).includes('Prone');
}

function toggleProne(c) {
  const ch = c.charId ? state.chars.find(x => x.id === c.charId) : null;
  const holder = ch || itemFor(c);
  if (!holder) return;
  holder.conditions ||= [];
  const i = holder.conditions.indexOf('Prone');
  if (i >= 0) holder.conditions.splice(i, 1); else holder.conditions.push('Prone');
}

const coverOf = c => !!itemFor(c)?.cover;

function toggleCover(c) {
  const it = itemFor(c);
  if (!it) return false;
  if (it.cover) delete it.cover; else it.cover = true;
  return true;
}

/** Bring the view to a combatant's token, keeping the zoom. */
function centreOn(it) {
  state.cam.x = view.W / 2 - it.x * state.cam.z;
  state.cam.y = view.H / 2 - it.y * state.cam.z;
  requestDraw();
}

/* A round is ten seconds, the same rule the companion uses so a phone and a
   laptop at one table agree on how long the fight has taken. Shown as seconds
   while it is short, then minutes, because "0.33 minutes" tells nobody
   anything and "20s" does. */
export const ROUND_SECONDS = 10;

export function elapsedLabel(round) {
  const secs = Math.max(0, (round - 1)) * ROUND_SECONDS;
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60), r = secs % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

/* ---- the order as it is played ----

   `state.init.list` is one entry per combatant, sorted by roll. What gets
   played can be shorter: with the setting on, every monster acts together at
   the best of their rolls, which is how the companion runs it and how most
   tables run it anyway — eight Brutes is one decision, not eight turns to
   click through.

   `state.init.turn` indexes THIS, not the raw list, so the two must always be
   built by the same function. Toggling the setting changes the length of the
   order, which is why `clampTurn()` exists. */

const isEnemy = c => !c.charId && !!itemFor(c)?.monster;

/**
 * The order as it is played: a list of entries, each either one combatant or
 * the whole opposition acting at once.
 * @returns {{group: boolean, val: number, members: object[]}[]}
 */
export function playOrder() {
  const list = state.init.list;
  if (!state.settings?.groupEnemyTurns) {
    return list.map(c => ({ group: false, val: c.val, members: [c] }));
  }
  const foes = list.filter(isEnemy);
  if (foes.length < 2) return list.map(c => ({ group: false, val: c.val, members: [c] }));

  const rest = list.filter(c => !isEnemy(c)).map(c => ({ group: false, val: c.val, members: [c] }));
  // The opposition goes at the best roll any of them made.
  const val = Math.max(...foes.map(f => f.val || 0));
  const entry = { group: true, val, members: foes };
  const at = rest.findIndex(e => (e.val || 0) <= val);
  if (at === -1) rest.push(entry); else rest.splice(at, 0, entry);
  return rest;
}

/** Keep `turn` inside the order, whatever just changed its length. */
export function clampTurn() {
  const n = playOrder().length;
  if (!n) { state.init.turn = 0; return; }
  if (state.init.turn >= n) state.init.turn = 0;
  if (state.init.turn < 0) state.init.turn = 0;
}

/** Everything acting right now, as the refs a token is matched on. Used by the
    renderer to glow them: with the opposition grouped, that is all of them. */
export function currentTurnRefs() {
  const entry = playOrder()[state.init.turn];
  if (!entry) return [];
  return entry.members.map(c => ({ charId: c.charId, itemId: c.itemId }));
}

export function renderInit() {
  const wrap = $('initChips');
  wrap.innerHTML = '';

  const round = state.init.round || 1;
  if (state.init.list.length) {
    const label = document.createElement('div');
    label.className = 'iround';
    label.innerHTML = `<span>Round ${round}</span><span class="ielapsed"
      title="Ten seconds a round">${esc(elapsedLabel(round))}</span>`;
    wrap.appendChild(label);
  }

  clampTurn();
  playOrder().forEach((entry, i) => {
    const up = i === state.init.turn;

    /* The opposition as one card: the count and the roll they are all acting
       on, with their colours so you can see which of them it means. */
    if (entry.group) {
      const el = document.createElement('div');
      el.className = 'turncard foes' + (up ? ' turn' : '');
      const dots = entry.members.slice(0, 10)
        .map(m => `<span class="tcdot" style="background:${esc(dotFor(m, itemFor(m)))}"></span>`).join('');
      el.innerHTML = `
        <span class="tcorder">${up ? '▸' : i + 1}</span>
        <span class="tcfoes">${dots}${entry.members.length > 10 ? `<span class="gmore">+${entry.members.length - 10}</span>` : ''}</span>
        <span class="tcwho">The opposition <small>${entry.members.length}</small></span>
        <span class="iv">${entry.val}</span>
        ${up ? `<div class="turnacts">
          <button class="tstate end" data-state="end" title="End the opposition's turn">
            <svg viewBox="0 0 24 24"><path d="M5 12h12"/><path d="M13 7l5 5-5 5"/></svg>
            End turn
          </button>
        </div>` : ''}`;
      el.querySelector('[data-state]')?.addEventListener('click', ev => {
        ev.stopPropagation();
        $('initNext').click();
      });
      wrap.appendChild(el);
      return;
    }

    const c = entry.members[0];
    const el = document.createElement('div');
    const it = itemFor(c);
    el.className = 'turncard' + (up ? ' turn' : '') + (it ? ' linked' : '');
    el.innerHTML = `
      <span class="tcorder">${up ? '▸' : i + 1}</span>
      <span class="tcdot" style="background:${esc(dotFor(c, it))}"></span>
      <span class="tcwho">${esc(c.name)}</span>
      ${statusPill(c)}
      <span class="iv">${c.val}</span>
      <button class="x" title="Remove">&#10005;</button>
      ${up ? `<div class="turnacts">
        <button class="tstate${proneOf(c) ? ' on' : ''}" data-state="prone"
          title="${proneOf(c) ? 'Stand up' : 'Go prone: Disadvantage on ranged attacks, Advantage for melee against you'}">
          <svg viewBox="0 0 24 24"><path d="M3 17h18"/><path d="M6 17c2-4 5-6 9-6"/><circle cx="17" cy="9" r="2.2"/></svg>
          Prone
        </button>
        <button class="tstate${coverOf(c) ? ' on' : ''}" data-state="cover" ${it ? '' : 'disabled'}
          title="${it ? (coverOf(c) ? 'Leave cover' : 'Take cover behind something') : 'Only a token on the map can take cover'}">
          <svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 4.2-3.2 7.6-8 9-4.8-1.4-8-4.8-8-9V6z"/></svg>
          Cover
        </button>
        <button class="tstate end" data-state="end" title="End this turn">
          <svg viewBox="0 0 24 24"><path d="M5 12h12"/><path d="M13 7l5 5-5 5"/></svg>
          End turn
        </button>
      </div>` : ''}`;

    el.querySelectorAll('[data-state]').forEach(b => b.addEventListener('click', ev => {
      ev.stopPropagation();
      const what = b.dataset.state;
      if (what === 'prone') {
        toggleProne(c);
        addMsg({ type: 'sys', text: `${c.name} ${proneOf(c) ? 'goes prone' : 'stands up'}.`, time: now() });
      } else if (what === 'cover') {
        if (!toggleCover(c)) return toast('Only a token on the map can take cover');
        addMsg({ type: 'sys', text: `${c.name} ${coverOf(c) ? 'takes cover' : 'leaves cover'}.`, time: now() });
      } else if (what === 'end') {
        return $('initNext').click();
      }
      renderInit();
      requestDraw();
    }));

    el.querySelector('.x').onclick = e => {
      e.stopPropagation();
      state.init.list = state.init.list.filter(x => x !== c);
      ui.hover = null;
      clampTurn();
      renderInit();
      requestDraw();
    };
    if (it) {
      el.title = 'Bring the view to them';
      el.onclick = () => centreOn(it);
      el.addEventListener('mouseenter', () => { ui.hover = it; requestDraw(); });
      el.addEventListener('mouseleave', () => { if (ui.hover === it) ui.hover = null; requestDraw(); });
    }
    wrap.appendChild(el);
  });
}

/**
 * Add a combatant and keep the order highest-first.
 * @param {string} name
 * @param {number} val   the initiative roll
 * @param {{charId?: string, itemId?: string}} [ref]  what it is on the map
 */
export function addCombatant(name, val, ref = {}) {
  state.init.list.push({ name, val, ...ref });
  state.init.list.sort((a, b) => b.val - a.val);
  state.init.round ||= 1;
}

/* Everything selected that can take a turn. A drawing cannot, and neither can
   a lamp — only a token standing for somebody. Anything already in the order
   is left alone rather than added twice.

   This is the payoff for the marquee: drag a box round the fight and roll for
   all of it at once, instead of opening ten cards. */
function selectedCombatants() {
  const picked = new Set(ui.sel.group);
  if (ui.sel.item) picked.add(ui.sel.item);
  const inOrder = new Set(state.init.list.flatMap(c => [c.charId, c.itemId].filter(Boolean)));

  return [...picked].filter(it =>
    it.kind === 'token'
    && (it.charId || it.monster)
    && !inOrder.has(it.charId)
    && !inOrder.has(it.id));
}

/** What a token rolls to go into the order, and why.
    A character rolls Agility; a monster rolls its Physical check. */
function initiativeFor(it) {
  if (it.charId) {
    const ch = state.chars.find(c => c.id === it.charId);
    if (ch) return { name: ch.name || it.name || 'Unnamed', mod: checkTotal(ch, 'agi'), ref: { charId: ch.id } };
  }
  if (it.monster) {
    const m = allMonsters().find(x => x.name === it.monster);
    const mod = m ? monsterCheck(m, 'check_physical') : (it.pl || 0);
    return { name: it.name || it.monster, mod, ref: { itemId: it.id } };
  }
  return null;
}

/** Roll every selected token into the order in one go. */
export function rollSelectedIntoOrder() {
  const picked = selectedCombatants();
  if (!picked.length) {
    toast(ui.sel.group.length || ui.sel.item
      ? 'Those are already in the order, or cannot take a turn'
      : 'Select some tokens first — drag a box round them');
    return;
  }
  const added = [];
  for (const it of picked) {
    const who = initiativeFor(it);
    if (!who) continue;
    const roll = d20() + who.mod;
    addCombatant(who.name, roll, who.ref);
    added.push(`${who.name} ${roll}`);
  }
  if (!added.length) return;
  state.init.turn = 0;
  addMsg({ type: 'sys', text: `Initiative: ${added.join(', ')}.`, time: now() });
  // Rolling a fight into the order is a reason to be looking at the order.
  revealWin('init');
  renderInit();
  requestDraw();
  toast(`${added.length} into the order`);
}

export function initInitiative() {
  $('initAdd').onclick = () => {
    const n = $('initName').value.trim();
    if (!n) return;
    addCombatant(n, +$('initVal').value || 0);
    $('initName').value = ''; $('initVal').value = '';
    renderInit();
  };
  $('initNext').onclick = () => {
    const order = playOrder();
    if (!order.length) return;
    const next = (state.init.turn + 1) % order.length;
    // Back at the top of the order is a new round.
    if (next === 0) {
      state.init.round = (state.init.round || 1) + 1;
      addMsg({ type: 'round', round: state.init.round, elapsed: elapsedLabel(state.init.round), time: now() });
    }
    state.init.turn = next;
    const entry = order[next];
    const grouped = entry.group;
    const up = entry.members[0];
    /* Whose turn it is is the thing you look for when you glance back at the
       log, so it is a card rather than a line of prose, and the party and the
       opposition are told apart at a glance. */
    addMsg({
      type: 'turn',
      who: grouped ? `The opposition · ${entry.members.length}` : up.name,
      side: grouped ? 'enemy' : up.charId ? 'party' : up.itemId ? 'enemy' : 'other',
      color: dotFor(up, itemFor(up)),
      round: state.init.round || 1,
      time: now(),
    });
    /* A toast as well as the chat line: whoever is up is usually looking at
       the map, not the log, and the token's glow only says where, not that it
       has just changed. Bring the view to them too — but not for the whole
       opposition, since there is no single "them" to bring it to. */
    toast(grouped ? `The opposition is up · ${entry.members.length}` : `${up.name} is up`);
    if (!grouped) {
      const it = itemFor(up);
      if (it) centreOn(it);
    }
    renderInit();
    requestDraw();
  };
  $('initClear').onclick = () => {
    state.init = { list: [], turn: 0, round: 1 };
    ui.hover = null;
    // Clearing the order is the end of a fight, which is what Press On waits
    // for. Nothing else in the app knows a combat happened.
    markCombatEnded(state.chars);
    renderInit();
  };
}
