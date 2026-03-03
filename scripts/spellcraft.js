/* =========================
   spellcraft.js
   Interactive Spellcraft tab — card selection flow + SP cost calculator
   ========================= */

const craftState = {
  manner: null,
  transmission: null,
  intent: null,
  intentSP: 0,
  range: null,
  duration: null,
  target: null,
};

/* ── SP modifier tables ── */
const RANGE_SP = {
  'Self': 0,
  'Touch': 0,
  'Reach': 0,
  'Melee': 0,
  'Short': 1,
  'Medium': 2,
  'Long': 3,
  'Visible': 3,
  'Known': 3,
};

const DURATION_SP = {
  'Instant': 0,
  'End of Next Turn': 0,
  '1 Minute': 1,
  '1 Hour': 2,
  '8 Hours': 3,
  '1 Day': 4,
  'Until Long Rest': 4,
  'Permanent': 0, // minimum enforced separately
};

const TARGET_SP = {
  'Creature': 0,
  'Object': 0,
  'Area': 2,
};

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', () => {
  initCraftCards();
  initToggles();
  initCraftBuilder();
  updateSPDisplay();
});

/* ══════════════════════════════════════
   CARD SELECTION
══════════════════════════════════════ */
function initCraftCards() {
  document.querySelectorAll('.manner-card').forEach(card => {
    card.addEventListener('click', () => {
      selectCraftCard('manner-cards', card);
      craftState.manner = card.dataset.value;
      unlockStep('step-transmission');
      updateSummary();
    });
  });

  document.querySelectorAll('.transmission-card').forEach(card => {
    card.addEventListener('click', () => {
      selectCraftCard('transmission-cards', card);
      craftState.transmission = card.dataset.value;
      unlockStep('step-intent');
      updateSummary();
    });
  });

  document.querySelectorAll('.intent-card').forEach(card => {
    card.addEventListener('click', () => {
      selectCraftCard('intent-cards', card);
      craftState.intent = card.dataset.value;
      craftState.intentSP = parseInt(card.dataset.sp);
      unlockStep('step-details');
      updateSummary();
      updateSPDisplay();
      refreshDurationAvailability();
      setTimeout(() => {
        document.getElementById('step-details')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    });
  });
}

function selectCraftCard(rowId, selectedCard) {
  document.querySelectorAll(`#${rowId} .craft-card`).forEach(c => c.classList.remove('selected'));
  selectedCard.classList.add('selected');
}

function unlockStep(stepId) {
  const step = document.getElementById(stepId);
  if (!step) return;
  step.classList.remove('craft-step--locked');
  setTimeout(() => step.classList.add('craft-step--revealed'), 20);
}

/* ══════════════════════════════════════
   TOGGLE PILLS
══════════════════════════════════════ */
function initToggles() {
  document.querySelectorAll('#toggle-range .sp-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      selectToggle('#toggle-range', btn);
      craftState.range = btn.dataset.value;
      if (craftState.target === 'Area') updateAreaNote();
      updateSPDisplay();
    });
  });

  document.querySelectorAll('#toggle-duration .sp-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('toggle-locked')) return;
      selectToggle('#toggle-duration', btn);
      craftState.duration = btn.dataset.value;
      updateSPDisplay();
    });
  });

  document.querySelectorAll('#toggle-target .sp-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      selectToggle('#toggle-target', btn);
      craftState.target = btn.dataset.value;
      updateAreaNote();
      updateSPDisplay();
    });
  });
}

function selectToggle(groupSelector, selectedBtn) {
  document.querySelectorAll(`${groupSelector} .sp-toggle`).forEach(b => b.classList.remove('active'));
  selectedBtn.classList.add('active');
}

function refreshDurationAvailability() {
  const permBtn = document.querySelector('#toggle-duration .sp-toggle[data-value="Permanent"]');
  if (!permBtn) return;
  const locked = (craftState.intentSP || 0) < 12;
  permBtn.classList.toggle('toggle-locked', locked);
  permBtn.title = locked ? 'Requires Storm (12 SP) or Cataclysm as base intent' : '';
  if (locked && craftState.duration === 'Permanent') {
    craftState.duration = null;
    document.querySelectorAll('#toggle-duration .sp-toggle').forEach(b => b.classList.remove('active'));
    updateSPDisplay();
  }
}

function updateAreaNote() {
  const note = document.getElementById('area-range-note');
  if (!note) return;
  if (craftState.target === 'Area' && craftState.range) {
    note.textContent = `Area = ${craftState.range} range`;
    note.style.display = 'inline';
  } else {
    note.style.display = 'none';
  }
}

/* ══════════════════════════════════════
   SP CALCULATION
══════════════════════════════════════ */
function calcTotalSP() {
  const base = craftState.intentSP || 0;
  const rangeMod = craftState.range ? (RANGE_SP[craftState.range] ?? 0) : 0;
  const durMod = craftState.duration ? (DURATION_SP[craftState.duration] ?? 0) : 0;
  const targetMod = craftState.target ? (TARGET_SP[craftState.target] ?? 0) : 0;

  let total = base + rangeMod + durMod + targetMod;
  if (craftState.duration === 'Permanent') total = Math.max(total, 12);

  return { total, base, rangeMod, durMod, targetMod };
}

function intentLabelForSP(sp) {
  if (sp <= 0) return 'Light Whisper';
  if (sp <= 1) return 'Whisper';
  if (sp <= 3) return 'Surge';
  if (sp <= 6) return 'Shout';
  if (sp <= 9) return 'Roar';
  if (sp <= 12) return 'Storm';
  return 'Cataclysm';
}

