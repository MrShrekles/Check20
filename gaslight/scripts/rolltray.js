/* The tray that opens before a roll.

   Rolls used to fire the instant you clicked: the modifier was whatever the
   sheet said, Advantage was whatever a condition had forced, and a temporary
   buff, a tweaked weapon or a narrator saying "take Advantage on this one" had
   nowhere to go. Damage was a second button you had to remember to press, and
   the spell's own text never reached the table at all.

   So every roll goes through here first. It carries:

     the modifier      the sheet's number, plus a temporary one you type
     Advantage         asked every time, not only when a condition forces it
     damage            editable, so a buffed weapon rolls what it actually does
     the text          the spell or feature's own words, sent with the roll

   A condition that forces Disadvantage still does, and the tray says which —
   but the narrator can overrule it, because they always could at a real table.

   Enter rolls. Escape cancels. The narrator who wants none of this turns
   "Ask before rolling" off in settings and gets the old behaviour back. */

import { $, esc } from './dom.js';
import { state } from './state.js';
import { checkLabel, ALL_CHECKS } from './character.js';

let el = null;
let pending = null;

function ensure() {
  if (el) return el;
  el = document.createElement('div');
  el.className = 'traymodal';
  el.hidden = true;
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target === el) cancel(); });
  document.addEventListener('keydown', e => {
    if (el.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); }
  });
  return el;
}

function cancel() {
  if (el) el.hidden = true;
  pending = null;
}

function commit() {
  if (!pending) return;
  const extra = +el.querySelector('[data-tray-mod]').value || 0;
  const sel = el.querySelector('[data-tray-check]');
  const key = sel ? sel.value : null;
  const rollType = el.querySelector('[data-tray-adv].on')?.dataset.trayAdv || 'flat';
  const dmgEl = el.querySelector('[data-tray-dmg]');
  const formula = dmgEl ? dmgEl.value.trim() : '';
  const typeEl = el.querySelector('[data-tray-dmgtype]');

  const base = key && pending.modFor ? pending.modFor(key) : (pending.roll.mod || 0);
  const out = {
    ...pending.roll,
    /* The label follows the check, so a swap shows in the log. With a name in
       front it reads "Lantern Mace (Luck)"; a bare check roll is just its own
       name. */
    label: key
      ? (pending.roll.labelBase ? `${pending.roll.labelBase} (${checkLabel(key)})` : checkLabel(key))
      : pending.roll.label,
    checkKey: key || pending.roll.checkKey,
    mod: base + extra,
    rollType,
    damage: formula ? { formula, type: typeEl ? typeEl.value.trim() : (pending.roll.damage?.type || '') } : null,
  };
  const done = pending.done;
  cancel();
  done(out);
}

/**
 * Ask about a roll, then hand the finished shape back.
 *
 * @param {object} roll   what rollCheck would have been given
 * @param {object} [opts]
 *   `desc`        the spell or feature's text
 *   `forcedBy`    the condition forcing Disadvantage
 *   `costNote`    what this costs
 *   `warn`        why this should not normally be allowed, shown in red. The
 *                 roll is still offered: it is the narrator's call, not the
 *                 app's, and a greyed-out button that explains nothing is how
 *                 people end up thinking the app is broken.
 *   `actionLabel` the button's words, e.g. "Cast anyway"
 *   `checks`      { key, suggested[], why, whyShort } for the check selector
 *   `modFor`      (key) => the modifier for that check
 *   `disFor`      (key) => what forces Disadvantage on that check, or null
 * @param {(roll: object) => void} done  called with the roll to make
 */
