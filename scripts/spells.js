// ─── Spell Builder ───────────────────────────────────────────────────────────

function getIntentCost(intent) {
  const costMap = {
    "Light Whisper": 0,
    "Whisper": 1,
    "Surge": 3,
    "Shout": 6,
    "Roar": 9,
    "Storm": 12,
    "Cataclysm": 24
  };
  return costMap[intent?.trim()] ?? '?';
}

function toTitleCase(str) {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

function initBuilder() {
  const generateBtn = document.getElementById('builder-generate');
  const clearBtn = document.getElementById('builder-clear');

  if (generateBtn) {
    generateBtn.addEventListener('click', buildSpell);
  }
  if (clearBtn) {
    clearBtn.addEventListener('click', clearBuilder);
  }
}

function getBuilderValues() {
  return {
    name: document.getElementById('builder-name')?.value.trim() || '',
    manner: document.getElementById('builder-manner')?.value || '',
    transmission: document.getElementById('builder-transmission')?.value || '',
    intent: document.getElementById('builder-intent')?.value || '',
    range: document.getElementById('builder-range')?.value || '',
    duration: document.getElementById('builder-duration')?.value.trim() || '',
    target: document.getElementById('builder-target')?.value.trim() || '',
    area: document.getElementById('builder-area')?.value.trim() || '',
    effect: document.getElementById('builder-effect')?.value.trim() || '',
  };
}

function buildSpell() {
  const v = getBuilderValues();
  const preview = document.getElementById('builder-preview');

  if (!v.manner || !v.transmission || !v.intent) {
    preview.innerHTML = `<div class="preview-error">Please select a <strong>Manner</strong>, <strong>Transmission</strong>, and <strong>Intent Level</strong> before building.</div>`;
    return;
  }

  const displayName = v.name || `${v.manner} ${v.transmission}`;
  const cost = getIntentCost(v.intent);

  let infoHTML = '<ul class="spell-info">';
  if (v.range) infoHTML += `<li><strong>Range: </strong>${v.range}</li>`;
  if (v.duration) infoHTML += `<li><strong>Duration: </strong>${v.duration}</li>`;
  if (v.target) infoHTML += `<li><strong>Target: </strong>${v.target}</li>`;
  if (v.area) infoHTML += `<li><strong>Area: </strong>${v.area}</li>`;
  infoHTML += '</ul>';

  preview.innerHTML = `
    <div class="spell-card built-spell">
      <h4>${toTitleCase(displayName)}</h4>
      <div class="spell-tags">
        <span class="origin">Custom</span>
        <span class="manner">${v.manner}</span>
        <span class="transmission">${v.transmission}</span>
      </div>
      <details class="spell-effect" open>
        <summary class="spell-features">${v.intent} <span class="sp-cost">${cost} SP</span></summary>
        ${infoHTML}
        <p>${v.effect || '<em>No effect description provided.</em>'}</p>
      </details>
      <div class="spell-buttons">
        <button class="copy-spell" id="builder-copy-spell">Copy Spell</button>
        <button class="copy-macro" id="builder-copy-macro">Copy Roll20</button>
      </div>
    </div>
  `;

  // Wire up copy buttons on the preview card
  const spellObj = {
    name: displayName,
    origin: 'Custom',
    manner: v.manner,
    transmission: v.transmission,
    effects: [{
      intent: v.intent,
      range: v.range,
      duration: v.duration,
      target: v.target,
      area: v.area,
      effect: v.effect
    }]
  };

  document.getElementById('builder-copy-spell')?.addEventListener('click', (e) => copySpellText(spellObj, e.target));
  document.getElementById('builder-copy-macro')?.addEventListener('click', (e) => copyMacroText(spellObj, e.target));
}

function clearBuilder() {
  ['builder-name', 'builder-manner', 'builder-transmission', 'builder-intent',
    'builder-range', 'builder-duration', 'builder-target', 'builder-area', 'builder-effect']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  document.getElementById('builder-preview').innerHTML = `
    <div class="preview-placeholder">
      <p>Fill in the fields and click <strong>Build Spell</strong> to see your spell here.</p>
    </div>`;
}

// ─── Tab Switching ────────────────────────────────────────────────────────────

function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      // Buttons
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Panels
      document.querySelectorAll('.tab-content').forEach(panel => panel.classList.remove('active'));
      document.getElementById(`tab-${target}`)?.classList.add('active');

      // Persist tab preference
      sessionStorage.setItem('activeSpellTab', target);
    });
  });

  // Restore last tab
  const saved = sessionStorage.getItem('activeSpellTab');
  if (saved) {
    const savedBtn = document.querySelector(`.tab-btn[data-tab="${saved}"]`);
    if (savedBtn) savedBtn.click();
  }
}

// ─── Spell List ───────────────────────────────────────────────────────────────

function highlightText(text, term) {
  if (!term) return text;
  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedTerm})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