function spTierClass(sp) {
  if (sp <= 0) return 'tier-0';
  if (sp <= 1) return 'tier-1';
  if (sp <= 3) return 'tier-3';
  if (sp <= 6) return 'tier-6';
  if (sp <= 9) return 'tier-9';
  if (sp <= 12) return 'tier-12';
  return 'tier-24';
}

function updateSPDisplay() {
  const { total, base, rangeMod, durMod, targetMod } = calcTotalSP();

  const totalEl = document.getElementById('sp-total');
  const breakEl = document.getElementById('sp-breakdown');
  const labelEl = document.getElementById('sp-intent-label');
  const damageEl = document.getElementById('sum-damage');

  if (totalEl) {
    totalEl.textContent = total;
    totalEl.className = 'sp-total-number ' + spTierClass(total);
  }
  if (labelEl) labelEl.textContent = intentLabelForSP(total);

  if (breakEl) {
    const parts = [`${base} base`];
    if (rangeMod) parts.push(`+${rangeMod} range`);
    if (durMod) parts.push(`+${durMod} duration`);
    if (targetMod) parts.push(`+${targetMod} area target`);
    if (craftState.duration === 'Permanent') parts.push('(min 12 · Permanent)');
    breakEl.textContent = parts.join('  ·  ');
  }

  if (damageEl && total > 0) {
    damageEl.textContent = `Spell Attack: ${total}d6 + ${total}  ·  Detonation: ${Math.floor(total / 2)}d6 + ${Math.floor(total / 2)} to all in range`;
  } else if (damageEl) {
    damageEl.textContent = '';
  }
}

/* ══════════════════════════════════════
   SUMMARY BAR
══════════════════════════════════════ */
function updateSummary() {
  const mannerEl = document.getElementById('sum-manner');
  const transEl = document.getElementById('sum-transmission');
  const intentEl = document.getElementById('sum-intent');
  if (mannerEl) mannerEl.textContent = craftState.manner || '—';
  if (transEl) transEl.textContent = craftState.transmission || '—';
  if (intentEl) intentEl.textContent = craftState.intent
    ? `${craftState.intent} (${craftState.intentSP} SP base)` : '—';
}

/* ══════════════════════════════════════
   BUILDER
══════════════════════════════════════ */
function initCraftBuilder() {
  document.getElementById('builder-generate')?.addEventListener('click', buildCraftSpell);
  document.getElementById('builder-clear')?.addEventListener('click', clearCraftBuilder);
}

function buildCraftSpell() {
  const preview = document.getElementById('builder-preview');
  if (!craftState.manner || !craftState.transmission || !craftState.intent) {
    preview.innerHTML = `<div class="preview-error">Select a Manner, Transmission, and Intent first.</div>`;
    return;
  }

  const { total } = calcTotalSP();
  const name = document.getElementById('builder-name')?.value.trim()
    || `${craftState.manner} ${craftState.transmission}`;
  const range = craftState.range || '';
  const duration = craftState.duration || '';
  const target = craftState.target || '';
  const area = (craftState.target === 'Area' && craftState.range) ? craftState.range : '';
  const effect = document.getElementById('builder-effect')?.value.trim() || '';
  const displayIntent = intentLabelForSP(total);

  let infoHTML = '<ul class="spell-info">';
  if (range) infoHTML += `<li><strong>Range: </strong>${range}</li>`;
  if (duration) infoHTML += `<li><strong>Duration: </strong>${duration}</li>`;
  if (target) infoHTML += `<li><strong>Target: </strong>${target}</li>`;
  if (area) infoHTML += `<li><strong>Area: </strong>${area}</li>`;
  infoHTML += '</ul>';

  const spellObj = {
    name, origin: 'Custom',
    manner: craftState.manner,
    transmission: craftState.transmission,
    effects: [{ intent: displayIntent, range, duration, target, area, effect }]
  };

  preview.innerHTML = `
    <div class="spell-card built-spell">
      <h4>${toTitleCase(name)}</h4>
      <div class="spell-tags">
        <span class="origin">Custom</span>
        <span class="manner">${craftState.manner}</span>
        <span class="transmission">${craftState.transmission}</span>
      </div>
      <details class="spell-effect" open>
        <summary class="spell-features">${displayIntent} <span class="sp-cost">${total} SP</span></summary>
        ${infoHTML}
        <p>${effect || '<em>No effect description provided.</em>'}</p>
      </details>
      <div class="spell-buttons">
        <button class="copy-spell" id="craft-copy-spell">Copy Spell</button>
        <button class="copy-macro" id="craft-copy-macro">Copy Roll20</button>
      </div>
    </div>`;

  document.getElementById('craft-copy-spell')?.addEventListener('click', (e) => copySpellText(spellObj, e.target));
  document.getElementById('craft-copy-macro')?.addEventListener('click', (e) => copyMacroText(spellObj, e.target));
}

function clearCraftBuilder() {
  document.querySelectorAll('.craft-card').forEach(c => c.classList.remove('selected'));
  ['step-transmission', 'step-intent', 'step-details'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.classList.add('craft-step--locked'); el.classList.remove('craft-step--revealed'); }
  });
  document.querySelectorAll('.sp-toggle').forEach(b => b.classList.remove('active'));
  Object.assign(craftState, { manner: null, transmission: null, intent: null, intentSP: 0, range: null, duration: null, target: null });
  ['builder-name', 'builder-effect'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const preview = document.getElementById('builder-preview');
  if (preview) preview.innerHTML = `<div class="preview-placeholder"><p>Your spell preview will appear here.</p></div>`;
  const areaNote = document.getElementById('area-range-note');
  if (areaNote) areaNote.style.display = 'none';
  updateSummary();
  updateSPDisplay();
}