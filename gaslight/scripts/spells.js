/* The Spells panel, in two tabs:

   Favourites  the character's starred spells, laid open and ready to cast
   All         every spell, searchable by name and filterable by origin; star
               one to keep it in Favourites, or open it and cast it here

   A spell is cast at an intent tier — Light Whisper through Cataclysm — and
   each tier has its own range, duration, effect and mana cost. Casting spends
   the mana and rolls the spellcasting check; any [[2d6]] in the effect text is
   a damage formula and gets its own roll button. */

import { esc, toast, detemplate } from './dom.js';
import { damageFormulas } from './formulas.js';
import { get, load } from './data.js';
import { checkTotal, castingCheck, checkLabel } from './character.js';
import { askRoll } from './rolltray.js';
import { rollCheck, rollDice } from './chat.js';
import { disadvantageFor } from './conditions.js';
import { originColor } from './origins.js';

/* Ascending power. Cost comes from the data, not from this list. */
export const INTENTS = ['Light Whisper', 'Whisper', 'Surge', 'Shout', 'Roar', 'Storm', 'Cataclysm'];

/* Which check a spell rolls against is the character's, not a constant: Spirit
   by default, Intellect for an Intellect spellcaster, and so on. Set under the
   cog on Health. */

let search = '';
let originFilter = '';
let expanded = null;          // the one spell open in the All tab
let onChanged = () => { };

export function initSpells(changedCallback) { onChanged = changedCallback; }
export const ensureSpellData = () => load('spells');
export function resetSpellBrowser() { search = ''; originFilter = ''; expanded = null; }

const allSpells = () => get('spells') || [];
const spellByName = name => allSpells().find(s => s.name === name) || null;
const isFav = (ch, name) => (ch.favoriteSpells || []).includes(name);

function toggleFav(ch, name) {
  ch.favoriteSpells ||= [];
  if (isFav(ch, name)) ch.favoriteSpells = ch.favoriteSpells.filter(n => n !== name);
  else { ch.favoriteSpells.push(name); toast(`${name} added to favourites`); }
  onChanged(ch);
}

/** Dice formulas embedded in effect text, e.g. "[[2d6 + 3]]". */
export { markedFormulas as effectFormulas } from './formulas.js';

export const spellTabs = ch => [
  ['favorites', `Favourites<b>${(ch.favoriteSpells || []).length}</b>`],
  ['all', `All<b>${allSpells().length || ''}</b>`],
];

export function renderSpellsPanel(ch, tab = 'favorites') {
  const frag = document.createDocumentFragment();
  if (!get('spells')) {
    const el = document.createElement('div');
    el.className = 'sempty';
    el.textContent = 'Loading spells…';
    frag.appendChild(el);
    ensureSpellData().then(() => onChanged(ch)).catch(() => {
      el.textContent = 'Spells could not be loaded.';
    });
    return frag;
  }
  frag.appendChild(manaLine(ch));
  frag.appendChild(tab === 'all' ? allBlock(ch) : favouritesBlock(ch));
  return frag;
}

function manaLine(ch) {
  const el = document.createElement('div');
  el.className = 'manaline';
  el.innerHTML = `<span class="bulkread">Mana <b>${ch.res.mana.current}</b> / ${ch.res.mana.max}</span>`;
  return el;
}

/* ---- favourites ---- */

function favouritesBlock(ch) {
  const el = document.createElement('div');
  const favs = (ch.favoriteSpells || []).map(spellByName).filter(Boolean);
  if (!favs.length) {
    el.className = 'sempty';
    el.textContent = 'No favourites yet. Star a spell in All to keep it here.';
    return el;
  }
  favs.forEach(sp => el.appendChild(spellCard(ch, sp, { open: true })));
  return el;
}

/* ---- all ---- */

function allBlock(ch) {
  const wrap = document.createElement('div');
  const origins = [...new Set(allSpells().map(s => s.origin))].sort();

  const controls = document.createElement('div');
  controls.className = 'spellfilters';
  controls.innerHTML = `
    <input class="gearsearch" placeholder="Search by name or manner" value="${esc(search)}">
    <select>
      <option value="">All origins</option>
      ${origins.map(o => `<option value="${esc(o)}"${o === originFilter ? ' selected' : ''}>${esc(o)}</option>`).join('')}
    </select>`;
  wrap.appendChild(controls);

  const results = document.createElement('div');
  wrap.appendChild(results);

  const draw = () => {
    const q = search.trim().toLowerCase();
    const hits = allSpells().filter(s =>
      (!originFilter || s.origin === originFilter) &&
      (!q || s.name.toLowerCase().includes(q) || (s.manner || '').toLowerCase().includes(q)));
    results.innerHTML = '';
    if (!hits.length) {
      results.innerHTML = '<div class="sempty" style="padding:14px 0">Nothing matches.</div>';
      return;
    }
    for (const s of hits) results.appendChild(spellCard(ch, s, { open: s.name === expanded, collapsible: true }));
  };

  controls.querySelector('input').addEventListener('input', e => { search = e.target.value; draw(); });
  controls.querySelector('select').addEventListener('change', e => { originFilter = e.target.value; draw(); });
  draw();
  return wrap;
}

/* ---- one spell ---- */

