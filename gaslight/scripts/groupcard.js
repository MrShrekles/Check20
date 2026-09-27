/* The card for a handful of tokens at once.

   Selecting one token opens a card; selecting five used to open nothing, and
   the only group action lived as a button in the initiative panel — which is
   the wrong place, because the thing you just did was make a selection, and
   the selection is what you want to act on.

   So the marquee opens this. It does the things that are tedious one token at
   a time: rolling the whole fight into the order, putting the same damage
   through six Brutes, marking everyone in a blast radius. */

import { state, ui } from './state.js';
import { $, esc, toast, safeColor } from './dom.js';
import { requestDraw, anchorCardBeside } from './view.js';
import { w2s, itemBounds } from './geometry.js';
import { applyDamage, reconcile } from './character.js';
import { allConditions, toggleCondition } from './conditions.js';
import { rollSelectedIntoOrder } from './initiative.js';
import { addMsg, now } from './chat.js';
import { isPlayerMode } from './session.js';

/** Everything selected, as one list. */
export function selection() {
  const all = new Set(ui.sel.group);
  if (ui.sel.item) all.add(ui.sel.item);
  return [...all];
}

export function hideGroupCard() {
  $('groupCard').classList.remove('on');
}

/** A character behind a token, if there is one. */
const charOf = it => (it.charId ? state.chars.find(c => c.id === it.charId) : null);

/* What the selection is made of, so the card can say so rather than just
   counting. "5 selected" is less use than "2 of the party, 3 monsters". */
function census(items) {
  const party = items.filter(i => i.charId).length;
  const monsters = items.filter(i => !i.charId && i.monster).length;
  const other = items.length - party - monsters;
  const bits = [];
  if (party) bits.push(`${party} of the party`);
  if (monsters) bits.push(`${monsters} monster${monsters === 1 ? '' : 's'}`);
  if (other) bits.push(`${other} other`);
  return bits.join(' · ');
}

/** Put the same damage through everything selected, armour first where it has any. */
function damageAll(items, amount) {
  const n = Math.max(0, Math.round(+amount || 0));
  if (!n) return null;
  const told = [];
  for (const it of items) {
    const ch = charOf(it);
    if (ch) {
      const r = applyDamage(ch, n);
      if (r) told.push(`${ch.name || 'Unnamed'} −${r.dmg}${r.downed ? ' (down)' : ''}`);
    } else if (it.monster || it.hpMax) {
      it.taken = (it.taken || 0) + n;
      told.push(`${it.name || 'Token'} −${n}`);
    }
  }
  return told;
}

/** Put a condition on everything that can hold one, or take it off everything. */
function conditionAll(items, name, on) {
  let touched = 0;
  for (const it of items) {
    const holder = charOf(it) || it;
    holder.conditions ||= [];
    const has = holder.conditions.includes(name);
    if (has !== on) { toggleCondition(holder, name); touched++; }
  }
  return touched;
}

export function showGroupCard() {
  const items = selection();
  if (items.length < 2 || isPlayerMode()) return hideGroupCard();

  const card = $('groupCard');
  const conds = allConditions();

  card.innerHTML = `
    <div class="tchead">
      <span class="gcount">${items.length}</span>
      <b>Selected</b>
      <button class="icobtn" data-gc="close" title="Clear the selection">
        <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>
    <div class="gcensus">${esc(census(items))}</div>
    <div class="gdots">${items.slice(0, 14).map(i =>
      `<span class="gdot" style="background:${safeColor(i.color)}" title="${esc(i.name || '')}"></span>`).join('')}
      ${items.length > 14 ? `<span class="gmore">+${items.length - 14}</span>` : ''}</div>

    <div class="tcrow">
      <span class="tclbl">Damage</span>
      <input type="number" min="0" class="tcdmg" data-gc-dmg placeholder="0">
      <button class="tcstep" data-gc="dmg" title="Apply to everything selected">✓</button>
    </div>

    <div class="tcrow">
      <span class="tclbl">Condition</span>
      <select data-gc-cond>
        ${conds.map(c => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('')}
      </select>
      <button class="tcstep" data-gc="cond-on" title="Put it on all of them">+</button>
      <button class="tcstep" data-gc="cond-off" title="Take it off all of them">−</button>
    </div>

    <div class="tcbtns">
      <button class="tbbtn tb-init" data-gc="init">Roll initiative</button>
    </div>
    <div class="tcbtns util">
      <button class="tbbtn tb-style" data-gc="clear">Clear conditions</button>
      <button class="tbbtn tb-atk" data-gc="delete">Delete</button>
    </div>`;

  /* Park it beside the selection rather than beside one token: the middle of
     what was dragged is where the pointer already is. */
  const boxes = items.map(itemBounds).filter(Boolean);
  const cx = boxes.reduce((n, b) => n + b.x + b.w / 2, 0) / (boxes.length || 1);
  const cy = boxes.reduce((n, b) => n + b.y + b.h / 2, 0) / (boxes.length || 1);
  anchorCardBeside(card, { x: cx, y: cy, size: 1 }, w2s(cx, cy), state.grid.size, state.cam.z);
  card.classList.add('on');

  card.onclick = e => {
    const a = e.target.closest('[data-gc]')?.dataset.gc;
    if (!a) return;
    const live = selection();

    if (a === 'close') {
      ui.sel.item = null; ui.sel.group = [];
      hideGroupCard(); requestDraw();
      return;
    }

    if (a === 'init') {
      rollSelectedIntoOrder();
      return;
    }

    if (a === 'dmg') {
      const input = card.querySelector('[data-gc-dmg]');
      const told = damageAll(live, input.value);
      if (!told?.length) return toast('Nothing there to damage');
      input.value = '';
      addMsg({ type: 'sys', text: `Damage: ${told.join(', ')}.`, time: now() });
      toast(`${told.length} took it`);
    }

    if (a === 'cond-on' || a === 'cond-off') {
      const name = card.querySelector('[data-gc-cond]').value;
      const n = conditionAll(live, name, a === 'cond-on');
      if (!n) return toast(`Nothing changed — they all ${a === 'cond-on' ? 'have' : 'lack'} ${name}`);
      addMsg({
        type: 'sys',
        text: `${name} ${a === 'cond-on' ? 'put on' : 'taken off'} ${n} token${n === 1 ? '' : 's'}.`,
        time: now(),
      });
    }

    if (a === 'clear') {
      let n = 0;
      for (const it of live) {
        const holder = charOf(it) || it;
        if (holder.conditions?.length) { holder.conditions = []; n++; }
      }
      if (!n) return toast('None of them had any');
      toast(`Cleared ${n}`);
    }

    if (a === 'delete') {
      const gone = new Set(live);
      state.items = state.items.filter(i => !gone.has(i));
      ui.sel.item = null; ui.sel.group = [];
      if (gone.has(ui.hover)) ui.hover = null;
      hideGroupCard(); requestDraw();
      toast(`${gone.size} deleted`);
      return;
    }

    for (const it of live) { const ch = charOf(it); if (ch) reconcile(ch); }
    requestDraw();
    showGroupCard();
  };
}
