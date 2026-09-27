/* The monster book: 99 written monsters from data/monsterbook.json.

   Monster text is written against the creature's power level, so a feature
   reads "Has additional [[5 * PL]] armor". resolvePL() works those out for the
   monster in hand, leaving dice alone: "[[1d6 + PL]]" at PL 4 becomes
   "1d6 + 4", which the dice roller can still read.

   Pinned monsters live in state.narrator.monsterBook, and any power level the
   narrator has nudged in state.narrator.plOverrides, so both a shortlist and
   the night's tuning are saved with the table. */

import { esc, toast, safeColor, sendButton } from './dom.js';
import { get, load } from './data.js';
import { state, id, activeLayer } from './state.js';
import { view, requestDraw } from './view.js';
import { s2w, snapCenter } from './geometry.js';
import { computeLight } from './lighting.js';
import { rollCheck, rollDice, postNote } from './chat.js';
import { originColor } from './origins.js';

let search = '';
let filters = { group: '', pl: '', env: '' };
// Each tab remembers what it had open, so browsing does not shut your book.
let expanded = { book: null, browse: null };
let showing = 'book';        // 'book' (pinned) or 'browse' (everything)
let onChanged = () => { };

export function initMonsters(changedCallback) { onChanged = changedCallback; }
export const ensureMonsterData = () => load('monsterbook');
export const allMonsters = () => get('monsterbook') || [];

/**
 * Open the book at one monster and return the tab it is on. Pinned monsters
 * are shown in the book; anything else is searched for in Browse.
 * @returns {'book'|'browse'}
 */
export function focusMonster(name) {
  if (isPinned(name)) {
    expanded.book = name;
    return 'book';
  }
  search = name;
  filters = { group: '', pl: '', env: '' };
  expanded.browse = name;
  return 'browse';
}

export function resetMonsterBrowser() {
  search = '';
  filters = { group: '', pl: '', env: '' };
  expanded = { book: null, browse: null };
}

/* ---- power level maths ---- */

/** Evaluate + - * / and parentheses over numbers and PL. No eval(). */
function evalExpr(src, pl) {
  const tokens = String(src).match(/\d+(?:\.\d+)?|PL|[+\-*/()]/gi);
  if (!tokens) return null;
  let i = 0;
  const peek = () => tokens[i];
  const take = () => tokens[i++];

  const primary = () => {
    const t = take();
    if (t === '(') { const v = expr(); if (peek() === ')') take(); return v; }
    if (t === '-') { const v = primary(); return v === null ? null : -v; }
    if (/^PL$/i.test(t)) return pl;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };
  const term = () => {
    let v = primary();
    while (v !== null && (peek() === '*' || peek() === '/')) {
      const op = take(); const r = primary();
      if (r === null) return null;
      v = op === '*' ? v * r : (r === 0 ? null : v / r);
    }
    return v;
  };
  const expr = () => {
    let v = term();
    while (v !== null && (peek() === '+' || peek() === '-')) {
      const op = take(); const r = term();
      if (r === null) return null;
      v = op === '+' ? v + r : v - r;
    }
    return v;
  };
  const value = expr();
  return i === tokens.length && value !== null ? Math.round(value * 100) / 100 : null;
}

/**
 * Replace [[...]] in monster text for a given power level.
 * Dice keep their notation with PL filled in; everything else becomes a number.
 */
export function resolvePL(text, pl = 0) {
  return String(text ?? '').replace(/\[\[(.*?)\]\]/g, (_, raw) => {
    const body = raw.trim();
    if (/\d*d\d+/i.test(body)) {
      // A dice formula: substitute PL, leave the dice for the roller.
      return body.replace(/\bPL\b/gi, pl).replace(/\s+/g, ' ').trim();
    }
    const n = evalExpr(body, pl);
    return n === null ? body : String(n);
  });
}

/** The book writes damage types with an emoji in front; strip it for display. */
export const cleanType = v => String(v ?? '').replace(/[^\x20-\x7E]/g, '').trim();

/** A dice formula inside monster text, ready to roll. */
export function monsterFormulas(text, pl = 0) {
  return [...String(text ?? '').matchAll(/\[\[(.*?)\]\]/g)]
    .map(m => m[1].replace(/\bPL\b/gi, pl).replace(/\s+/g, ''))
    .filter(f => /^\d*d\d+!?([+-]\d+)*$/i.test(f));
}

