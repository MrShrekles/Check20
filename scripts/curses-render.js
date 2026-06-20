/* ─── curses-render.js ───────────────────────────────────────────────────── */

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, m =>
        ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])
    );
}

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
    row.className = 'spell-row curse-row';
    row.dataset.slug = entry.name.toLowerCase().replace(/\s+/g, '-');
    row.dataset.type = entry.type;
    if (entry.color) row.style.setProperty('--row-accent', entry.color);

    const typeLabel = entry.type === 'disease' ? 'Disease' : 'Curse';
    const sourceTag = entry.source
        ? `<span class="curse-source-tag curse-source--${esc(entry.source)}">${esc(entry.source)}</span>` : '';
    const typeTag   = `<span class="curse-type-tag curse-type--${esc(entry.type)}">${typeLabel}</span>`;
    const subtitle  = entry.subtitle
        ? `<span class="curse-subtitle">${esc(entry.subtitle)}</span>` : '';

    const infectionHtml = entry.infection
        ? `<div class="curse-infection">
               <span class="curse-infection-label">Infection:</span>
               ${esc(entry.infection)}
           </div>` : '';

    const sectionsHtml = (entry.sections || []).map(renderSection).join('');

    row.innerHTML = `
        <div class="spell-row-head curse-row-head">
            <span class="spell-row-arrow">▶</span>
            <span class="spell-row-name">${esc(entry.name)}</span>
            ${subtitle}
            <div class="spell-row-tags">
                ${typeTag}${sourceTag}
            </div>
        </div>
        <div class="spell-row-detail curse-row-detail">
            <p class="curse-desc">${esc(entry.desc)}</p>
            ${infectionHtml}
            ${sectionsHtml}
        </div>`;

    row.querySelector('.curse-row-head').addEventListener('click', () => {
        const open = row.classList.toggle('open');
        row.querySelector('.spell-row-arrow').textContent = open ? '▼' : '▶';
    });

    return row;
}

function renderCurses(items) {
    const container = document.getElementById('curse-sections');
    if (!container) return;

    container.innerHTML = '';

    /* Group headers when showing all */
    const curses   = items.filter(e => e.type === 'curse');
    const diseases = items.filter(e => e.type === 'disease');
    const frag     = document.createDocumentFragment();

    function appendGroup(label, entries) {
        if (!entries.length) return;
        const hdr = document.createElement('div');
        hdr.className = 'spell-group-header';
        hdr.textContent = `${label}  (${entries.length})`;
        frag.appendChild(hdr);
        entries.forEach(e => frag.appendChild(renderCurseRow(e)));
    }

    /* When both types are present, show grouped headers */
    if (curses.length && diseases.length) {
        appendGroup('Curses', curses);
        appendGroup('Diseases', diseases);
    } else {
        items.forEach(e => frag.appendChild(renderCurseRow(e)));
    }

    container.appendChild(frag);

    document.getElementById('curse-count').textContent =
        `${items.length} entr${items.length !== 1 ? 'ies' : 'y'}`;
    document.getElementById('curse-no-results').style.display =
        items.length ? 'none' : '';
}
