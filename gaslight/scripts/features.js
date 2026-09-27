/* The Features panel: who the character is, and what that gives them.

   Species, class, path and talent, plus every feature those choices grant.
   Picking happens inside the panel — a drill-down replaces the list rather
   than opening a modal, so the rail stays non-blocking and the map stays live.

   Paths progress in order; talent steps may be taken in any order. An entry in
   class-new.json is a path when `path.steps` is populated and a talent when
   `talent.steps` is, and `draft` entries are unwritten scaffolds. */

import { $, esc, detemplate, safeColor, sendButton } from './dom.js';
import { get, load, speciesList } from './data.js';
import { originColor } from './origins.js';
import {
  grantOpeningSteps, checkKey, checkLabel, checkTotal,
  withOverride, setOverride, clearOverride, isOverridden,
} from './character.js';
import { disadvantageFor } from './conditions.js';
import { damageFormulas } from './formulas.js';
import { askRoll } from './rolltray.js';
import { rollCheck, rollDice, postNote } from './chat.js';

/* Which picker is open, if any: null | 'species' | 'class' | 'path' | 'talent' */
let picker = null;
let speciesCrumb = { lineage: null, option: null };
let onChanged = () => { };

export function initFeatures(changedCallback) { onChanged = changedCallback; }

/** Everything the panel reads. Loaded lazily the first time it opens. */
export function ensureFeatureData() {
  return load('species', 'class-new');
}

const classEntries = key => Object.values(get('class-new')?.[key] || {}).filter(e => !e.draft);

export const pathsFor = key => classEntries(key).filter(e => e.path?.steps?.length);
export const talentsFor = key => classEntries(key).filter(e => e.talent?.steps?.length);

const findEntry = (key, name) => classEntries(key).find(e => e.name === name) || null;
export const pathEntry = ch => (ch.classKey && ch.pathName) ? findEntry(ch.classKey, ch.pathName) : null;
export const talentEntry = ch => (ch.classKey && ch.talentName) ? findEntry(ch.classKey, ch.talentName) : null;

export const speciesEntry = ch =>
  ch.species ? speciesList().find(s => s.name === ch.species) || null : null;

export const CLASS_KEYS = ['tank', 'support', 'professional', 'merchant', 'mage'];
const titleCase = s => s ? s[0].toUpperCase() + s.slice(1) : '';

/* ---- panel ---- */

export function renderFeaturesPanel(ch) {
  const frag = document.createDocumentFragment();
  if (!get('species') || !get('class-new')) {
    const el = document.createElement('div');
    el.className = 'sempty';
    el.textContent = 'Loading species and class data…';
    frag.appendChild(el);
    ensureFeatureData().then(() => onChanged(ch)).catch(() => {
      el.textContent = 'Species and class data could not be loaded.';
    });
    return frag;
  }

  if (picker) { frag.appendChild(renderPicker(ch)); return frag; }

  frag.appendChild(identityBlock(ch));
  const feats = featuresBlock(ch);
  if (feats) frag.appendChild(feats);
  return frag;
}

function block(title, extra = '') {
  const el = document.createElement('div');
  el.className = 'sblock';
  el.innerHTML = `<h4>${title}${extra}</h4>`;
  return el;
}

function identityBlock(ch) {
  const el = block('Identity');
  const sp = speciesEntry(ch);
  const rows = [
    ['species', 'Species', ch.species, sp ? `${sp.lineage} · ${sp.option}` : '', sp?.origin],
    ['class', 'Class', titleCase(ch.classKey), '', ''],
    ['path', 'Path', ch.pathName, '', pathEntry(ch)?.origin],
    ['talent', 'Talent', ch.talentName, '', talentEntry(ch)?.origin],
  ];

  const wrap = document.createElement('div');
  // Four short facts do not need four full-width rows.
  wrap.className = 'idlist two';
  wrap.innerHTML = rows.map(([kind, label, value, sub, origin]) => `
    <button class="idrow" data-pick="${kind}" ${kind !== 'species' && kind !== 'class' && !ch.classKey ? 'disabled' : ''}>
      <span class="idlbl">${label}</span>
      ${origin ? `<span class="opip" style="background:${originColor(origin)}" title="${esc(origin)}"></span>` : ''}
      <span class="idval${value ? '' : ' none'}">${esc(value || (ch.classKey || kind === 'species' || kind === 'class' ? 'Choose…' : 'Pick a class first'))}</span>
      ${sub ? `<span class="idsub">${esc(sub)}</span>` : ''}
    </button>`).join('');
  el.appendChild(wrap);

  wrap.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => {
    if (b.disabled) return;
    picker = b.dataset.pick;
    if (picker === 'species') speciesCrumb = { lineage: null, option: null };
    onChanged(ch);
  }));
  return el;
}

