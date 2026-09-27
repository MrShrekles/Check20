/* The character rail: vertical tabs down the right edge of the map that
   expand into panels over it.

   The rail deliberately has no scrim and no modal state. Its container passes
   the pointer straight through, so the map stays fully interactive while a
   panel is open — you can aim, drag and target with the sheet on screen.

   One character is "set" at a time, chosen from the roster or from a token. */

import { state, id, activeLayer } from './state.js';
import { $, esc, toast, safeColor } from './dom.js';
import {
  CHECKS, ALL_CHECKS, checkTotal, checkLabel, woundsMax, manaMax, castingCheck,
  movement, lowLight, reconcile, applyDamage, heal,
} from './character.js';
import { grouped, disadvantageFor, hasCondition, toggleCondition, MAJOR } from './conditions.js';
import { rollCheck, addMsg, now, renderSpeakers } from './chat.js';
import { askRoll } from './rolltray.js';
import { d20, fmtMod } from './dice.js';
import { renderInit, addCombatant, clampTurn } from './initiative.js';
import { renderRoster } from './roster.js';
import { setNotifyFocus } from './notify.js';
import { refreshTokenCard } from './tokencard.js';
import { recoveryBlock } from './recovery.js';
import { view, requestDraw } from './view.js';
import { s2w, snapCenter } from './geometry.js';
import { computeLight } from './lighting.js';
import { renderFeaturesPanel, initFeatures, ensureFeatureData, resetFeaturePicker } from './features.js';
import { renderGearPanel, initGear, ensureGearData, resetGearBrowser } from './gear.js';
import { renderSpellsPanel, initSpells, ensureSpellData, resetSpellBrowser, spellTabs } from './spells.js';
import { renderRefPanel, initReference, refTabs } from './reference.js';
import { ensureTableData } from './tables.js';
import { renderProgressionPanel, initProgression } from './progression.js';
import { renderBioPanel, initBio } from './bio.js';
import { renderCreator, initCreator, ensureCreatorData, isDraft } from './creator.js';
import { revealWin } from './dock.js';

let activeId = null;
let openSection = null;

/* Which inner tab each multi-tab section shows. Kept per session, not per
   character, so switching characters leaves you where you were looking. */
const subTab = { kit: 'features', spells: 'favorites', ref: 'tables' };

/* Damage and heal notes, kept per character so they survive a re-render. */
const notes = new Map();

export const activeCharacter = () => state.chars.find(c => c.id === activeId) || null;
export const activeCharacterId = () => activeId;
export const openSectionName = () => openSection;

/** Put a character in the rail, optionally opening a section with it. */
export function setActiveCharacter(ch, section = 'checks') {
  if (!ch) return;
  if (ch.id !== activeId) { resetFeaturePicker(); resetGearBrowser(); resetSpellBrowser(); }
  activeId = ch.id;
  setNotifyFocus(ch.name);
  if (section) openSection = section;
  if (isDraft(ch)) ensureCreatorData().then(renderRail).catch(() => { });
  renderRail();
  renderRoster();   // the roster marks which character is set
}

export function clearActiveCharacter() {
  activeId = null;
  setNotifyFocus('');
  openSection = null;
  renderRail();
  renderRoster();
}

/* Names the roster and token card already use. */
/** Open a character's rail, on a named section. The token card uses this to
    jump straight to their kit or their spells rather than dropping everyone on
    Checks and making them find it. */
export const openSheet = (ch, section = 'checks') => setActiveCharacter(ch, section);
export const closeSheet = () => clearActiveCharacter();

export function refreshSheet(ch) {
  if (activeId && (!ch || ch.id === activeId)) renderRail();
}

/* Every edit funnels through here so rail, roster, token card and map agree. */
function changed(ch) {
  reconcile(ch);
  renderRail();
  renderRoster();
  refreshTokenCard();
  requestDraw();
}

