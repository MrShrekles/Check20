/* The narrator's generators: loot, people, scenes, doors, afflictions, gods.

   The rules are the website's, ported from scripts/worldgen.js and the loot
   roller in scripts/narrator.js, so a haul rolled here matches one rolled
   there. The data files are the same shared ones, read-only.

   Results are kept for the session only. Two ways out of here: Send puts one
   in front of the table, in the chat log; Keep files it in the journal, where
   an NPC or a haul can be written up and handed out again later. Both are
   saved with the table. */

import { esc, toast, sendButton } from './dom.js';
import { get, load, speciesList } from './data.js';
import { postNote } from './chat.js';
import { state, id } from './state.js';
import { renderJournal } from './journal.js';

let onChanged = () => { };
let showing = 'loot';
let lootPL = 5;
const results = { loot: [], npc: [], scene: [], trap: [], curse: [], god: [] };

export function initGenerators(changedCallback) { onChanged = changedCallback; }

export const ensureGeneratorData = () => load(
  'loot', 'items', 'weapons', 'armor', 'enchanted', 'medicine', 'enchantedgen',
  'worldbuilding', 'species', 'traps', 'curses', 'gods',
);

export function resetGenerators() { showing = 'loot'; }

/* ---- picking ---- */

const pick = arr => (arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : null);
const uid = () => 'g' + Math.random().toString(36).slice(2, 9);

/* ---- loot ----
   Ported from rollLoot() in scripts/narrator.js: the tier sets how much gold,
   how many rolls, which rarities and which pools a haul draws from. */

function rollLoot(pl) {
  const config = get('loot');
  const items = get('items') || [];
  const weapons = get('weapons') || [];
  const armor = get('armor') || [];
  const enchanted = get('enchanted') || [];
  const medicine = get('medicine') || [];
  const enchGenRaw = get('enchantedgen') || [];

  const tiers = config?.tiers || [];
  const tier = tiers.find(t => pl >= t.min && pl <= t.max) || tiers[tiers.length - 1];
  if (!tier) return null;

  const med = cat => medicine.filter(x => x.category === cat).map(x => x.value);
  const gen = type => enchGenRaw.filter(x => x.type === type);
  const genText = type => gen(type).map(x => x.text);

  const gold = Math.floor((tier.goldMin + Math.random() * (tier.goldMax - tier.goldMin)) * pl);
  const count = tier.rolls + (Math.random() < tier.bonus ? 1 : 0);
  const rarities = tier.rarities || null;
  const byRarity = arr => {
    if (!rarities) return arr;
    const f = arr.filter(x => rarities.includes(String(x.rarity || 'common').toLowerCase()));
    return f.length ? f : arr;
  };

  const picks = [];
  for (let i = 0; i < count; i++) {
    const cat = pick(tier.pools);
    let res = null;
    if (cat === 'item') {
      const it = pick(items);
      if (it) res = { cat, name: it.name, desc: it.description || '', meta: it.category || '' };
    } else if (cat === 'medicine') {
      res = {
        cat, meta: 'Medicine',
        name: [pick(med('prefix')), pick(med('base')), pick(med('suffix'))].filter(Boolean).join(' '),
        desc: pick(med('effects')) || '',
      };
    } else if (cat === 'weapon') {
      const w = pick(byRarity(weapons));
      if (w) res = { cat, name: w.name, desc: [w.damage, w.damageType].filter(Boolean).join(' '), meta: [w.category, w.rarity].filter(Boolean).join(' · ') };
    } else if (cat === 'armor') {
      const a = pick(byRarity(armor));
      if (a) res = { cat, name: a.name, desc: a.description || `+${a.armor} Armor Rating`, meta: a.rarity || '' };
    } else if (cat === 'enchanted') {
      if (Math.random() < .5 && enchanted.length) {
        const e = pick(enchanted);
        res = { cat, name: e.name, desc: e.effect || e.description || '', meta: e.type || 'Enchanted' };
      } else {
        const base = pick([...weapons, ...armor, ...items]);
        const effectEntry = pick(gen('effect'));
        const prefix = effectEntry?.prefix || pick(genText('prefix'));
        const effect = String(effectEntry?.text || '')
          .replace('{type}', pick(genText('damageType')) || '')
          .replace('{check}', pick(genText('check')) || '')
          .replace('{origin}', pick(genText('origin')) || '')
          .replace('{language}', pick(genText('language')) || '')
          .replace('{condition}', pick(genText('condition')) || '')
          .replace('{manner}', pick(genText('manner')) || '')
          .replace('{transmission}', pick(genText('transmission')) || '');
        res = { cat, name: `${prefix || 'Enchanted'} ${base?.name || 'Item'}`, desc: effect, meta: 'Enchanted' };
      }
    }
    if (res) picks.push(res);
  }

  return {
    id: uid(),
    title: `${tier.label} haul`,
    sub: `PL ${pl}`,
    tags: [`${gold} GP`],
    rows: picks.map(p => [p.name, [p.desc, p.meta].filter(Boolean).join(' · ')]),
    text: `${tier.label} haul at PL ${pl}: ${gold} GP`
      + (picks.length ? `, ${picks.map(p => p.name).join(', ')}` : ', and nothing else'),
  };
}

