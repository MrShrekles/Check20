/* =========================
   species-render.js
   Card, grid, feature, and tag rendering
   ========================= */

function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function linkifyDesc(text) {
    if (!text) return '';
    return escapeHTML(text)
        .replace(/\[([^\]]+)\]/g, (match, name) => {
            const god = (typeof GOD_MAP !== 'undefined') && GOD_MAP.get(name.toLowerCase());
            if (god) return `<span class="god-ref" data-god="${escapeHTML(name.toLowerCase())}">${escapeHTML(name)}</span>`;
            return match;
        })
        .replace(/\n\n+/g, '<br><br>')
        .replace(/\n/g, '<br>');
}

// ── GOD TOOLTIP ──────────────────────────────────────────────────────────────
(function initGodTooltip() {
    const tip = document.createElement('div');
    tip.id = 'god-tooltip';
    tip.style.cssText = `
        position:fixed;z-index:999;pointer-events:none;display:none;
        max-width:260px;background:#111820;border:1px solid #2a3a52;
        border-radius:6px;padding:10px 12px;box-shadow:0 6px 20px rgba(0,0,0,.6);
        font-family:'Share Tech Mono',monospace;font-size:11px;line-height:1.6;color:#b0c4d8;
    `;
    document.body.appendChild(tip);

    document.addEventListener('mouseover', e => {
        const span = e.target.closest('.god-ref');
        if (!span) return;
        const god = (typeof GOD_MAP !== 'undefined') && GOD_MAP.get(span.dataset.god);
        if (!god) return;
        const excerpt = god.desc.length > 180 ? god.desc.slice(0, 180).trimEnd() + '…' : god.desc;
        tip.innerHTML = `
            <div style="font-family:'Cinzel',serif;font-size:13px;color:#e0c87a;margin-bottom:4px;">${escapeHTML(god.name)}</div>
            ${god.words ? `<div style="font-size:9px;letter-spacing:.08em;color:#6b9fc4;margin-bottom:6px;">${escapeHTML(god.words)}</div>` : ''}
            <div>${escapeHTML(excerpt)}</div>`;
        tip.style.display = 'block';
    });

    document.addEventListener('mousemove', e => {
        if (tip.style.display === 'none') return;
        const x = e.clientX + 14;
        const y = e.clientY + 14;
        tip.style.left = (x + 260 > window.innerWidth ? e.clientX - 274 : x) + 'px';
        tip.style.top  = (y + tip.offsetHeight > window.innerHeight ? e.clientY - tip.offsetHeight - 8 : y) + 'px';
    });

    document.addEventListener('mouseout', e => {
        if (e.target.closest('.god-ref')) tip.style.display = 'none';
    });
})();

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

    const desc = s.description || {};
    const physical     = typeof desc === 'string' ? desc : (desc.physical || '');
    const environment  = typeof desc === 'string' ? '' : (desc.environment !== '[TBD]' ? desc.environment || '' : '');
    const culture      = typeof desc === 'string' ? '' : (desc.culture    !== '[TBD]' ? desc.culture    || '' : '');
    const lore         = typeof desc === 'string' ? '' : (desc.lore       !== '[TBD]' ? desc.lore       || '' : '');

    const descHtml = [
        physical     && `<p>${linkifyDesc(physical)}</p>`,
        environment  && `<h4 class="desc-section-label">Environment</h4><p>${linkifyDesc(environment)}</p>`,
        culture      && `<h4 class="desc-section-label">Culture</h4><p>${linkifyDesc(culture)}</p>`,
        lore         && `<h4 class="desc-section-label">Lore</h4><p>${linkifyDesc(lore)}</p>`,
    ].filter(Boolean).join('');

    const displayName = s.name.replace(/\s*\([^)]*\)/g, '').trim();
    el.innerHTML = `
    <img class="cover" loading="lazy" src="${cover}" alt="${escapeHTML(displayName)}" data-slug="${escapeHTML(s.slug)}">
    <header><h3>${escapeHTML(displayName)}</h3></header>
    <div class="species-meta">${chips}</div>
    <div class="species-body collapsed">
      <div class="species-desc">${descHtml}</div>
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
    if (physical.length < 220 && !environment && !culture && !lore) {
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
    const name     = (f.name        || 'Feature').trim();
    const action   = (f.action      || '').toString().trim();
    const check    = (f.check       || '').toString().trim();
    const range    = (f.range       || '').toString().trim();
    const duration = (f.duration    || '').toString().trim();
    const dmg      = (f.damage      || '').toString().trim();
    const dtype    = (f.type        || '').toString().trim();
    const effect   = (f.description || '').toString().trim();

    const condition  = (f.condition || '').toString().trim();

    const actionPill    = action    ? `<span class="feature-pill pill-action">${escapeHTML(action)}</span>`       : '';
    const checkPill     = check     ? `<span class="feature-pill pill-check">${escapeHTML(check)}</span>`         : '';
    const rangePill     = range     ? `<span class="feature-pill pill-range">${escapeHTML(range)}</span>`         : '';
    const durationPill  = duration  ? `<span class="feature-pill pill-duration">${escapeHTML(duration)}</span>`   : '';
    const conditionPill = condition ? `<span class="feature-pill pill-condition">${escapeHTML(condition)}</span>` : '';
    const dmgBits       = [dmg, dtype].filter(Boolean).join(' · ');
    const dmgPill       = dmgBits   ? `<span class="feature-pill pill-dmg">${escapeHTML(dmgBits)}</span>`         : '';

    const pills = [actionPill, checkPill, rangePill, durationPill, conditionPill, dmgPill].filter(Boolean).join('');

    return `
    <div class="feature-line">
      <div class="feature-name">${escapeHTML(name)}</div>
      ${pills ? `<div class="feature-pills">${pills}</div>` : ''}
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

        // Collapsible option groups - collapsed state is in-memory only
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