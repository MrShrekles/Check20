let cachedArmor = [];

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('armor-sort-options').addEventListener('change', renderArmor);
  document.getElementById('armor-search').addEventListener('input', renderArmor);
  loadArmor();
});

async function loadArmor() {
  const response = await fetch('data/armor.json');
  cachedArmor = await response.json();
  renderArmor();
}

function renderArmor() {
  const container = document.getElementById('armor-grid');
  const sortKey = document.getElementById('armor-sort-options').value || 'name';
  const searchTerm = document.getElementById('armor-search').value.toLowerCase() || '';

  let filtered = cachedArmor.filter(item =>
    item.name.toLowerCase().includes(searchTerm) ||
    (item.description || '').toLowerCase().includes(searchTerm) ||
    (item.checkBonus || '').toLowerCase().includes(searchTerm) ||
    (item.checkPenalty || '').toLowerCase().includes(searchTerm)
  );

  filtered.sort((a, b) => {
    if (sortKey === 'armor' || sortKey === 'bulk' || sortKey === 'cost') {
      return (b[sortKey] || 0) - (a[sortKey] || 0);
    } else {
      return (a[sortKey] || '').localeCompare(b[sortKey] || '');
    }
  });

  container.innerHTML = '';
  filtered.forEach(item => {
    const icon = item.category === "shield"
      ? `<svg class="armor-icon" viewBox="0 0 24 24" width="18" height="18"><path fill="goldenrod" d="M12 2L4 5v6c0 5.25 3.4 10.74 8 12 4.6-1.26 8-6.75 8-12V5l-8-3z"/></svg>`
      : `<img src="assets/icons/kevlar-vest.svg" class="armor-icon" alt="armor icon" width="20" height="20">`;

    const tagsHTML = `
      <div class="armor-tags">
        <span class="${item.category}">${item.category}</span>
        ${item.hefty === "yes" ? `<span class="hefty">Hefty</span>` : ''}
      </div>
    `;

    const card = document.createElement('div');
    card.className = 'armor-card';

    card.innerHTML = `
      <h4>${icon} ${item.name}</h4>
      ${tagsHTML}
      <ul class="armor-info">
        <li><strong>Armor:</strong> ${item.armor}</li>
        <li><strong>Bulk:</strong> ${item.bulk}</li>
        <li><strong class="cost-text">Cost:</strong> ${item.cost} gp</li>
        ${item.checkBonus ? `<li><strong class="bonus-text">Check Bonus:</strong> ${item.checkBonus}</li>` : ''}
        ${item.movePenalty ? `<li><strong class="penalty-text">Move Penalty:</strong> ${item.movePenalty}</li>` : ''}
        ${item.checkPenalty ? `<li><strong class="penalty-text">Check Penalty:</strong> ${item.checkPenalty}</li>` : ''}
      </ul>
      ${item.description ? `<p>${item.description}</p>` : ''}
      <div class="armor-buttons">
        <button class="copy-armor" data-macro="/me equips ${item.name} gaining ${item.armor} armor.">${item.category === "shield" ? "Copy Shield Macro" : "Copy Armor Macro"}</button>
        <button class="copy-addarmor">Copy to Sheet</button>
      </div>
    `;

    card.querySelector('.copy-armor').addEventListener('click', e => {
      navigator.clipboard.writeText(e.target.dataset.macro);
      e.target.textContent = "Copied!";
      setTimeout(() => e.target.textContent = "Copy Armor Macro", 1500);
    });

    card.querySelector('.copy-addarmor').addEventListener('click', e => {
      copyAddArmorText(item, e.target);
    });

    container.appendChild(card);
  });
}

function copyAddArmorText(item, button) {
  const penaltyParts = [];
  if (item.movePenalty) penaltyParts.push(`Move:${item.movePenalty}`);
  if (item.checkPenalty?.toLowerCase().includes('magic')) {
    const match = item.checkPenalty.match(/magic\s*([+-]?\d+)/i);
    if (match) penaltyParts.push(`Magic:${match[1]}`);
  }

  const mods = [];
  const statList = ["Agility", "Crafting", "Influence", "Intellect", "Luck", "Observation", "Spirit", "Stealth", "Strength", "Survival"];
  statList.forEach(stat => {
    const regex = new RegExp(`${stat}\\s*[+-]?\\d`, "i");
    const match = (item.checkBonus || item.checkPenalty || "").match(regex);
    if (match) {
      const value = match[0].match(/[+-]?\d+/);
      if (value) mods.push(`${stat}:${value[0]}`);
    }
  });

  const allMods = [...mods, ...penaltyParts];
  const macro = `!addarmor ${item.name}|${item.armor}|${item.description || ''}|${allMods.join(',')}`;

  navigator.clipboard.writeText(macro).then(() => {
    const original = button.textContent;
    button.textContent = "Copied!";
    setTimeout(() => button.textContent = "Copy to Sheet", 1500);
  });
}
