/* The chat log, the Check20 roller and the raw dice buttons.

   Messages use the website's field names so they can be bridged to a room's
   chat later without translation:
     { type: 'roll', charName, label, total, mod, rollType, rollNote, conditions, time }
     { type: 'dice', charName, label, notation, total, faces, bonus, time }
     { type: 'msg',  charName, text, time }
     { type: 'sys',  text, time }
   Older saves used { kind, who, formula, detail }; those still render. */

import { state } from './state.js';
import { $, esc } from './dom.js';
import { linkTerms } from './glossary.js';
import { checkRoll, rollFormula } from './dice.js';
import { checkCard, diceCard, tableCard, noteCard, turnCard, roundCard } from './rollcards.js';
import { switchTab } from './tabs.js';
import { notifyMessage } from './notify.js';
import { isPlayerMode } from './session.js';

/* Something that wants a look at every posted message without chat having to
   know about it — the damage tables' auto-roll, for one. */
let postHook = () => { };
export const setPostHook = fn => { postHook = fn; };

export const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/* How much of the log is in the page at once. The rest is still in state and
   still saved; it is just not built into the DOM until asked for, because a
   campaign's worth of cards is thousands of elements nobody is looking at. */
const WINDOW = 150;

/** Build the log from the last `count` messages, with a way back to the rest. */
export function paintLog(count = WINDOW) {
  const log = $('chatlog');
  const all = state.chat;
  const shown = Math.min(count, all.length);
  const from = all.length - shown;

  log.innerHTML = '';
  if (from > 0) {
    const more = document.createElement('button');
    more.className = 'chatmore';
    more.type = 'button';
    more.textContent = `Show ${Math.min(WINDOW, from)} earlier of ${from}`;
    more.addEventListener('click', () => {
      paintLog(shown + WINDOW);
      log.scrollTop = 0;
    });
    log.appendChild(more);
  }
  for (let i = from; i < all.length; i++) log.appendChild(renderMsg(all[i], i));
  log.scrollTop = log.scrollHeight;
}

export function addMsg(m) {
  state.chat.push(m);
  const log = $('chatlog');
  log.appendChild(renderMsg(m, state.chat.length - 1));
  log.scrollTop = log.scrollHeight;
  // A roll you just made is worth seeing straight away.
  if (['roll', 'dice', 'table', 'note'].includes(m.type)) switchTab('chat');
  notifyMessage(m);
  postHook(m);
}

export function renderMsg(m, i = -1) {
  const d = document.createElement('div');
  const type = m.type || m.kind;
  d.className = 'msg' + (type === 'sys' ? ' sys' : '');

  if (m.type === 'turn') d.innerHTML = turnCard(m);
  else if (m.type === 'round') d.innerHTML = roundCard(m);
  else if (m.type === 'roll') d.innerHTML = checkCard(m);
  else if (m.type === 'dice') d.innerHTML = diceCard(m);
  else if (m.type === 'table') d.innerHTML = tableCard(m);
  else if (m.type === 'note') d.innerHTML = noteCard(m);
  else if (type === 'roll') d.innerHTML = legacyRoll(m);
  else if (type === 'sys') d.innerHTML = linkTerms(esc(m.text));
  else {
    /* The box takes several lines now, so the log has to keep them: a
       narrator's paragraph break is part of what they wrote. */
    d.innerHTML = `<span class="who">${esc(m.charName ?? m.who)}</span><span class="t">${esc(m.time || '')}</span><span class="msgtext">${linkTerms(esc(m.text))}</span>`;
  }

  /* The narrator can take a message back out of the log — a misfired roll, a
     handout sent to the wrong table. Players cannot: the log is the record.
     The index is the handle, which holds because a delete repaints the log
     and anything new is only ever appended. */
  if (i >= 0 && !isPlayerMode()) {
    const del = document.createElement('button');
    del.className = 'msgdel';
    del.type = 'button';
    del.title = 'Delete this message';
    del.dataset.msgdel = String(i);
    del.textContent = '×';
    d.appendChild(del);
  }
  return d;
}

/* The pre-card shape, kept so old chat logs still read. */
function legacyRoll(m) {
  const critCls = m.crit === 20 ? ' crit' : m.crit === 1 ? ' fumble' : '';
  return `<span class="who">${esc(m.who)}</span><span class="t">${esc(m.time || '')}</span>
    <div class="rollcard">
      <div class="formula">${linkTerms(esc(m.formula))}</div>
      <div class="dice">${esc(m.detail)}</div>
      <div class="total${critCls}">${m.total}</div>
    </div>`;
}

/**
 * Roll a Check20 check and post it.
 * @param {object} o
 * @param {string} o.charName  who is rolling
 * @param {string} o.label     what is being rolled, e.g. "Agility"
 * @param {number} o.mod       the full modifier
 * @param {string} [o.rollType]  'flat' | 'adv' | 'dis'
 * @param {string[]} [o.conditions]  conditions active at the moment of rolling
 * @param {boolean} [o.attack]  flags a miss as provokable
 * @param {{formula: string, type?: string}} [o.damage]  rolled alongside, on one card
 */