/* ---- features list ---- */

function featuresBlock(ch) {
  const sp = speciesEntry(ch);
  const path = pathEntry(ch);
  const talent = talentEntry(ch);
  if (!sp && !path && !talent) return null;

  const el = block('Features');
  const wrap = document.createElement('div');

  if (sp) {
    if (sp.feature_name) {
      wrap.appendChild(featureCard({
        key: `species:${sp.name}:feature`,
        name: sp.feature_name, effect: sp.feature_effect,
        action: sp.fetAction, check: sp.fetCheck,
        tag: 'Species', origin: sp.origin,
      }, ch));
    }
    if (sp['sub-fet-name']) {
      wrap.appendChild(featureCard({
        key: `species:${sp.name}:sub`,
        name: sp['sub-fet-name'], effect: sp['sub-fet-effect'],
        tag: 'Species', origin: sp.origin,
      }, ch));
    }
  }

  // The opening step comes with the path, whether or not Progression was opened.
  grantOpeningSteps(ch);

  for (const [entry, kind, key] of [[path, 'Path', 'path'], [talent, 'Talent', 'talent']]) {
    if (!entry) continue;
    const steps = entry[key].steps;
    const taken = ch.progression?.[key === 'path' ? 'pathChecked' : 'talentChecked'] || {};

    const asCard = (st, i) => ({
      // The same key the step is bought under, so an override follows it.
      key: `${entry.name}:${i}`,
      name: st.name, effect: st.description,
      action: st.action, check: st.check, range: st.range,
      damage: st.damage, damageType: st.damageType, duration: st.duration,
      step: kind === 'Path' ? st.step ?? i : null,
      taken: !!taken[`${entry.name}:${i}`],
      origin: entry.origin,
    });

    const have = [], missing = [];
    steps.forEach((st, i) => (taken[`${entry.name}:${i}`] ? have : missing).push(asCard(st, i)));

    const head = document.createElement('div');
    head.className = 'featgrouphead';
    head.innerHTML = `<span class="opip" style="background:${safeColor(originColor(entry.origin))}"></span>
      ${esc(entry.name)} <small>${esc(kind)} · ${have.length} of ${steps.length}</small>`;
    wrap.appendChild(head);

    /* What the character actually has, grouped so an upgrade sits under the
       feature it upgrades rather than as another card in the list. */
    if (have.length) {
      for (const [fam, list] of familyGroups(have)) {
        if (list.length === 1) { wrap.appendChild(featureCard(list[0], ch)); continue; }

        /* The first step is the feature; the rest are what it does now.
           Bloodmark and Regen are not things a character announces — they are
           how Bloodletting behaves once they are bought. So the base carries
           the roll and the Send for the whole family, and an upgrade keeps
           only what is genuinely its own: an extra die, and its own wording. */
        /* The base IS the collapsible. Closed, it is one card with the name,
           the tags, the buttons and the first line of what it does. Opened, it
           unfolds its own text and the upgrades underneath it — which is how
           they are used: not five features, one feature that does five
           things. */
        const [base, ...upgrades] = list;
        wrap.appendChild(featureCard(base, ch, upgrades));
      }
    } else {
      wrap.appendChild(Object.assign(document.createElement('div'),
        { className: 'hint', textContent: `No ${kind.toLowerCase()} steps taken yet. Buy them in Progression.` }));
    }

    /* The rest is the road ahead, shut by default. It is reference, not the
       character: showing it inline made a fresh character look like it had
       thirty features. */
    if (missing.length) {
      const d = document.createElement('details');
      d.className = 'featlocked';
      d.innerHTML = `<summary>Not taken <b>${missing.length}</b></summary>`;
      missing.forEach(f => d.appendChild(featureCard(f, ch)));
      wrap.appendChild(d);
    }
  }
  el.appendChild(wrap);
  return el;
}

