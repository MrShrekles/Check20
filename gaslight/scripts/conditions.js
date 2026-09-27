/* Check20 conditions, and the checks each one drags to Disadvantage.

   The names and effects come from data/conditions.json at runtime; the
   disadvantage table is rules knowledge that lives in code, lifted from
   active-sheet.js so the two agree. */

import { get } from './data.js';
import { CHECK_KEYS } from './character.js';

const PHYSICAL = ['agi', 'cra', 'ste', 'str', 'sur'];
const MENTAL = ['inf', 'int', 'lck', 'obs', 'spi'];

/** Condition name -> the check keys it penalises, or 'all'. */
export const CONDITION_DISADVANTAGE = {
  Broken: PHYSICAL,
  Dislocation: PHYSICAL,
  Concussion: MENTAL,
  Coughing: MENTAL,
  Charmed: MENTAL,
  Confused: MENTAL,
  Deaf: ['ste', 'spi'],
  Blind: 'all',
  Exhaustion: 'all',
  Exhausted: 'all',
  Stunned: 'all',
  Pinned: 'all',
};

/** Conditions serious enough to flag differently in the roster. */
export const MAJOR = new Set(['Death', 'Injured', 'Unconscious', 'Exhaustion', 'Exhausted', 'Stunned', 'Constrained', 'Exposed']);

export const allConditions = () => get('conditions') || [];

/* ---- categories and their colours ----

   The four categories come from data/conditions.json, not from a list here,
   so adding a condition to the data is enough. The colours are the table's
   shorthand: what kind of trouble is this?

     Corpus     red      the body
     Cognition  blue     the mind
     Special    yellow   states like Intangible and Invisible
     Major      black    the ones that end a turn or a character

   Ink is the pip's outline, which keeps a black pip visible on a dark map. */

export const CONDITION_CATEGORIES = ['Corpus', 'Cognition', 'Special', 'Major'];

const CATEGORY_STYLE = {
  Corpus:    { fill: '#c0392b', ink: 'rgba(8,10,12,.75)' },
  Cognition: { fill: '#3d7ea6', ink: 'rgba(8,10,12,.75)' },
  Special:   { fill: '#c9a227', ink: 'rgba(8,10,12,.75)' },
  Major:     { fill: '#111418', ink: 'rgba(225,215,195,.85)' },
};

/** The category a condition belongs to, from the data. Major wins if the
    data has not been loaded yet, since MAJOR is known without it. */
export function conditionCategory(name) {
  const c = conditionInfo(name);
  if (c?.category && CATEGORY_STYLE[c.category]) return c.category;
  return MAJOR.has(name) ? 'Major' : 'Corpus';
}

export const conditionStyle = name => CATEGORY_STYLE[conditionCategory(name)];
export const conditionColor = name => conditionStyle(name).fill;

/** Conditions grouped into the four categories, in category order. */
export function byCategory(list) {
  const out = new Map(CONDITION_CATEGORIES.map(c => [c, []]));
  for (const c of list) {
    const cat = CATEGORY_STYLE[c.category] ? c.category : conditionCategory(c.name);
    out.get(cat).push(c);
  }
  for (const [k, v] of out) if (!v.length) out.delete(k);
  return out;
}


export function conditionInfo(name) {
  return allConditions().find(c => c.name === name) || null;
}

/** Conditions grouped by category, in the order the data lists them. */
export function grouped() {
  const out = new Map();
  for (const c of allConditions()) {
    if (!out.has(c.category)) out.set(c.category, []);
    out.get(c.category).push(c);
  }
  return out;
}

/** The first active condition that penalises this check, or null. */
export function disadvantageFor(ch, checkKey) {
  for (const name of ch.conditions || []) {
    const rule = CONDITION_DISADVANTAGE[name];
    if (!rule) continue;
    if (rule === 'all' || rule.includes(checkKey)) return name;
  }
  return null;
}