/* ---- the narrator's pinned shortlist ---- */

function narratorState() {
  const n = state.narrator ||= {};
  n.monsterBook ||= [];
  n.tweaks ||= {};
  // Tables saved with the first cut of this feature kept PL on its own.
  if (n.plOverrides) {
    for (const [name, pl] of Object.entries(n.plOverrides)) (n.tweaks[name] ||= {}).pl = pl;
    delete n.plOverrides;
  }
  return n;
}
const bookList = () => narratorState().monsterBook ||= [];
export const isPinned = name => bookList().includes(name);

/* ---- the monster as it is being run tonight ----

   The book is a starting point, not the last word. A narrator can move the
   power level, a check or a damage formula mid-fight; the changes are kept per
   monster in state.narrator.tweaks, so they save with the table.

   Checks are adaptive: they follow the power level one for one — the book's
   Ironhide Brute is PL 6 with Physical 6, so at PL 13 it rolls Physical 13 —
   right up until the narrator types a number, which then stands on its own.
   Set a check back to what the PL implies and it follows along again. */

const tweaks = () => narratorState().tweaks;
const tweakOf = m => tweaks()[m.name];

function setTweak(m, key, value) {
  const t = tweaks()[m.name] ||= {};
  if (value === null) delete t[key];
  else t[key] = value;
  if (!Object.keys(t).length) delete tweaks()[m.name];
}

export const monsterTweaked = m => !!tweakOf(m);

export function resetMonster(m) {
  delete tweaks()[m.name];
  onChanged();
}

/** The power level in play: what the narrator set, or what the book says. */
export function monsterPL(m) {
  const v = tweakOf(m)?.pl;
  return Number.isFinite(v) ? v : (m.pl || 0);
}

export const plAdjusted = m => monsterPL(m) !== (m.pl || 0);

/* Physical and Mental are two halves of one budget, and the budget is PL:
   97 of the 99 written monsters have check_physical + check_mental === pl.
   (Skeleton and Ice Elemental are written at twice their PL; the book as
   written is shown until something is adjusted, and the pair is balanced from
   then on.)

   So moving PL moves both halves, keeping the monster's own leaning, and
   setting one half spends from the other. Only Physical is stored; Mental is
   whatever is left of the budget. */
function derivedChecks(m) {
  const pl = monsterPL(m);
  const ph = m.check_physical ?? 0;
  const me = m.check_mental ?? 0;
  if (pl === (m.pl || 0)) return { check_physical: ph, check_mental: me };   // the book as written
  const sum = ph + me;
  const phys = sum > 0 ? Math.round(ph / sum * pl) : pl;
  return { check_physical: phys, check_mental: Math.max(0, pl - phys) };
}

/** Both checks in play, always adding up to the power level once touched. */
export function monsterChecks(m) {
  const set = tweakOf(m)?.check_physical;
  if (!Number.isFinite(set)) return derivedChecks(m);
  const pl = monsterPL(m);
  const phys = Math.max(0, Math.min(pl, set));
  return { check_physical: phys, check_mental: pl - phys };
}

export const monsterCheck = (m, key) => monsterChecks(m)[key];

export const checkAdjusted = (m, key) => monsterCheck(m, key) !== (m[key] ?? 0);

/* ---- attacks ----
   Every attack rolls against one of the two checks. Melee and ranged go with
   Physical and spells with Mental unless the narrator says otherwise. */

const SLOT_CHECK = { melee_attack: 'check_physical', ranged_attack: 'check_physical', spell: 'check_mental' };

/** Which check an attack slot rolls against. */
export function attackCheck(m, slot) {
  const v = tweakOf(m)?.[`${slot}_check`];
  return v === 'check_physical' || v === 'check_mental' ? v : (SLOT_CHECK[slot] || 'check_physical');
}

/** The damage formula in play for an attack slot. */
export function monsterDamage(m, slot) {
  const v = tweakOf(m)?.[`${slot}_damage`];
  return typeof v === 'string' ? v : String(m[slot]?.damage || '');
}

export const damageAdjusted = (m, slot) => monsterDamage(m, slot) !== String(m[slot]?.damage || '');

export function setPL(m, pl) {
  const next = Math.max(0, Math.min(40, Math.round(pl)));
  setTweak(m, 'pl', next === (m.pl || 0) ? null : next);
  onChanged();
}

