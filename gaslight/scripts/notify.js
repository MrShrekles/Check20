/* Chat notifications, offline.

   Two signals, both in-app:
     a count on the Chat tab while you are looking at another tab
     a toast for anything that happens to the character in the rail

   Rolls jump you to Chat by themselves (see addMsg), so the count is really
   for messages you did not cause: system lines now, other players later. */

import { $, esc } from './dom.js';

let unread = 0;
let chatVisible = true;
let focusName = '';       // the character set in the rail
let toastTimer = null;

/** Tell notifications which character is in the rail, so its events stand out. */
export function setNotifyFocus(name) { focusName = name || ''; }

function paintBadge() {
  const badge = $('chatBadge');
  if (!badge) return;
  badge.hidden = unread === 0;
  badge.textContent = unread > 99 ? '99+' : String(unread);
}

/** The sidebar changed tab. */
export function onTabChange(tab) {
  chatVisible = tab === 'chat';
  if (chatVisible) { unread = 0; paintBadge(); }
}

/** One line describing a message, for the toast. */
function summarise(m) {
  const who = m.charName ? `${m.charName}: ` : '';
  if (m.type === 'roll') {
    const crit = m.crit === 20 ? ' — critical' : m.crit === 1 ? ' — fumble' : '';
    const n = m.successes ?? 0;
    const outcome = m.noOutcome ? '' : n ? ` — ${n} success${n > 1 ? 'es' : ''}` : ' — no success';
    return `${who}${m.label} ${m.total}${crit}${crit ? '' : outcome}`;
  }
  if (m.type === 'dice') return `${who}${m.label} ${m.total}`;
  if (m.type === 'table') return `${who}${m.label}: ${(m.results || []).map(r => r.result).join(', ')}`;
  if (m.type === 'note') return `${who}${m.label || 'Handout'}`;
  if (m.type === 'msg' || m.kind === 'msg') return `${who}${m.text}`;
  return m.text || '';
}

function showToast(text) {
  const el = $('notifyToast');
  if (!el) return;
  el.innerHTML = `<span>${esc(text)}</span>`;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 4000);
}

/**
 * A message arrived. Counts it when Chat is hidden, and announces it when it
 * concerns the character currently in the rail.
 */
export function notifyMessage(m) {
  if (!chatVisible) {
    unread++;
    paintBadge();
  }
  const mine = focusName && m.charName === focusName;
  // No need to announce what you can already see.
  if (mine && !chatVisible) showToast(summarise(m));
}

export function initNotify() {
  chatVisible = document.querySelector('.tabs button.on')?.dataset.tab === 'chat';
  paintBadge();
}
