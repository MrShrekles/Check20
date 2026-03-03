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

      // Show/hide floating search (only on spellbook)
      const floatingSearch = document.getElementById('floating-search');
      if (floatingSearch) {
        floatingSearch.style.display = target === 'spellbook' ? 'flex' : 'none';
      }

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
let selectedSort = 'name';

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

  document.getElementById('spell-search')?.addEventListener('input', renderSpells);

  document.getElementById('toggle-details')?.addEventListener('click', () => {
    document.querySelectorAll('.spell-effect').forEach(el => {
      el.open = !el.open;
    });
  });

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

function renderSpells() {
  const container = document.getElementById('spell-grid');
  const searchTerm = document.getElementById('spell-search')?.value.toLowerCase() || '';

  const rangeOrder = {
    'self': 1, 'touch': 2, 'reach': 3, 'melee': 4,
    'short': 5, 'medium': 6, 'long': 7, 'visible': 8, 'known': 9
  };

  let filteredSpells = cachedSpells.filter(spell => {
    const matchesIntent = activeIntents.length === 0 || spell.effects.some(e =>
      activeIntents.includes(e.intent)
    );
    const matchesOrigin = activeOrigins.length === 0 || activeOrigins.includes((spell.origin || '').toLowerCase());
    const matchesSearch = spell.name.toLowerCase().includes(searchTerm) ||
      spell.effects.some(e => e.effect.toLowerCase().includes(searchTerm));
    return matchesIntent && matchesOrigin && matchesSearch;
  });

  if (selectedSort === 'name') {
    filteredSpells.sort((a, b) => a.name.localeCompare(b.name));
  } else if (selectedSort === 'range') {
    filteredSpells.sort((a, b) => {
      const aRange = rangeOrder[a.effects?.[0]?.range?.toLowerCase()] || 999;
      const bRange = rangeOrder[b.effects?.[0]?.range?.toLowerCase()] || 999;
      return bRange - aRange;
    });
  } else if (selectedSort === 'duration') {
    filteredSpells.sort((a, b) =>
      (a.effects?.[0]?.duration || '').localeCompare(b.effects?.[0]?.duration || '')
    );
  } else if (selectedSort === 'origin') {
    filteredSpells.sort((a, b) => a.origin.localeCompare(b.origin));
  }

  container.innerHTML = '';
  document.getElementById('spell-count').textContent = `${filteredSpells.length} Spells Found`;

  filteredSpells.forEach(spell => {
    const card = document.createElement('div');
    card.className = 'spell-card';

    card.innerHTML = `
<h4>${highlightText(toTitleCase(spell.name), searchTerm)}</h4>
<div class="spell-tags">
  <span class="origin">${spell.origin}</span>
  <span class="manner">${spell.manner}</span>
  <span class="transmission">${spell.transmission}</span>
</div>

${spell.effects
        .filter(effect => activeIntents.length === 0 || activeIntents.includes(effect.intent))
        .map(effect => `
    <details class="spell-effect" open>
      <summary class="spell-features">${effect.intent} <span class="sp-cost">${getIntentCost(effect.intent)} SP</span></summary>
      ${renderEffectInfo(effect)}
      <p>${highlightText(effect.effect, searchTerm)}</p>
    </details>
  `).join('')}

      <div class="spell-buttons">
        <button class="copy-spell" data-spell="${spell.name}">Copy Spell</button>
        <button class="copy-macro" data-spell="${spell.name}">Copy Roll20</button>
        <button class="copy-addspell" data-spell="${spell.name}">Copy to Sheet</button>
      </div>
    `;

    card.querySelector('.copy-spell').addEventListener('click', (e) => copySpellText(spell, e.target));
    card.querySelector('.copy-macro').addEventListener('click', (e) => copyMacroText(spell, e.target));
    card.querySelector('.copy-addspell').addEventListener('click', (e) => copyAddSpellText(spell, e.target));

    container.appendChild(card);
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

// ─── Floating Search ─────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const searchBox = document.getElementById('floating-search');
  const toggleBtn = document.getElementById('toggle-search');

  // Default: hide until spellbook tab is active
  if (searchBox) searchBox.style.display = 'none';

  toggleBtn?.addEventListener('click', () => {
    searchBox.classList.toggle('expanded');
    searchBox.classList.toggle('collapsed');
  });
});