/** Every check key currently at Disadvantage, as a Set. */
export function disadvantagedKeys(ch) {
  const out = new Set();
  for (const k of CHECK_KEYS) if (disadvantageFor(ch, k)) out.add(k);
  return out;
}

export function hasCondition(ch, name) {
  return (ch.conditions || []).includes(name);
}

export function toggleCondition(ch, name) {
  ch.conditions ||= [];
  const i = ch.conditions.indexOf(name);
  if (i >= 0) ch.conditions.splice(i, 1);
  else ch.conditions.push(name);
  return ch.conditions.includes(name);
}

/* ---- picking conditions from a token ----

   Both cards need the same thing: the conditions already on something, and a
   way to search the rest. The holder is either a character (conditions on the
   sheet) or a plain item (conditions on the token), so this works on anything
   with a `conditions` array. */

/** Conditions whose name or effect text matches a query, newest data order. */
export function searchConditions(q) {
  const term = String(q || '').trim().toLowerCase();
  const all = allConditions();
  if (!term) return all;
  return all.filter(c =>
    String(c.name || '').toLowerCase().includes(term) ||
    String(c.effect || c.description || '').toLowerCase().includes(term));
}

/** The markup for the picker: what is on now, then a search and its results. */
export function conditionPickerHTML(holder, query = '', open = false) {
  const on = holder.conditions || [];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const pips = on.length
    ? on.map(c => `<button class="cpip cat-${conditionCategory(c).toLowerCase()}" data-cond-off="${esc(c)}"
        title="${esc(conditionInfo(c)?.effect || c)} — click to remove">${esc(c)} ×</button>`).join('')
    : '<span class="cnone">None</span>';

  if (!open) {
    return `<div class="condbox">
      <div class="condrow">${pips}</div>
      <button class="tbbtn condadd" data-cond-open="1">+ Condition</button>
    </div>`;
  }

  /* Grouped by category so the list reads as the four kinds of trouble rather
     than one alphabet. A search narrows within the groups. */
  const hits = searchConditions(query);
  const groups = byCategory(hits);
  const list = hits.length
    ? [...groups].map(([cat, items]) => `
        <div class="condcat cat-${cat.toLowerCase()}">
          <span class="condcatdot"></span>${esc(cat)}
        </div>
        <div class="condhits">${items.map(c => `<button
          class="condhit cat-${cat.toLowerCase()}${on.includes(c.name) ? ' on' : ''}"
          data-cond-on="${esc(c.name)}"
          title="${esc(c.effect || c.description || '')}">${esc(c.name)}</button>`).join('')}</div>`).join('')
    : '<span class="cnone">Nothing matches</span>';

  return `<div class="condbox">
    <div class="condrow">${pips}</div>
    <div class="condsearch">
      <input type="text" data-cond-q placeholder="Search conditions" value="${esc(query)}" autocomplete="off">
      <button class="icobtn" data-cond-close="1" title="Done">
        <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>
    <div class="condlist">${list}</div>
  </div>`;
}

/** Wire a rendered picker. `onChange` runs after anything is toggled. */
export function wireConditionPicker(root, holder, state, onChange) {
  root.querySelectorAll('[data-cond-off]').forEach(b =>
    b.addEventListener('click', () => {
      toggleCondition(holder, b.dataset.condOff);
      onChange();
    }));
  root.querySelectorAll('[data-cond-on]').forEach(b =>
    b.addEventListener('click', () => {
      toggleCondition(holder, b.dataset.condOn);
      onChange();
    }));
  const open = root.querySelector('[data-cond-open]');
  if (open) open.addEventListener('click', () => { state.open = true; onChange(); });
  const close = root.querySelector('[data-cond-close]');
  if (close) close.addEventListener('click', () => { state.open = false; state.query = ''; onChange(); });
  const q = root.querySelector('[data-cond-q]');
  if (q) {
    q.addEventListener('input', () => { state.query = q.value; onChange(); });
    // The card re-renders on every keystroke, so put the caret back.
    q.focus();
    q.setSelectionRange(q.value.length, q.value.length);
  }
}