/* ---- people and scenes ---- */

const NAME_STYLES = ['fantasy', 'twenties', 'victorian', 'goblin'];

function rollName(style = pick(NAME_STYLES)) {
  const n = get('worldbuilding')?.names || {};
  const p = key => pick(n[key]) || '';
  if (style === 'fantasy') return `${p('fantasy-start')}${p('fantasy-core')}${p('fantasy-end')}`;
  if (style === 'goblin') return `${p('goblin-prefix')}${p('goblin-suffix')}`;
  if (style === 'victorian') return `${p('victorian-first')} ${p('victorian-last')}`;
  return `${p('twenties-first')} ${p('twenties-last')}`;
}

/* The regions an NPC can come from. The table repeats entries to weight a
   random roll, so the picker shows each place once. */
export const regionList = () =>
  [...new Set((get('worldbuilding')?.habitats || []).map(s => String(s).trim()).filter(Boolean))].sort();

/* What the narrator pinned down before rolling. Kept here rather than in the
   panel because the panel is rebuilt after every roll. */
export const npcOpts = { style: '', from: '', species: '' };

function rollNPC(opts = {}) {
  const w = get('worldbuilding') || {};
  const species = opts.species || pick(speciesList())?.name || 'Human';
  const name = rollName(opts.style || pick(NAME_STYLES));
  const role = pick(w.people) || 'a stranger';
  const want = pick(w.motivations) || 'something they will not name';
  const item = pick(w.signatureItems) || '';
  const trade = pick(w.affinities) || '';
  const from = opts.from || pick(w.habitats) || '';
  return {
    id: uid(),
    title: name,
    sub: [species, trade].filter(Boolean).join(' · '),
    tags: [from].filter(Boolean),
    rows: [
      ['To the party', role],
      ['Wants', want],
      item ? ['Carries', item] : null,
    ].filter(Boolean),
    text: `${name}, ${species}${trade ? ` (${trade})` : ''}${from ? ` out of ${from}` : ''} — ${role}. Wants: ${want}.${item ? ` Carries ${item}.` : ''}`,
  };
}

function rollScene() {
  const w = get('worldbuilding') || {};
  const where = pick(w.locations) || 'somewhere quiet';
  const who = pick(w.people) || 'a stranger';
  const what = pick(w.conflicts) || 'a complication';
  const thing = pick(w.objects) || '';
  return {
    id: uid(),
    title: where.replace(/^(a|an|the) /i, c => c.toUpperCase()),
    sub: what,
    tags: [],
    rows: [
      ['Where', where],
      ['Who', who],
      ['Trouble', what],
      thing ? ['On the table', thing] : null,
    ].filter(Boolean),
    text: `At ${where}: ${who} is caught up in ${what}${thing ? `, and ${thing} is in the middle of it` : ''}.`,
  };
}

/* ---- doors, locks and traps ----
   The site's rule: damage is PL d6, and an area is PL x 5 feet. */

