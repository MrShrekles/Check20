/* The layers panel and the new-layer modal. */

import { state, ui, id, activeLayer } from './state.js';
import { $, esc, toast } from './dom.js';
import { requestDraw } from './view.js';
import { computeLight } from './lighting.js';

const eyeSvg = '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.5"/></svg>';
const lockSvg = '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>';

const NEW_LAYER_HINTS = {
  draw: 'Pencil, lines, shapes and labels. Tokens cannot go here.',
  token: 'Tokens and lamps. Drawings cannot go here.',
  map: 'Rooms and backdrop art, under everything else.',
  narrator: 'A drawing layer that players never see.',
};
const DEFAULT_NAMES = { draw: 'Drawings', token: 'Tokens', map: 'Map', narrator: 'Narrator' };

export function renderLayers() {
  const list = $('layerList');
  list.innerHTML = '';
  // Topmost layer draws last, so the panel lists them in reverse.
  [...state.layers].reverse().forEach(L => {
    const row = document.createElement('div');
    row.className = 'lrow' + (L.id === state.activeLayerId ? ' active' : '') + (L.visible ? '' : ' hiddenL');
    row.innerHTML = `
      <button class="icobtn ${L.visible ? 'lit' : ''}" data-a="vis" title="Show or hide">${eyeSvg}</button>
      <button class="icobtn ${L.locked ? 'lit' : ''}" data-a="lock" title="Lock or unlock">${lockSvg}</button>
      <span class="lname" data-a="sel" title="Double-click to rename">${esc(L.name)}</span>
      <span class="ltype">${L.type}</span>
      <span class="nartag ${L.narrator ? 'lit' : ''}" data-a="nar" title="Narrator only, hidden in player view">Nar</span>`;
    row.addEventListener('click', e => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'vis') { L.visible = !L.visible; computeLight(); }
      else if (a === 'lock') { L.locked = !L.locked; }
      else if (a === 'nar') { L.narrator = !L.narrator; computeLight(); }
      state.activeLayerId = L.id;
      renderLayers(); requestDraw();
    });
    row.querySelector('.lname').addEventListener('dblclick', () => {
      const n = prompt('Layer name', L.name);
      if (n) { L.name = n.trim(); renderLayers(); }
    });
    list.appendChild(row);
  });
  const L = activeLayer();
  $('layerOpacity').value = Math.round(L.opacity * 100);
  $('opv').textContent = Math.round(L.opacity * 100) + '%';
}

function moveLayer(dir) {
  const i = state.layers.findIndex(l => l.id === state.activeLayerId);
  const j = i + dir;
  if (j < 0 || j >= state.layers.length) return;
  [state.layers[i], state.layers[j]] = [state.layers[j], state.layers[i]];
  renderLayers(); requestDraw();
}

export function initLayers() {
  $('layerOpacity').addEventListener('input', function () {
    activeLayer().opacity = +this.value / 100;
    $('opv').textContent = this.value + '%';
    requestDraw();
  });

  const modal = $('layerModal');
  $('layerAdd').onclick = () => {
    $('nlName').value = '';
    modal.classList.add('on');
    $('nlName').focus();
  };
  $('nlType').addEventListener('change', function () { $('nlHint').textContent = NEW_LAYER_HINTS[this.value]; });
  $('nlCancel').onclick = () => modal.classList.remove('on');
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('on'); });
  $('nlCreate').onclick = () => {
    const type = $('nlType').value;
    const name = $('nlName').value.trim() || DEFAULT_NAMES[type] + ' ' + state.layers.length;
    const L = { id: id(), name, type, visible: true, locked: false, opacity: 1, narrator: type === 'narrator' };
    state.layers.push(L);
    state.activeLayerId = L.id;
    modal.classList.remove('on');
    renderLayers(); requestDraw();
  };

  $('layerDel').onclick = () => {
    if (state.layers.length <= 1) return toast('Keep at least one layer');
    const L = activeLayer();
    if (!confirm(`Delete layer "${L.name}" and everything on it?`)) return;
    if (ui.hover && ui.hover.layerId === L.id) ui.hover = null;
    state.items = state.items.filter(i => i.layerId !== L.id);
    state.layers = state.layers.filter(l => l !== L);
    state.activeLayerId = state.layers[state.layers.length - 1].id;
    renderLayers(); computeLight(); requestDraw();
  };
  $('layerUp').onclick = () => moveLayer(1);
  $('layerDown').onclick = () => moveLayer(-1);
}
