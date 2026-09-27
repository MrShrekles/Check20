/* Guided character creation, ported from scripts/create-char.js.

   Six steps: Class, Path & Talent, Species, Stats, Starting Details, Review.

   The character being built is a real entry in state.chars carrying a `draft`
   object, so everything already built works on it while it is being made: the
   stats step previews wounds and mana with the sheet's own formulas, and a
   half-made character survives a reload through autosave. Finishing removes
   `draft`; cancelling removes the character.

   Rules, as the website has them:
     stat points  20, max 10 per check (Professional: 25, max 15)
     wealth       1d100+50, rolled once
     wounds       class features that say "gain +N wounds" add to max wounds
     gear         the class's starting kit, plus any extra lines */

import { esc, detemplate } from './dom.js';
import { get, load } from './data.js';
import { id as newId } from './state.js';
import {
  CHECKS, ALL_CHECKS, checkLabel, woundsMax, manaMax, movement, lowLight,
  makeCharacter, TOKEN_COLORS,
} from './character.js';
import {
  CLASS_KEYS, pathsFor, talentsFor, optionGrid, speciesDrill, applySpecies, speciesEntry,
} from './features.js';
import { originColor } from './origins.js';
import { EXTRA_EQUIPMENT, TRINKETS } from './creation-lists.js';

export const STEPS = ['class', 'path', 'species', 'stats', 'details', 'review'];
const LABELS = {
  class: 'Class', path: 'Path & Talent', species: 'Species',
  stats: 'Stats', details: 'Details', review: 'Name & Begin',
};

const BASE_POINTS = 20;
const BASE_MAX = 10;

let hooks = { changed: () => { }, finished: () => { }, cancelled: () => { } };
export function initCreator(h) { hooks = { ...hooks, ...h }; }

export const ensureCreatorData = () =>
  load('species', 'class-new', 'classes', 'weapons', 'armor', 'items', 'worldbuilding');

const dataReady = () => ['species', 'class-new', 'classes', 'weapons', 'armor', 'items', 'worldbuilding']
  .every(n => get(n));

const titleCase = s => s ? s[0].toUpperCase() + s.slice(1) : '';
const pick = arr => arr?.length ? arr[Math.floor(Math.random() * arr.length)] : '';

/** A fresh character in creation. */
export function newDraft(index = 0) {
  const ch = makeCharacter({ id: newId(), color: TOKEN_COLORS[index % TOKEN_COLORS.length] });
  ch.draft = {
    step: 0, error: '',
    wealthRolled: false, extraEquip: '',
    crumb: { lineage: null, option: null },
    nameStyle: 'fantasy',
  };
  return ch;
}

export const isDraft = ch => !!ch?.draft;

/* ---- class data ---- */

const classInfo = key => Object.values(get('classes') || {})
  .find(c => (c.name || '').toLowerCase() === key) || null;

function limits(ch) {
  return ch.classKey === 'professional' ? { total: BASE_POINTS + 5, max: 15 } : { total: BASE_POINTS, max: BASE_MAX };
}

const pointsSpent = ch => ALL_CHECKS.reduce((n, { key }) => n + (ch.checks[key].mod || 0), 0);

/** "Gain +10 Wounds" in a class feature raises max wounds. "heal +10 wounds" does not. */
function classWoundsBonus(key) {
  return (classInfo(key)?.features || []).reduce((sum, f) => {
    const txt = Array.isArray(f.description) ? f.description.join(' ') : (f.description || '');
    const m = txt.match(/\bgain\s+\+(\d+)\s+wounds\b/i);
    return sum + (m ? parseInt(m[1], 10) : 0);
  }, 0);
}

/** Find a named item in the gear data, so a starting kit arrives with its stats. */
function resolveItem(name, description = '') {
  const want = String(name).trim().toLowerCase();
  for (const src of ['armor', 'weapons', 'items']) {
    const hit = (get(src) || []).find(x => (x.name || '').toLowerCase() === want);
    if (hit) return { ...hit, id: newId() };
  }
  return { id: newId(), name: String(name).trim(), category: 'gear', description };
}

const classKit = key => (classInfo(key)?.equipment || [])
  .filter(e => e?.name?.trim())
  .map(e => resolveItem(e.name, e.description || ''));

/* ---- validation ---- */

