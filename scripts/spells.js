function highlightText(text, term) {
  if (!term) return text;
  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escape regex
  const regex = new RegExp(`(${escapedTerm})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

let cachedSpells = [];

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('sort-options').addEventListener('change', renderSpells);
  document.getElementById('filter-intent').addEventListener('change', renderSpells);
  document.getElementById('spell-search').addEventListener('input', renderSpells);

  document.getElementById('toggle-tags').addEventListener('click', () => {
    document.querySelectorAll('.spell-tags').forEach(el => el.classList.toggle('hidden'));
  });

  document.getElementById('toggle-details').addEventListener('click', () => {
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
  return costMap[intent.trim()] ?? '?';
}

function toTitleCase(str) {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
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
  const sortKey = document.getElementById('sort-options')?.value || 'name';
  const filterIntent = document.getElementById('filter-intent')?.value || '';
  const searchTerm = document.getElementById('spell-search')?.value.toLowerCase() || '';

  let filteredSpells = cachedSpells.filter(spell => {
    const matchesIntent = filterIntent === '' || spell.effects.some(e => e.intent === filterIntent);
    const matchesSearch = spell.name.toLowerCase().includes(searchTerm) ||
      spell.effects.some(e => e.effect.toLowerCase().includes(searchTerm));
    return matchesIntent && matchesSearch;
  });

  if (sortKey === 'name') {
    filteredSpells.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortKey === 'intent') {
    filteredSpells.sort((a, b) => {
      const aCost = getIntentCost(a.effects?.[0]?.intent ?? '');
      const bCost = getIntentCost(b.effects?.[0]?.intent ?? '');
      return aCost - bCost;
    });
  } else if (sortKey === 'manner') {
    filteredSpells.sort((a, b) => a.manner.localeCompare(b.manner));
  } else if (sortKey === 'transmission') {
    filteredSpells.sort((a, b) => a.transmission.localeCompare(b.transmission));
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

      ${spell.effects.map(effect => `
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
    const original = button.textContent;
    button.textContent = "Copied!";
    button.classList.add("copied");
    setTimeout(() => {
      button.textContent = original;
      button.classList.remove("copied");
    }, 1500);
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

  const macro = parts.join(' ');

  navigator.clipboard.writeText(macro).then(() => {
    const original = button.textContent;
    button.textContent = "Copied!";
    button.classList.add("copied");
    setTimeout(() => {
      button.textContent = original;
      button.classList.remove("copied");
    }, 1500);
  });
}

function copyAddSpellText(spell, button) {
  let output = '';
  spell.effects.forEach(effect => {
    const intentFormatted = effect.intent.trim();
    const spellText = `!addspell ${toTitleCase(spell.name)}|${intentFormatted}|${effect.effect}`;
    output += spellText + `\n`;
  });

  navigator.clipboard.writeText(output.trim()).then(() => {
    const originalText = button.textContent;
    button.textContent = "Copied!";
    button.classList.add("copied");
    setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove("copied");
    }, 1500);
  });
}