function rollTrap(pl) {
  const all = get('traps') || [];
  const byType = t => all.filter(x => x.type === t);
  const door = pick(byType('door'))?.text || 'A plain door';
  const lock = pick(byType('lock')) || { name: '?', key: '?', hint: '?' };
  const trap = pick(byType('trap')) || { name: '?', dmg: '?', effect: '?' };
  const effect = String(trap.effect || '').replace('{dmg}', `${pl}d6`).replace('{range}', `${pl * 5}ft`);
  return {
    id: uid(),
    title: `${lock.name} lock`,
    sub: `PL ${pl} · ${trap.name} trap`,
    tags: [`${pl}d6`, trap.dmg].filter(Boolean),
    rows: [['Door', door], ['Key', `${lock.key} — ${lock.hint}`], ['Trap', effect]],
    rolls: [`${pl}d6`],
    text: `${door}. ${lock.name} lock: ${lock.key} — ${lock.hint}. ${trap.name} trap: ${effect}`,
  };
}

/* ---- afflictions and gods ---- */

function rollAffliction() {
  const c = get('curses') || {};
  const all = [...(c.curses || []), ...(c.diseases || [])];
  const a = pick(all);
  if (!a) return null;
  const steps = (a.sections?.[0]?.steps || []).slice(0, 3);
  return {
    id: uid(),
    title: a.name,
    sub: [a.subtitle, a.type].filter(Boolean).join(' · '),
    tags: [a.source].filter(Boolean),
    rows: steps.map(s => [s.name || 'Step', s.desc || '']),
    text: `${a.name}${a.subtitle ? ` (${a.subtitle})` : ''}: ${a.desc || ''}`,
  };
}

function rollGod() {
  const g = pick(get('gods') || []);
  if (!g) return null;
  return {
    id: uid(),
    title: g.name,
    sub: [g.rank, g.lineage].filter(Boolean).join(' · '),
    tags: String(g.words || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 4),
    /* `worship` and `cursePassive` are empty for all 109 gods and
       `blessFeature` for 95 of them, so the name carries the row and the
       feature joins it only when the data has one. Otherwise the card showed
       a heading with nothing under it. `desc` is the one field written for
       every god, so it leads. */
    rows: [
      g.desc ? ['About', g.desc] : null,
      g.location ? ['Found', g.location] : null,
      g.blessName ? ['Blessing', [g.blessName, g.blessFeature].filter(Boolean).join(' — ')] : null,
      g.curseName ? ['Curse', [g.curseName, g.cursePassive].filter(Boolean).join(' — ')] : null,
    ].filter(Boolean),
    text: `${g.name}${g.rank ? `, ${g.rank}` : ''} — ${g.words || ''}. ${g.desc || ''}`,
  };
}

/* ---- the panel ---- */

/* The choices a narrator can pin down before rolling an NPC. Anything left on
   "Any" is rolled as before, so the quick path is still one click. */
function npcControls() {
  const opt = (v, label, sel) => `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${esc(label)}</option>`;
  const names = speciesList().map(s => s.name).filter(Boolean).sort();
  return `
    <label class="genopt">Name
      <select data-gen-opt="style">
        ${opt('', 'Any', npcOpts.style)}
        ${NAME_STYLES.map(s => opt(s, s[0].toUpperCase() + s.slice(1), npcOpts.style)).join('')}
      </select>
    </label>
    <label class="genopt">From
      <select data-gen-opt="from">
        ${opt('', 'Anywhere', npcOpts.from)}
        ${regionList().map(h => opt(h, h, npcOpts.from)).join('')}
      </select>
    </label>
    <label class="genopt">Species
      <select data-gen-opt="species">
        ${opt('', 'Any', npcOpts.species)}
        ${names.map(n => opt(n, n, npcOpts.species)).join('')}
      </select>
    </label>`;
}

const TABS = [
  ['loot', 'Loot', pl => rollLoot(pl), true],
  ['npc', 'NPC', (pl, o) => rollNPC(o), false, npcControls],
  ['scene', 'Scenes', () => rollScene(), false],
  ['trap', 'Doors', pl => rollTrap(pl), true],
  ['curse', 'Curses', () => rollAffliction(), false],
  ['god', 'Gods', () => rollGod(), false],
];

export const generatorTabs = () => TABS.map(([k, label]) => [k, label]);