/* Setting either half sets the split. Back on the derived split, the monster
   goes back to following its power level. */
export function setCheck(m, key, value) {
  const pl = monsterPL(m);
  const want = Math.max(0, Math.min(pl, Math.round(value || 0)));
  const phys = key === 'check_physical' ? want : pl - want;
  setTweak(m, 'check_physical', phys === derivedChecks(m).check_physical ? null : phys);
}

function setAttackCheck(m, slot, key) {
  setTweak(m, `${slot}_check`, key === (SLOT_CHECK[slot] || 'check_physical') ? null : key);
}

function setDamage(m, slot, text) {
  const v = String(text || '').trim();
  setTweak(m, `${slot}_damage`, !v || v === String(m[slot]?.damage || '') ? null : v);
}

function togglePin(name) {
  const book = bookList();
  const i = book.indexOf(name);
  if (i >= 0) book.splice(i, 1);
  else { book.push(name); toast(`${name} pinned to your book`); }
  onChanged();
}

/* ---- filters ---- */

const tidy = s => String(s || '').trim();
const envOf = m => tidy(m.environment);
const envKey = m => envOf(m).toLowerCase();

const PL_BANDS = [['1-3', 1, 3], ['4-6', 4, 6], ['7-10', 7, 10], ['11-99', 11, 99]];

function matches(m) {
  const q = search.trim().toLowerCase();
  if (filters.group && m._group !== filters.group) return false;
  if (filters.env && envKey(m) !== filters.env) return false;
  if (filters.pl) {
    const band = PL_BANDS.find(b => b[0] === filters.pl);
    const pl = monsterPL(m);
    if (band && !(pl >= band[1] && pl <= band[2])) return false;
  }
  if (!q) return true;
  return [m.name, m._group, envOf(m), m.origin, m.behavior]
    .some(v => String(v || '').toLowerCase().includes(q));
}

/* ---- panel ---- */

export const monsterTabs = () => [
  ['book', `Book<b>${bookList().length}</b>`],
  ['browse', `Browse<b>${allMonsters().length || ''}</b>`],
];

export function renderMonstersPanel(tab = 'book') {
  showing = tab;
  const frag = document.createDocumentFragment();
  if (!get('monsterbook')) {
    const el = document.createElement('div');
    el.className = 'sempty';
    el.textContent = 'Loading the monster book…';
    frag.appendChild(el);
    ensureMonsterData().then(onChanged).catch(() => { el.textContent = 'The monster book could not be loaded.'; });
    return frag;
  }
  frag.appendChild(tab === 'browse' ? browseBlock() : pinnedBlock());
  return frag;
}

function pinnedBlock() {
  const wrap = document.createElement('div');
  const pinned = bookList().map(n => allMonsters().find(m => m.name === n)).filter(Boolean);
  if (!pinned.length) {
    wrap.className = 'sempty';
    wrap.textContent = 'Nothing pinned yet. Find monsters in Browse and pin the ones you need tonight.';
    return wrap;
  }
  pinned.forEach(m => wrap.appendChild(monsterCard(m, { open: m.name === expanded.book, collapsible: true })));
  return wrap;
}

function browseBlock() {
  const wrap = document.createElement('div');
  const all = allMonsters();
  const groups = [...new Set(all.map(m => m._group).filter(Boolean))].sort();
  const envs = [...new Map(all.filter(m => envOf(m)).map(m => [envKey(m), envOf(m)])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1]));

  const controls = document.createElement('div');
  controls.className = 'monfilters';
  controls.innerHTML = `
    <input class="gearsearch" placeholder="Search name, group, environment" value="${esc(search)}">
    <div class="monselects">
      <select data-f="group">
        <option value="">All groups</option>
        ${groups.map(g => `<option${g === filters.group ? ' selected' : ''}>${esc(g)}</option>`).join('')}
      </select>
      <select data-f="pl">
        <option value="">Any PL</option>
        ${PL_BANDS.map(([k]) => `<option value="${k}"${k === filters.pl ? ' selected' : ''}>PL ${k.replace('-99', '+')}</option>`).join('')}
      </select>
      <select data-f="env">
        <option value="">Anywhere</option>
        ${envs.map(([k, label]) => `<option value="${esc(k)}"${k === filters.env ? ' selected' : ''}>${esc(label)}</option>`).join('')}
      </select>
    </div>`;
  wrap.appendChild(controls);

  const count = document.createElement('div');
  count.className = 'moncount';
  wrap.appendChild(count);

  const results = document.createElement('div');
  wrap.appendChild(results);

  const draw = () => {
    const hits = all.filter(matches);
    count.textContent = `${hits.length} of ${all.length}`;
    results.innerHTML = '';
    if (!hits.length) {
      results.innerHTML = '<div class="sempty" style="padding:14px 0">Nothing matches.</div>';
      return;
    }
    for (const m of hits) results.appendChild(monsterCard(m, { open: m.name === expanded.browse, collapsible: true }));
  };

  controls.querySelector('input').addEventListener('input', e => { search = e.target.value; draw(); });
  controls.querySelectorAll('[data-f]').forEach(sel => sel.addEventListener('change', e => {
    filters[sel.dataset.f] = e.target.value;
    draw();
  }));
  draw();
  return wrap;
}

