/* ─── enchanted-render.js ────────────────────────────────────────────────── */

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, m =>
        ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])
    );
}

function renderEnchantedRow(item) {
    const row = document.createElement('div');
    row.className = 'spell-row enchanted-row';
    row.dataset.slug = item.slug;
    row.dataset.type = (item.type || '').toLowerCase();
    if (item.color) row.style.setProperty('--row-accent', item.color);

    const checksHtml = item.checks.map(c =>
        `<span class="enc-check-tag">${esc(c)}</span>`
    ).join('');

    const statHtml = item.damageArmor
        ? `<span class="spell-row-cost enc-stat">${esc(item.damageArmor)}</span>` : '';

    row.innerHTML = `
        <div class="spell-row-head enc-row-head">
            <span class="spell-row-arrow">▶</span>
            <span class="spell-row-name">${esc(item.name)}</span>
            <div class="spell-row-tags enc-tags">
                <span class="enc-type-tag">${esc(item.type || '')}</span>
                ${checksHtml}
            </div>
            ${statHtml}
        </div>
        <div class="spell-row-detail enc-row-detail"></div>`;

    /* Build expanded detail lazily on first open */
    let detailBuilt = false;
    const head   = row.querySelector('.enc-row-head');
    const detail = row.querySelector('.enc-row-detail');

    head.addEventListener('click', () => {
        const open = row.classList.toggle('open');
        head.querySelector('.spell-row-arrow').textContent = open ? '▼' : '▶';

        if (open && !detailBuilt) {
            detailBuilt = true;

            /* Pixel art image - hide on error via makeCodexImage */
            const img = makeCodexImage(
                `assets/images/enchanted/${item.slug}.png`,
                item.name,
                'codex-cover codex-cover--pixel enc-art'
            );
            detail.appendChild(img);

            const body = document.createElement('div');
            body.className = 'enc-body';
            body.innerHTML = `
                ${item.description ? `<p class="enc-desc"><em>${esc(item.description)}</em></p>` : ''}
                ${item.effect   ? `<div class="enc-block"><span class="enc-label">Effect</span><p>${esc(item.effect)}</p></div>`   : ''}
                ${item.upgrade  ? `<div class="enc-block enc-upgrade"><span class="enc-label">Upgrade</span><p>${esc(item.upgrade)}</p></div>` : ''}
                ${item.tags.length ? `<div class="enc-chip-row">${item.tags.map(t => `<span class="enc-chip">${esc(t)}</span>`).join('')}</div>` : ''}
            `;
            detail.appendChild(body);
        }
    });

    return row;
}

/* ─── Progression item rows ─────────────────────────────────────────────── */

function renderProgStep(step) {
    const action = step.action ? `<span class="prog-action-tag">${esc(step.action)}</span>` : '';
    const range  = step.range  ? `<span class="prog-range-tag">${esc(step.range)}</span>`  : '';
    const check  = step.check  ? `<span class="prog-check-tag">${esc(step.check)}</span>`  : '';
    return `<div class="prog-step">
        <span class="prog-step-num">${step.step}</span>
        <div class="prog-step-body">
            <div class="prog-step-head">
                <span class="prog-step-name">${esc(step.name)}</span>${action}${range}${check}
            </div>
            <p class="prog-step-desc">${esc(step.description)}</p>
        </div>
    </div>`;
}

function renderProgRow(item) {
    const row = document.createElement('div');
    row.className = 'spell-row prog-row';
    row.dataset.slug = item.slug || '';
    if (item.color) row.style.setProperty('--row-accent', item.color);

    const inspiredTag = item.inspired
        ? `<span class="prog-inspired-tag" title="Inspired by">${esc(item.inspired)}</span>` : '';

    row.innerHTML = `
        <div class="spell-row-head prog-row-head">
            <span class="spell-row-arrow">▶</span>
            <span class="spell-row-name">${esc(item.name)}</span>
            <div class="spell-row-tags">
                <span class="prog-type-tag">${esc(item.type || '')}</span>
                <span class="prog-origin-tag">${esc(item.origin || '')}</span>
                ${inspiredTag}
            </div>
            <span class="spell-row-cost prog-pts">${item.points || 10} pts</span>
        </div>
        <div class="spell-row-detail prog-row-detail"></div>`;

    let built = false;
    const head   = row.querySelector('.prog-row-head');
    const detail = row.querySelector('.prog-row-detail');

    head.addEventListener('click', () => {
        const open = row.classList.toggle('open');
        head.querySelector('.spell-row-arrow').textContent = open ? '▼' : '▶';

        if (open && !built) {
            built = true;
            const featureHtml = item.itemFeature ? `
                <div class="prog-initial-feature">
                    <div class="prog-initial-head">
                        <span class="prog-initial-label">Initial Feature</span>
                        ${item.itemFeature.action ? `<span class="prog-action-tag">${esc(item.itemFeature.action)}</span>` : ''}
                    </div>
                    <strong class="prog-initial-name">${esc(item.itemFeature.name)}</strong>
                    <p>${esc(item.itemFeature.desc)}</p>
                </div>` : '';

            detail.innerHTML = `
                ${item.desc ? `<p class="prog-desc">${esc(item.desc)}</p>` : ''}
                ${featureHtml}
                <div class="prog-steps-label">Progression Steps</div>
                <div class="prog-steps">${(item.steps || []).map(renderProgStep).join('')}</div>`;
        }
    });

    return row;
}

function renderProgression(items) {
    const container = document.getElementById('prog-sections');
    if (!container) return;

    container.innerHTML = '';
    const frag = document.createDocumentFragment();

    /* Group by origin */
    const groups = new Map();
    items.forEach(item => {
        const o = item.origin || 'Other';
        if (!groups.has(o)) groups.set(o, []);
        groups.get(o).push(item);
    });

    groups.forEach((entries, label) => {
        const hdr = document.createElement('div');
        hdr.className = 'spell-group-header';
        hdr.textContent = `${label}  (${entries.length})`;
        frag.appendChild(hdr);
        entries.forEach(e => frag.appendChild(renderProgRow(e)));
    });

    container.appendChild(frag);

    document.getElementById('prog-count').textContent =
        `${items.length} item${items.length !== 1 ? 's' : ''}`;
    document.getElementById('prog-no-results').style.display =
        items.length ? 'none' : '';
}

/* ─── Enchanted items ───────────────────────────────────────────────────── */

function renderEnchanted(items) {
    const container = document.getElementById('enchanted-sections');
    if (!container) return;

    container.innerHTML = '';

    /* Group by type */
    const groups = new Map();
    items.forEach(item => {
        const t = item.type || 'Item';
        if (!groups.has(t)) groups.set(t, []);
        groups.get(t).push(item);
    });

    const frag = document.createDocumentFragment();

    if (groups.size > 1) {
        groups.forEach((entries, label) => {
            const hdr = document.createElement('div');
            hdr.className = 'spell-group-header';
            hdr.textContent = `${label}  (${entries.length})`;
            frag.appendChild(hdr);
            entries.forEach(e => frag.appendChild(renderEnchantedRow(e)));
        });
    } else {
        items.forEach(e => frag.appendChild(renderEnchantedRow(e)));
    }

    container.appendChild(frag);

    document.getElementById('enchanted-count').textContent =
        `${items.length} item${items.length !== 1 ? 's' : ''}`;
    document.getElementById('enchanted-no-results').style.display =
        items.length ? 'none' : '';
}