function validate(ch) {
  const step = STEPS[ch.draft.step];
  if (step === 'class' && !ch.classKey) return 'Choose a class to continue.';
  if (step === 'path' && !(ch.pathName && ch.talentName)) return 'Choose both a path and a talent.';
  if (step === 'species' && !ch.species) return 'Choose a species to continue.';
  if (step === 'stats' && pointsSpent(ch) > limits(ch).total) {
    return `That is ${pointsSpent(ch) - limits(ch).total} point(s) too many.`;
  }
  if (step === 'review' && !ch.name.trim()) return 'Give your character a name.';
  return '';
}

/* ---- panel ---- */

export function renderCreator(ch) {
  const frag = document.createDocumentFragment();
  if (!dataReady()) {
    const el = document.createElement('div');
    el.className = 'sempty';
    el.textContent = 'Loading classes, species and gear…';
    frag.appendChild(el);
    ensureCreatorData().then(() => hooks.changed(ch)).catch(() => {
      el.textContent = 'Creation data could not be loaded.';
    });
    return frag;
  }

  const d = ch.draft;
  frag.appendChild(stepper(ch));

  const body = document.createElement('div');
  body.className = 'wizbody';
  const step = STEPS[d.step];
  const render = { class: classStep, path: pathStep, species: speciesStep, stats: statsStep, details: detailsStep, review: reviewStep }[step];
  body.appendChild(render(ch));
  frag.appendChild(body);

  if (d.error) {
    const err = document.createElement('div');
    err.className = 'wizerr';
    err.textContent = d.error;
    frag.appendChild(err);
  }
  frag.appendChild(nav(ch));
  return frag;
}

function stepper(ch) {
  const d = ch.draft;
  const el = document.createElement('div');
  el.className = 'wizsteps';
  el.innerHTML = STEPS.map((s, i) => `
    <button class="wizstep${i === d.step ? ' on' : i < d.step ? ' done' : ''}" data-step="${i}"
      ${i > d.step ? 'disabled' : ''} title="${LABELS[s]}">
      <span>${i < d.step ? '✓' : i + 1}</span>${LABELS[s]}
    </button>`).join('');
  el.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.step;
    if (i < d.step) { d.step = i; d.error = ''; hooks.changed(ch); }
  }));
  return el;
}

function nav(ch) {
  const d = ch.draft;
  const last = d.step === STEPS.length - 1;
  const el = document.createElement('div');
  el.className = 'wiznav';
  el.innerHTML = `
    <button class="tbbtn" data-nav="cancel" title="Discard this character">Cancel</button>
    <span style="flex:1"></span>
    ${d.step > 0 ? '<button class="tbbtn" data-nav="back">Back</button>' : ''}
    <button class="tbbtn wizgo" data-nav="next">${last ? 'Create character' : 'Next'}</button>`;
  el.querySelector('[data-nav=cancel]').onclick = () => {
    if (confirm('Discard this character?')) hooks.cancelled(ch);
  };
  el.querySelector('[data-nav=back]')?.addEventListener('click', () => {
    d.step = Math.max(0, d.step - 1); d.error = ''; hooks.changed(ch);
  });
  el.querySelector('[data-nav=next]').onclick = () => {
    d.error = validate(ch);
    if (d.error) return hooks.changed(ch);
    if (last) return finish(ch);
    d.step++;
    hooks.changed(ch);
  };
  return el;
}

function block(title, extra = '') {
  const el = document.createElement('div');
  el.className = 'sblock';
  el.innerHTML = `<h4>${title}${extra}</h4>`;
  return el;
}

/* ---- step 1: class ---- */