let activeIntents = [];
let cachedSpells = [];
let activeOrigins = [];
let selectedSort = 'origin';

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initBuilder();

  document.querySelectorAll('#sort-toggles button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#sort-toggles button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSort = btn.dataset.sort;
      renderSpells();
    });
  });

  document.querySelectorAll('#intent-toggles button').forEach(btn => {
    btn.addEventListener('click', () => {
      const intent = btn.dataset.intent;
      btn.classList.toggle('active');
      if (activeIntents.includes(intent)) {
        activeIntents = activeIntents.filter(i => i !== intent);
      } else {
        activeIntents.push(intent);
      }
      renderSpells();
    });
  });

  document.querySelectorAll('#origin-toggles button').forEach(btn => {
    btn.addEventListener('click', () => {
      const origin = btn.dataset.origin.toLowerCase();
      btn.classList.toggle('active');
      if (activeOrigins.includes(origin)) {
        activeOrigins = activeOrigins.filter(o => o !== origin);
      } else {
        activeOrigins.push(origin);
      }
      renderSpells();
    });
  });

  // spell-search is now #sidebar-search-input, wired in sidebar.js after sidebar loads

  const expandBtn = document.getElementById('expand-all');
  const collapseBtn = document.getElementById('collapse-all');
  if (expandBtn) {
    expandBtn.addEventListener('click', () => {
      document.querySelectorAll('.spell-row').forEach(r => r.classList.add('open'));
    });
  }
  if (collapseBtn) {
    collapseBtn.addEventListener('click', () => {
      document.querySelectorAll('.spell-row').forEach(r => r.classList.remove('open'));
    });
  }

  loadSpells();
});

async function loadSpells() {
  const response = await fetch('data/spells.json');
  cachedSpells = await response.json();
  renderSpells();
}