export function renderGeneratorsPanel(tab = 'loot') {
  showing = TABS.some(t => t[0] === tab) ? tab : 'loot';
  const entry = TABS.find(t => t[0] === showing);
  const wrap = document.createElement('div');

  if (!get('loot')) {
    wrap.className = 'sempty';
    wrap.textContent = 'Loading the tables…';
    ensureGeneratorData().then(onChanged).catch(() => { wrap.textContent = 'The generator tables could not be loaded.'; });
    return wrap;
  }

  const [, label, roll, usesPL, controls] = entry;
  const bar = document.createElement('div');
  bar.className = 'genbar';
  bar.innerHTML = `
    ${usesPL ? `<label class="genpl">PL <input type="number" id="genPL" min="1" max="20" value="${lootPL}"></label>` : ''}
    ${controls ? controls() : ''}
    <button class="tbbtn genroll" data-gen-roll>Roll ${esc(label.toLowerCase())}</button>
    ${results[showing].length ? '<button class="tbbtn" data-gen-clear>Clear</button>' : ''}`;
  wrap.appendChild(bar);

  const list = document.createElement('div');
  list.className = 'genlist';
  wrap.appendChild(list);

  const draw = () => {
    list.innerHTML = '';
    if (!results[showing].length) {
      list.innerHTML = `<div class="sempty">Nothing rolled yet. ${usesPL ? 'Set a power level and roll.' : 'Give it a roll.'}</div>`;
      return;
    }
    for (const r of results[showing]) list.appendChild(resultCard(r));
  };

  // A choice sticks the moment it is made, so it survives the rebuild a roll
  // triggers and the narrator does not set it again for every NPC.
  for (const sel of bar.querySelectorAll('[data-gen-opt]')) {
    sel.addEventListener('change', () => { npcOpts[sel.dataset.genOpt] = sel.value; });
  }

  bar.querySelector('[data-gen-roll]').addEventListener('click', () => {
    const pl = usesPL ? Math.max(1, Math.min(20, +bar.querySelector('#genPL')?.value || lootPL)) : 0;
    if (usesPL) lootPL = pl;
    const opts = {};
    for (const sel of bar.querySelectorAll('[data-gen-opt]')) if (sel.value) opts[sel.dataset.genOpt] = sel.value;
    const r = roll(pl, opts);
    if (!r) return toast('That table came back empty');
    results[showing].unshift(r);
    results[showing] = results[showing].slice(0, 12);
    onChanged();
  });
  bar.querySelector('[data-gen-clear]')?.addEventListener('click', () => {
    results[showing] = [];
    onChanged();
  });

  draw();
  return wrap;
}

/* A result, written out the way a journal entry wants it. */
function asEntry(r) {
  const lines = [
    r.sub || '',
    r.tags?.length ? r.tags.join(' · ') : '',
    '',
    ...r.rows.map(([k, v]) => `${k}: ${v}`),
  ].filter((l, i) => l !== '' || i > 1);
  return { title: r.title, body: lines.join('\n').trim() };
}

function resultCard(r) {
  const el = document.createElement('div');
  el.className = 'gencard';
  el.innerHTML = `
    <div class="genhead">
      <b>${esc(r.title)}</b>
      ${r.sub ? `<span class="gensub">${esc(r.sub)}</span>` : ''}
      <button class="icobtn" data-gen-del title="Discard">
        <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>
    ${r.tags?.length ? `<div class="feattags">${r.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
    ${r.rows.map(([k, v]) => `<div class="genrow"><span>${esc(k)}</span><p>${esc(v)}</p></div>`).join('')}
    <div class="gearacts">
      ${sendButton('Send to chat', 'data-gen-send')}
      <button class="tbbtn" data-gen-keep title="File this in the journal">Keep</button>
    </div>`;

  el.querySelector('[data-gen-send]').addEventListener('click', () => {
    postNote({ charName: 'Narrator', label: r.title, tags: r.tags, text: r.text, rolls: r.rolls });
  });
  el.querySelector('[data-gen-keep]').addEventListener('click', () => {
    const { title, body } = asEntry(r);
    state.journal.unshift({ id: id(), title, body, notes: [], open: false });
    renderJournal();
    toast(`${title} filed in the journal`);
  });
  el.querySelector('[data-gen-del]').addEventListener('click', () => {
    results[showing] = results[showing].filter(x => x.id !== r.id);
    onChanged();
  });
  return el;
}
