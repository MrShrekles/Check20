/* The Gear panel: what the character carries, and what it does to them.

   Armour ratings set the armour maximum and "Stealth +1" strings on anything
   carried move the matching check — both handled by recalcEquipment() in the
   model, so this panel only has to add, remove and roll.

   Bulk over Strength is Pinned; over twice Strength adds Exhaustion. */

import { esc, toast } from './dom.js';
import { get, load } from './data.js';
import { id } from './state.js';
import { bindDragReorder } from './reorder.js';
import { bulkStatus, isArmor, checkTotal, checkKey, checkLabel } from './character.js';
import { rollCheck, rollDice } from './chat.js';
import { askRoll } from './rolltray.js';
import { disadvantageFor } from './conditions.js';

let browsing = false;
let source = 'weapons';
let search = '';
let onChanged = () => { };
/* Which item has its editor open. Kept here rather than on the item so it is
   not saved with the table: an open drawer is not part of the character. */
let editing = null;

export function initGear(changedCallback) { onChanged = changedCallback; }
export const ensureGearData = () => load('weapons', 'armor', 'items', 'damage');
export function resetGearBrowser() { browsing = false; search = ''; }

const SOURCES = [['weapons', 'Weapons'], ['armor', 'Armour'], ['items', 'Items']];

/* What kind of thing this is, from the category the catalogue gave it. Three
   families, because three is what a glance can tell apart: something you hit
   with, something you hide behind, and everything else.

   weapons.json  firearm, magic, melee, ranged
   armor.json    armor, shield
   items.json    Food & Drink, Tools & Equipment, Potions & Salves, ... */
const WEAPON_CATS = new Set(['melee', 'ranged', 'firearm', 'magic']);
const ARMOUR_CATS = new Set(['armor', 'armour', 'shield']);

export function gearKind(it) {
  const cat = String(it.category || '').trim().toLowerCase();
  if (WEAPON_CATS.has(cat)) return 'weapon';
  if (ARMOUR_CATS.has(cat)) return 'armour';
  // Fall back to what it does, for anything custom or uncategorised.
  if (String(it.check || '').trim() && String(it.damage || '').trim()) return 'weapon';
  if (+it.armor > 0) return 'armour';
  return 'kit';
}

const KIND_ICON = {
  weapon: '<svg viewBox="0 0 24 24"><path d="M20 4v4L10 18"/><path d="M16 4h4"/><path d="M7 12.5 11.5 17"/><path d="M8.6 15.4 5 19"/></svg>',
  armour: '<svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 4.2-3.2 7.6-8 9-4.8-1.4-8-4.8-8-9V6z"/></svg>',
  kit: '<svg viewBox="0 0 24 24"><rect x="4" y="7" width="16" height="13" rx="2"/><path d="M9 7V5a3 3 0 016 0v2"/></svg>',
};

export function renderGearPanel(ch) {
  const frag = document.createDocumentFragment();
  if (!get('weapons') || !get('armor') || !get('items') || !get('damage')) {
    const el = document.createElement('div');
    el.className = 'sempty';
    el.textContent = 'Loading gear data…';
    frag.appendChild(el);
    ensureGearData().then(() => onChanged(ch)).catch(() => {
      el.textContent = 'Gear data could not be loaded.';
    });
    return frag;
  }
  if (browsing) { frag.appendChild(browser(ch)); return frag; }
  frag.appendChild(carriedBlock(ch));
  return frag;
}

function block(title) {
  const el = document.createElement('div');
  el.className = 'sblock';
  el.innerHTML = `<h4>${title}</h4>`;
  return el;
}

/* ---- carried ---- */

