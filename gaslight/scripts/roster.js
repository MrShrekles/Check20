/* The Party tab: a compact, always-visible roster.

   Its job is the glance — who is hurt, who is conditioned, whose token is
   where. Clicking a row sets that character in the map-side rail. */

import { state } from './state.js';
import { $, esc, safeColor } from './dom.js';
import { woundsMax, reconcile } from './character.js';
import { newDraft, isDraft } from './creator.js';
import { MAJOR } from './conditions.js';
import { renderSpeakers } from './chat.js';
import { setActiveCharacter, activeCharacterId } from './sheet.js';

export function renderRoster() {
  const list = $('charList');
  list.innerHTML = '';
  if (!state.chars.length) {
    list.innerHTML = '<div class="hint" style="text-align:center;padding:20px 0">No characters yet. Add the party and key NPCs here.</div>';
    return;
  }

  for (const ch of state.chars) {
    reconcile(ch);
    const wm = woundsMax(ch);
    const hp = ch.res.hp.current;
    const pct = Math.max(0, Math.min(100, hp / wm * 100));
    const cls = hp <= 0 ? ' down' : hp < wm / 2 ? ' hurt' : '';
    const draft = isDraft(ch);

    const row = document.createElement('div');
    row.className = 'rosterrow' + (ch.id === activeCharacterId() ? ' set' : '');
    row.title = 'Set this character in the rail';
    row.innerHTML = `
      <span class="rdot" style="background:${safeColor(ch.color)}"></span>
      <span class="rname">${esc(ch.name || (draft ? 'New character' : 'Unnamed'))}</span>
      ${draft ? '<span class="rhp creating">creating…</span>' : `<span class="rhp${cls}">${hp}/${wm}</span>`}
      <span class="rmeta">
        <span class="rbar"><i style="width:${pct}%"></i></span>
        <span class="rconds">${(ch.conditions || []).slice(0, 4)
        .map(c => `<span class="cpip${MAJOR.has(c) ? ' major' : ''}" title="${esc(c)}">${esc(c)}</span>`).join('')}
        ${(ch.conditions || []).length > 4 ? `<span class="cpip">+${ch.conditions.length - 4}</span>` : ''}</span>
      </span>`;
    row.addEventListener('click', () => setActiveCharacter(ch));
    list.appendChild(row);
  }
}

export function initRoster() {
  $('charAdd').onclick = () => {
    // Opens the guided build; its first step offers a blank character instead.
    const ch = newDraft(state.chars.length);
    state.chars.unshift(ch);
    renderRoster();
    renderSpeakers();
    setActiveCharacter(ch);
  };
}