export function askRoll(roll, opts, done) {
  // Turned off in settings: straight through, exactly as before.
  if (!state.settings?.askBeforeRoll) return done(roll);

  ensure();
  pending = { roll, done, modFor: opts?.modFor, disFor: opts?.disFor };

  const forced = opts?.forcedBy || null;
  const start = roll.rollType && roll.rollType !== 'flat' ? roll.rollType : 'flat';
  const dmg = roll.damage?.formula || '';

  el.innerHTML = `
    <div class="traybox">
      <div class="trayhead">
        <h4>${esc(roll.label || 'Check')}</h4>
        <button class="icobtn" data-tray-close title="Cancel">
          <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      ${opts?.costNote ? `<div class="traycost">${esc(opts.costNote)}</div>` : ''}
      ${opts?.warn ? `<div class="traywarn">${esc(opts.warn)}</div>` : ''}
      ${opts?.desc ? `<p class="traydesc">${esc(opts.desc)}</p>` : ''}

      ${opts?.checks ? `
      <div class="trayrow">
        <label>Check</label>
        <select data-tray-check title="${esc(opts.checks.why || 'Which check this rolls against')}">
          ${opts.checks.suggested?.length ? `<optgroup label="${esc(opts.checks.whyShort || 'Suggested')}">
            ${opts.checks.suggested.map(k => `<option value="${k}"${k === opts.checks.key ? ' selected' : ''}>${esc(checkLabel(k))}</option>`).join('')}
          </optgroup>` : ''}
          <optgroup label="Any other check">
            ${ALL_CHECKS.filter(c => !opts.checks.suggested?.includes(c.key))
              .map(c => `<option value="${c.key}"${c.key === opts.checks.key ? ' selected' : ''}>${esc(checkLabel(c.key))}</option>`).join('')}
          </optgroup>
        </select>
      </div>
      ${opts.checks.why ? `<div class="traywhy">${esc(opts.checks.why)}</div>` : ''}` : ''}

      <div class="trayrow">
        <label>Modifier</label>
        <span class="traybase" title="What the sheet says">${roll.mod >= 0 ? '+' : ''}${roll.mod || 0}</span>
        <span class="trayplus">+</span>
        <input type="number" data-tray-mod value="0" step="1"
          title="A temporary bonus or penalty: a buff, a tweaked weapon, a narrator's call">
      </div>

      <div class="trayrow">
        <label>Roll</label>
        <div class="trayadv">
          <button data-tray-adv="adv"${start === 'adv' ? ' class="on"' : ''}>Advantage</button>
          <button data-tray-adv="flat"${start === 'flat' ? ' class="on"' : ''}>Normal</button>
          <button data-tray-adv="dis"${start === 'dis' ? ' class="on"' : ''}>Disadvantage</button>
        </div>
      </div>
      ${forced ? `<div class="trayforced">${esc(forced)} forces Disadvantage — change it only if the narrator says so.</div>` : ''}

      ${roll.damage !== undefined ? `
      <div class="trayrow">
        <label>Damage</label>
        <input type="text" data-tray-dmg value="${esc(dmg)}" placeholder="none"
          title="Rolled with the attack. Edit it for a buff or a different weapon.">
        <input type="text" data-tray-dmgtype value="${esc(roll.damage?.type || '')}"
          class="traytype" placeholder="type">
      </div>` : ''}

      <div class="trayacts">
        <button class="tbbtn ${opts?.warn ? 'tb-init' : 'tb-atk'}" data-tray-roll>${esc(opts?.actionLabel || 'Roll')}</button>
      </div>
      <div class="trayhint">Enter rolls · Escape cancels</div>
    </div>`;

  el.hidden = false;

  el.querySelector('[data-tray-close]').onclick = cancel;
  el.querySelector('[data-tray-roll]').onclick = commit;
  el.querySelectorAll('[data-tray-adv]').forEach(b => b.addEventListener('click', () => {
    el.querySelectorAll('[data-tray-adv]').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
  }));

  const checkEl = el.querySelector('[data-tray-check]');
  if (checkEl) checkEl.addEventListener('change', () => {
    const k = checkEl.value;
    // The modifier shown follows the check, and so does anything forcing
    // Disadvantage: Blind hits some checks and not others.
    if (opts.modFor) {
      const v = opts.modFor(k);
      el.querySelector('.traybase').textContent = `${v >= 0 ? '+' : ''}${v}`;
    }
    const warn = el.querySelector('.trayforced');
    const nowForced = opts.disFor ? opts.disFor(k) : null;
    if (warn) warn.remove();
    if (nowForced) {
      const d = document.createElement('div');
      d.className = 'trayforced';
      d.textContent = `${nowForced} forces Disadvantage — change it only if the narrator says so.`;
      el.querySelector('.trayadv').closest('.trayrow').after(d);
      el.querySelectorAll('[data-tray-adv]').forEach(x => x.classList.toggle('on', x.dataset.trayAdv === 'dis'));
    }
  });

  const modEl = el.querySelector('[data-tray-mod]');
  modEl.focus();
  modEl.select();
}

/** The label for the check a roll is using, for a tray title. */
export const castLabel = key => checkLabel(key);
