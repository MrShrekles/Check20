/* The Progression panel: XP, and the path and talent steps it buys.

   Each step costs 20 XP. Path steps are linear — step N needs every earlier
   step — while talent steps may be taken in any order. Taking a step also
   grants one of: +1 to any check (max 15), +1 Mana, or +1 Class Resource;
   that pick is made on the Checks panel, so this panel only tracks the steps.

   Keys are `${entryName}:${index}` so a character who switches path keeps a
   readable record and nothing collides. */

import { esc, toast, detemplate, safeColor } from './dom.js';
import { pathEntry, talentEntry } from './features.js';
import { originColor } from './origins.js';
import { stepKey, isFreeStep, grantOpeningSteps, checkPointsTotal, unassignedSteps } from './character.js';
import { askStepGain, gainLabel } from './stepgain.js';

export const XP_PER_STEP = 20;

let onChanged = () => { };
export function initProgression(changedCallback) { onChanged = changedCallback; }

/* Step 0 is the path's own: granted, never bought. The model owns that rule;
   this panel only honours it. */
export const isFree = isFreeStep;

export function xpSpent(ch) {
  const paid = store => Object.entries(store || {})
    .filter(([key, on]) => on && !isFree(+key.slice(key.lastIndexOf(':') + 1)))
    .length;
  return (paid(ch.progression?.pathChecked) + paid(ch.progression?.talentChecked)) * XP_PER_STEP;
}

export const xpAvailable = ch => (ch.progression?.xp || 0) - xpSpent(ch);

export function renderProgressionPanel(ch) {
  const frag = document.createDocumentFragment();
  frag.appendChild(xpBlock(ch));
  const path = pathEntry(ch);
  const talent = talentEntry(ch);
  if (!path && !talent) {
    const el = document.createElement('div');
    el.className = 'sempty';
    el.textContent = 'Choose a class, path and talent on the Features panel first.';
    frag.appendChild(el);
    return frag;
  }
  const head = document.createElement('div');
  head.className = 'unlocktitle';
  head.textContent = 'Unlocks';
  frag.appendChild(head);
  if (path) frag.appendChild(stepsBlock(ch, path, 'path'));
  if (talent) frag.appendChild(stepsBlock(ch, talent, 'talent'));
  return frag;
}

function block(title) {
  const el = document.createElement('div');
  el.className = 'sblock';
  el.innerHTML = `<h4>${title}</h4>`;
  return el;
}