/* ---- onto the map ----
   A monster token is a plain token that remembers which monster it came from,
   so a second one is numbered rather than named the same. Size follows the
   book: a Giant takes three squares, a Tiny one takes half. */

const TOKEN_SIZE = { tiny: .5, small: 1, medium: 1, large: 2, giant: 3 };

/** Called with a freshly placed monster token. main.js points this at the
    property panel; nothing here needs to know that. */
let placedHook = null;
export const setTokenPlacedHook = fn => { placedHook = fn; };

/* Six Ironhide Brutes in one origin colour are six identical circles. Each
   copy after the first is nudged along in lightness so they read apart at a
   glance, before anyone renames or marks them. */
function shadeFor(hex, n) {
  if (!n) return hex;
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return hex;
  const v = parseInt(m[1], 16);
  // Alternate lighter and darker so a big group stays inside a usable range.
  const step = (n % 2 ? 1 : -1) * Math.ceil(n / 2) * 22;
  const ch = i => {
    const c = (v >> (16 - i * 8)) & 255;
    return Math.max(24, Math.min(231, c + step));
  };
  return '#' + [0, 1, 2].map(i => ch(i).toString(16).padStart(2, '0')).join('');
}

function placeMonsterToken(m) {
  const layer = state.layers.find(l => l.type === 'token') || activeLayer();
  if (!layer) return toast('There is no layer to put it on');
  const centre = s2w(view.W / 2, view.H / 2);
  const p = snapCenter(centre.x, centre.y);
  const already = state.items.filter(i => i.monster === m.name).length;
  const name = already ? `${m.name} ${already + 1}` : m.name;

  /* Wounds come from the power level: PL x PL is the book's ceiling. A monster
     written with more than that is the narrator's call, so the card's max field
     stays editable and a tweaked PL does not silently rewrite a fight already
     under way. */
  const pl = monsterPL(m);

  state.items.push({
    id: id(), layerId: layer.id, kind: 'token',
    monster: m.name, pl,
    hpMax: pl * pl, taken: 0,
    x: p.x, y: p.y,
    size: TOKEN_SIZE[String(m.size || '').toLowerCase()] || 1,
    color: shadeFor(originColor(m.origin), already),
    name,
  });
  const placed = state.items[state.items.length - 1];
  computeLight();
  requestDraw();
  toast(`${name} placed · ${pl * pl} wounds`);
  // Straight into the panel: the name and colour are what a narrator wants to
  // change the moment a second Brute lands on the map. A hook rather than an
  // import, because props.js reaches this module through narrator.js and the
  // dependencies here run one way.
  placedHook?.(placed);
}

/* ---- one monster ---- */

/* Anything written on a monster can be put in front of the table: a feature,
   a spell's effect, a scrap of description. The text goes over resolved for
   the power level in play, with its formulas still rollable. */
const sendBtn = title => sendButton(title);

function wireSend(el, note) {
  el.querySelector('[data-send]')?.addEventListener('click', e => {
    e.stopPropagation();
    postNote(note());
  });
}

const MOVES = [['walk', 'Walk'], ['fly', 'Fly'], ['swim', 'Swim'], ['climb', 'Climb']];

/* A check you can type into. It shows the number in play; the written one is
   in the tooltip. Edits are taken on change, not on every keystroke, so the
   card is never rebuilt under the cursor. */