/* ---- rail ---- */

const SECTION_NAMES = {
  checks: 'Checks', kit: 'Features & Gear', spells: 'Spells',
  prog: 'Progression', bio: 'Bio', ref: 'Reference',
};

/* Sections with inner tabs: the tab list, and what each tab renders. */
const TABBED = {
  kit: {
    tabs: () => [['features', 'Features'], ['gear', 'Gear']],
    render: (ch, t) => t === 'gear' ? renderGearPanel(ch) : renderFeaturesPanel(ch),
  },
  spells: { tabs: ch => spellTabs(ch), render: (ch, t) => renderSpellsPanel(ch, t) },
  ref: { tabs: () => refTabs(), render: (ch, t) => renderRefPanel(ch, t) },
};

const SECTIONS = {
  checks: renderChecksPanel,
  prog: renderProgressionPanel,
  bio: renderBioPanel,
};

function note(text) {
  const el = document.createElement('div');
  el.className = 'sempty';
  el.textContent = text;
  return el;
}

function subTabBar(sec, ch) {
  const bar = document.createElement('div');
  bar.className = 'subtabs';
  bar.innerHTML = TABBED[sec].tabs(ch).map(([k, label]) =>
    `<button type="button" data-sub="${k}" class="${k === subTab[sec] ? 'on' : ''}">${label}</button>`).join('');
  bar.addEventListener('click', e => {
    const b = e.target.closest('[data-sub]');
    if (!b || b.dataset.sub === subTab[sec]) return;
    subTab[sec] = b.dataset.sub;
    resetFeaturePicker(); resetGearBrowser();
    renderRail();
  });
  return bar;
}

export function renderRail() {
  const rail = $('edgeRail');
  const panel = $('edgePanel');
  const ch = activeCharacter();
  rail.hidden = !ch;
  if (!ch) return;
  reconcile(ch);
  const creating = isDraft(ch);
  if (creating && !openSection) openSection = 'checks';
  rail.classList.toggle('creating', creating);

  for (const tab of rail.querySelectorAll('.edgetab')) tab.classList.toggle('on', tab.dataset.sec === openSection);

  // Keep the scroll position across re-renders of the same section.
  const keepScroll = panel.dataset.sec === openSection ? panel.scrollTop : 0;
  panel.hidden = !openSection;
  panel.innerHTML = '';
  panel.dataset.sec = openSection || '';
  if (!openSection) return;

  const sec = openSection;
  const head = document.createElement('div');
  head.className = 'edgepanelhead';
  head.innerHTML = `
    <span class="sheetdot" style="background:${safeColor(ch.color)}"></span>
    <span class="sectionname">${esc(creating ? 'Create' : SECTION_NAMES[sec] || sec)}</span>
    <span class="sep">/</span>
    <h3>${esc(ch.name || (creating ? 'New character' : 'Unnamed'))}</h3>
    <span class="sheetsub">${esc([ch.species, ch.classKey, ch.pathName].filter(Boolean).join(' · '))}</span>
    <button class="icobtn" data-rail="close" title="Close (Esc)">
      <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>`;
  panel.appendChild(head);

  if (creating) panel.appendChild(renderCreator(ch));
  else if (TABBED[sec]) {
    panel.appendChild(subTabBar(sec, ch));
    panel.appendChild(TABBED[sec].render(ch, subTab[sec]));
  } else panel.appendChild(SECTIONS[sec](ch));

  panel.scrollTop = keepScroll;
}

/* ---- Checks panel ---- */

function renderChecksPanel(ch) {
  const frag = document.createDocumentFragment();
  frag.appendChild(identityBlock(ch));
  frag.appendChild(checksBlock(ch));
  frag.appendChild(healthBlock(ch));
  frag.appendChild(recoveryBlock(ch, changed, block));
  frag.appendChild(conditionsBlock(ch));
  return frag;
}