function carriedBlock(ch) {
  const el = block('Carried');
  const bulk = bulkStatus(ch);

  const head = document.createElement('div');
  head.className = 'gearhead';
  head.innerHTML = `
    <span class="bulkread${bulk.exhausted ? ' bad' : bulk.over ? ' warn' : ''}">
      Bulk <b>${bulk.carried}</b> / ${bulk.limit}
    </span>
    ${bulk.exhausted ? '<span class="bulkwarn">Over twice Strength: Pinned and Exhaustion</span>'
      : bulk.over ? '<span class="bulkwarn">Over Strength: Pinned</span>' : ''}
    <button class="tbbtn" data-gear="add">+ Add gear</button>
    <button class="tbbtn" data-gear="custom" title="Something the catalogue does not have">+ Custom</button>`;
  el.appendChild(head);
  head.querySelector('[data-gear=add]').addEventListener('click', () => { browsing = true; onChanged(ch); });
  /* Something the catalogue has not got: a blank item, opened for editing
     straight away so there is never an unnamed row to hunt for. */
  head.querySelector('[data-gear=custom]').addEventListener('click', () => {
    const it = { id: id(), name: 'New item', category: 'Custom' };
    ch.equipment.push(it);
    editing = it.id;
    onChanged(ch);
  });

  /* The order is the player's, so it is draggable and it is saved: what you
     reach for first should be at the top, and the token card takes its
     actions from this order too. */
  const list = document.createElement('div');
  list.className = 'gearlist';
  if (!(ch.equipment || []).length) {
    list.innerHTML = '<div class="sempty" style="padding:14px 0">Carrying nothing.</div>';
  }
  (ch.equipment || []).forEach((it, i) => list.appendChild(gearRow(ch, it, i)));
  el.appendChild(list);
  bindDragReorder(list, ch.equipment || [], () => onChanged(ch));
  return el;
}

/* ---- attacking with a piece of gear ----

   Exported because the token card offers the same attacks without wanting a
   second copy of any of this: a weapon's check list, why it is that check,
   and the damage that rides along. One implementation, two ways in. */

/** Weapons carried: anything with a check to roll, in the order the player
    put them in. */
export const weaponsOf = ch => (ch.equipment || []).filter(i => String(i.check || '').trim());

/**
 * What the token card offers. Starred items if any have been starred,
 * otherwise the first few in the player's own order — so the card is useful
 * before anyone has configured anything, and exactly theirs once they have.
 */
export function cardActions(ch, max = 3) {
  const all = weaponsOf(ch);
  const pinned = all.filter(i => i.onCard);
  return (pinned.length ? pinned : all).slice(0, max);
}

export function attackWith(ch, it) {
  /* A weapon usually lists several checks — 104 of the 116 do, typically
     "Agility, Luck, Observation". Taking the first silently was the wrong
     call: the player never saw the other two, or why it was Agility. The
     tray shows the weapon's own list, says where it came from, and lets any
     check be chosen over it. */
  const listed = String(it.check || '').split(',').map(x => x.trim()).filter(Boolean);
  const keys = listed.map(checkKey).filter(Boolean);
  const key = keys[0];
  if (!key) return toast(`"${it.check || 'nothing'}" is not a check`);
  const dis = disadvantageFor(ch, key);
  askRoll({
    charName: ch.name || 'Unnamed',
    labelBase: it.name,
    label: `${it.name} (${checkLabel(key)})`,
    mod: checkTotal(ch, key),
    rollType: dis ? 'dis' : 'flat', conditions: ch.conditions, attack: true,
    damage: { formula: it.damage ? String(it.damage) : '', type: it.damageType || '' },
    note: it.notes || '',
  }, {
    desc: it.notes || '',
    forcedBy: dis,
    checks: {
      key,
      suggested: keys,
      whyShort: `${it.name} lists`,
      why: keys.length > 1
        ? `${it.name} can be used with ${listed.join(', ')}. Any other check is the narrator's call.`
        : `${it.name} lists ${listed[0]}. Any other check is the narrator's call.`,
    },
    modFor: k => checkTotal(ch, k),
    disFor: k => disadvantageFor(ch, k),
  }, rollCheck);
}

/* An item is spread straight out of the catalogue and then never editable
   again, which is wrong the moment anything happens to it: a weapon is
   enchanted, armour is dented, a narrator hands over something one of a kind.
   Every field the rest of the sheet reads is here, so what you change is what
   the attack rolls and what `recalcEquipment` sums.

   `checkBonus` and `checkPenalty` are strings like "Survival +1" because that
   is how the catalogue writes them and how `recalcEquipment` parses them. */
/* The seventeen written damage types and the categories the catalogue uses.
   Typed free-hand these drift — "fire" and "Fire", "Melee" and "melee" — and
   the damage table lookup on a roll card matches by name, so a typo silently
   costs the player their table roll. A list cannot be mistyped.

   `damageTypes()` reads the data so a new type in damage.json appears here
   without anyone remembering to add it. */
const damageTypes = () => Object.keys(get('damage')?.types || {});

const GEAR_CATEGORIES = [
  ['Weapon', ['melee', 'ranged', 'firearm', 'magic']],
  ['Armour', ['armor', 'shield']],
  ['Kit', ['Tools & Equipment', 'Potions & Salves', 'Food & Drink', 'Fashion',
    'Musical Instruments', 'Communication', 'Miscellaneous', 'Custom']],
];

