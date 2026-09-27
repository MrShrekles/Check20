/* The Check20 glossary: the Rules tab, and the dotted hover terms that appear
   anywhere text is rendered. Terms load from data/glossary.json at boot. */

import { $, esc } from './dom.js';

let GLOSSARY = [];
const byLower = new Map();
let termRegex = null;

export async function loadGlossary(url = '../data/glossary.json') {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`glossary ${res.status}`);
  GLOSSARY = await res.json();

  byLower.clear();
  for (const g of GLOSSARY) byLower.set(g.term.toLowerCase(), g);

  // Longest term first, so "Critical Success" wins over "Success".
  termRegex = GLOSSARY.length ? new RegExp('\\b(' +
    GLOSSARY.map(g => g.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .sort((a, b) => b.length - a.length).join('|') + ')\\b', 'gi') : null;
}

export const lookup = term => byLower.get(String(term).toLowerCase());

/** Every glossary entry, in file order. Empty until loadGlossary() resolves. */
export const glossaryEntries = () => GLOSSARY;

/** Wrap known terms in hover spans. Input must already be HTML-escaped. */
export function linkTerms(escapedText) {
  if (!termRegex) return escapedText;
  return escapedText.replace(termRegex, m => `<span class="gterm" data-term="${m.toLowerCase()}">${m}</span>`);
}

export function renderRules() {
  const q = $('ruleSearch').value.trim().toLowerCase();
  const ty = $('ruleType').value;
  const list = $('ruleList');
  const hits = GLOSSARY.filter(g =>
    (!ty || g.type === ty) &&
    (!q || g.term.toLowerCase().includes(q) || g.definition.toLowerCase().includes(q)));

  if (!hits.length) {
    list.innerHTML = '<div class="hint" style="text-align:center;padding:16px 0">No matching terms.</div>';
    return;
  }
  list.innerHTML = hits.slice(0, 80).map(g =>
    `<div class="gcard"><b>${esc(g.term)}</b><span class="gcat">${esc(g.type)} &middot; ${esc(g.category)}</span>
      <p>${esc(g.definition)}</p>${g.duration ? `<div class="gdur">${esc(g.duration)}</div>` : ''}</div>`
  ).join('');
}

export function initGlossary() {
  const sel = $('ruleType');
  for (const t of new Set(GLOSSARY.map(g => g.type))) {
    const o = document.createElement('option');
    o.value = t; o.textContent = t[0].toUpperCase() + t.slice(1);
    sel.appendChild(o);
  }
  $('ruleSearch').addEventListener('input', renderRules);
  sel.addEventListener('change', renderRules);

  const gtip = $('gtip');
  document.addEventListener('mouseover', e => {
    const el = e.target.closest('.gterm');
    if (!el) { gtip.style.display = 'none'; return; }
    const g = byLower.get(el.dataset.term);
    if (!g) return;
    gtip.innerHTML = `<b>${esc(g.term)}</b><span class="gcat">${esc(g.type)} &middot; ${esc(g.category)}</span>
      <div>${esc(g.definition)}</div>${g.duration ? `<span class="gdur">${esc(g.duration)}</span>` : ''}`;
    const r = el.getBoundingClientRect();
    gtip.style.display = 'block';
    gtip.style.left = Math.max(6, Math.min(window.innerWidth - gtip.offsetWidth - 6, r.left)) + 'px';
    gtip.style.top = Math.max(6, r.top - gtip.offsetHeight - 6) + 'px';
  });

  renderRules();
}