function block(title, cog) {
  const el = document.createElement('div');
  el.className = 'sblock';
  el.innerHTML = cog
    ? `<div class="sblockhead"><h4>${title}</h4>
         <button class="cogbtn" data-cog title="${cog}">⚙</button></div>`
    : `<h4>${title}</h4>`;
  return el;
}

/* A block's editor drawer: the numbers that feed the derived values, kept
   behind a cog so the panel stays about play rather than setup. The model has
   carried these fields since the start; nothing on the sheet ever showed them. */
function modifierDrawer(ch, changed) {
  const d = document.createElement('div');
  d.className = 'smods';
  d.hidden = true;
  d.innerHTML = `
    <div class="smodgrid">
      <label>Wound bonus
        <input type="number" data-mod-f="res.hp.bonus" value="${ch.res.hp.bonus || 0}"
          title="Added to Agility + Strength + Survival">
      </label>
      <label>Move mod
        <input type="number" data-mod-f="moveMod" value="${ch.moveMod || 0}" title="Feet, added to the base 30">
      </label>
      <label>Low light mod
        <input type="number" data-mod-f="lowlightMod" value="${ch.lowlightMod || 0}" title="Feet, added to the base 30">
      </label>
      <label>Resource name
        <input type="text" data-mod-f="res.classRes.label" value="${esc(ch.res.classRes.label || '')}"
          maxlength="18" placeholder="Class">
      </label>
      <label>Mana bonus
        <input type="number" data-mod-f="res.mana.bonus" value="${ch.res.mana.bonus || 0}"
          title="Added on top of whatever the base works out to">
      </label>
      <label>Mana base
        <input type="number" min="0" data-mod-f="res.mana.flat"
          value="${Number.isFinite(ch.res.mana.flat) ? ch.res.mana.flat : ''}"
          placeholder="from Spirit"
          title="A flat Mana pool that replaces the Spirit formula. An Intellect spellcaster reads 'You have 6 Mana': put 6 here. Leave it empty to work it out from Spirit.">
      </label>
      <label>Casts on
        <select data-mod-f="castingCheck">
          ${ALL_CHECKS.map(c => `<option value="${c.key}"${castingCheck(ch) === c.key ? ' selected' : ''}>${esc(checkLabel(c.key))}</option>`).join('')}
        </select>
      </label>
    </div>
    <div class="hint">Wounds and Mana are worked out from the checks; these are
      the bonuses on top. A Tank's +10 Wounds goes in Wound bonus. An Intellect
      spellcaster sets Mana base to 6 and Casts on to Intellect.</div>`;

  d.querySelectorAll('[data-mod-f]').forEach(i => i.addEventListener('change', () => {
    const path = i.dataset.modF;
    /* An empty Mana base is not zero: it means work it out from Spirit. Every
       other number field treats empty as zero. */
    const blankIsNull = path === 'res.mana.flat';
    const val = i.type !== 'number'
      ? i.value
      : (blankIsNull && i.value.trim() === '' ? null : (+i.value || 0));
    const parts = path.split('.');
    let t = ch;
    for (const k of parts.slice(0, -1)) t = t[k];
    t[parts.at(-1)] = val;
    changed(ch);
  }));
  return d;
}

function identityBlock(ch) {
  const el = block('Character');
  const wrap = document.createElement('div');
  wrap.className = 'sidrow';
  wrap.innerHTML = `
    <input class="full" data-idf="name" value="${esc(ch.name)}" placeholder="Name">
    <input type="color" data-idf="color" value="${ch.color}" title="Token colour">
    <button class="tbbtn" data-act="place">Place token</button>
    <button class="tbbtn" data-act="init" title="d20 + Agility">Initiative</button>`;
  el.appendChild(wrap);

  wrap.querySelectorAll('[data-idf]').forEach(i => i.addEventListener('input', () => {
    ch[i.dataset.idf] = i.value;
    if (i.dataset.idf === 'name') setNotifyFocus(ch.name);
    if (i.dataset.idf === 'color') recolourTokens(ch);
    const head = i.closest('.edgepanel').querySelector('.edgepanelhead');
    head.querySelector('h3').textContent = ch.name || 'Unnamed';
    head.querySelector('.sheetdot').style.background = ch.color;
    renderRoster(); renderSpeakers(); requestDraw();
  }));
  wrap.querySelector('[data-act=place]').addEventListener('click', () => placeToken(ch));
  wrap.querySelector('[data-act=init]').addEventListener('click', () => rollInitiative(ch));
  return el;
}

