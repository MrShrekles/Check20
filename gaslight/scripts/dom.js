/* Small DOM helpers shared by every module. */

const cache = new Map();

/** Memoised document.getElementById. Ids in this app are static. */
export function $(id) {
  let el = cache.get(id);
  if (!el) { el = document.getElementById(id); cache.set(id, el); }
  return el;
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** A colour safe to drop into a style attribute. A saved table is just a file,
    and a file can be hand-edited, so anything that is not a plain colour is
    replaced rather than written into the page. */
export function safeColor(v, fallback = '#d9b382') {
  const s = String(v ?? '').trim();
  const ok = /^#[0-9a-f]{3,8}$/i.test(s) || /^(?:rgb|hsl)a?\([0-9.,%\s/-]+\)$/i.test(s);
  return ok ? s : fallback;
}

/** The Send button, wherever something can be put in front of the table. */
export const sendButton = (title = 'Send to chat', attr = 'data-send', label = 'Send') =>
  `<button class="tbbtn sendbtn" ${attr} title="${esc(title)}">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l16-8-6 16-2.5-6z"/></svg>${esc(label)}</button>`;

let toastT;
export function toast(t) {
  const el = $('toast');
  el.textContent = t; el.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2200);
}

/** Game text marks dice and formulas as [[2d6]] or [[1+PL]] for the website's
    roll buttons. On a sheet they read as plain text. */
export const detemplate = text => String(text ?? '').replace(/\[\[(.*?)\]\]/g, (_, f) => f.trim());