/** A select that keeps whatever the item already had, even if the data has
    since dropped it — the character's own value is never thrown away. */
function selectFor(key, value, groups) {
  const flat = groups.flatMap(([, list]) => list);
  const cur = String(value ?? '');
  const extra = cur && !flat.some(v => v.toLowerCase() === cur.toLowerCase()) ? cur : null;
  return `
    <select data-gf="${key}">
      <option value=""${cur ? '' : ' selected'}>— none —</option>
      ${extra ? `<option value="${esc(extra)}" selected>${esc(extra)} (kept)</option>` : ''}
      ${groups.map(([label, list]) => `<optgroup label="${esc(label)}">
        ${list.map(v => `<option value="${esc(v)}"${v.toLowerCase() === cur.toLowerCase() ? ' selected' : ''}>${esc(v)}</option>`).join('')}
      </optgroup>`).join('')}
    </select>`;
}

function gearEditor(it) {
  const f = (key, label, hint = '', wide = false) => `
    <label class="${wide ? 'wide' : ''}">${label}
      <input type="text" data-gf="${key}" value="${esc(it[key] ?? '')}" ${hint ? `placeholder="${esc(hint)}"` : ''}>
    </label>`;
  return `
    <div class="geareditor">
      <div class="gefields">
        ${f('name', 'Name', '', true)}
        ${f('damage', 'Damage', '1d6')}
        <label>Type${selectFor('damageType', it.damageType, [['Damage types', damageTypes()]])}</label>
        ${f('check', 'Checks', 'Agility, Luck', true)}
        ${f('armor', 'Armour', '0')}
        ${f('bulk', 'Bulk', '1')}
        ${f('range', 'Range', 'Melee')}
        <label>Category${selectFor('category', it.category, GEAR_CATEGORIES)}</label>
        ${f('checkBonus', 'Check bonus', 'Survival +1', true)}
        ${f('checkPenalty', 'Check penalty', 'Stealth -1', true)}
        <label class="wide">Description
          <textarea data-gf="description" rows="2">${esc(it.description ?? '')}</textarea>
        </label>
      </div>
      <div class="gehint">Checks are a comma-separated list; the attack tray offers
        them and lets any other be chosen. Armour, bulk and the check bonus feed
        the sheet's totals.</div>
      <button class="tbbtn gedrop" data-act="drop"
        title="Take it off this character. There is no party inventory to drop it into yet.">Remove this item</button>
    </div>`;
}

function wireGearEditor(row, ch, it) {
  row.querySelectorAll('[data-gf]').forEach(i => i.addEventListener('change', () => {
    const key = i.dataset.gf;
    const raw = i.value.trim();
    // Armour and bulk are numbers to everything that reads them; the rest are
    // text, and an empty field means the item simply has none.
    if (key === 'armor' || key === 'bulk') {
      if (raw === '') delete it[key]; else it[key] = +raw || 0;
    } else if (raw === '') {
      delete it[key];
    } else {
      it[key] = raw;
    }
    onChanged(ch);
  }));
}

