async function loadSpells() {
    const response = await fetch('data/spells.json');
    cachedSpells = await response.json();
    renderSpells();
}

let cachedSpells = [];

function toTitleCase(str) {
  return str.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

function renderSpells() {
    const container = document.getElementById('spell-grid');
    container.innerHTML = '';

    cachedSpells.forEach(spell => {
        const card = document.createElement('div');
        card.className = 'spell-card';

        card.innerHTML = `
<h4>${toTitleCase(spell.name)}</h4>
  <div class="spell-tags">
    <span class="manner">${spell.manner}</span>
    <span class="transmission">${spell.transmission}</span>
  </div>
  ${spell.effects.map(effect => `
    <div class="spell-features">${effect.intent} <span class="sp-cost">${getIntentCost(effect.intent)} SP</span></div>
    ${renderEffectInfo(effect)}
    <p>${effect.effect}</p>
  `).join('')}
`;

        card.innerHTML += `
  <div class="spell-buttons">
    <button class="copy-spell" data-spell="${spell.name}">Copy Spell</button>
    <button class="copy-macro" data-spell="${spell.name}">Copy Roll20</button>
    <button class="copy-addspell" data-spell="${spell.name}">Copy to Sheet</button>
  </div>
`;
const copyButton = card.querySelector('.copy-spell');
const macroButton = card.querySelector('.copy-macro');
const addSpellButton = card.querySelector('.copy-addspell');

addSpellButton.addEventListener('click', (e) => {
  copyAddSpellText(spell, e.target);
});

copyButton.addEventListener('click', (e) => {
  copySpellText(spell, e.target);
});

macroButton.addEventListener('click', (e) => {
  copyMacroText(spell, e.target);
});

        container.appendChild(card);
    });
}
function renderEffectInfo(effect) {
    let infoHTML = '<ul class="spell-info">';

    if (effect.range) {
        infoHTML += `<li><strong>Range: </strong>${effect.range}</li>`;
    }
    if (effect.duration) {
        infoHTML += `<li><strong>Duration: </strong>${effect.duration}</li>`;
    }
    if (effect.target) {
        infoHTML += `<li><strong>Target: </strong>${effect.target}</li>`;
    }
    if (effect.area) {
        infoHTML += `<li><strong>Area: </strong>${effect.area}</li>`;
    }

    infoHTML += '</ul>';
    return infoHTML;
}


function renderSpellInfo(spell) {
    const firstEffect = spell.effects[0];
    let infoHTML = '<ul class="spell-info">';

    if (firstEffect.range) {
        infoHTML += `<li><strong>Range: </strong>${firstEffect.range}</li>`;
    }
    if (firstEffect.duration) {
        infoHTML += `<li><strong>Duration: </strong>${firstEffect.duration}</li>`;
    }
    if (firstEffect.target) {
        infoHTML += `<li><strong>Target: </strong>${firstEffect.target}</li>`;
    }
    if (firstEffect.area) {
        infoHTML += `<li><strong>Area: </strong>${firstEffect.area}</li>`;
    }

    infoHTML += '</ul>';
    return infoHTML;
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

loadSpells();

function copySpellText(spell, button) {
    let text = `# **${toTitleCase(spell.name)}**
*Manner*: ${spell.manner}
*Transmission*: ${spell.transmission}
  
${spell.effects.map(effect => {
        return `**${effect.intent} ** (${getIntentCost(effect.intent)} SP)
- Range: ${effect.range}
- Duration: ${effect.duration}
${effect.target ? `- Target: ${effect.target}` : ''}
${effect.area ? `- Area: ${effect.area}` : ''}
${effect.effect}`;
    }).join('\n\n')}
  `;

    navigator.clipboard.writeText(text).then(() => {
        // Change button appearance temporarily
        const originalText = button.textContent;
        button.textContent = "Copied!";
        button.classList.add("copied");

        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove("copied");
        }, 1500);
    });
}

function copyMacroText(spell, button) {
    let macro = `&{template:shek} {{name=${toTitleCase(spell.name)}}}
 {{Manner=${spell.manner}}} {{Transmission=${spell.transmission}}}`;
  
    spell.effects.forEach(effect => {
      macro += ` {{${effect.intent} (${getIntentCost(effect.intent)} SP)=${effect.effect}}}`;
    });
  
    navigator.clipboard.writeText(macro).then(() => {
      const originalText = button.textContent;
      button.textContent = "Copied!";
      button.classList.add("copied");
  
      setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove("copied");
      }, 1500);
    });
  }
  
  function copyAddSpellText(spell, button) {
    let output = '';

    spell.effects.forEach(effect => {
        const intentFormatted = effect.intent.trim(); // Example: Whisper, Surge, Shout
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
