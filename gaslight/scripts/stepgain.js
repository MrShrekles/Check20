/* What a step grants, and the modal that asks.

   Every path or talent step past the first buys one of three things:

     +1 to any check      capped at 15, however the total got there
     +1 Mana
     +1 Class Resource    only if the character has one

   The choice is stored against the step in `progression.gains`, not applied to
   the character, so giving a step back takes its grant with it and nothing has
   to be remembered or undone. `character.js` derives the totals.

   The class resource is the awkward one. There is no structured resource in
   `class-new.json` — it is written into prose across most entries, and the
   character's own `res.classRes.label` is free text the narrator fills in. So
   the option is offered only when the character actually has one set up, and
   says where to set one otherwise, rather than granting a point to a resource
   that does not exist. */

import { $, esc } from './dom.js';
import {
  ALL_CHECKS, checkLabel, checkTotal, checkAtCap, CHECK_CAP,
  manaMax, checkPointsTotal,
} from './character.js';

/** Does this character have a class resource worth granting a point to? */
export const hasClassResource = ch =>
  !!(String(ch?.res?.classRes?.label || '').trim() && ch.res.classRes.label !== 'Resource')
  || (ch?.res?.classRes?.baseMax || 0) > 0
  || (ch?.res?.classRes?.max || 0) > 0;

let el = null;
let onPick = null;

function ensureModal() {
  if (el) return el;
  el = document.createElement('div');
  el.className = 'gainmodal';
  el.hidden = true;
  document.body.appendChild(el);
  el.addEventListener('click', e => {
    if (e.target === el) close();              // a click outside is a cancel
  });
  return el;
}

function close() {
  if (el) el.hidden = true;
  onPick = null;
}

/**
 * Ask what a step grants.
 * @param {object} ch       the character taking the step
 * @param {string} stepName what the step is called, for the heading
 * @param {(gain: object) => void} pick  called with the chosen grant
 */
export function askStepGain(ch, stepName, pick) {
  ensureModal();
  onPick = pick;

  const cap = CHECK_CAP;
  const rows = ALL_CHECKS.map(c => {
    const total = checkTotal(ch, c.key);
    const full = checkAtCap(ch, c.key);
    return `<button class="gaincheck${full ? ' full' : ''}" data-gain-check="${c.key}"
      ${full ? 'disabled' : ''}
      title="${full ? `${checkLabel(c.key)} is already at the cap of ${cap}` : `Raise ${checkLabel(c.key)} to ${total + 1}`}">
      <span class="gcname">${esc(checkLabel(c.key))}</span>
      <span class="gcval">${total}${full ? '' : ` → ${total + 1}`}</span>
    </button>`;
  }).join('');

  const res = ch.res.classRes;
  const canRes = hasClassResource(ch);

  el.innerHTML = `
    <div class="gainbox">
      <div class="gainhead">
        <h4>${esc(stepName || 'Step')}</h4>
        <button class="icobtn" data-gain-close title="Cancel">
          <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <p class="gainlede">Every step grants one of these. Choose now, or later
        from the Progression panel.</p>

      <div class="gainsection">
        <div class="gainlabel">+1 to a check
          <span class="gaintot">total ${checkPointsTotal(ch)} · cap ${cap} each</span>
        </div>
        <div class="gainchecks">${rows}</div>
      </div>

      <div class="gainsection">
        <div class="gainlabel">or a resource</div>
        <div class="gainothers">
          <button class="gainother" data-gain-other="mana"
            title="Raise maximum Mana to ${manaMax(ch) + 1}">
            <b>+1 Mana</b><span>${manaMax(ch)} → ${manaMax(ch) + 1}</span>
          </button>
          <button class="gainother" data-gain-other="classRes" ${canRes ? '' : 'disabled'}
            title="${canRes
              ? `Raise ${esc(res.label)} to ${(res.baseMax ?? res.max ?? 0) + 1}`
              : 'This character has no class resource. Name one under the cog on Health.'}">
            <b>+1 ${canRes ? esc(res.label) : 'Class Resource'}</b>
            <span>${canRes ? `${res.max || 0} → ${(res.max || 0) + 1}` : 'none set'}</span>
          </button>
        </div>
      </div>

      <button class="tbbtn gainlater" data-gain-later>Decide later</button>
    </div>`;

  el.hidden = false;

  el.querySelector('[data-gain-close]').onclick = close;
  el.querySelector('[data-gain-later]').onclick = () => { const f = onPick; close(); f?.(null); };
  el.querySelectorAll('[data-gain-check]').forEach(b => b.addEventListener('click', () => {
    const f = onPick; close(); f?.({ type: 'check', key: b.dataset.gainCheck });
  }));
  el.querySelectorAll('[data-gain-other]').forEach(b => b.addEventListener('click', () => {
    const f = onPick; close(); f?.({ type: b.dataset.gainOther });
  }));
}

/** One line describing a stored grant, for the step's row. */
export function gainLabel(ch, gain) {
  if (!gain) return '';
  if (gain.type === 'check') return `+1 ${checkLabel(gain.key)}`;
  if (gain.type === 'mana') return '+1 Mana';
  if (gain.type === 'classRes') return `+1 ${ch?.res?.classRes?.label || 'Resource'}`;
  return '';
}