/* The opening sentence, for a card that is closed. Enough to know which
   feature this is without unfolding the paragraph under it. Cut at a sentence
   where there is one, at a word where the sentence runs long. */
function firstLine(text, max = 96) {
  const t = String(text || '').trim().replace(/\s+/g, ' ');
  if (!t) return '';
  const stop = t.search(/[.!?](\s|$)/);
  let out = stop > 0 && stop < max ? t.slice(0, stop + 1) : t;
  if (out.length > max) {
    const cut = out.lastIndexOf(' ', max);
    out = out.slice(0, cut > 40 ? cut : max).trim() + '…';
  }
  return out;
}

/** "Bloodletting: Bloodmark" is Bloodmark once you already know the family. */
const shortName = name => {
  const t = String(name || '');
  const i = t.indexOf(':');
  return i > 0 ? t.slice(i + 1).trim() : t;
};

/* An upgrade is written "Base: Variant" or "Base II", so both collapse to the
   same family. Order is kept: the base was taken before its upgrades. */
const featFamily = name =>
  String(name || '').split(':')[0].replace(/\s+(II|III|IV|V|VI|VII|VIII|IX|X)\s*$/i, '').trim();

function familyGroups(cards) {
  const out = new Map();
  for (const c of cards) {
    const fam = featFamily(c.name) || c.name || 'Unnamed';
    if (!out.has(fam)) out.set(fam, []);
    out.get(fam).push(c);
  }
  return out;
}

/* Which feature has its editor open. Not saved: an open drawer is not part of
   the character, only what it was used to change is. */
let editingFeat = null;

/* Which features are open. Not saved: what a player had unfolded is not part
   of the character. */
const expandedFeats = new Set();

/* Rewriting a feature for one character.

   The data is shared and read-only, so a change is kept against the character
   as an override rather than edited in place. The written wording sits under
   each field as a reminder of what it is departing from, and Reset puts it
   back exactly. */
function featureEditor(base, f, ch) {
  const field = (key, label, wide = false) => `
    <label class="${wide ? 'wide' : ''}">${label}
      <input type="text" data-ff="${key}" value="${esc(f[key] ?? '')}"
        placeholder="${esc(base[key] ?? '')}">
    </label>`;
  return `
    <div class="feateditor">
      <div class="gefields">
        ${field('name', 'Name', true)}
        ${field('action', 'Action')}
        ${field('check', 'Check')}
        ${field('range', 'Range')}
        ${field('duration', 'Duration')}
        ${field('damage', 'Damage')}
        ${field('damageType', 'Damage type')}
        <label class="wide">Text
          <textarea data-ff="effect" rows="4"
            placeholder="${esc(detemplate(base.effect || ''))}">${esc(f.effect ?? '')}</textarea>
        </label>
      </div>
      <div class="fehint">
        Changed here for <b>${esc(ch.name || 'this character')}</b> only — the
        rulebook and everyone else's copy are untouched. A field left matching
        the written version is not stored, so later changes to the data still
        reach it.
      </div>
      ${isOverridden(ch, base) ? `<button class="tbbtn" data-feat="reset">Put the written version back</button>` : ''}
    </div>`;
}

/* A feature is not only text. 298 of the 1544 written path and talent steps
   carry a check and 242 carry damage, which makes a large part of what a
   character can do rollable — and none of it was. Anything with a check rolls
   through the same tray an attack does; anything with damage can roll that on
   its own; and any of it can be read out to the table.

   `ch` is needed to roll, so it is threaded through rather than reached for:
   featureCard is called from five places and every one of them has it. */
/**
 * @param {object} base      the feature as written
 * @param {object} ch        the character, for rolling and overrides
 * @param {object[]} [family] upgrades this feature carries, if it is a base
 * @param {boolean} [isUpgrade] true when this IS an upgrade of something else
 */
