/* ─── class-codex-render.js ──────────────────────────────────────────────────
   Renders class options as codex rows, grouped Class -> Path / Talent.
   originClass()/originColor() come from scripts/origin-colors.js.
   parseDice() comes from scripts/tooltips.js.
   ───────────────────────────────────────────────────────────────────────── */

function escClass(s) {
    return String(s ?? '').replace(/[&<>"']/g, m =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])
    );
}

// Escape, then let [[1d4]] expressions become dice badges.
function textClass(s) {
    const esc = escClass(s);
    return typeof parseDice === 'function' ? parseDice(esc) : esc;
}

function renderClassStepTags(step) {
    const tags = [];
    const add = (cls, label) => tags.push(`<span class="class-tag ${cls}">${escClass(label)}</span>`);
    if (step.action)    add('tag-action', step.action);
    if (step.check)     add('tag-check', `Check: ${step.check}`);
    if (step.range)     add('tag-range', `Range: ${step.range}`);
    if (step.duration)  add('tag-duration', `Duration: ${step.duration}`);
    if (step.damage)    add('tag-damage', `Damage: ${step.damage}${step.damageType ? ` (${step.damageType})` : ''}`);
    if (step.armor)     add('tag-armor', `Armor: ${step.armor}`);
    if (step.condition) add('tag-condition', `Condition: ${step.condition}`);
    return tags.length ? `<div class="class-step-tags">${tags.join('')}</div>` : '';
}

function renderClassStep(step, index, numbered) {
    const num = numbered
        ? `<span class="class-step-num">${index}</span>`
        : `<span class="class-step-num class-step-num--open">&bull;</span>`;
    return `<div class="spell-intent-block class-step">
        <div class="spell-intent-header">
            ${num}
            <span class="intent-name">${escClass(step.name)}</span>
        </div>
        ${renderClassStepTags(step)}
        <p class="intent-effect">${textClass(step.description)}</p>
    </div>`;
}

function renderClassStepGroups(entry) {
    const initial = entry.steps.filter(s => Number(s.step) === 0);
    const rest    = entry.steps.filter(s => Number(s.step) !== 0);
    const isPath  = entry.kind === 'path';

    const initialHtml = initial.length ? `
        <div class="class-step-group">
            <h4 class="class-step-label">Initial Feature</h4>
            ${initial.map(s => renderClassStep(s, 0, false)).join('')}
        </div>` : '';

    const restHtml = rest.length ? `
        <div class="class-step-group">
            <h4 class="class-step-label">${isPath ? 'Progression (in order)' : 'Progression (any order)'}</h4>
            ${rest.map((s, i) => renderClassStep(s, Number(s.step) || i + 1, isPath)).join('')}
        </div>` : '';

    return initialHtml + restHtml;
}

function renderClassRow(entry) {
    const row = document.createElement('div');
    row.className = 'spell-row';
    row.dataset.slug   = entry.name.toLowerCase().replace(/\s+/g, '-');
    row.dataset.kind   = entry.kind;
    row.dataset.origin = entry.originKey;
    row.style.setProperty('--row-accent', originColor(entry.origin));

    const stepCount = entry.steps.filter(s => Number(s.step) !== 0).length;

    row.innerHTML = `
        <div class="spell-row-head">
            <span class="spell-row-arrow">&#9654;</span>
            <span class="spell-row-name">${escClass(entry.name)}</span>
            <div class="spell-row-tags species-row-tags">
                <span class="origin-tag ${originClass(entry.origin)}">${escClass(entry.origin)}</span>
                <span class="class-kind-chip kind-${entry.kind}">${escClass(entry.kindLabel)}</span>
            </div>
            <span class="spell-row-cost">${stepCount} steps</span>
        </div>
        <div class="spell-row-detail">
            <p class="class-desc">${textClass(entry.desc)}</p>
            ${renderClassStepGroups(entry)}
        </div>`;

    row.querySelector('.spell-row-head').addEventListener('click', () => {
        const open = row.classList.toggle('open');
        row.querySelector('.spell-row-arrow').innerHTML = open ? '&#9660;' : '&#9654;';
    });

    return row;
}

/* ── The base class itself, as a row at the top of its group ── */
function renderClassCoreRow(cls) {
    const row = document.createElement('div');
    row.className = 'spell-row class-core-row';
    row.dataset.slug = classKey(cls.name);

    const featureHtml = (cls.features || []).map(f => `
        <div class="spell-intent-block class-step">
            <div class="spell-intent-header"><span class="intent-name">${escClass(f.name)}</span></div>
            <p class="intent-effect">${textClass(Array.isArray(f.description) ? f.description.join(' ') : f.description)}</p>
        </div>`).join('');

    const equipHtml = (cls.equipment || []).map(eq => `
        <li><strong>${escClass(eq.name)}</strong>${eq.description ? ` - ${textClass(eq.description)}` : ''}
            ${eq.choices?.length ? `<ul>${eq.choices.map(c =>
                `<li><strong>${escClass(c.name)}</strong> - ${textClass(c.description)}</li>`).join('')}</ul>` : ''}
        </li>`).join('');

    row.innerHTML = `
        <div class="spell-row-head">
            <span class="spell-row-arrow">&#9654;</span>
            <span class="spell-row-name">${escClass(cls.name)}</span>
            <div class="spell-row-tags species-row-tags">
                <span class="class-kind-chip kind-core">Class Core</span>
            </div>
        </div>
        <div class="spell-row-detail">
            <p class="class-desc">${textClass(cls.description || 'No description available.')}</p>
            ${featureHtml ? `<div class="class-step-group"><h4 class="class-step-label">Class Features</h4>${featureHtml}</div>` : ''}
            ${equipHtml ? `<div class="class-step-group"><h4 class="class-step-label">Starting Equipment</h4><ul class="class-equip-list">${equipHtml}</ul></div>` : ''}
        </div>`;

    row.querySelector('.spell-row-head').addEventListener('click', () => {
        const open = row.classList.toggle('open');
        row.querySelector('.spell-row-arrow').innerHTML = open ? '&#9660;' : '&#9654;';
    });

    return row;
}

/* ── Main render: Class -> Path / Talent ── */
function renderClassCodex(items) {
    const container = document.getElementById('class-sections');
    if (!container) return;

    const sortRows = arr => arr.slice().sort((a, b) =>
        classState.sort === 'name'
            ? a.name.localeCompare(b.name)
            : a.origin.localeCompare(b.origin) || a.name.localeCompare(b.name)
    );

    // class -> kind -> rows, in canonical class order
    const classMap = new Map();
    (classState.classOrder || CLASS_ORDER).forEach(k => classMap.set(k, { path: [], talent: [] }));
    items.forEach(e => {
        if (!classMap.has(e.classKey)) classMap.set(e.classKey, { path: [], talent: [] });
        classMap.get(e.classKey)[e.kind].push(e);
    });

    container.innerHTML = '';
    const frag = document.createDocumentFragment();

    classMap.forEach((kinds, key) => {
        const total = kinds.path.length + kinds.talent.length;
        if (!total) return;

        const grid = document.createElement('div');
        grid.className = 'spell-grid';

        const hdr = document.createElement('div');
        hdr.className = 'spell-group-header';
        hdr.textContent = `${capFirstClass(key)}  (${total})`;
        grid.appendChild(hdr);

        // Base class blurb - hidden while searching so results stay clean
        const core = CLASS_CORES[key];
        if (core && !classState.q) grid.appendChild(renderClassCoreRow(core));

        ['path', 'talent'].forEach(kind => {
            const rows = kinds[kind];
            if (!rows.length) return;

            const sub = document.createElement('div');
            sub.className = 'species-option-header';
            sub.textContent = `${CLASS_KIND_LABEL[kind]}  (${rows.length})`;
            grid.appendChild(sub);

            sortRows(rows).forEach(e => grid.appendChild(renderClassRow(e)));
        });

        frag.appendChild(grid);
    });

    container.appendChild(frag);

    document.getElementById('class-count').textContent =
        `${items.length} result${items.length !== 1 ? 's' : ''}`;
    document.getElementById('class-no-results').style.display = items.length ? 'none' : '';
}