function classStep(ch) {
  const frag = document.createDocumentFragment();
  const el = block('Choose a class');
  el.appendChild(optionGrid(CLASS_KEYS.map(k => ({
    name: titleCase(k),
    sub: `${pathsFor(k).length} paths · ${talentsFor(k).length} talents`,
    selected: k === ch.classKey,
    title: classInfo(k)?.description || '',
  })), it => {
    const key = it.name.toLowerCase();
    if (key !== ch.classKey) {
      // Paths and talents belong to a class; changing it clears both.
      ch.classKey = key;
      ch.pathName = ''; ch.talentName = '';
      ch.res.hp.bonus = classWoundsBonus(key);
    }
    ch.draft.error = '';
    hooks.changed(ch);
  }));
  frag.appendChild(el);

  const info = classInfo(ch.classKey);
  if (info) {
    const card = block(titleCase(ch.classKey));
    const feats = (info.features || []).map(f => `
      <div class="featcard"><div class="feathead"><b>${esc(f.name)}</b></div>
        <p>${esc(detemplate(Array.isArray(f.description) ? f.description.join(' ') : f.description))}</p></div>`).join('');
    const kit = (info.equipment || []).filter(e => e?.name?.trim()).map(e => esc(e.name)).join(' · ');
    card.insertAdjacentHTML('beforeend', `
      ${info.description ? `<p class="wizprose">${esc(info.description)}</p>` : ''}
      ${feats}
      ${kit ? `<div class="wizkit"><span>Starting kit</span>${kit}</div>` : ''}
      ${ch.classKey === 'professional' ? '<div class="wizkit"><span>Stats</span>25 points, up to 15 in a check</div>' : ''}`);
    frag.appendChild(card);
  }

  const skip = document.createElement('button');
  skip.className = 'wizskip';
  skip.textContent = 'Skip the guided build and make a blank character (for NPCs)';
  skip.onclick = () => {
    ch.name ||= 'New character';
    delete ch.draft;
    hooks.finished(ch, { blank: true });
  };
  frag.appendChild(skip);
  return frag;
}

/* ---- step 2: path and talent ---- */

function pathStep(ch) {
  const frag = document.createDocumentFragment();
  for (const kind of ['path', 'talent']) {
    const list = kind === 'path' ? pathsFor(ch.classKey) : talentsFor(ch.classKey);
    const chosen = kind === 'path' ? ch.pathName : ch.talentName;
    const el = block(kind === 'path' ? 'Path' : 'Talent');
    el.insertAdjacentHTML('beforeend', `<p class="hint" style="margin-bottom:7px">${kind === 'path'
      ? 'Linear progression. At each step, gain +1 to any check (max 15), +1 Mana, or +1 Class Resource.'
      : 'Steps may be taken in any order.'}</p>`);
    el.appendChild(optionGrid(list.map(e => ({
      name: e.name, origin: e.origin,
      sub: `${e.origin} · ${(kind === 'path' ? e.path : e.talent).steps.length} steps`,
      selected: e.name === chosen, title: e.desc || '',
    })), it => {
      if (kind === 'path') ch.pathName = it.name; else ch.talentName = it.name;
      ch.draft.error = '';
      hooks.changed(ch);
    }));
    const entry = list.find(e => e.name === chosen);
    if (entry) {
      const steps = (kind === 'path' ? entry.path : entry.talent).steps;
      el.insertAdjacentHTML('beforeend', `
        ${entry.desc ? `<p class="wizprose">${esc(entry.desc)}</p>` : ''}
        <details class="wizsteplist"><summary>${steps.length} steps</summary>
          ${steps.map((s, i) => `<div class="featcard"><div class="feathead">
            ${kind === 'path' ? `<span class="featstep">${s.step ?? i}</span>` : ''}<b>${esc(s.name || '')}</b>
            ${s.check ? `<span class="feattag">${esc(s.check)}</span>` : ''}</div>
            <p>${esc(detemplate(s.description))}</p></div>`).join('')}
        </details>`);
    }
    frag.appendChild(el);
  }
  return frag;
}

/* ---- step 3: species ---- */

function speciesStep(ch) {
  const frag = document.createDocumentFragment();
  const crumb = ch.draft.crumb;
  const el = block('Choose a species');
  if (crumb.lineage) {
    const back = document.createElement('button');
    back.className = 'wizcrumb';
    back.textContent = `← ${[crumb.lineage, crumb.option].filter(Boolean).join(' · ')}`;
    back.onclick = () => {
      if (crumb.option) crumb.option = null; else crumb.lineage = null;
      hooks.changed(ch);
    };
    el.appendChild(back);
  }
  el.appendChild(speciesDrill(crumb, ch.species, s => {
    // Re-choosing replaces the fields the last species filled in.
    ch.size = ''; ch.language = ''; ch.diet = '';
    applySpecies(ch, s);
    ch.draft.error = '';
    hooks.changed(ch);
  }, () => hooks.changed(ch)));
  frag.appendChild(el);

  const sp = speciesEntry(ch);
  if (sp) {
    const card = block(esc(sp.name), ` <span class="opip" style="background:${originColor(sp.origin)};display:inline-block;margin-left:6px"></span>`);
    card.insertAdjacentHTML('beforeend', `
      <div class="wizkit"><span>Lineage</span>${esc(sp.lineage)} · ${esc(sp.option)}</div>
      <div class="wizkit"><span>Size</span>${esc(sp.size || '—')} ft · <span>Diet</span>${esc(sp.diet || '—')}</div>
      <div class="wizkit"><span>Language</span>${esc(sp.language || '—')}</div>
      ${sp.feature_name ? `<div class="featcard"><div class="feathead"><b>${esc(sp.feature_name)}</b>
        ${sp.fetCheck ? `<span class="feattag">${esc(sp.fetCheck)}</span>` : ''}</div><p>${esc(detemplate(sp.feature_effect))}</p></div>` : ''}
      ${sp['sub-fet-name'] ? `<div class="featcard"><div class="feathead"><b>${esc(sp['sub-fet-name'])}</b></div>
        <p>${esc(sp['sub-fet-effect'] || '')}</p></div>` : ''}`);
    frag.appendChild(card);
  }
  return frag;
}

