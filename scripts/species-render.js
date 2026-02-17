/* =========================
   species-render.js
   Card, grid, feature, and tag rendering
   ========================= */

function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

/* ====== Card ====== */
function renderCard(s) {
    const el = document.createElement('article');
    el.className = 'species-card';
    el.dataset.id = s.slug;
    const cover = s.images?.[0] || `assets/species/${s.slug}.jpg`;

    const chips = [
        s.rarity && `<div class="info-chip">Rarity: <span class="chip chip-rarity rarity-${(s.rarityKey || '').replace(/\s+/g, '-')}">${escapeHTML(s.rarity)}</span></div>`,
        ...(s.regionList || []).map(r => `<span class="chip">${escapeHTML(r)}</span>`)
    ].filter(Boolean).join('');

    const featureLines = (s.features || []).map(f => renderFeatureLine(f)).join('');

    el.innerHTML = `
    <img class="cover" loading="lazy" src="${cover}" alt="${escapeHTML(s.name)}" data-slug="${escapeHTML(s.slug)}">
    <header><h3>${escapeHTML(s.name)}</h3></header>
    <div class="species-meta">${chips}</div>
    <div class="species-body collapsed">
      ${escapeHTML(s.description || '')}
      ${renderDataTags(s)}
    </div>
    <a class="read-more" role="button">Read full</a>
    ${featureLines}
    `;

    const body = el.querySelector('.species-body');
    const btn = el.querySelector('.read-more');
    const toggle = () => {
        const isCollapsed = body.classList.toggle('collapsed');
        btn.textContent = isCollapsed ? 'Read full' : 'Show less';
    };
    btn.addEventListener('click', toggle);
    if ((s.description || '').length < 220) {
        body.classList.remove('collapsed');
        btn.style.display = 'none';
    }

    return el;
}

function renderDataTags(s) {
    const rows = [
        ['Size (ft)', s.size],
        ['Lifespan', s.lifespan],
        ['Language', s.language],
        ['Diet', s.diet],
        ['Rarity', s.rarity],
        ['Region', (s.regionList || []).join(', ') || s.region],
        ['Origin', s.origin]
    ].filter(([, v]) => v && String(v).trim().length);

    if (!rows.length) return '';
    return `
    <div class="read-tags">
      ${rows.map(([k, v]) => `
        <span class="tag-kv"><span class="k">${escapeHTML(k)}:</span> <span class="v">${escapeHTML(String(v))}</span></span>
      `).join('')}
    </div>
    `;
}

function refreshCard(idSlug) {
    const el = document.querySelector(`.species-card[data-id="${idSlug}"]`);
    if (!el) return;
    const sp = SPECIES.find(s => s.slug === idSlug);
    if (!sp) return;
    el.replaceWith(renderCard(sp));
}

/* ====== Feature block ====== */
function renderFeatureLine(f) {
    const name = (f.name || 'Feature').trim();
    const action = (f.action || '').toString().trim();
    const dmg = (f.damage || '').toString().trim();
    const dtype = (f.type || '').toString().trim();
    const effect = (f.description || '').toString().trim();

    const actionPill = action ? `<span class="feature-pill pill-action">${escapeHTML(action)}</span>` : '';
    const dmgBits = [dmg, dtype].filter(Boolean).join(', ');
    const dmgPill = dmgBits ? `<span class="feature-pill pill-dmg">${escapeHTML(dmgBits)}</span>` : '';

    return `
    <div class="feature-line">
      <div class="feature-name">${escapeHTML(name)}</div>
      <div class="feature-pills">${actionPill} ${dmgPill}</div>
      <div class="feature-effect">${escapeHTML(effect)}</div>
    </div>
    `;
}

/* ====== Grid ====== */
function renderGrid(list) {
    const wrap = document.getElementById('species-sections');
    if (!wrap) return;
    wrap.innerHTML = '';

    // When a specific lineage tab is active, list is already filtered to one lineage
    // so we skip the lineage section wrapper and render option groups directly.
    const tabbed = state.selectedLineage !== 'all';

    if (tabbed) {
        renderOptionGroups(wrap, list);
    } else {
        const byLineage = list.reduce((m, s) => {
            const L = s.lineage || 'Other';
            (m[L] ||= []).push(s);
            return m;
        }, {});

        const lineageNames = Object.keys(byLineage).sort((a, b) => {
            if (a === 'Other') return 1;
            if (b === 'Other') return -1;
            return a.localeCompare(b);
        });

        const outerFrag = document.createDocumentFragment();
        lineageNames.forEach(L => {
            const sec = document.createElement('section');
            sec.className = 'lineage-section';
            sec.dataset.lineage = L.toLowerCase();
            sec.dataset.lineageLabel = L;

            const header = document.createElement('div');
            header.className = 'lineage-header';
            header.innerHTML = `
            <span class="twisty">▸</span>
            <h2 style="margin:0">${escapeHTML(L)}</h2>
            <span class="count">(${byLineage[L].length})</span>
            `;
            header.addEventListener('click', () => {
                const now = !isCollapsed(L);
                setCollapsed(L, now);
                sec.classList.toggle('collapsed', now);
                if (!now) sec.scrollIntoView({ block: 'start', behavior: 'smooth' });
            });
            sec.appendChild(header);
            sec.classList.toggle('collapsed', isCollapsed(L));

            renderOptionGroups(sec, byLineage[L]);
            outerFrag.appendChild(sec);
        });

        wrap.appendChild(outerFrag);
    }
}

/* ====== Option Groups (shared by both tabbed and all-view) ====== */
function renderOptionGroups(parent, items) {
    const byOption = items.reduce((m, s) => {
        const O = s.option || 'General';
        (m[O] ||= []).push(s);
        return m;
    }, {});

    const optionNames = Object.keys(byOption).sort((a, b) => a.localeCompare(b));
    const frag = document.createDocumentFragment();

    optionNames.forEach(O => {
        const wrapper = document.createElement('div');
        wrapper.className = 'option-group';

        const oh = document.createElement('div');
        oh.className = 'option-header';
        oh.innerHTML = `
        <span class="twisty">▸</span>
        <h3>${escapeHTML(O)}</h3>
        <small class="count">(${byOption[O].length})</small>
        `;

        const grid = document.createElement('div');
        grid.className = 'lineage-grid';

        // Collapsible option groups — collapsed state is in-memory only
        oh.addEventListener('click', () => {
            wrapper.classList.toggle('collapsed');
        });

        const gridFrag = document.createDocumentFragment();
        byOption[O].forEach(s => gridFrag.appendChild(renderCard(s)));
        grid.appendChild(gridFrag);

        wrapper.appendChild(oh);
        wrapper.appendChild(grid);
        frag.appendChild(wrapper);
    });

    parent.appendChild(frag);
}