function recolourTokens(ch) {
  for (const it of state.items) if (it.charId === ch.id) it.color = ch.color;
}

/** Drop a token bound to this character at the centre of the view. */
export function placeToken(ch) {
  const layer = state.layers.find(l => l.type === 'token') || activeLayer();
  const centre = s2w(view.W / 2, view.H / 2);
  const p = snapCenter(centre.x, centre.y);

  // One body each. A character is in one place at a time, so placing again
  // brings the token you already have to the centre rather than leaving a twin
  // on the map. Anything that really does copy a character is its own feature.
  const existing = state.items.find(i => i.kind === 'token' && i.charId === ch.id);
  if (existing) {
    existing.x = p.x; existing.y = p.y;
    computeLight(); requestDraw();
    toast(`${ch.name || 'Token'} brought to centre of view`);
    return;
  }

  state.items.push({
    id: id(), layerId: layer.id, kind: 'token', charId: ch.id,
    x: p.x, y: p.y, size: 1, color: ch.color, name: ch.name || 'Unnamed',
  });
  computeLight(); requestDraw();
  toast(`${ch.name || 'Token'} placed at centre of view`);
}

function rollInitiative(ch) {
  const agi = checkTotal(ch, 'agi');
  const r = d20() + agi;
  addCombatant(ch.name || 'Unnamed', r, { charId: ch.id });
  // `turn` indexes the played order, which is shorter than the list when the
  // opposition acts as one, so only initiative.js can clamp it safely.
  clampTurn();
  revealWin('init');
  renderInit();
  addMsg({ kind: 'sys', text: `${ch.name || 'Unnamed'} rolls Initiative: ${r} (d20 ${fmtMod(agi)})`, time: now() });
}

const fmt = n => (n >= 0 ? '+' : '') + n;

function checksBlock(ch) {
  const el = block('Checks');
  const grid = document.createElement('div');
  grid.className = 'scheckcols';

  for (const [group, label] of [['physical', 'Physical'], ['mental', 'Mental']]) {
    const col = document.createElement('div');
    col.innerHTML = `<h5>${label}</h5>`;
    for (const { key } of CHECKS[group]) {
      const c = ch.checks[key];
      const dis = disadvantageFor(ch, key);
      const row = document.createElement('div');
      row.className = 'scheck' + (dis ? ' dis' : '');
      row.innerHTML = `
        <button class="sckroll" data-roll="${key}" title="${dis ? esc(dis) + ' forces Disadvantage. ' : ''}Click to roll">
          ${checkLabel(key)}${dis ? `<span class="disflag" title="${esc(dis)}">DIS</span>` : ''}
        </button>
        <span class="sckparts">
          <input type="number" data-mod="${key}" value="${c.mod}" title="Check value">
          <input type="number" data-bonus="${key}" value="${c.bonus}" title="Manual bonus">
          ${c.armorBonus ? `<span class="ckarmor" title="From armour">${fmt(c.armorBonus)}</span>` : ''}
        </span>
        <b class="scktotal">${fmt(checkTotal(ch, key))}</b>`;
      col.appendChild(row);
    }
    grid.appendChild(col);
  }
  el.appendChild(grid);

  el.querySelectorAll('[data-roll]').forEach(b => b.addEventListener('click', () => {
    const key = b.dataset.roll;
    const dis = disadvantageFor(ch, key);
    askRoll({
      charName: ch.name || 'Unnamed', labelBase: '', label: checkLabel(key),
      mod: checkTotal(ch, key),
      rollType: dis ? 'dis' : 'flat', conditions: ch.conditions,
    }, {
      forcedBy: dis,
      // Clicked a check by name, so there is nothing to explain — but a
      // narrator asking for "the same thing on Luck" can still swap it.
      checks: { key, suggested: [key], whyShort: 'You picked' },
      modFor: k => checkTotal(ch, k),
      disFor: k => disadvantageFor(ch, k),
    }, rollCheck);
  }));
  el.querySelectorAll('[data-mod]').forEach(i => i.addEventListener('change', () => {
    ch.checks[i.dataset.mod].mod = +i.value || 0; changed(ch);
  }));
  el.querySelectorAll('[data-bonus]').forEach(i => i.addEventListener('change', () => {
    ch.checks[i.dataset.bonus].bonus = +i.value || 0; changed(ch);
  }));
  return el;
}