/* ---- step 4: stats ---- */

/* Which checks the chosen path, talent and species actually use, so points go
   where they will be rolled. Ported from renderBuildGuide() in create-char.js,
   including its test for checks an enemy rolls rather than you. */
const ENEMY_SAVE = /\b(?:enemies|opponents?|targets?|each creature|all creatures|must make|succeed on|creatures?\s+(?:within|in|around|that)|they make|creature makes?|affected creatures?|hostile)\b/i;
const VALID_CHECKS = new Set(ALL_CHECKS.map(c => c.label));

function enemyRolls(step) {
  if (step.checkType === 'enemy') return true;
  if (step.checkType === 'self' || step.checkType === 'contested') return false;
  return step.description ? ENEMY_SAVE.test(step.description) : false;
}

function guideRows(ch) {
  const path = pathsFor(ch.classKey).find(e => e.name === ch.pathName);
  const talent = talentsFor(ch.classKey).find(e => e.name === ch.talentName);
  const steps = [
    ...(path?.path?.steps || []).map(s => ({ ...s, source: ch.pathName })),
    ...(talent?.talent?.steps || []).map(s => ({ ...s, source: ch.talentName })),
  ].filter(s => s.name && s.check && VALID_CHECKS.has(s.check) && s.checkType !== 'unneeded');
  const sp = speciesEntry(ch);
  const species = sp?.feature_name && VALID_CHECKS.has(sp.fetCheck)
    ? [{ name: sp.feature_name, check: sp.fetCheck, source: sp.name }] : [];
  return {
    yours: [...steps.filter(s => !enemyRolls(s)), ...species],
    enemy: steps.filter(enemyRolls),
  };
}

function statsStep(ch) {
  const frag = document.createDocumentFragment();
  const lim = limits(ch);
  const spent = pointsSpent(ch);
  const left = lim.total - spent;
  const { yours, enemy } = guideRows(ch);
  const wanted = new Map();
  for (const s of yours) wanted.set(s.check, (wanted.get(s.check) || 0) + 1);

  const el = block('Allocate stats');
  el.insertAdjacentHTML('beforeend', `
    <div class="wizpoints${left < 0 ? ' over' : left === 0 ? ' done' : ''}">
      <b>${left}</b> of ${lim.total} points left · up to ${lim.max} in a check
    </div>`);

  const grid = document.createElement('div');
  grid.className = 'scheckcols';
  for (const [group, label] of [['physical', 'Physical'], ['mental', 'Mental']]) {
    const col = document.createElement('div');
    col.innerHTML = `<h5>${label}</h5>`;
    for (const { key } of CHECKS[group]) {
      const v = ch.checks[key].mod || 0;
      const uses = wanted.get(checkLabel(key)) || 0;
      const row = document.createElement('div');
      row.className = 'scheck wizstat' + (uses ? ' wanted' : '');
      row.innerHTML = `
        <span class="sckroll" title="${uses ? `${uses} of your features roll this` : ''}">
          ${checkLabel(key)}${uses ? `<span class="wantflag">${uses}</span>` : ''}
        </span>
        <button class="tcstep" data-d="-1" ${v <= 0 ? 'disabled' : ''}>−</button>
        <b class="scktotal">${v}</b>
        <button class="tcstep" data-d="1" ${v >= lim.max || left <= 0 ? 'disabled' : ''}>+</button>`;
      row.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => {
        const next = Math.max(0, Math.min(lim.max, v + +b.dataset.d));
        if (next > v && left <= 0) return;
        ch.checks[key].mod = next;
        ch.draft.error = '';
        hooks.changed(ch);
      }));
      col.appendChild(row);
    }
    grid.appendChild(col);
  }
  el.appendChild(grid);

  // Live preview, using the sheet's own formulas.
  el.insertAdjacentHTML('beforeend', `
    <div class="derivedrow" style="margin-top:9px;grid-template-columns:repeat(4,1fr)">
      <span>Wounds <b>${woundsMax(ch)}</b></span>
      <span>Mana <b>${manaMax(ch)}</b></span>
      <span>Move <b>${movement(ch)}</b></span>
      <span>Low light <b>${lowLight(ch)}</b></span>
    </div>
    ${ch.res.hp.bonus ? `<div class="hint" style="margin-top:5px">Includes +${ch.res.hp.bonus} wounds from your class.</div>` : ''}`);
  frag.appendChild(el);

  if (yours.length || enemy.length) {
    const g = block('Build guide');
    const row = s => `<div class="guiderow"><span>${esc(s.name)}</span><small>${esc(s.source || '')}</small><b>${esc(s.check)}</b></div>`;
    g.insertAdjacentHTML('beforeend', `
      ${yours.length ? `<div class="guidehead">Checks you roll — worth investing in</div>${yours.map(row).join('')}` : ''}
      ${enemy.length ? `<div class="guidehead enemy">Checks enemies roll against you — no points needed</div>${enemy.map(row).join('')}` : ''}`);
    frag.appendChild(g);
  }
  return frag;
}