function renderEffectInfo(effect) {
  let infoHTML = '<ul class="spell-info">';
  if (effect.range) infoHTML += `<li><strong>Range: </strong>${effect.range}</li>`;
  if (effect.duration) infoHTML += `<li><strong>Duration: </strong>${effect.duration}</li>`;
  if (effect.target) infoHTML += `<li><strong>Target: </strong>${effect.target}</li>`;
  if (effect.area) infoHTML += `<li><strong>Area: </strong>${effect.area}</li>`;
  infoHTML += '</ul>';
  return infoHTML;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const rangeOrder = {
  'self': 1, 'touch': 2, 'reach': 3, 'melee': 4,
  'short': 5, 'medium': 6, 'long': 7, 'visible': 8, 'known': 9
};

function getGroupKey(spell) {
  switch (selectedSort) {
    case 'origin':   return toTitleCase(spell.origin || 'Unknown');
    case 'range':    return toTitleCase(spell.effects?.[0]?.range || 'Unknown');
    case 'duration': return spell.effects?.[0]?.duration || 'Unknown';
    default:         return null;
  }
}

function spellCostRange(effects) {
  const costs = effects.map(e => getIntentCost(e.intent)).filter(c => c !== '?');
  if (!costs.length) return '?';
  const lo = Math.min(...costs), hi = Math.max(...costs);
  return lo === hi ? `${lo} SP` : `${lo}–${hi} SP`;
}

// ── Main render ───────────────────────────────────────────────────────────────
function renderSpells() {
  const container = document.getElementById('spell-grid');
  const searchTerm = document.getElementById('sidebar-search-input')?.value.toLowerCase() || '';

  let filteredSpells = cachedSpells.filter(spell => {
    const matchesIntent  = activeIntents.length === 0 || spell.effects.some(e => activeIntents.includes(e.intent));
    const matchesOrigin  = activeOrigins.length === 0  || activeOrigins.includes((spell.origin || '').toLowerCase());
    const matchesSearch  = spell.name.toLowerCase().includes(searchTerm) ||
                           spell.effects.some(e => e.effect.toLowerCase().includes(searchTerm));
    return matchesIntent && matchesOrigin && matchesSearch;
  });

  if (selectedSort === 'name') {
    filteredSpells.sort((a, b) => a.name.localeCompare(b.name));
  } else if (selectedSort === 'range') {
    filteredSpells.sort((a, b) =>
      (rangeOrder[a.effects?.[0]?.range?.toLowerCase()] || 999) -
      (rangeOrder[b.effects?.[0]?.range?.toLowerCase()] || 999)
    );
  } else if (selectedSort === 'duration') {
    filteredSpells.sort((a, b) =>
      (a.effects?.[0]?.duration || '').localeCompare(b.effects?.[0]?.duration || '')
    );
  } else if (selectedSort === 'origin') {
    filteredSpells.sort((a, b) => a.origin.localeCompare(b.origin));
  }

  container.innerHTML = '';
  document.getElementById('spell-count').textContent = `${filteredSpells.length} Spells Found`;

  // Group
  const groups = new Map();
  filteredSpells.forEach(spell => {
    const key = getGroupKey(spell);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(spell);
  });

  groups.forEach((spells, groupKey) => {

    if (groupKey !== null) {
      const header = document.createElement('h3');
      header.className = 'spell-group-header';
      header.textContent = `${groupKey}  (${spells.length})`;
      container.appendChild(header);
    }

    spells.forEach(spell => {
      const visibleEffects = spell.effects.filter(e =>
        activeIntents.length === 0 || activeIntents.includes(e.intent)
      );

      // ── Row shell ──
      const row = document.createElement('div');
      row.className = 'spell-row';

      // ── Collapsed header ──
      const head = document.createElement('div');
      head.className = 'spell-row-head';
      head.innerHTML = `
        <span class="spell-row-arrow">▶</span>
        <span class="spell-row-name">${highlightText(toTitleCase(spell.name), searchTerm)}</span>
        <span class="spell-row-tags">
          <span class="origin">${spell.origin}</span>
          <span class="manner">${spell.manner}</span>
          <span class="transmission">${spell.transmission}</span>
        </span>
        <span class="spell-row-cost">${spellCostRange(visibleEffects)}</span>`;

      // ── Expanded detail ──
      const detail = document.createElement('div');
      detail.className = 'spell-row-detail';
      detail.innerHTML = visibleEffects.map(e => {
        const meta = [
          e.range    ? `Range: ${e.range}`       : '',
          e.duration ? `Duration: ${e.duration}` : '',
          e.target   ? `Target: ${e.target}`     : '',
          e.area     ? `Area: ${e.area}`         : '',
        ].filter(Boolean).join(' · ');

        return `
          <div class="spell-intent-block">
            <div class="spell-intent-header">
              <span class="intent-name">${e.intent}</span>
              <span class="intent-cost">${getIntentCost(e.intent)} SP</span>
              ${meta ? `<span class="intent-meta">${meta}</span>` : ''}
            </div>
            <p class="intent-effect">${highlightText(e.effect, searchTerm)}</p>
          </div>`;
      }).join('');

      // actions
      const actions = document.createElement('div');
      actions.className = 'spell-row-actions';
      actions.innerHTML = `
        <button class="copy-spell">Copy Spell</button>
        <button class="copy-macro">Copy Roll20</button>
        <button class="copy-addspell">Copy to Sheet</button>`;

      actions.querySelector('.copy-spell').addEventListener('click',    e => { e.stopPropagation(); copySpellText(spell, e.target); });
      actions.querySelector('.copy-macro').addEventListener('click',    e => { e.stopPropagation(); copyMacroText(spell, e.target); });
      actions.querySelector('.copy-addspell').addEventListener('click', e => { e.stopPropagation(); copyAddSpellText(spell, e.target); });

      detail.appendChild(actions);

      // toggle on head click
      head.addEventListener('click', () => {
        const open = row.classList.toggle('open');
        head.querySelector('.spell-row-arrow').textContent = open ? '▼' : '▶';
      });

      // auto-expand when search term matches
      if (searchTerm && spell.name.toLowerCase().includes(searchTerm)) {
        row.classList.add('open');
        head.querySelector('.spell-row-arrow').textContent = '▼';
      }

      row.appendChild(head);
      row.appendChild(detail);
      container.appendChild(row);
    });
  });
}

// ─── Copy Helpers ─────────────────────────────────────────────────────────────

function copySpellText(spell, button) {
  let text = `# **${toTitleCase(spell.name)}**
  *Origin*: ${spell.origin}
  *Manner*: ${spell.manner}
  *Transmission*: ${spell.transmission}

${spell.effects.map(effect => {
    return `**${effect.intent}** (${getIntentCost(effect.intent)} SP)
- Range: ${effect.range}
- Duration: ${effect.duration}
${effect.target ? `- Target: ${effect.target}` : ''}
${effect.area ? `- Area: ${effect.area}` : ''}
${effect.effect}`;
  }).join('\n\n')}`;

  navigator.clipboard.writeText(text).then(() => {
    flashButton(button, 'Copied!');
  });
}

function copyMacroText(spell, button) {
  const parts = [
    '&{template:shek}',
    `{{name=${toTitleCase(spell.name)}}}`,
    `{{Origin=${spell.origin}}}`,
    `{{Manner=${spell.manner}}}`,
    `{{Transmission=${spell.transmission}}}`
  ];

  spell.effects.forEach(effect => {
    const safeEffect = effect.effect.replace(/\s*\n\s*/g, ' ');
    const cost = getIntentCost(effect.intent);
    parts.push(`{{${effect.intent} (${cost} SP)=${safeEffect}}}`);
  });

  navigator.clipboard.writeText(parts.join(' ')).then(() => {
    flashButton(button, 'Copied!');
  });
}

function copyAddSpellText(spell, button) {
  let output = '';
  spell.effects.forEach(effect => {
    output += `!addspell ${toTitleCase(spell.name)}|${effect.intent.trim()}|${effect.effect}\n`;
  });

  navigator.clipboard.writeText(output.trim()).then(() => {
    flashButton(button, 'Copied!');
  });
}

function flashButton(button, message) {
  const original = button.textContent;
  button.textContent = message;
  button.classList.add('copied');
  setTimeout(() => {
    button.textContent = original;
    button.classList.remove('copied');
  }, 1500);
}