function xpBlock(ch) {
  const el = block('Experience');
  const total = ch.progression?.xp || 0;
  const spent = xpSpent(ch);
  const pending = unassignedSteps(ch).length;
  const avail = total - spent;
  const pct = total > 0 ? Math.min(100, spent / total * 100) : 0;

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="xprow">
      <label>Total XP</label>
      <input type="number" id="xpTotal" min="0" value="${total}">
      <span class="xpstat">Spent <b>${spent}</b></span>
      <span class="xpstat${avail < 0 ? ' over' : avail >= XP_PER_STEP ? ' ready' : ''}">Available <b>${avail}</b></span>
    </div>
    <div class="woundbar" style="margin:8px 2px"><i style="width:${pct}%"></i></div>
    <div class="xprow">
      <label>Check points</label>
      <span class="xpstat"><b>${checkPointsTotal(ch)}</b> across the ten checks</span>
      ${pending ? `<button class="tbbtn gainchip none" data-assign-all>${pending} step${pending === 1 ? '' : 's'} without a grant</button>` : ''}
    </div>
    <div class="hint">${XP_PER_STEP} XP per step. Each step also grants +1 to any
      check (capped at 15), +1 Mana, or +1 Class Resource.</div>`;
  el.appendChild(wrap);
  /* Walk whatever is still unassigned, one modal after the next, so a
     character imported or bought in a hurry can be caught up in one go. */
  wrap.querySelector('[data-assign-all]')?.addEventListener('click', () => {
    const queue = unassignedSteps(ch);
    const next = () => {
      const key = queue.shift();
      if (!key) return onChanged(ch);
      askStepGain(ch, key.slice(0, key.lastIndexOf(':')), g => {
        if (g) (ch.progression.gains ||= {})[key] = g;
        next();
      });
    };
    next();
  });

  wrap.querySelector('#xpTotal').addEventListener('change', e => {
    ch.progression.xp = Math.max(0, +e.target.value || 0);
    onChanged(ch);
  });
  return el;
}

/* One path or talent, grouped: what you have taken, what you can take next,
   and what is still locked. Path steps unlock in order, so only the next one
   is ever available; talent steps are all available at once. */
function stepsBlock(ch, entry, kind) {
  const steps = (kind === 'path' ? entry.path : entry.talent).steps;
  const store = kind === 'path' ? 'pathChecked' : 'talentChecked';
  grantOpeningSteps(ch);
  const taken = ch.progression[store] ||= {};
  const linear = kind === 'path';
  const has = i => !!taken[stepKey(entry.name, i)];
  const gainOf = i => (ch.progression.gains || {})[stepKey(entry.name, i)] || null;

  const groups = { taken: [], next: [], locked: [] };
  steps.forEach((st, i) => {
    if (has(i)) groups.taken.push([st, i]);
    else if (!linear || i === 0 || has(i - 1)) groups.next.push([st, i]);
    else groups.locked.push([st, i]);
  });

  const el = document.createElement('div');
  el.className = 'sblock';
  const pct = steps.length ? groups.taken.length / steps.length * 100 : 0;
  el.innerHTML = `
    <div class="unlockhead">
      <span class="opip" style="background:${safeColor(originColor(entry.origin))}"></span>
      <h4>${kind === 'path' ? 'Path' : 'Talent'} · ${esc(entry.name)}</h4>
      <span class="unlockcount">${groups.taken.length}<small>/${steps.length}</small></span>
    </div>
    <div class="woundbar" style="margin:0 2px 8px"><i style="width:${pct}%"></i></div>
    <div class="hint" style="margin-bottom:7px">${linear
      ? 'Unlocks in order: each step needs the one before it.'
      : 'Unlocks in any order.'}</div>`;

  const affordable = xpAvailable(ch) >= XP_PER_STEP;

  const row = ([st, i], state) => {
    const on = state === 'taken';
    // A taken path step can only be given back if nothing after it is taken,
    // and the opening step is never given back at all: it came with the path.
    const refundable = on && !isFree(i) && (!linear || !has(i + 1));
    const canAct = on ? refundable : state === 'next';
    const r = document.createElement('div');
    r.className = 'progstep' + (on ? ' on' : '') + (state === 'locked' ? ' locked' : '')
      + (isFree(i) ? ' granted' : '');
    r.innerHTML = `
      <button class="progtick" ${canAct ? '' : 'disabled'}
        title="${on
          ? (isFree(i) ? 'Comes with the path — not bought, not given back'
            : refundable ? 'Give this step back' : 'Take back the later steps first')
          : state === 'next' ? `Take this step for ${XP_PER_STEP} XP`
          : 'Take the step before it first'}">
        ${on ? '✓' : (linear ? (st.step ?? i) : '+')}
      </button>
      <div class="progbody">
        <b>${esc(st.name || 'Unnamed')}</b>
        ${isFree(i) ? '<span class="feattag granted">Included</span>' : ''}
        ${on && !isFree(i) ? (gainOf(i)
          ? `<button class="feattag gainchip" data-setgain="${i}" title="Change what this step granted">${esc(gainLabel(ch, gainOf(i)))}</button>`
          : `<button class="feattag gainchip none" data-setgain="${i}" title="This step has not been assigned what it grants">Choose grant</button>`) : ''}
        ${[st.action, st.check, st.range].filter(Boolean).map(t => `<span class="feattag">${esc(t)}</span>`).join('')}
        <p>${esc(detemplate(st.description))}</p>
      </div>`;
    r.querySelector('[data-setgain]')?.addEventListener('click', ev => {
      ev.stopPropagation();
      askStepGain(ch, st.name || 'Step', g => {
        const gains = ch.progression.gains ||= {};
        if (g) gains[stepKey(entry.name, i)] = g;
        onChanged(ch);
      });
    });

    r.querySelector('.progtick').addEventListener('click', () => {
      if (!canAct) return;
      const key = stepKey(entry.name, i);
      const gains = ch.progression.gains ||= {};
      if (on) {
        delete taken[key];
        delete gains[key];          // the grant goes back with the step
        onChanged(ch);
        return;
      }
      if (!affordable) return toast(`Needs ${XP_PER_STEP} XP`);
      taken[key] = true;
      onChanged(ch);
      // Ask what it grants. "Decide later" leaves it unassigned, and the
      // panel keeps a note of how many are still waiting.
      askStepGain(ch, st.name || 'Step', g => {
        if (g) gains[key] = g;
        onChanged(ch);
      });
    });
    return r;
  };

  const group = (label, list, state, open) => {
    if (!list.length) return;
    const d = document.createElement('details');
    d.className = 'unlockgroup ' + state;
    d.open = open;
    d.innerHTML = `<summary>${label} <b>${list.length}</b></summary>`;
    list.forEach(pair => d.appendChild(row(pair, state)));
    el.appendChild(d);
  };

  group(linear ? 'Next step' : 'Available', groups.next, 'next', true);
  group('Taken', groups.taken, 'taken', false);
  group('Locked', groups.locked, 'locked', false);
  return el;
}
