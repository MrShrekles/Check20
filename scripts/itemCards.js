async function buildItemCards() {
  const container = document.getElementById('item-cards');
  const checkWrap = document.getElementById('check-filters');  // ← new
  const tagWrap = document.getElementById('tag-filters');
  const sortSel = document.getElementById('sort-select');
  const rawItems = await fetch('data/enchanted.json').then(r => r.json());

  // 1. normalize & cache
  const items = rawItems.map(i => {
    const tags = (i.tags || i.tag || [])
      .map(t => t.trim().toLowerCase());

    // allow multiple checks via comma‑sep or single string
    const chkRaw = i.check ?? '';
    const checks = chkRaw.split(',')
      .map(c => c.trim().toLowerCase())
      .filter(Boolean);

    return { ...i, tags, checks };
  });

  // --- build check chips, grouped under “Checks” ---
  const checkPriority = [
    'agility',
    'crafting',
    'influence',
    'intellect',
    'luck',
    'observation',
    'spirit',
    'stealth',
    'strength',
    'survival'
  ];

  // pull unique checks
  const allChecks = Array.from(
    new Set(items.flatMap(it => it.checks))
  );

  // sort by priority then alpha
  allChecks.sort((a, b) => {
    const ia = checkPriority.indexOf(a);
    const ib = checkPriority.indexOf(b);
    if (ia > -1 || ib > -1) {
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    }
    return a.localeCompare(b);
  });

  // render check buttons
  checkWrap.innerHTML = `
    <div class="check-group">
      <h4>Checks</h4>
      ${allChecks.map(c =>
    `<button class="check-chip" data-check="${c}">${c}</button>`
  ).join('')}
    </div>
  `;

  const activeChecks = new Set();
  checkWrap.addEventListener('click', e => {
    if (!e.target.matches('.check-chip')) return;
    const c = e.target.dataset.check;
    activeChecks.has(c) ? activeChecks.delete(c) : activeChecks.add(c);
    [...checkWrap.querySelectorAll('.check-chip')].forEach(btn =>
      btn.classList.toggle('active', activeChecks.has(btn.dataset.check))
    );
    render();
  });


  // --- build tag chips, grouped under headers ---
  const tagPriority = [
    'action',
    'half action',
    'off-action',
    'reaction',
    'passive'
  ];

  const allTags = Array.from(
    new Set(items.flatMap(i => i.tags))
  );

  allTags.sort((a, b) => {
    const ia = tagPriority.indexOf(a);
    const ib = tagPriority.indexOf(b);
    if (ia > -1 || ib > -1) {
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    }
    return a.localeCompare(b);
  });

  const primary = allTags.filter(t => tagPriority.includes(t));
  const secondary = allTags.filter(t => !tagPriority.includes(t));

  tagWrap.innerHTML = `
    <div class="tag-group">
      <h4>Actions</h4>
      ${primary.map(t =>
    `<button class="tag-chip" data-tag="${t}">${t}</button>`
  ).join('')}
    </div>
    <div class="tag-group">
      <h4>Other</h4>
      ${secondary.map(t =>
    `<button class="tag-chip" data-tag="${t}">${t}</button>`
  ).join('')}
    </div>
  `;

  const activeTags = new Set();
  tagWrap.addEventListener('click', e => {
    if (!e.target.matches('.tag-chip')) return;
    const t = e.target.dataset.tag;
    activeTags.has(t) ? activeTags.delete(t) : activeTags.add(t);
    [...tagWrap.querySelectorAll('.tag-chip')].forEach(btn =>
      btn.classList.toggle('active', activeTags.has(btn.dataset.tag))
    );
    render();
  });

  sortSel.addEventListener('change', render);
  render();


  // ------------ helpers ------------ //
  function render() {
    let view = [...items];

    // filter by checks (OR logic)
    if (activeChecks.size) {
      view = view.filter(it =>
        it.checks.some(c => activeChecks.has(c))
      );
    }

    // filter by tags (OR logic)
    if (activeTags.size) {
      view = view.filter(it =>
        it.tags.some(t => activeTags.has(t))
      );
    }

    // sort
    const key = sortSel.value;
    view.sort((a, b) => {
      if (key === 'damage') {
        return (a['Damage, Armor'] || '')
          .localeCompare(b['Damage, Armor'] || '');
      }
      return (a[key] || '').localeCompare(b[key] || '');
    });

    // paint
    container.innerHTML = '';
    view.forEach(drawCard);
  }

  function drawCard(it) {
    const slug = it.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_');

    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      <header>
        <h2 class="item-title">${it.name}</h2>
        <span class="item-type">${it.type ?? ''}</span>
      </header>
      <p class="item-desc"><em>${it.description ?? ''}</em></p>
      <img src="assets/images/${slug}.jpg" alt="${it.name}">
      <div class="item-stats">
        <strong>Checks:</strong>
        ${it.checks.map(c => `<span class="item-check">${c}</span>`).join(' ')}
      </div>
      <div class="item-stats">
        <strong>${it['Damage, Armor'] ?? ''}</strong>
      </div>
      <p class="features">
        <strong>Effect:</strong> ${it.effect ?? ''}
      </p>
      <p class="item-text">
        <strong>Upgrade:</strong> ${it.upgrade ?? ''}
      </p>
      <div class="tag-wrap">
        ${it.tags.map(tag =>
      `<span class="item-tag">${tag}</span>`
    ).join('')}
      </div>
    `;
    container.appendChild(card);
  }
}

document.addEventListener('DOMContentLoaded', buildItemCards);
