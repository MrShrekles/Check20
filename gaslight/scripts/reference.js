/* The Reference panel: the same three tabs as active-sheet's.

   Damage Tables  every table from damage.json; roll one straight into chat
   Conditions     every condition with its effect and duration, what it does to
                  rolls, and a button to put it on (or take it off) this character
   Actions        the glossary's action entries, grouped as the rules group them */

import { esc, detemplate } from './dom.js';
import { grouped, hasCondition, toggleCondition, CONDITION_DISADVANTAGE, MAJOR } from './conditions.js';
import { glossaryEntries } from './glossary.js';
import { damageTables, damageRule, ensureTableData, rollDamageTable, TABLE_GROUPS } from './tables.js';
import { get } from './data.js';

let onChanged = () => { };
export function initReference(changedCallback) { onChanged = changedCallback; }

export const refTabs = () => [['tables', 'Damage Tables'], ['conditions', 'Conditions'], ['actions', 'Actions']];

export function renderRefPanel(ch, tab = 'tables') {
  if (tab === 'conditions') return conditionsTab(ch);
  if (tab === 'actions') return actionsTab();
  return tablesTab(ch);
}

function note(text) {
  const el = document.createElement('div');
  el.className = 'sempty';
  el.textContent = text;
  return el;
}

/* ---- damage tables ---- */

function tablesTab(ch) {
  if (!get('damage')) {
    const el = note('Loading damage tables…');
    ensureTableData().then(() => onChanged(ch)).catch(() => { el.textContent = 'Damage tables could not be loaded.'; });
    return el;
  }
  const frag = document.createDocumentFragment();
  const rule = document.createElement('p');
  rule.className = 'refrule';
  rule.textContent = damageRule();
  frag.appendChild(rule);

  const byGroup = {};
  for (const [name, t] of Object.entries(damageTables())) (byGroup[t.category || 'Other'] ||= []).push([name, t]);
  const groups = [...TABLE_GROUPS, ...Object.keys(byGroup).filter(g => !TABLE_GROUPS.includes(g))];

  for (const g of groups) {
    if (!byGroup[g]) continue;
    const h = document.createElement('div');
    h.className = 'refgroup';
    h.textContent = g;
    frag.appendChild(h);
    for (const [name, t] of byGroup[g]) {
      const card = document.createElement('details');
      card.className = 'reftable';
      card.innerHTML = `
        <summary>
          <span class="reficon">${esc(t.icon || '')}</span>
          <b>${esc(name)}</b>
          <button class="tbbtn" data-roll title="Roll 1d6 on this table">Roll</button>
        </summary>
        ${t.desc ? `<p class="refdesc">${esc(t.desc)}</p>` : ''}
        <ol>${(t.entries || []).map(e => `<li>${esc(e)}</li>`).join('')}</ol>`;
      card.querySelector('[data-roll]').addEventListener('click', e => {
        e.preventDefault();          // do not toggle the <details>
        rollDamageTable(name, { charName: ch.name || '' });
      });
      frag.appendChild(card);
    }
  }
  return frag;
}

/* ---- conditions ---- */

function rollEffect(name) {
  const rule = CONDITION_DISADVANTAGE[name];
  if (!rule) return '';
  if (rule === 'all') return 'Disadvantage on every check';
  const phys = ['agi', 'cra', 'ste', 'str', 'sur'], ment = ['inf', 'int', 'lck', 'obs', 'spi'];
  if (phys.every(k => rule.includes(k)) && rule.length === 5) return 'Disadvantage on physical checks';
  if (ment.every(k => rule.includes(k)) && rule.length === 5) return 'Disadvantage on mental checks';
  const labels = { agi: 'Agility', cra: 'Crafting', ste: 'Stealth', str: 'Strength', sur: 'Survival', inf: 'Influence', int: 'Intellect', lck: 'Luck', obs: 'Observation', spi: 'Spirit' };
  return 'Disadvantage on ' + rule.map(k => labels[k]).join(' and ');
}

function conditionsTab(ch) {
  const groups = grouped();
  if (!groups.size) return note('Conditions data not loaded.');
  const frag = document.createDocumentFragment();
  const active = (ch.conditions || []).length;
  const top = document.createElement('p');
  top.className = 'refrule';
  top.textContent = active
    ? `${ch.name || 'This character'} has ${active} condition${active > 1 ? 's' : ''}. Active ones are marked.`
    : `Apply a condition to ${ch.name || 'this character'} from here, or on the Checks panel.`;
  frag.appendChild(top);

  for (const [cat, list] of groups) {
    const h = document.createElement('div');
    h.className = 'refgroup';
    h.textContent = cat;
    frag.appendChild(h);
    for (const c of list) {
      const on = hasCondition(ch, c.name);
      const eff = rollEffect(c.name);
      const card = document.createElement('div');
      card.className = 'refcond' + (on ? ' on' : '') + (MAJOR.has(c.name) ? ' major' : '');
      card.innerHTML = `
        <div class="refcondhead">
          <b>${esc(c.name)}</b>
          ${on ? '<span class="feattag">Active</span>' : ''}
          <button class="tbbtn" data-toggle>${on ? 'Remove' : 'Apply'}</button>
        </div>
        <p>${esc(detemplate(c.effect))}</p>
        ${eff ? `<div class="refeff">${esc(eff)}</div>` : ''}
        ${c.duration ? `<div class="gdur">${esc(c.duration)}</div>` : ''}`;
      card.querySelector('[data-toggle]').addEventListener('click', () => {
        toggleCondition(ch, c.name);
        onChanged(ch);
      });
      frag.appendChild(card);
    }
  }
  return frag;
}

/* ---- actions ---- */

const ACTION_ORDER = ['Action Economy', 'Action', 'Half-Action', 'Off-Action', 'Rest'];

function actionsTab() {
  const actions = glossaryEntries().filter(g => g.type === 'action');
  if (!actions.length) return note('The glossary has not loaded.');
  const byCat = {};
  for (const a of actions) (byCat[a.category || 'Other'] ||= []).push(a);
  const cats = [...ACTION_ORDER, ...Object.keys(byCat).filter(c => !ACTION_ORDER.includes(c))];

  const frag = document.createDocumentFragment();
  for (const cat of cats) {
    if (!byCat[cat]) continue;
    const h = document.createElement('div');
    h.className = 'refgroup';
    h.textContent = cat;
    frag.appendChild(h);
    for (const a of byCat[cat]) {
      const card = document.createElement('div');
      card.className = 'srefcard';
      card.innerHTML = `<b>${esc(a.term)}</b><p>${esc(detemplate(a.definition))}</p>`;
      frag.appendChild(card);
    }
  }
  return frag;
}