function healthBlock(ch) {
  const el = block('Health', 'Wound bonus, movement and the resource name');
  const wm = woundsMax(ch), mm = manaMax(ch);
  const pct = Math.max(0, Math.min(100, ch.res.hp.current / wm * 100));
  const noteText = notes.get(ch.id) || '';

  const drawer = modifierDrawer(ch, changed);
  el.querySelector('[data-cog]').addEventListener('click', () => { drawer.hidden = !drawer.hidden; });

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="sresgrid">
      ${resTile('Wounds', 'res.hp.current', ch.res.hp.current, wm, true)}
      ${resTile('Armor', 'res.armor.current', ch.res.armor.current, ch.res.armor.max, false, 'res.armor.max')}
      ${resTile('Mana', 'res.mana.current', ch.res.mana.current, mm, true)}
      ${resTile(esc(ch.res.classRes.label || 'Class'), 'res.classRes.current', ch.res.classRes.current, ch.res.classRes.max, false, 'res.classRes.baseMax')}
    </div>
    <div class="woundbar" style="margin:9px 2px"><i style="width:${pct}%"></i></div>
    <div class="sdamagerow">
      <label>Take damage</label>
      <input type="number" id="sDmg" min="0" placeholder="0">
      <button class="tbbtn" id="sDmgApply">Apply</button>
      <input type="number" id="sHeal" min="0" placeholder="0">
      <button class="tbbtn" id="sHealApply">Heal</button>
    </div>
    <div class="sdamagehint" id="sDmgHint"${noteText ? '' : ' hidden'}>${esc(noteText)}</div>
    <div class="derivedrow" style="margin-top:9px">
      <span title="Base 30 ft, +5 ft per 2 Agility">Movement <b>${movement(ch)} ft</b></span>
      <span title="Base 30 ft, +5 ft per 2 Observation">Low light <b>${lowLight(ch)} ft</b></span>
    </div>`;
  el.appendChild(drawer);
  el.appendChild(wrap);

  wrap.querySelectorAll('[data-res]').forEach(i => i.addEventListener('change', () => {
    setPath(ch, i.dataset.res, +i.value || 0); changed(ch);
  }));
  wrap.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => {
    const path = b.dataset.step;
    setPath(ch, path, Math.max(0, (getPath(ch, path) || 0) + +b.dataset.delta));
    changed(ch);
  }));
  wrap.querySelector('#sDmgApply').addEventListener('click', () => {
    const r = applyDamage(ch, wrap.querySelector('#sDmg').value);
    if (!r) return;
    const parts = [];
    if (r.armorHit) parts.push(`${r.armorHit} to armour`);
    if (r.woundsHit) parts.push(`${r.woundsHit} to wounds`);
    notes.set(ch.id, `−${r.dmg}: ${parts.join(', ')}${r.downed ? ' — Injured' : ''}`);
    changed(ch);
  });
  wrap.querySelector('#sHealApply').addEventListener('click', () => {
    const r = heal(ch, wrap.querySelector('#sHeal').value);
    if (!r) return;
    notes.set(ch.id, `+${r.healed} wounds`);
    changed(ch);
  });
  return el;
}

function resTile(label, path, cur, max, derivedMax, maxPath) {
  return `<div class="srestile">
    <div class="rl">${label}</div>
    <div class="rv">
      <button class="tcstep" data-step="${path}" data-delta="-1" title="−1">−</button>
      <input type="number" data-res="${path}" value="${cur}">
      <span class="rmax">/</span>
      ${derivedMax ? `<span class="rmax rmaxfix">${max}</span>`
      : `<input type="number" data-res="${maxPath}" value="${max}">`}
      <button class="tcstep" data-step="${path}" data-delta="1" title="+1">+</button>
    </div>
  </div>`;
}

function conditionsBlock(ch) {
  const el = block('Conditions');
  const groups = grouped();
  if (!groups.size) {
    el.appendChild(note('Conditions data not loaded.'));
    return el;
  }
  const wrap = document.createElement('div');
  for (const [cat, list] of groups) {
    const row = document.createElement('div');
    row.className = 'scondgroup';
    row.innerHTML = `<h5>${esc(cat)}</h5>`;
    const chips = document.createElement('div');
    chips.className = 'scondchips';
    for (const c of list) {
      const b = document.createElement('button');
      b.className = 'scond' + (hasCondition(ch, c.name) ? ' on' : '') + (MAJOR.has(c.name) ? ' major' : '');
      b.textContent = c.name;
      b.title = [c.effect, c.duration].filter(Boolean).join('\n');
      b.addEventListener('click', () => { toggleCondition(ch, c.name); changed(ch); });
      chips.appendChild(b);
    }
    row.appendChild(chips);
    wrap.appendChild(row);
  }
  el.appendChild(wrap);
  return el;
}

/* ---- dotted-path helpers ---- */

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}
function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  keys.reduce((o, k) => o[k], obj)[last] = value;
}

/* ---- wiring ---- */

export function initSheet() {
  initReference(changed);
  initCreator({
    changed: ch => { renderRail(); renderRoster(); },
    finished: (ch, { blank }) => {
      openSection = 'checks';
      reconcile(ch);
      renderRail(); renderRoster(); renderSpeakers();
      toast(blank ? 'Blank character added' : `${ch.name} is ready`);
    },
    cancelled: ch => {
      state.chars = state.chars.filter(c => c !== ch);
      clearActiveCharacter();
      renderSpeakers();
    },
  });

  // The features panel re-renders through the same funnel as every other edit.
  initFeatures(changed);
  initGear(changed);
  initSpells(changed);
  initProgression(changed);
  initBio(changed);

  $('edgeRail').addEventListener('click', e => {
    if (e.target.closest('[data-rail=close]')) { openSection = null; return renderRail(); }
    const tab = e.target.closest('.edgetab');
    if (!tab) return;
    const sec = tab.dataset.sec;
    openSection = openSection === sec ? null : sec;
    resetFeaturePicker(); resetGearBrowser(); resetSpellBrowser();
    // Load what a section reads before it is first drawn. Progression and Bio
    // read species and class data too.
    const needs = {
      kit: () => Promise.all([ensureFeatureData(), ensureGearData()]),
      spells: ensureSpellData,
      ref: ensureTableData,
      prog: ensureFeatureData,
      bio: ensureFeatureData,
    }[openSection];
    if (needs) needs().then(renderRail).catch(() => { });
    renderRail();
  });

  window.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !openSection) return;
    if (e.target.closest('.edgepanel')) return;   // fields handle their own Esc
    openSection = null;
    renderRail();
  });
}
