/* The card for a monster's token.

   A character's token has the sheet behind it; a monster's has the book. This
   card is the bit of the book you need with the token in front of you: what it
   has taken, what it can do, and a way into the full stat block.

   Wounds are per token, the way a narrator runs them at the table: give this
   one 12 and the next one 8, or give neither a number and just keep a tally.
   The book writes no wounds for monsters, so nothing is assumed here. */

import { state } from './state.js';
import { $, esc, safeColor, toast } from './dom.js';
import { requestDraw, anchorCardBeside } from './view.js';
import { w2s } from './geometry.js';
import { rollCheck } from './chat.js';
import { askRoll } from './rolltray.js';
import {
  allMonsters, monsterPL, monsterCheck, monsterDamage, attackCheck, cleanType,
  ensureMonsterData, setPL, setCheck,
} from './monsters.js';
import { showMonster } from './narrator.js';
import { isPlayerMode } from './session.js';
import { conditionPickerHTML, wireConditionPicker } from './conditions.js';
import { showPopFor } from './props.js';
import { addCombatant, renderInit } from './initiative.js';
import { d20 } from './dice.js';
import { revealWin } from './dock.js';

let tokenItem = null;
/* The picker's own transient state: whether the search is open and what is
   typed in it. Not saved — the conditions themselves are. */
const condUI = { open: false, query: '' };

/** The book entry a monster token came from, if the book is loaded. */
export const monsterFor = it =>
  it?.monster ? allMonsters().find(m => m.name === it.monster) || null : null;

export function hideMonsterCard() {
  $('monsterCard').classList.remove('on');
  tokenItem = null;
}

export function refreshMonsterCard() {
  if (tokenItem) showMonsterCard(tokenItem);
}

const SLOTS = [['melee_attack', 'Melee'], ['ranged_attack', 'Ranged'], ['spell', 'Spell']];

