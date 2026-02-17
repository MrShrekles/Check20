async function buildItemCards() {
  const container = document.getElementById('item-cards');
  const checkWrap = document.getElementById('check-filters');
  const tagWrap = document.getElementById('tag-filters');
  const sortSel = document.getElementById('sort-select');

  const rawItems = await fetch('data/enchanted.json').then(r => r.json());

  // ---------- helpers ----------
  const slugify = (name = '') =>
    name.toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

  const uniq = (arr) => Array.from(new Set(arr));

  const checkPriority = [
    'agility', 'crafting', 'influence', 'intellect', 'luck',
    'observation', 'spirit', 'stealth', 'strength', 'survival'
  ];
  const tagPriority = ['action', 'half action', 'off-action', 'reaction', 'passive'];

  const prioritySort = (priority) => (a, b) => {
    const ia = priority.indexOf(a);
    const ib = priority.indexOf(b);
    if (ia !== -1 || ib !== -1) {
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    }
    return a.localeCompare(b);
  };

  // ---------- normalize & cache ----------
  const items = rawItems.map(i => {
    const tags = (i.tags || i.tag || [])
      .map(t => String(t).trim().toLowerCase())
      .filter(Boolean);

    const chkRaw = String(i.check ?? '');
    const checks = chkRaw.split(',')
      .map(c => c.trim().toLowerCase())
      .filter(Boolean);

    return {
      ...i,
      tags,
      checks,
      _slug: slugify(i.name || ''),
      _damageArmor: String(i['Damage, Armor'] ?? ''),
      _sortCache: Object.create(null) // lazy per-key cache
    };
  });

  // ---------- build chips ----------
  const allChecks = uniq(items.flatMap(it => it.checks)).sort(prioritySort(checkPriority));
  const allTags = uniq(items.flatMap(it => it.tags)).sort(prioritySort(tagPriority));

  checkWrap.innerHTML = `
    <div class="check-group">
      <h4>Checks</h4>
      ${allChecks.map(c => `<button type="button" class="check-chip" data-check="${c}">${c}</button>`).join('')}
    </div>
  `;

  const primary = allTags.filter(t => tagPriority.includes(t));
  const secondary = allTags.filter(t => !tagPriority.includes(t));

  tagWrap.innerHTML = `
    <div class="tag-group">
      <h4>Actions</h4>
      ${primary.map(t => `<button type="button" class="tag-chip" data-tag="${t}">${t}</button>`).join('')}
    </div>
    <div class="tag-group">
      <h4>Other</h4>
      ${secondary.map(t => `<button type="button" class="tag-chip" data-tag="${t}">${t}</button>`).join('')}
    </div>
  `;

  // ---------- state ----------
  const activeChecks = new Set();
  const activeTags = new Set();

  // Toggle a chip without re-querying all buttons each time
  const toggleChip = (btn, set, value) => {
    if (set.has(value)) {
      set.delete(value);
      btn.classList.remove('active');
    } else {
      set.add(value);
      btn.classList.add('active');
    }
    render();
  };

  checkWrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.check-chip');
    if (!btn) return;
    toggleChip(btn, activeChecks, btn.dataset.check);
  });

  tagWrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.tag-chip');
    if (!btn) return;
    toggleChip(btn, activeTags, btn.dataset.tag);
  });

  sortSel.addEventListener('change', render);

  render();

  // ---------- render ----------
  function render() {
    const hasChecks = activeChecks.size > 0;
    const hasTags = activeTags.size > 0;

    // filter
    let view = items;
    if (hasChecks || hasTags) {
      view = items.filter(it => {
        if (hasChecks && !it.checks.some(c => activeChecks.has(c))) return false;
        if (hasTags && !it.tags.some(t => activeTags.has(t))) return false;
        return true;
      });
    }

    // sort (cache sort values per key to avoid repeated localeCompare inputs)
    const key = sortSel.value;
    view.sort((a, b) => {
      if (key === 'damage') {
        return a._damageArmor.localeCompare(b._damageArmor);
      }
      // lazily cache per-key normalized string
      const av = (a._sortCache[key] ??= String(a[key] ?? ''));
      const bv = (b._sortCache[key] ??= String(b[key] ?? ''));
      return av.localeCompare(bv);
    });

    // paint (fast)
    const frag = document.createDocumentFragment();
    for (const it of view) frag.appendChild(drawCard(it));
    container.replaceChildren(frag);
  }

  function drawCard(it) {
    const card = document.createElement('div');
    card.className = 'item-card';

    const checksHtml = it.checks.map(c => `<span class="item-check">${c}</span>`).join(' ');
    const tagsHtml = it.tags.map(t => `<span class="item-tag">${t}</span>`).join('');

    card.innerHTML = `
    <header>
      <h2 class="item-title">${it.name ?? ''}</h2>
      <span class="item-type">${it.type ?? ''}</span>
    </header>

    <p class="item-desc"><em>${it.description ?? ''}</em></p>

    <div class="item-stats">
      <strong>Checks:</strong>
      ${checksHtml}
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
      ${tagsHtml}
    </div>
  `;

    const img = document.createElement('img');
    img.src = `assets/images/enchanted/${it._slug}.png`;
    img.alt = it.name ?? '';
    img.loading = 'lazy';
    img.onerror = () => {
      img.onerror = null;
      img.src = 'assets/images/enchanted/no-image-pixel-sword.png';
    };

    // Insert image right after description
    const desc = card.querySelector('.item-desc');
    desc.insertAdjacentElement('afterend', img);

    return card;
  }

}

document.addEventListener('DOMContentLoaded', buildItemCards);