function featureCard(base, ch, family = null, isUpgrade = false) {
  /* What the data says, with anything this character changed on top. The
     written version is kept as `base` so the editor can show what it is
     departing from and put it back. */
  const f = ch ? withOverride(ch, base) : base;
  const el = document.createElement('div');
  el.className = 'featcard' + (f.taken ? ' taken' : '') + (f.edited ? ' edited' : '');
  const checkKeyName = f.check ? checkKey(String(f.check).split(',')[0].trim()) : null;
  const formulas = damageFormulas(f.damage, f.effect);
  const canRoll = !!(ch && checkKeyName);
  const canDamage = !!(ch && !checkKeyName && formulas.length);
  const tags = [
    f.action && f.action !== 'Passive' ? f.action : null,
    f.check || null,
    f.range || null,
    f.damage ? `${f.damage} ${f.damageType || ''}`.trim() : null,
    f.duration || null,
  ].filter(Boolean);

  /* Collapsed by default: a path of eleven steps is a wall of prose, and the
     head already carries the name, what it costs to use and what it rolls.
     What you can DO with it stays visible either way — the buttons are the
     reason to find the feature, so they must not be behind the disclosure. */
  const open = expandedFeats.has(base.key);
  el.classList.toggle('open', open);
  el.classList.toggle('upgrade', isUpgrade);

  /* Everything this feature carries with it, base and upgrades, as the
     character has them now. */
  const carried = (family || []).map(u => (ch ? withOverride(ch, u) : u));

  el.innerHTML = `
    <div class="actcard">
      <div class="actbody">
        <div class="feathead">
          ${f.step != null ? `<span class="featstep">${f.step}</span>` : ''}
          <b>${esc(f.name || 'Unnamed')}</b>
          ${f.action === 'Passive' ? '<span class="feattag passive">Passive</span>' : ''}
          ${f.tag ? `<span class="feattag">${esc(f.tag)}</span>` : ''}
          ${f.edited ? '<span class="feattag edited" title="Changed for this character">Edited</span>' : ''}
        </div>
        ${tags.length ? `<div class="feattags">${tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
        ${open
          ? `<p>${esc(detemplate(f.effect))}</p>`
          : `<p class="featsnip"><span class="snip">${esc(firstLine(detemplate(f.effect)))}</span><button
               class="readmore" data-feat="more">Read more</button></p>`}
        ${!isUpgrade && carried.length ? `<div class="carries" title="Rolled and sent with this">
          ${carried.map(u => `<span>${esc(shortName(u.name))}</span>`).join('')}
        </div>` : ''}
      </div>
      ${ch ? `<div class="actside">
        ${canRoll ? `<button class="tbbtn tb-atk" data-feat="roll" title="Roll ${esc(f.check)}">${esc(f.check)}</button>` : ''}
        ${canDamage ? `<button class="tbbtn tb-atk" data-feat="dmg" title="Roll the damage">${esc(formulas[0])}</button>` : ''}
        ${isUpgrade ? '' : sendButton(
          carried.length
            ? `Read this out with its ${carried.length} upgrade${carried.length === 1 ? '' : 's'}`
            : 'Read this out to the table',
          'data-feat="send"', 'Send')}
        ${base.key ? `<button class="tbbtn small" data-feat="edit" title="Change how this works for this character">Edit</button>` : ''}
      </div>` : ''}
    </div>
    ${editingFeat === base.key ? featureEditor(base, f, ch) : ''}
    ${open && !isUpgrade && family?.length ? '<div class="featkids"></div>' : ''}`;

  // Opened, a base unfolds the upgrades it carries underneath itself.
  const kids = el.querySelector('.featkids');
  if (kids) family.forEach(u => kids.appendChild(featureCard(u, ch, null, true)));

  /* The whole head opens it, not a caret: the card is the target, and a
     4mm caret is not. Anything with its own job stops the click. */
  el.querySelector('.actbody')?.addEventListener('click', ev => {
    // An upgrade lives inside its base's card; folding it must not fold that.
    ev.stopPropagation();
    if (expandedFeats.has(base.key)) expandedFeats.delete(base.key);
    else expandedFeats.add(base.key);
    if (ch) onChanged(ch); else el.classList.toggle('open');
  });

  if (!ch) return el;

  el.querySelector('[data-feat=edit]')?.addEventListener('click', () => {
    editingFeat = editingFeat === base.key ? null : base.key;
    onChanged(ch);
  });

  el.querySelectorAll('[data-ff]').forEach(i => i.addEventListener('change', () => {
    setOverride(ch, base, i.dataset.ff, i.value);
    onChanged(ch);
  }));

  el.querySelector('[data-feat=reset]')?.addEventListener('click', () => {
    clearOverride(ch, base);
    onChanged(ch);
  });

  el.querySelector('[data-feat=roll]')?.addEventListener('click', () => {
    const listed = String(f.check).split(',').map(x => x.trim()).filter(Boolean);
    const keys = listed.map(checkKey).filter(Boolean);
    const key = keys[0];
    const dis = disadvantageFor(ch, key);
    askRoll({
      charName: ch.name || 'Unnamed',
      labelBase: f.name || 'Feature',
      label: `${f.name || 'Feature'} (${checkLabel(key)})`,
      mod: checkTotal(ch, key),
      rollType: dis ? 'dis' : 'flat',
      conditions: ch.conditions,
      attack: !!formulas.length,
      damage: { formula: formulas[0] || '', type: f.damageType || '' },
      note: detemplate(f.effect || ''),
    }, {
      desc: detemplate(f.effect || ''),
      forcedBy: dis,
      checks: {
        key,
        suggested: keys,
        whyShort: `${f.name || 'This'} uses`,
        why: `${f.name || 'This feature'} is written against ${listed.join(', ')}.`,
      },
      modFor: k => checkTotal(ch, k),
      disFor: k => disadvantageFor(ch, k),
    }, rollCheck);
  });

  el.querySelector('[data-feat=dmg]')?.addEventListener('click', () => {
    rollDice({ charName: ch.name || 'Unnamed', label: f.name || 'Feature', formula: formulas[0] });
  });

  el.querySelector('[data-feat=send]')?.addEventListener('click', () => {
    /* One post for the whole feature. An upgrade read out on its own says
       "deal an additional 1d6" with no sign of what it is additional to. */
    const parts = [detemplate(f.effect || '')];
    const rolls = [...formulas];
    for (const u of carried) {
      parts.push(`${shortName(u.name)}: ${detemplate(u.effect || '')}`);
      for (const r of damageFormulas(u.damage, u.effect)) if (!rolls.includes(r)) rolls.push(r);
    }
    postNote({
      charName: ch.name || 'Unnamed',
      label: f.name || 'Feature',
      tags: [f.action, f.check, f.range, f.duration].filter(Boolean),
      text: parts.join('\n\n'),
      rolls,
    });
  });

  return el;
}

/* ---- pickers ---- */

function renderPicker(ch) {
  const el = document.createElement('div');
  el.className = 'sblock pickerblock';
  const titles = { species: 'Choose a species', class: 'Choose a class', path: 'Choose a path', talent: 'Choose a talent' };

  const head = document.createElement('div');
  head.className = 'pickerhead';
  head.innerHTML = `<h4>${titles[picker]}</h4>
    <button class="tbbtn" data-picker="back">Back</button>`;
  el.appendChild(head);
  head.querySelector('[data-picker=back]').addEventListener('click', () => {
    if (picker === 'species' && speciesCrumb.option) speciesCrumb.option = null;
    else if (picker === 'species' && speciesCrumb.lineage) speciesCrumb.lineage = null;
    else picker = null;
    onChanged(ch);
  });

  if (picker === 'species') el.appendChild(speciesPicker(ch));
  else if (picker === 'class') el.appendChild(classPicker(ch));
  else el.appendChild(pathTalentPicker(ch, picker));
  return el;
}

export function optionGrid(items, onPick) {
  const grid = document.createElement('div');
  grid.className = 'pickgrid';
  items.forEach((it, i) => {
    const b = document.createElement('button');
    b.className = 'pickopt' + (it.selected ? ' on' : '');
    if (it.origin) b.style.setProperty('--opt-accent', originColor(it.origin));
    b.innerHTML = `<span class="pickname">${esc(it.name)}</span>
      ${it.sub ? `<span class="picksub">${esc(it.sub)}</span>` : ''}`;
    if (it.title) b.title = it.title;
    b.addEventListener('click', () => onPick(it, i));
    grid.appendChild(b);
  });
  return grid;
}

/**
 * Lineage -> option -> species, the same drill-down the site uses. Shared by
 * this panel and character creation.
 * @param {{lineage: string|null, option: string|null}} crumb  mutated as the user drills in
 * @param {string} selected  the species currently chosen, highlighted
 * @param {(species: object) => void} onPick  a species was chosen
 * @param {() => void} rerender  the crumb changed; draw again
 */
export function speciesDrill(crumb, selected, onPick, rerender) {
  const all = speciesList();
  if (!crumb.lineage) {
    const lineages = [...new Set(all.map(s => s.lineage))].sort();
    return optionGrid(
      lineages.map(l => ({ name: l, sub: `${all.filter(s => s.lineage === l).length} species` })),
      it => { crumb.lineage = it.name; rerender(); });
  }
  const inLineage = all.filter(s => s.lineage === crumb.lineage);
  if (!crumb.option) {
    const options = [...new Set(inLineage.map(s => s.option))].sort();
    if (options.length === 1) crumb.option = options[0];
    else {
      return optionGrid(
        options.map(o => ({ name: o, sub: `${inLineage.filter(s => s.option === o).length} species` })),
        it => { crumb.option = it.name; rerender(); });
    }
  }
  const list = inLineage.filter(s => s.option === crumb.option);
  return optionGrid(
    list.map(s => ({
      name: s.name, sub: s.feature_name || '', origin: s.origin,
      selected: s.name === selected,
      title: s.feature_effect || '',
    })),
    it => onPick(list.find(x => x.name === it.name)));
}

/** Copy a species' identity and features onto a character. */
export function applySpecies(ch, s) {
  ch.species = s.name;
  ch.speciesLineage = s.lineage;
  ch.speciesOption = s.option;
  ch.speciesFeature = s.feature_name
    ? { name: s.feature_name, effect: s.feature_effect, action: s.fetAction, check: s.fetCheck } : null;
  ch.speciesSubFeature = s['sub-fet-name']
    ? { name: s['sub-fet-name'], effect: s['sub-fet-effect'] } : null;
  ch.size ||= s.size || '';
  ch.language ||= s.language || '';
  ch.diet ||= s.diet || '';
}

function speciesPicker(ch) {
  return speciesDrill(speciesCrumb, ch.species, s => {
    applySpecies(ch, s);
    picker = null;
    onChanged(ch);
  }, () => onChanged(ch));
}

function classPicker(ch) {
  const light = get('classes');
  return optionGrid(
    CLASS_KEYS.map(k => ({
      name: titleCase(k), sub: `${pathsFor(k).length} paths · ${talentsFor(k).length} talents`,
      selected: k === ch.classKey, key: k,
      title: Object.values(light || {}).find(c => (c.name || '').toLowerCase() === k)?.description || '',
    })),
    it => {
      const key = CLASS_KEYS[CLASS_KEYS.findIndex(k => titleCase(k) === it.name)];
      if (key !== ch.classKey) {
        // Paths and talents belong to a class; changing it clears both.
        ch.classKey = key;
        ch.pathName = '';
        ch.talentName = '';
        ch.progression.pathChecked = {};
        ch.progression.talentChecked = {};
      }
      picker = null;
      onChanged(ch);
    });
}

function pathTalentPicker(ch, kind) {
  const list = kind === 'path' ? pathsFor(ch.classKey) : talentsFor(ch.classKey);
  const steps = e => (kind === 'path' ? e.path.steps : e.talent.steps).length;
  return optionGrid(
    list.map(e => ({
      name: e.name, sub: `${e.origin} · ${steps(e)} steps`, origin: e.origin,
      selected: e.name === (kind === 'path' ? ch.pathName : ch.talentName),
      title: e.desc || '',
    })),
    it => {
      if (kind === 'path') { ch.pathName = it.name; ch.progression.pathChecked = {}; }
      else { ch.talentName = it.name; ch.progression.talentChecked = {}; }
      picker = null;
      onChanged(ch);
    });
}

/** Leaving the panel closes any open picker. */
export function resetFeaturePicker() { picker = null; }