/* ---- step 5: details ---- */

function sizeOptions(ch) {
  const sp = speciesEntry(ch);
  const parts = String(sp?.size || '').split('-').map(Number).filter(Boolean);
  if (parts.length >= 2) {
    const out = [];
    for (let i = Math.min(...parts); i <= Math.max(...parts); i++) out.push(`${i} ft`);
    return out;
  }
  return sp?.size ? [sp.size] : ['Small', 'Medium', 'Large', 'Huge'];
}

function detailsStep(ch) {
  const d = ch.draft;
  const sizes = sizeOptions(ch);
  if (!sizes.includes(ch.size)) ch.size = sizes[0];

  const el = block('Starting details');
  el.insertAdjacentHTML('beforeend', `
    <div class="wizfields">
      <label>Wealth
        <span class="wizinline">
          <input type="number" data-w="wealth" min="0" value="${ch.wealth || ''}" placeholder="0">
          <button class="tbbtn" data-roll="wealth" ${d.wealthRolled ? 'disabled' : ''}>${d.wealthRolled ? 'Rolled' : 'Roll 1d100+50'}</button>
        </span>
      </label>
      <label>Age <input data-w="age" value="${esc(ch.age)}"></label>
      <label>Size
        <select data-w="size">${sizes.map(s => `<option${s === ch.size ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select>
      </label>
      <label class="wide">Motivation
        <span class="wizinline"><input data-w="motivation" value="${esc(ch.motivation)}">
        <button class="tbbtn" data-roll="motivation" title="Pick one at random">Random</button></span>
      </label>
      <label class="wide">Trinket
        <span class="wizinline"><input data-w="trinket" value="${esc(ch.trinket)}">
        <button class="tbbtn" data-roll="trinket" title="Pick one at random">Random</button></span>
      </label>
      <label class="wide">Extra equipment <small>one item per line</small>
        <textarea data-w="extraEquip" rows="3">${esc(d.extraEquip)}</textarea>
        <button class="tbbtn" data-roll="equip" style="justify-self:start">Suggest</button>
      </label>
    </div>`);

  el.querySelectorAll('[data-w]').forEach(i => i.addEventListener('change', () => {
    const k = i.dataset.w;
    if (k === 'extraEquip') d.extraEquip = i.value;
    else ch[k] = i.type === 'number' ? (+i.value || 0) : i.value;
  }));
  el.querySelectorAll('[data-roll]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.roll;
    if (k === 'wealth') {
      // One roll, as on the website: the result stands.
      ch.wealth = 50 + 1 + Math.floor(Math.random() * 100);
      d.wealthRolled = true;
    }
    if (k === 'motivation') ch.motivation = pick(get('worldbuilding')?.motivations);
    if (k === 'trinket') ch.trinket = pick(TRINKETS);
    if (k === 'equip') d.extraEquip = [d.extraEquip.trim(), pick(EXTRA_EQUIPMENT)].filter(Boolean).join('\n');
    hooks.changed(ch);
  }));

  const kit = classKit(ch.classKey);
  if (kit.length) {
    el.insertAdjacentHTML('beforeend', `<div class="wizkit" style="margin-top:8px"><span>Class kit</span>${kit.map(x => esc(x.name)).join(' · ')}</div>`);
  }
  return el;
}

/* ---- step 6: review ---- */

const NAME_STYLES = [['fantasy', 'Fantasy'], ['victorian', 'Victorian'], ['twenties', 'Twenties'], ['goblin', 'Goblin']];

/* Same syllable tables as the website's generator, from worldbuilding.json. */
function generateName(style) {
  const n = get('worldbuilding')?.names;
  if (!n) return '';
  if (style === 'twenties' || style === 'victorian') return `${pick(n[`${style}-first`])} ${pick(n[`${style}-last`])}`;
  if (style === 'goblin') return pick(n['goblin-prefix']) + pick(n['goblin-suffix']);
  const first = pick(n['fantasy-start']), last = pick(n['fantasy-end']);
  let core = pick(n['fantasy-core']);
  if (core && first.endsWith(core[0])) core = core.slice(1);
  if (core && last && core.endsWith(last[0])) core = core.slice(0, -1);
  const name = first + core + last;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function reviewStep(ch) {
  const d = ch.draft;
  const frag = document.createDocumentFragment();
  const el = block('Name');
  el.insertAdjacentHTML('beforeend', `
    <div class="wizinline">
      <input class="full" data-name value="${esc(ch.name)}" placeholder="Character name">
      <select data-style>${NAME_STYLES.map(([k, l]) => `<option value="${k}"${k === d.nameStyle ? ' selected' : ''}>${l}</option>`).join('')}</select>
      <button class="tbbtn" data-gen>Roll a name</button>
    </div>`);
  const input = el.querySelector('[data-name]');
  input.addEventListener('input', () => { ch.name = input.value; });
  el.querySelector('[data-style]').addEventListener('change', e => { d.nameStyle = e.target.value; });
  el.querySelector('[data-gen]').onclick = () => {
    const n = generateName(d.nameStyle);
    if (n) { ch.name = n; hooks.changed(ch); }
  };
  frag.appendChild(el);

  const lim = limits(ch);
  const spent = pointsSpent(ch);
  const stats = ALL_CHECKS.filter(c => ch.checks[c.key].mod > 0)
    .map(c => `${c.label.slice(0, 3)} ${ch.checks[c.key].mod}`).join(' · ');
  const extra = d.extraEquip.split('\n').map(s => s.trim()).filter(Boolean);
  const kit = [...classKit(ch.classKey).map(x => x.name), ...extra];
  const rows = [
    ['Class', titleCase(ch.classKey)],
    ['Path', ch.pathName], ['Talent', ch.talentName],
    ['Species', [ch.species, ch.speciesOption].filter(Boolean).join(' · ')],
    ['Stats', stats || '—'],
    ['Points', `${spent} / ${lim.total} used${spent < lim.total ? ` (${lim.total - spent} unspent)` : ''}`],
    ['Wounds', `${woundsMax(ch)}`], ['Mana', `${manaMax(ch)}`],
    ['Wealth', ch.wealth ? `${ch.wealth}` : ''],
    ['Gear', kit.join(' · ')],
    ['Trinket', ch.trinket], ['Motivation', ch.motivation],
  ].filter(([, v]) => v);
  const card = block('Review');
  card.insertAdjacentHTML('beforeend', rows.map(([k, v]) =>
    `<div class="reviewrow"><span>${k}</span><b>${esc(v)}</b></div>`).join(''));
  frag.appendChild(card);
  return frag;
}

/* ---- finish ---- */

function finish(ch) {
  const extra = ch.draft.extraEquip.split('\n').map(s => s.trim()).filter(Boolean);
  ch.equipment = [...classKit(ch.classKey), ...extra.map(n => resolveItem(n))];
  ch.level = 1;
  ch.name = ch.name.trim();
  // Start at full wounds, mana and armour: zeroed pools refill on reconcile.
  ch.res.hp.current = 0; ch.res.hp.max = 0;
  ch.res.mana.current = 0; ch.res.mana.max = 0;
  ch.res.armor.current = 0; ch.res.armor.max = 0;
  delete ch.draft;
  hooks.finished(ch, { blank: false });
}
