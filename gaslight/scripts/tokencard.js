/* Quick actions for a token that is bound to a character.

   Clicking such a token with Select opens this card next to it: wounds and
   armour steppers, damage, conditions at a glance, and a way into the full
   sheet. Tokens with no character behind them fall through to the ordinary
   item property popup. */

import { state } from './state.js';
import { $, esc, safeColor } from './dom.js';
import { requestDraw, anchorCardBeside } from './view.js';
import { w2s } from './geometry.js';
import { woundsMax, reconcile, applyDamage, checkTotal, checkLabel } from './character.js';
import { disadvantageFor, conditionPickerHTML, wireConditionPicker } from './conditions.js';
import { rollCheck } from './chat.js';
import { openSheet, refreshSheet } from './sheet.js';
import { renderRoster } from './roster.js';
import { showPopFor } from './props.js';
import { cardActions, attackWith } from './gear.js';
import { askRoll } from './rolltray.js';

let tokenItem = null;
const condUI = { open: false, query: '' };

export const characterFor = it =>
  it && it.charId ? state.chars.find(c => c.id === it.charId) || null : null;

export function hideTokenCard() {
  $('tokenCard').classList.remove('on');
  tokenItem = null;
}

/** Re-render in place if the card is showing. */
export function refreshTokenCard() {
  if (tokenItem) showTokenCard(tokenItem);
}

export function showTokenCard(it) {
  const ch = characterFor(it);
  if (!ch) return hideTokenCard();
  tokenItem = it;
  reconcile(ch);

  const card = $('tokenCard');
  const wm = woundsMax(ch);
  /* What this character can actually do, rather than one arbitrary check.
     Starred gear if they have starred any, otherwise the first few in their
     own order — so the card is useful straight away and theirs once they have
     said what belongs on it. The rest are a click away in Kit. */
  const weapons = cardActions(ch, 3);
  const spellCount = (ch.favoriteSpells || []).length;

  card.innerHTML = `
    <div class="tchead">
      <span class="rdot" style="background:${safeColor(ch.color)}"></span>
      <b class="tcname" data-tc-name contenteditable="true" spellcheck="false"
        title="Click to rename">${esc(ch.name || 'Unnamed')}</b>
      <button class="icobtn" data-tc="close" title="Close">
        <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>
    <div class="tcrow">
      <span class="tclbl">Armor</span>
      <button class="tcstep" data-tc="ar-" title="−1">−</button>
      <span class="tcval">${ch.res.armor.current}/${ch.res.armor.max}</span>
      <button class="tcstep" data-tc="ar+" title="+1">+</button>
    </div>
    <div class="tcrow">
      <span class="tclbl">Wounds</span>
      <button class="tcstep" data-tc="hp-" title="−1">−</button>
      <span class="tcval">${ch.res.hp.current}/${wm}</span>
      <button class="tcstep" data-tc="hp+" title="+1">+</button>
    </div>
    <div class="tcrow">
      <span class="tclbl">Damage</span>
      <input type="number" min="0" id="tcDmg" class="tcdmg" placeholder="0">
      <button class="tcstep" data-tc="dmg" title="Apply damage">✓</button>
    </div>
    ${conditionPickerHTML(ch, condUI.query, condUI.open)}
    ${weapons.length ? `<div class="tcbtns">
      ${weapons.map((w, i) =>
        `<button class="tbbtn tb-atk" data-tc="atk:${i}" title="${esc(w.check || '')}">${esc(w.name)}</button>`).join('')}
    </div>` : ''}
    <div class="tcbtns">
      <button class="tbbtn tb-init" data-tc="check" title="Roll any check, with the tray">Check</button>
      ${spellCount ? `<button class="tbbtn tb-book" data-tc="go:spells">Spells <b>${spellCount}</b></button>` : ''}
    </div>
    <div class="tcbtns util">
      <button class="tbbtn" data-tc="go:kit" title="Features and gear">Kit</button>
      <button class="tbbtn tb-book" data-tc="sheet">Sheet</button>
      <button class="tbbtn tb-style" data-tc="mark" title="Mark, colour and size">Style</button>
    </div>`;

  /* Renaming a character here renames the character, and every token bound
     to it follows on the next paint. */
  const nameEl = card.querySelector('[data-tc-name]');
  nameEl.addEventListener('blur', () => {
    const v = nameEl.textContent.trim();
    if (v && v !== ch.name) {
      ch.name = v;
      for (const t of state.items) if (t.charId === ch.id) t.name = v;
    }
    syncAfterEdit(ch);
  });
  nameEl.addEventListener('keydown', ev => {
    if (ev.key === 'Enter') { ev.preventDefault(); nameEl.blur(); }
    if (ev.key === 'Escape') { nameEl.textContent = ch.name || 'Unnamed'; nameEl.blur(); }
  });

  wireConditionPicker(card, ch, condUI, () => syncAfterEdit(ch));

  anchorCardBeside(card, it, w2s(it.x, it.y), state.grid.size, state.cam.z);
  card.classList.add('on');

  card.onclick = e => {
    const a = e.target.closest('[data-tc]')?.dataset.tc;
    if (!a) return;
    if (a === 'close') return hideTokenCard();
    // The mark picker lives in the property panel, which a carded token never
    // opens on its own. This is the way in.
    if (a === 'mark') {
      hideTokenCard();
      return showPopFor(it);
    }
    if (a === 'sheet') {
      hideTokenCard();
      return openSheet(ch);
    }
    if (a.startsWith('atk:')) {
      return attackWith(ch, weapons[+a.slice(4)]);
    }

    /* Any check, not one the card picked. Agility was only ever there because
       something had to be, and a card that offers one of ten checks is telling
       the player the other nine do not exist. */
    if (a === 'check') {
      const start = 'agi';
      const dis = disadvantageFor(ch, start);
      return askRoll({
        charName: ch.name || 'Unnamed', labelBase: '', label: checkLabel(start),
        mod: checkTotal(ch, start),
        rollType: dis ? 'dis' : 'flat', conditions: ch.conditions,
      }, {
        forcedBy: dis,
        checks: { key: start, suggested: [], whyShort: '' },
        modFor: k => checkTotal(ch, k),
        disFor: k => disadvantageFor(ch, k),
      }, rollCheck);
    }

    if (a.startsWith('go:')) {
      hideTokenCard();
      return openSheet(ch, a.slice(3));
    }
    if (a === 'hp-') ch.res.hp.current = Math.max(0, ch.res.hp.current - 1);
    if (a === 'hp+') ch.res.hp.current = Math.min(wm, ch.res.hp.current + 1);
    if (a === 'ar-') ch.res.armor.current = Math.max(0, ch.res.armor.current - 1);
    if (a === 'ar+') ch.res.armor.current = Math.min(ch.res.armor.max, ch.res.armor.current + 1);
    if (a === 'dmg') {
      const input = card.querySelector('#tcDmg');
      if (!applyDamage(ch, input.value)) return;
      input.value = '';
    }
    syncAfterEdit(ch);
  };
}

function syncAfterEdit(ch) {
  reconcile(ch);
  renderRoster();
  refreshSheet(ch);
  refreshTokenCard();
  requestDraw();
}