function gearRow(ch, it, index = 0) {
  const row = document.createElement('div');
  row.className = 'gearrow';
  const tags = [
    isArmor(it) && it.armor ? `${it.armor} armour` : null,
    it.damage ? `${it.damage} ${it.damageType || ''}`.trim() : null,
    it.range || null,
    it.bulk ? `bulk ${it.bulk}` : null,
    it.checkBonus || null,
    it.checkPenalty || null,
  ].filter(Boolean);

  row.dataset.dragIdx = index;
  const kind = gearKind(it);
  row.classList.add('kind-' + kind);
  const canAttack = !!String(it.check || '').trim();
  row.innerHTML = `
    <div class="actcard">
      <div class="actbody">
        <div class="gearmain">
          <span class="draghandle" title="Drag to reorder">
            <svg viewBox="0 0 24 24"><path d="M8 7h.01M8 12h.01M8 17h.01M16 7h.01M16 12h.01M16 17h.01"/></svg>
          </span>
          <span class="gearicon" aria-hidden="true">${KIND_ICON[kind]}</span>
          <b>${esc(it.name)}</b>
          ${it.category ? `<span class="feattag">${esc(it.category)}</span>` : ''}
          ${canAttack ? `<button class="pinbtn${it.onCard ? ' on' : ''}" data-act="pin"
            title="${it.onCard ? 'Taken off the token card' : 'Put this on the token card'}">${it.onCard ? '★' : '☆'}</button>` : ''}
        </div>
        ${tags.length ? `<div class="feattags">${tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
        ${it.description ? `<p class="geardesc">${esc(it.description)}</p>` : ''}
      </div>
      <div class="actside">
        ${it.check ? `<button class="tbbtn tb-atk" data-act="attack">Attack</button>` : ''}
        ${it.damage ? `<button class="tbbtn" data-act="damage">Damage</button>` : ''}
        <button class="tbbtn small" data-act="edit" title="Change this item, or remove it">Edit</button>
      </div>
    </div>
    ${editing === it.id ? gearEditor(it) : ''}`;

  if (editing === it.id) wireGearEditor(row, ch, it);
  row.querySelector('[data-act=edit]').addEventListener('click', () => {
    editing = editing === it.id ? null : it.id;
    onChanged(ch);
  });

  row.querySelector('[data-act=pin]')?.addEventListener('click', () => {
    if (it.onCard) delete it.onCard; else it.onCard = true;
    onChanged(ch);
  });
  /* Removing lives inside Edit: it is not something to have one slip away
     from you in a list, and a row of four buttons was one too many. */
  row.querySelector('[data-act=drop]')?.addEventListener('click', () => {
    ch.equipment = ch.equipment.filter(x => x !== it);
    if (editing === it.id) editing = null;
    onChanged(ch);
  });
  row.querySelector('[data-act=attack]')?.addEventListener('click', () => attackWith(ch, it));
  row.querySelector('[data-act=damage]')?.addEventListener('click', () => {
    rollDice({ charName: ch.name || 'Unnamed', label: `${it.name} damage`, formula: String(it.damage) });
  });
  return row;
}

/* ---- browser ---- */

function browser(ch) {
  const el = document.createElement('div');
  el.className = 'sblock pickerblock';

  const head = document.createElement('div');
  head.className = 'pickerhead';
  head.innerHTML = `<h4>Add gear</h4><button class="tbbtn" data-gear="back">Back</button>`;
  el.appendChild(head);
  head.querySelector('[data-gear=back]').addEventListener('click', () => { browsing = false; onChanged(ch); });

  const tabs = document.createElement('div');
  tabs.className = 'gearsrc';
  tabs.innerHTML = SOURCES.map(([k, label]) =>
    `<button class="tool${k === source ? ' on' : ''}" data-src="${k}">${label}</button>`).join('');
  el.appendChild(tabs);
  tabs.addEventListener('click', e => {
    const b = e.target.closest('[data-src]');
    if (b) { source = b.dataset.src; onChanged(ch); }
  });

  const box = document.createElement('input');
  box.className = 'gearsearch';
  box.placeholder = 'Search by name, category or property';
  box.value = search;
  el.appendChild(box);

  const results = document.createElement('div');
  results.className = 'gearresults';
  el.appendChild(results);

  const draw = () => {
    const q = search.trim().toLowerCase();
    const all = get(source) || [];
    const hits = all.filter(x => !q
      || (x.name || '').toLowerCase().includes(q)
      || (x.category || '').toLowerCase().includes(q)
      || (x.properties || '').toLowerCase().includes(q));
    results.innerHTML = '';
    if (!hits.length) {
      results.innerHTML = '<div class="sempty" style="padding:14px 0">Nothing matches.</div>';
      return;
    }
    for (const x of hits.slice(0, 60)) {
      const b = document.createElement('button');
      b.className = 'pickopt';
      const bits = [
        x.category, x.armor ? `${x.armor} armour` : null,
        x.damage ? `${x.damage} ${x.damageType || ''}`.trim() : null,
        x.bulk ? `bulk ${x.bulk}` : null, x.checkBonus || null, x.checkPenalty || null,
      ].filter(Boolean);
      b.innerHTML = `<span class="pickname">${esc(x.name)}</span>
        <span class="picksub">${esc(bits.join(' · '))}</span>`;
      b.title = x.description || '';
      b.addEventListener('click', () => {
        ch.equipment.push({ ...x, id: id() });
        toast(`${x.name} added`);
        onChanged(ch);
      });
      results.appendChild(b);
    }
    if (hits.length > 60) {
      const more = document.createElement('div');
      more.className = 'sempty';
      more.style.padding = '8px 0';
      more.textContent = `${hits.length - 60} more — narrow the search.`;
      results.appendChild(more);
    }
  };

  box.addEventListener('input', () => { search = box.value; draw(); });
  draw();
  return el;
}