function spellCard(ch, sp, { open = false, collapsible = false } = {}) {
  const card = document.createElement('div');
  card.className = 'spellcard' + (open ? ' open' : '') + (collapsible ? ' collapsible' : '');
  const fav = isFav(ch, sp.name);
  const tiers = [...(sp.effects || [])].sort((a, b) => INTENTS.indexOf(a.intent) - INTENTS.indexOf(b.intent));
  const costs = tiers.map(t => +t.cost || 0);

  card.innerHTML = `
    <div class="spellhead">
      <span class="opip" style="background:${originColor(sp.origin)}" title="${esc(sp.origin)}"></span>
      <b>${esc(sp.name)}</b>
      <span class="feattag">${esc(sp.manner || '')}</span>
      ${collapsible && !open ? `<span class="spellsum">${tiers.length} tiers · ${Math.min(...costs) || 'free'}–${Math.max(...costs)} MN</span>` : ''}
      <button class="favstar${fav ? ' on' : ''}" data-sp="fav" title="${fav ? 'Remove from favourites' : 'Add to favourites'}"
        aria-pressed="${fav}">${fav ? '★' : '☆'}</button>
    </div>`;

  card.querySelector('[data-sp=fav]').addEventListener('click', e => {
    e.stopPropagation();
    toggleFav(ch, sp.name);
  });
  if (collapsible) {
    card.querySelector('.spellhead').addEventListener('click', () => {
      expanded = expanded === sp.name ? null : sp.name;
      onChanged(ch);
    });
  }
  if (!open) return card;

  for (const eff of tiers) {
    const cost = +eff.cost || 0;
    const afford = cost <= ch.res.mana.current;
    /* Damage comes from the effect's own field when it has one, and from the
       dice written into its text otherwise. Both exist in the data: 12 effects
       carry a `damage` field, 28 write dice into the prose, and 9 do both. The
       field wins, because it is the authored answer. */
    /* Where a spell's damage can be, in the order it is trusted:
         1. the effect's own `damage` field   12 of 187 effects
         2. dice marked up as [[2d6]]         28 of 187
         3. dice written into the prose       22 more, marked up nowhere
       Without the third, those 22 cast with nothing. */
    const formulas = damageFormulas(eff.damage, eff.effect);
    const row = document.createElement('div');
    row.className = 'spelltier' + (afford ? '' : ' poor');
    row.innerHTML = `
      <div class="tierhead">
        <span class="tiername">${esc(eff.intent || '')}</span>
        <span class="tiercost${afford ? '' : ' short'}">${cost ? `${cost} MN` : 'free'}${afford ? '' : ` · you have ${ch.res.mana.current}`}</span>
        <span class="tiermeta">${esc([eff.range, eff.target, eff.duration].filter(Boolean).join(' · '))}</span>
      </div>
      <p>${esc(detemplate(eff.effect))}</p>
      <div class="gearacts">
        <button class="tbbtn${afford ? '' : ' short'}" data-cast="1"
          title="${afford ? 'Cast this' : `Needs ${cost} Mana and you have ${ch.res.mana.current}`}">Cast</button>
        ${formulas.map(f => `<button class="tbbtn" data-dmg="${esc(f)}">${esc(f)}</button>`).join('')}
      </div>`;

    row.querySelector('[data-cast]').addEventListener('click', () => {
      const cast = castingCheck(ch);
      const short = cost > ch.res.mana.current;
      const dis = disadvantageFor(ch, cast);
      /* The spell's own damage rides along with the cast rather than waiting
         for a second button, and its text goes to the table with it. */
      askRoll({
        charName: ch.name || 'Unnamed',
        labelBase: `${sp.name} · ${eff.intent}`,
        label: `${sp.name} · ${eff.intent}`,
        mod: checkTotal(ch, cast),
        rollType: dis ? 'dis' : 'flat',
        conditions: ch.conditions,
        note: detemplate(eff.effect || ''),
        damage: { formula: formulas[0] || '', type: eff.damageType || sp.origin || '' },
      }, {
        desc: detemplate(eff.effect || ''),
        forcedBy: dis,
        costNote: cost ? `${cost} Mana · ${ch.res.mana.current} left` : 'Free',
        warn: short
          ? `Not enough Mana: this costs ${cost} and ${ch.name || 'this character'} has ${ch.res.mana.current}. Casting anyway is the narrator's call.`
          : null,
        actionLabel: short ? 'Cast anyway' : 'Cast',
        checks: {
          key: cast,
          suggested: [cast],
          whyShort: 'You cast on',
          why: ch.castingCheck
            ? `This character casts on ${checkLabel(cast)}, set under the cog on Health.`
            : `Spells cast on ${checkLabel(cast)} unless the class says otherwise — set that under the cog on Health.`,
        },
        modFor: k => checkTotal(ch, k),
        disFor: k => disadvantageFor(ch, k),
      }, roll => {
        /* Mana is spent only once the roll is actually made, and never goes
           below zero: a narrator who allows an overcast is allowing the spell,
           not inventing a negative pool. */
        const spent = Math.min(cost, ch.res.mana.current);
        ch.res.mana.current -= spent;
        if (spent < cost) toast(`Cast with ${cost - spent} Mana short — narrator's call`);
        rollCheck(roll);
        onChanged(ch);
      });
    });
    row.querySelectorAll('[data-dmg]').forEach(b => b.addEventListener('click', () => {
      rollDice({ charName: ch.name || 'Unnamed', label: `${sp.name} damage`, formula: b.dataset.dmg });
    }));
    card.appendChild(row);
  }
  return card;
}
