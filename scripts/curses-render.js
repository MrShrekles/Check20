/* ─── curses-render.js ───────────────────────────────────────────────────── */

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, m =>
        ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])
    );
}

const CURSE_TYPE_LABEL = { curse: 'Curses', disease: 'Diseases' };

function renderStep(step, index, type) {
    const num    = type === 'numbered' ? `<span class="curse-step-num">${index + 1}</span>` : '';
    const action = step.action ? `<span class="curse-action-tag">${esc(step.action)}</span>` : '';
    const note   = step.note   ? `<span class="curse-step-note">${esc(step.note)}</span>` : '';
    return `<div class="curse-step">
        ${num}
        <div class="curse-step-body">
            <div class="curse-step-head">
                <span class="curse-step-name">${esc(step.name)}</span>${action}${note}
            </div>
            <p class="curse-step-desc">${esc(step.desc)}</p>
        </div>
    </div>`;
}

function renderSection(section, sIdx) {
    const isTable    = section.type === 'table';
    const isNumbered = section.type === 'numbered';

    const stepsHtml = (section.steps || []).map((st, i) =>
        renderStep(st, i, section.type)
    ).join('');

    const rewardHtml = section.reward ? `
        <div class="curse-reward">
            <span class="curse-reward-label">Unlock:</span>
            <strong>${esc(section.reward.name)}</strong> - ${esc(section.reward.desc)}
        </div>` : '';

    const introHtml = section.intro
        ? `<p class="curse-section-intro">${esc(section.intro)}</p>` : '';

    return `<div class="curse-section-block" data-type="${esc(section.type || '')}">
        <h4 class="curse-section-label">${esc(section.label)}</h4>
        ${introHtml}
        <div class="curse-steps${isTable ? ' curse-steps--table' : ''}">${stepsHtml}</div>
        ${rewardHtml}
    </div>`;
}

function renderCurseRow(entry) {
    const row = document.createElement('div');
    row.className = 'spell-row';
    row.dataset.slug = entry.name.toLowerCase().replace(/\s+/g, '-');
    row.dataset.type = entry.type;
    if (entry.color) row.style.setProperty('--row-accent', entry.color);

    const typeLabel = entry.type === 'disease' ? 'Disease' : 'Curse';
    const rarityClass = `rarity-${entry.type === 'disease' ? 'rare' : 'uncommon'}`;
    const sourceTag = entry.source
        ? `<span class="species-origin-tag">${esc(entry.source)}</span>` : '';
    const typeTag   = `<span class="chip chip-rarity ${rarityClass}">${esc(typeLabel)}</span>`;
    const subtitle  = entry.subtitle
        ? `<span class="curse-subtitle">${esc(entry.subtitle)}</span>` : '';

    const infectionHtml = entry.infection
        ? `<div class="curse-infection">
               <span class="curse-infection-label">Infection:</span>
               ${esc(entry.infection)}
           </div>` : '';

    const sectionsHtml = (entry.sections || []).map(renderSection).join('');

    row.innerHTML = `
        <div class="spell-row-head">
            <span class="spell-row-arrow">▶</span>
            <span class="spell-row-name">${esc(entry.name)}</span>
            ${subtitle}
            <div class="spell-row-tags species-row-tags">
                ${sourceTag}${typeTag}
            </div>
        </div>
        <div class="spell-row-detail">
            <p class="curse-desc">${esc(entry.desc)}</p>
            ${infectionHtml}
            ${sectionsHtml}
        </div>`;

    row.querySelector('.spell-row-head').addEventListener('click', () => {
        const open = row.classList.toggle('open');
        row.querySelector('.spell-row-arrow').textContent = open ? '▼' : '▶';
    });

    return row;
}

/* ── Main render: two-level grouping, mirrors species renderGrid ── */
function renderCurses(items) {
    const container = document.getElementById('curse-sections');
    if (!container) return;

    const typeMap = new Map();
    items.forEach(e => {
        const tKey = e.type || 'curse';
        if (!typeMap.has(tKey)) typeMap.set(tKey, { label: CURSE_TYPE_LABEL[tKey] || tKey, sources: new Map() });

        const sKey = e.sourceKey || '__none__';
        const tg = typeMap.get(tKey);
        if (!tg.sources.has(sKey)) tg.sources.set(sKey, { label: e.source || '', items: [] });
        tg.sources.get(sKey).items.push(e);
    });

    container.innerHTML = '';
    const frag = document.createDocumentFragment();

    typeMap.forEach(({ label: typeLabel, sources }) => {
        const total = [...sources.values()].reduce((n, s) => n + s.items.length, 0);

        const grid = document.createElement('div');
        grid.className = 'spell-grid';

        const tHdr = document.createElement('div');
        tHdr.className = 'spell-group-header';
        tHdr.textContent = `${typeLabel}  (${total})`;
        grid.appendChild(tHdr);

        sources.forEach(({ label: sourceLabel, items: sourceItems }) => {
            if (sourceLabel) {
                const sHdr = document.createElement('div');
                sHdr.className = 'species-option-header';
                sHdr.textContent = `${sourceLabel}  (${sourceItems.length})`;
                grid.appendChild(sHdr);
            }
            sourceItems.forEach(e => grid.appendChild(renderCurseRow(e)));
        });

        frag.appendChild(grid);
    });

    container.appendChild(frag);

    document.getElementById('curse-count').textContent =
        `${items.length} result${items.length !== 1 ? 's' : ''}`;
    document.getElementById('curse-no-results').style.display =
        items.length ? 'none' : '';
}