export function rollCheck(o) {
  const r = checkRoll(o.mod || 0, o.rollType || 'flat');
  let damage = null;
  if (o.damage?.formula) {
    const d = rollFormula(o.damage.formula);
    if (d) damage = { notation: d.notation, total: d.total, faces: d.faces, bonus: d.bonus, type: o.damage.type || '' };
  }
  const msg = {
    type: 'roll',
    charName: o.charName || '',
    label: o.label || 'Check',
    ...r,
    conditions: o.conditions?.length ? [...o.conditions] : undefined,
    attack: o.attack || undefined,
    damage: damage || undefined,
    note: o.note || undefined,      // the spell or feature's own words
    noOutcome: o.noOutcome || undefined,
    time: now(),
  };
  addMsg(msg);
  return msg;
}

/**
 * Send a piece of text to the table: a monster feature, a spell's effect, a
 * handout. Any formulas travel with it as buttons.
 * @param {{charName?: string, label?: string, text: string, tags?: string[], rolls?: string[]}} o
 */
export function postNote(o) {
  const msg = {
    type: 'note',
    charName: o.charName || '',
    label: o.label || '',
    /* `parts` is a note made of named pieces — a feature and each upgrade it
       carries. `text` is still there for everything that sends plain prose,
       and for logs saved before this existed. */
    parts: o.parts?.length ? o.parts.map(p => ({ label: p.label || '', text: String(p.text || '') })) : undefined,
    text: String(o.text || ''),
    tags: o.tags?.length ? [...o.tags] : undefined,
    rolls: o.rolls?.length ? [...o.rolls] : undefined,
    time: now(),
  };
  addMsg(msg);
  return msg;
}

/** Roll a raw NdM+K formula and post it. Returns null if it does not read. */
export function rollDice({ charName = '', label = '', formula }) {
  const r = rollFormula(formula);
  if (!r) {
    addMsg({ type: 'sys', text: `Could not read "${formula}". Try NdM+K, like 2d6+3.`, time: now() });
    return null;
  }
  const msg = {
    type: 'dice', charName, label: label || r.notation,
    notation: r.notation, total: r.total, faces: r.faces, bonus: r.bonus, crit: r.crit,
    time: now(),
  };
  addMsg(msg);
  return msg;
}

export function renderSpeakers() {
  const sel = $('speaker');
  const cur = sel.value;
  sel.innerHTML = '<option value="Narrator">Narrator</option>' +
    state.chars.filter(c => c.name).map(c => `<option>${esc(c.name)}</option>`).join('');
  if ([...sel.options].some(o => o.value === cur)) sel.value = cur;
}

export function initChat() {
  // Formulas sent over with a note stay rollable in the log.
  $('chatlog').addEventListener('click', e => {
    const del = e.target.closest('[data-msgdel]');
    if (del) {
      const i = +del.dataset.msgdel;
      if (Number.isInteger(i) && i >= 0 && i < state.chat.length) {
        state.chat.splice(i, 1);
        paintLog();
      }
      return;
    }
    const b = e.target.closest('[data-noteroll]');
    if (!b) return;
    rollDice({ charName: b.dataset.who || '', label: b.dataset.lbl || 'Effect', formula: b.dataset.noteroll });
  });

  const speaker = () => $('speaker').value;

  /* Enter sends, Shift+Enter is a new line — the box holds several now, and a
     narrator reading out a paragraph should not have to send it in pieces. */
  $('chatInput').addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    const v = this.value.trim(); if (!v) return;
    this.value = '';
    let m;
    if (m = v.match(/^\/(c|check)\s+([+-]?\d+)\s*(adv|dis)?/i)) {
      const mod = +m[2];
      rollCheck({ charName: speaker(), label: `Check ${mod >= 0 ? '+' : ''}${mod}`, mod, rollType: m[3] ? m[3].toLowerCase() : 'flat' });
    } else if (m = v.match(/^\/(r|roll)\s+(.+)/i)) {
      rollDice({ charName: speaker(), formula: m[2] });
    } else {
      addMsg({ type: 'msg', charName: speaker(), text: v, time: now() });
    }
  });

  /* The dice tray is shut until asked for. */
  $('diceToggle').addEventListener('click', () => {
    const tools = $('chatTools');
    const open = tools.hidden;
    tools.hidden = !open;
    $('diceToggle').setAttribute('aria-expanded', String(open));
  });

  $('dicebtns').addEventListener('click', e => {
    const b = e.target.closest('[data-d]'); if (!b) return;
    rollDice({ charName: speaker(), label: 'd' + b.dataset.d, formula: '1d' + b.dataset.d });
  });

  $('modUp').onclick = () => { const i = $('checkMod'); i.value = +i.value + 1; };
  $('modDown').onclick = () => { const i = $('checkMod'); i.value = +i.value - 1; };
  $('rollCheckBtn').onclick = () => {
    const mod = +$('checkMod').value || 0;
    rollCheck({ charName: speaker(), label: `Check ${mod >= 0 ? '+' : ''}${mod}`, mod, rollType: $('checkAdv').value });
  };
}