export function showMonsterCard(it) {
  // The book is the narrator's. A player never opens it; a narrator checking
  // player view is told why nothing happened, rather than thinking it broke.
  if (isPlayerMode()) return hideMonsterCard();
  if (state.playerView) {
    toast('Player view: monster cards are hidden');
    return hideMonsterCard();
  }

  const m = monsterFor(it);
  // The book is loaded lazily by the narrator rail, so after a reload a monster
  // token has nothing to read and the card would silently refuse to open.
  // Fetch the book, then open once it is there. `monsterFor` guards the retry,
  // so a token naming a monster the book does not have still just closes.
  if (!m) {
    if (it?.monster) {
      ensureMonsterData()
        .then(() => { if (monsterFor(it)) showMonsterCard(it); })
        .catch(() => { toast('The monster book could not be loaded'); });
    }
    return hideMonsterCard();
  }
  tokenItem = it;
  it.taken ||= 0;

  const card = $('monsterCard');
  const pl = monsterPL(m);
  const attacks = SLOTS.filter(([slot]) => m[slot]?.name);

  card.innerHTML = `
    <div class="tchead">
      <span class="rdot" style="background:${safeColor(it.color)}"></span>
      <b class="tcname" data-mc-name contenteditable="true" spellcheck="false"
        title="Click to rename this token">${esc(it.name || m.name)}</b>
      <span class="mcpl">PL ${pl}</span>
      <button class="icobtn" data-mc="close" title="Close">
        <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>
    <div class="tcrow">
      <span class="tclbl">Armor</span>
      <button class="tcstep" data-mc="ar-" title="−1">−</button>
      <span class="tcval">${it.armor || 0}</span>
      <button class="tcstep" data-mc="ar+" title="+1">+</button>
    </div>
    <div class="tcrow">
      <span class="tclbl">Wounds</span>
      <button class="tcstep" data-mc="dmg-" title="${it.hpMax ? 'Take 1 wound' : 'Undo 1 taken'}">−</button>
      <span class="tcval${it.hpMax && it.taken >= it.hpMax ? ' out' : ''}">${it.hpMax ? `${Math.max(0, it.hpMax - it.taken)}/${it.hpMax}` : it.taken}</span>
      <button class="tcstep" data-mc="dmg+" title="${it.hpMax ? 'Heal 1' : 'Take 1 wound'}">+</button>
      <input type="number" min="0" class="tcmax" data-mc-max placeholder="max"
        value="${it.hpMax || ''}" title="Wounds this one has. Leave it empty to keep a tally instead.">
    </div>
    <div class="tcrow">
      <span class="tclbl">Damage</span>
      <input type="number" min="0" class="tcdmg" data-mc-dmg placeholder="0">
      <button class="tcstep" data-mc="dmg" title="Add to what it has taken">✓</button>
    </div>
    <div class="tcrow">
      <span class="tclbl">Power</span>
      <button class="tcstep" data-mc="pl-" title="Drop a power level">−</button>
      <span class="tcval">PL ${pl}</span>
      <button class="tcstep" data-mc="pl+" title="Raise a power level">+</button>
    </div>
    <div class="mcchecks">
      <span>Physical
        <button class="tcstep sm" data-mc="ph-" title="−1">−</button>
        <b>${monsterCheck(m, 'check_physical')}</b>
        <button class="tcstep sm" data-mc="ph+" title="+1">+</button>
      </span>
      <span>Mental
        <button class="tcstep sm" data-mc="me-" title="−1">−</button>
        <b>${monsterCheck(m, 'check_mental')}</b>
        <button class="tcstep sm" data-mc="me+" title="+1">+</button>
      </span>
    </div>
    ${conditionPickerHTML(it, condUI.query, condUI.open)}
    ${attacks.length ? `<div class="tcbtns">
      ${attacks.map(([slot, label]) =>
        `<button class="tbbtn tb-atk" data-mc="atk:${slot}">${esc(m[slot].name || label)}</button>`).join('')}
    </div>` : ''}
    <div class="tcbtns util">
      <button class="tbbtn tb-init" data-mc="init">Initiative</button>
      <button class="tbbtn tb-book" data-mc="book">Stat block</button>
      <button class="tbbtn tb-style" data-mc="mark" title="Mark, colour and size">Style</button>
    </div>`;

  anchorCardBeside(card, it, w2s(it.x, it.y), state.grid.size, state.cam.z);
  card.classList.add('on');

  // Conditions live on the token itself: two Brutes take their own.
  it.conditions ||= [];
  wireConditionPicker(card, it, condUI, () => { requestDraw(); refreshMonsterCard(); });

  /* Rename in place. The card is rebuilt on every change, so committing on
     blur rather than on input keeps the caret where the narrator put it. */
  const nameEl = card.querySelector('[data-mc-name]');
  nameEl.addEventListener('blur', () => {
    const v = nameEl.textContent.trim();
    it.name = v || m.name;
    requestDraw();
    refreshMonsterCard();
  });
  nameEl.addEventListener('keydown', ev => {
    if (ev.key === 'Enter') { ev.preventDefault(); nameEl.blur(); }
    if (ev.key === 'Escape') { nameEl.textContent = it.name || m.name; nameEl.blur(); }
  });

  card.querySelector('[data-mc-max]').addEventListener('change', e => {
    const n = Math.max(0, Math.round(+e.target.value || 0));
    if (n) it.hpMax = n; else delete it.hpMax;
    requestDraw();
    refreshMonsterCard();
  });

  card.onclick = e => {
    const a = e.target.closest('[data-mc]')?.dataset.mc;
    if (!a) return;
    if (a === 'close') return hideMonsterCard();
    if (a === 'book') { hideMonsterCard(); return showMonster(m.name); }

    // Six identical Brutes are the reason marks exist, and the property panel
    // is the only place that sets one. This is the way in from the card.
    if (a === 'mark') {
      hideMonsterCard();
      return showPopFor(it);
    }

    /* Power level and the two checks, tuned from the token. The same setters
       the book's panel uses, so a change here shows there and saves with the
       table. Physical and Mental share the power level as one budget, so
       moving one moves the other. */
    if (a === 'pl-' || a === 'pl+') {
      setPL(m, pl + (a === 'pl+' ? 1 : -1));
      requestDraw();
      return refreshMonsterCard();
    }
    if (a === 'ph-' || a === 'ph+') {
      setCheck(m, 'check_physical', monsterCheck(m, 'check_physical') + (a === 'ph+' ? 1 : -1));
      return refreshMonsterCard();
    }
    if (a === 'me-' || a === 'me+') {
      setCheck(m, 'check_mental', monsterCheck(m, 'check_mental') + (a === 'me+' ? 1 : -1));
      return refreshMonsterCard();
    }

    if (a === 'init') {
      const roll = d20() + monsterCheck(m, 'check_physical');
      addCombatant(it.name || m.name, roll, { itemId: it.id });
      renderInit();
      revealWin('init');
      return;
    }

    if (a.startsWith('atk:')) {
      const slot = a.slice(4);
      const atk = m[slot];
      const formula = monsterDamage(m, slot);
      const type = cleanType(atk.damage_type);
      return askRoll({
        charName: it.name || m.name,
        label: `${atk.name}${pl !== (m.pl || 0) ? ` · PL ${pl}` : ''}`,
        mod: monsterCheck(m, attackCheck(m, slot)),
        attack: true,
        damage: { formula: formula || '', type },
        note: atk.effect || atk.description || '',
      }, { desc: atk.effect || atk.description || '' }, rollCheck);
    }

    /* The steppers move the number on the card, not the hidden tally behind
       it. With a ceiling the card reads what is LEFT, so − wounds it and +
       heals it; with no ceiling it reads what it has TAKEN, so they swap. */
    if (a === 'dmg-') it.taken = it.hpMax ? Math.min(it.hpMax, it.taken + 1) : Math.max(0, it.taken - 1);
    if (a === 'dmg+') it.taken = it.hpMax ? Math.max(0, it.taken - 1) : it.taken + 1;
    if (a === 'ar-') it.armor = Math.max(0, (it.armor || 0) - 1);
    if (a === 'ar+') it.armor = (it.armor || 0) + 1;
    if (a === 'dmg') {
      const input = card.querySelector('[data-mc-dmg]');
      const n = Math.max(0, Math.round(+input.value || 0));
      if (!n) return;
      it.taken += n;
      input.value = '';
    }
    requestDraw();
    refreshMonsterCard();
  };
}