function statEdit(m, key, label) {
  return `<span class="statedit${checkAdjusted(m, key) ? ' adj' : ''}">${label}
    <input type="number" min="0" max="${monsterPL(m)}" data-chk="${key}" value="${monsterCheck(m, key)}"
      title="${label} in play. Written ${m[key] ?? 0}. Physical and Mental share the power level between them, so raising one lowers the other."></span>`;
}

/** A Physical / Mental switch for one attack. */
function checkPicker(m, slot) {
  const on = attackCheck(m, slot);
  return `<span class="chkpick" data-chkpick="${slot}">
    ${[['check_physical', 'PHY'], ['check_mental', 'MEN']].map(([k, label]) =>
      `<button type="button" data-chkkey="${k}" class="${k === on ? 'on' : ''}"
        title="Roll this attack against ${k === 'check_physical' ? 'Physical' : 'Mental'}">${label}</button>`).join('')}
  </span>`;
}

function monsterCard(m, { open = false, collapsible = false } = {}) {
  const pl = monsterPL(m);
  const adjusted = plAdjusted(m);
  const card = document.createElement('div');
  card.className = 'moncard' + (open ? ' open' : '') + (collapsible ? ' collapsible' : '');
  const pinned = isPinned(m.name);

  card.innerHTML = `
    <div class="monhead">
      <span class="opip" style="background:${safeColor(originColor(m.origin))}" title="${esc(m.origin || '')}"></span>
      <b>${esc(m.name)}</b>
      <span class="plset${adjusted ? ' adj' : ''}">
        ${open ? '<button class="plbtn" data-pl="-1" title="Lower the power level" aria-label="Lower power level">&minus;</button>' : ''}
        <span class="monpl" title="${adjusted ? `Power level, set from ${m.pl || 0}` : 'Power level'}">PL ${pl}</span>
        ${open ? '<button class="plbtn" data-pl="1" title="Raise the power level" aria-label="Raise power level">+</button>' : ''}
        ${open && monsterTweaked(m) ? `<button class="plbtn plreset" data-pl="reset" title="Back to the book: PL ${m.pl || 0} as written" aria-label="Back to the book">&#8634;</button>` : ''}
      </span>
      ${collapsible && !open ? `<span class="monsum">${esc(m._group || '')}${envOf(m) ? ` · ${esc(envOf(m))}` : ''}</span>` : ''}
      <button class="favstar${pinned ? ' on' : ''}" data-pin title="${pinned ? 'Remove from your book' : 'Pin to your book'}"
        aria-pressed="${pinned}">${pinned ? '★' : '☆'}</button>
    </div>`;

  card.querySelector('[data-pin]').addEventListener('click', e => { e.stopPropagation(); togglePin(m.name); });
  card.querySelectorAll('[data-pl]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();                     // the header toggles; these do not
    if (b.dataset.pl === 'reset') resetMonster(m);
    else setPL(m, pl + Number(b.dataset.pl));
  }));
  if (collapsible) {
    card.querySelector('.monhead').addEventListener('click', () => {
      expanded[showing] = expanded[showing] === m.name ? null : m.name;
      onChanged();
    });
  }
  if (!open) return card;

  const body = document.createElement('div');
  body.className = 'monbody';
  const moves = MOVES.filter(([k]) => +m[k] > 0).map(([k, label]) => `${label} ${m[k]}ft`).join(' · ');
  const tags = [m._group, m.size, m.rarity, envOf(m), m.behavior].filter(Boolean);

  body.innerHTML = `
    <div class="montags">${tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>
    <div class="monstats">
      ${statEdit(m, 'check_physical', 'Physical')}
      ${statEdit(m, 'check_mental', 'Mental')}
      ${moves ? `<span class="monmove">${esc(moves)}</span>` : ''}
      <button class="tbbtn montoken" data-token title="Put one on the map at the centre of the view">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>Token</button>
    </div>
    ${m.motivation ? `<div class="monmotive">Wants: ${esc(m.motivation)}</div>` : ''}`;

  for (const [slot, label] of [['melee_attack', 'Melee'], ['ranged_attack', 'Ranged'], ['spell', 'Spell']]) {
    const a = m[slot];
    if (!a?.name) continue;
    const row = document.createElement('div');
    row.className = 'monattack';
    const dmgType = cleanType(a.damage_type);
    row.innerHTML = `
      <div class="monattackhead"><span class="monslot">${label}</span><b>${esc(a.name)}</b>
        <input class="dmgedit${damageAdjusted(m, slot) ? ' adj' : ''}" data-dmgedit="${slot}"
          value="${esc(monsterDamage(m, slot))}" spellcheck="false"
          title="Damage in play. Written ${esc(String(a.damage || '—'))}.">
        <span class="monslot">${esc(dmgType)}</span>
        ${checkPicker(m, slot)}
      </div>
      <div class="gearacts">
        <button class="tbbtn" data-atk="${slot}">Attack</button>
        ${monsterDamage(m, slot) ? `<button class="tbbtn" data-dmg="${slot}">${esc(monsterDamage(m, slot))}</button>` : ''}
        ${sendBtn(`Send ${a.name} to chat`)}
      </div>`;
    row.querySelector('[data-atk]').addEventListener('click', () => {
      const formula = monsterDamage(m, slot);
      rollCheck({
        charName: m.name, label: `${a.name} (${label})${plAdjusted(m) ? ` · PL ${monsterPL(m)}` : ''}`,
        mod: monsterCheck(m, attackCheck(m, slot)), attack: true,
        damage: formula ? { formula, type: dmgType } : null,
      });
    });
    row.querySelector('[data-chkpick]').addEventListener('click', e => {
      const b = e.target.closest('[data-chkkey]');
      if (!b) return;
      setAttackCheck(m, slot, b.dataset.chkkey);
      for (const sib of b.parentElement.children) sib.classList.toggle('on', sib === b);
      refreshReset();
    });
    row.querySelector('[data-dmg]')?.addEventListener('click', () =>
      rollDice({ charName: m.name, label: `${a.name} damage`, formula: monsterDamage(m, slot) }));
    wireSend(row, () => ({
      charName: m.name, label: `${a.name} (${label})`,
      tags: [monsterDamage(m, slot), dmgType, attackCheck(m, slot) === 'check_mental' ? 'Mental' : 'Physical'],
      text: `${a.name}: ${monsterDamage(m, slot) || 'no damage'} ${dmgType}, rolled against ${attackCheck(m, slot) === 'check_mental' ? 'Mental' : 'Physical'} ${monsterCheck(m, attackCheck(m, slot))}.`,
      rolls: monsterDamage(m, slot) ? [monsterDamage(m, slot)] : [],
    }));
    row.querySelector('[data-dmgedit]').addEventListener('change', e => {
      setDamage(m, slot, e.target.value);
      const now = monsterDamage(m, slot);
      e.target.value = now;
      e.target.classList.toggle('adj', damageAdjusted(m, slot));
      const btn = row.querySelector('[data-dmg]');
      if (btn) btn.textContent = now;
      refreshReset();
    });
    body.appendChild(row);
  }

  const feats = [];
  if (m.feature_name) {
    feats.push({
      name: m.feature_name, type: m.feature_type, range: m.feature_range,
      effect: m.feature_effect, duration: m.feature_duration, damage: m.feature_damage,
    });
  }
  for (const f of m.features || []) feats.push(f);

  for (const f of feats) {
    const el = document.createElement('div');
    el.className = 'featcard';
    const tags = [f.type, f.range, f.duration, f.damage].filter(Boolean);
    const rolls = monsterFormulas(f.effect, pl);
    el.innerHTML = `
      <div class="feathead"><b>${esc(f.name || '')}</b></div>
      ${tags.length ? `<div class="feattags">${tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
      <p>${esc(resolvePL(f.effect, pl))}</p>
      <div class="gearacts">
        ${rolls.map(r => `<button class="tbbtn" data-roll="${esc(r)}">${esc(r)}</button>`).join('')}
        ${sendBtn(`Send ${f.name || 'this feature'} to chat`)}
      </div>`;
    el.querySelectorAll('[data-roll]').forEach(b => b.addEventListener('click', () =>
      rollDice({ charName: m.name, label: f.name || 'Feature', formula: b.dataset.roll })));
    wireSend(el, () => ({
      charName: m.name, label: f.name || 'Feature', tags,
      text: resolvePL(f.effect, monsterPL(m)), rolls: monsterFormulas(f.effect, monsterPL(m)),
    }));
    body.appendChild(el);
  }

  /* The book's spell lists: a named spell, then its effects by intent, each
     with its mana cost and range. Damage on an effect is rollable. */
  for (const sp of Array.isArray(m.spells) ? m.spells : []) {
    if (!sp?.name) continue;
    const el = document.createElement('div');
    el.className = 'featcard';
    const tags = [sp.manner, sp.transmission].filter(Boolean);
    el.innerHTML = `
      <div class="feathead"><b>${esc(sp.name)}</b><span class="monslot">Spell</span></div>
      ${tags.length ? `<div class="feattags">${tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
      ${(sp.effects || []).map((e, i) => `
        <div class="speffect">
          <div class="speffhead">
            <b>${esc(e.intent || 'Effect')}</b>
            ${e.cost ? `<span class="spcost">${esc(String(e.cost))} mana</span>` : ''}
            ${e.range ? `<span>${esc(e.range)}</span>` : ''}
            ${e.area ? `<span>${esc(e.area)}</span>` : ''}
            ${e.damage ? `<span>${esc(String(e.damage))} ${esc(cleanType(e.type))}</span>` : ''}
          </div>
          <p>${esc(resolvePL(e.effect, pl))}</p>
          <div class="gearacts">
            ${e.damage ? `<button class="tbbtn" data-spdmg="${esc(String(e.damage))}" data-spname="${esc(sp.name)}">Roll ${esc(String(e.damage))}</button>` : ''}
            ${sendButton('Send this effect to chat', `data-spsend="${i}"`)}
          </div>
        </div>`).join('')}`;
    el.querySelectorAll('[data-spdmg]').forEach(b => b.addEventListener('click', () =>
      rollDice({ charName: m.name, label: `${b.dataset.spname} damage`, formula: b.dataset.spdmg })));
    el.querySelectorAll('[data-spsend]').forEach(b => b.addEventListener('click', () => {
      const e = (sp.effects || [])[+b.dataset.spsend];
      if (!e) return;
      const pln = monsterPL(m);
      postNote({
        charName: m.name, label: `${sp.name} \u00b7 ${e.intent || 'Effect'}`,
        tags: [e.cost ? `${e.cost} mana` : '', e.range, e.area, e.damage ? `${e.damage} ${cleanType(e.type)}` : ''],
        text: resolvePL(e.effect, pln),
        rolls: [...monsterFormulas(e.effect, pln), ...(e.damage ? [String(e.damage)] : [])],
      });
    }));
    body.appendChild(el);
  }
  if (m.silver != null) {
    body.insertAdjacentHTML('beforeend', `<div class="monspells"><span>Silver</span>${esc(String(m.silver))}</div>`);
  }
  for (const [label, text] of [['Description', m.description], ['Lore', m.lore]]) {
    if (!text) continue;
    const part = document.createElement('details');
    part.className = 'lorepart';
    part.innerHTML = `<summary>${label}</summary>
      <p>${esc(resolvePL(text, pl))}</p>
      <div class="gearacts">${sendBtn(`Read ${label.toLowerCase()} out to the table`)}</div>`;
    wireSend(part, () => ({
      charName: m.name, label, text: resolvePL(text, monsterPL(m)),
    }));
    body.appendChild(part);
  }

  // One reset covers everything tweaked on this monster, so it has to come and
  // go as edits are made, without rebuilding the card under the cursor.
  function refreshReset() {
    const head = card.querySelector('.plset');
    const has = monsterTweaked(m);
    const btn = head.querySelector('.plreset');
    if (has && !btn) {
      head.insertAdjacentHTML('beforeend',
        `<button class="plbtn plreset" data-pl="reset" title="Back to the book: PL ${m.pl || 0} as written" aria-label="Back to the book">&#8634;</button>`);
      head.querySelector('.plreset').addEventListener('click', e => { e.stopPropagation(); resetMonster(m); });
    } else if (!has && btn) {
      btn.remove();
    }
  }

  // The two checks share one budget, so setting either redraws both.
  function refreshChecks() {
    for (const el of body.querySelectorAll('[data-chk]')) {
      const key = el.dataset.chk;
      el.value = monsterCheck(m, key);
      el.parentElement.classList.toggle('adj', checkAdjusted(m, key));
    }
  }

  body.querySelector('[data-token]')?.addEventListener('click', () => placeMonsterToken(m));

  body.querySelectorAll('[data-chk]').forEach(inp => inp.addEventListener('change', () => {
    setCheck(m, inp.dataset.chk, +inp.value);
    refreshChecks();
    refreshReset();
  }));

  card.appendChild(body);
  return card;
}
