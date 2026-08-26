/* ─── unions-render.js ──────────────────────────────────────────────────────
   Renders unions as codex expandable rows (.spell-row pattern).
   Each union gets a colored left-border accent from its `color` field.
   Factions (when present) appear as sub-rows within the expanded panel.
   ─────────────────────────────────────────────────────────────────────────── */

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, m =>
        ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])
    );
}

/* ── Build a simple keyed list block ── */
function listBlock(items, label) {
    if (!items?.length) return '';
    const rows = items.map(item =>
        `<div class="union-list-item">
            <span class="union-item-name">${esc(item.name)}</span>
            <span class="union-item-desc">${esc(item.desc)}</span>
        </div>`
    ).join('');
    return `<div class="union-section">
        <h4 class="union-section-label">${esc(label)}</h4>
        <div class="union-list">${rows}</div>
    </div>`;
}

/* ── Render a single faction sub-row (future use) ── */
function renderFactionRow(faction, unionColor) {
    const row = document.createElement('div');
    row.className = 'spell-row union-faction-row';
    row.style.setProperty('--row-accent', unionColor);
    row.innerHTML = `
        <div class="spell-row-head">
            <span class="spell-row-arrow">▶</span>
            <span class="spell-row-name">${esc(faction.name)}</span>
            <div class="spell-row-tags">
                <span class="union-tag-faction">Faction</span>
            </div>
        </div>
        <div class="spell-row-detail">
            ${faction.desc ? `<p class="union-faction-desc">${esc(faction.desc)}</p>` : ''}
        </div>`;

    row.querySelector('.spell-row-head').addEventListener('click', () => {
        const open = row.classList.toggle('open');
        row.querySelector('.spell-row-arrow').textContent = open ? '▼' : '▶';
    });
    return row;
}

/* ── Render a single union row ── */
function renderUnionRow(u) {
    const row = document.createElement('div');
    row.className = 'spell-row';
    row.dataset.slug = u.slug;
    row.style.setProperty('--row-accent', u.color || 'transparent');

    const hasFactions = u.factions?.length > 0;

    /* Build the d4 roll widget HTML for names and leaders */
    const nameOptions   = (u.names   || []).map(n => `<li>${esc(n)}</li>`).join('');
    const leaderOptions = (u.leaders || []).map(l =>
        `<li><strong>${esc(l.name)}:</strong> ${esc(l.desc)}</li>`
    ).join('');

    const goodsHtml        = listBlock(u.goods,            u.goodsLabel      || 'Goods');
    const merchantHtml     = listBlock(u.merchantFeatures, 'Merchant Features');
    const infoHtml         = listBlock(u.infoAccess,       'Information Access');

    const factionsHtml = hasFactions
        ? `<div class="union-section union-factions-section">
               <h4 class="union-section-label">Factions</h4>
               <div class="union-factions-list" data-slug="${esc(u.slug)}"></div>
           </div>`
        : '';

    row.innerHTML = `
        <div class="spell-row-head">
            <span class="spell-row-arrow">▶</span>
            <span class="spell-row-name">${esc(u.name)}</span>
            <div class="spell-row-tags">
                <span class="union-tag-opposition" title="Opposition">${esc(u.opposition)}</span>
                ${hasFactions ? `<span class="union-tag-factions">${u.factions.length} faction${u.factions.length !== 1 ? 's' : ''}</span>` : ''}
            </div>
        </div>
        <div class="spell-row-detail">
            <p class="union-tagline">${esc(u.tagline)}</p>
            <p class="union-desc">${esc(u.desc)}</p>
            <p class="union-location"><strong>Location:</strong> ${esc(u.location)}</p>

            <div class="union-roll-cols">
                <div class="union-roll-col">
                    <div class="union-roll-block" data-key="${esc(u.slug)}-names">
                        <div class="union-roll-header">
                            <span class="union-section-label">Union Names</span>
                            <button class="union-roll-btn" data-list="names">Roll d${u.names?.length || 4}</button>
                        </div>
                        <ul class="union-roll-options" style="display:none">${nameOptions}</ul>
                        <div class="union-roll-result"></div>
                    </div>
                </div>
                <div class="union-roll-col">
                    <div class="union-roll-block" data-key="${esc(u.slug)}-leaders">
                        <div class="union-roll-header">
                            <span class="union-section-label">Leaders</span>
                            <button class="union-roll-btn" data-list="leaders">Roll d${u.leaders?.length || 4}</button>
                        </div>
                        <ul class="union-roll-options" style="display:none">${leaderOptions}</ul>
                        <div class="union-roll-result"></div>
                    </div>
                </div>
            </div>

            ${goodsHtml}
            ${merchantHtml}
            ${infoHtml}
            ${factionsHtml}
        </div>`;

    /* Toggle open/close */
    row.querySelector('.spell-row-head').addEventListener('click', () => {
        const open = row.classList.toggle('open');
        row.querySelector('.spell-row-arrow').textContent = open ? '▼' : '▶';

        /* Render faction sub-rows lazily on first open */
        if (open && hasFactions) {
            const container = row.querySelector('.union-factions-list');
            if (container && !container.dataset.rendered) {
                container.dataset.rendered = '1';
                u.factions.forEach(f => container.appendChild(renderFactionRow(f, u.color)));
            }
        }
    });

    /* Roll buttons for names / leaders */
    row.querySelectorAll('.union-roll-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const block   = btn.closest('.union-roll-block');
            const key     = block.dataset.key;
            const listEl  = block.querySelector('.union-roll-options');
            const result  = block.querySelector('.union-roll-result');
            const options = Array.from(listEl.querySelectorAll('li')).map(li => li.innerHTML.trim());
            if (!options.length) return;
            const choice = options[Math.floor(Math.random() * options.length)];
            result.innerHTML = choice;
            result.classList.add('rolled');
            try { localStorage.setItem('union-roll-' + key, choice); } catch {}
        });

        /* Restore last roll from localStorage */
        const block  = btn.closest('.union-roll-block');
        const key    = block.dataset.key;
        const result = block.querySelector('.union-roll-result');
        try {
            const saved = localStorage.getItem('union-roll-' + key);
            if (saved) { result.innerHTML = saved; result.classList.add('rolled'); }
        } catch {}
    });

    return row;
}

/* ── Main render ── */
function renderUnions(items) {
    const container = document.getElementById('unions-sections');
    if (!container) return;

    container.innerHTML = '';
    const frag = document.createDocumentFragment();
    items.forEach(u => frag.appendChild(renderUnionRow(u)));
    container.appendChild(frag);

    document.getElementById('unions-count').textContent =
        `${items.length} union${items.length !== 1 ? 's' : ''}`;
    document.getElementById('unions-no-results').style.display =
        items.length ? 'none' : '';
}
