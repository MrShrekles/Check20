// char_class.js - Path/Talent wired like class-loader, but to sheet targets.

document.addEventListener('DOMContentLoaded', async () => {
    const [baseClasses, optClasses] = await fetchClassData();

    const clsSel = document.getElementById('class');
    const pathSel = document.getElementById('path');
    const talentSel = document.getElementById('talent');
    const classDetails = document.getElementById('class-features');
    const equipList = document.getElementById('class-equipment');

    // Fill classes from classes.json (names only)
    clsSel.innerHTML = `<option value="">Select Class</option>` +
        (baseClasses || []).map(c => `<option value="${c.name}">${c.name}</option>`).join('');

    clsSel.onchange = () => {
        const chosenName = clsSel.value;
        if (!chosenName) return;

        // --- Base write-ups (still from classes.json only) ---
        const base = baseClasses.find(c => c.name === chosenName) || {};
        classDetails.innerHTML = (base.features?.map(f =>
            `<li><strong>${f.name}:</strong> ${Array.isArray(f.description) ? f.description.join(" ") : (f.description || "")}</li>`
        ).join('')) || '';

        equipList.innerHTML = base.equipment?.length ? (
            `<h4>Starting Equipment</h4>` +
            base.equipment.map(e => `
        <li>
          <strong>${e.name}:</strong> ${e.description || ""}
          ${e.choices?.length ? `<ul>${e.choices.map(c => `<li><em>${c.name}:</em> ${c.description || ""}</li>`).join('')}</ul>` : ''}
        </li>`).join('')
        ) : '';

        // --- Paths / Talents strictly from class-new.json ---
        const classKey = chosenName.toLowerCase();
        const entries = Array.isArray(optClasses?.[classKey]) ? optClasses[classKey] : []; // classes.{key} → array
        // Pass full entry objects so populate can attach data-origin to each option
        populate(pathSel, entries.filter(e => Array.isArray(e?.path?.steps) && e.path.steps.length), "Select a Path");
        populate(talentSel, entries.filter(e => Array.isArray(e?.talent?.steps) && e.talent.steps.length), "Select a Talent");

        // Clear detail panes + progression page + origin pills
        byId('path-details').innerHTML = '';
        byId('talent-details').innerHTML = '';
        byId('progression').innerHTML = '';
        setOriginPill('path-origin-pill', '');
        setOriginPill('talent-origin-pill', '');

        // Hook up change handlers (mirror class-loader behavior)
        wireBranchHandlers(entries);
    };
});

async function fetchClassData() {
    try {
        const [baseRes, optRes] = await Promise.all([
            fetch('data/classes.json'),
            fetch('data/class-new.json')
        ]);
        const base = await baseRes.json();
        const opt = await optRes.json();
        return [base?.classes || [], opt?.classes || {}];
    } catch (e) { console.error(e); return [[], {}]; }
}

function wireBranchHandlers(entries) {
    const pathSel = byId('path');
    const talentSel = byId('talent');

    pathSel.onchange = () => {
        const chosen = entries.find(e => e.name === pathSel.value && Array.isArray(e?.path?.steps));
        renderBranch(chosen, true);
        setOriginPill('path-origin-pill', chosen?.origin || '');
    };
    talentSel.onchange = () => {
        const chosen = entries.find(e => e.name === talentSel.value && Array.isArray(e?.talent?.steps));
        renderBranch(chosen, false);
        setOriginPill('talent-origin-pill', chosen?.origin || '');
    };
}

// Render to sheet targets, but use class-loader’s split: step 0 vs rest
function renderBranch(entry, isPath) {
    const paneId = isPath ? 'path-details' : 'talent-details';
    const data = isPath ? entry?.path : entry?.talent;
    const steps = Array.isArray(data?.steps) ? data.steps : [];
    const initial = steps.filter(s => Number(s?.step) === 0);
    const rest = steps.filter(s => Number(s?.step) !== 0);

    const originTag = entry?.origin ? `<span class="origin-pill">${entry.origin}</span>` : '';

    // Page 1 (summary + initial)
    byId(paneId).innerHTML = entry ? `
    <h4>${entry.name} ${originTag}</h4>
    ${initial.length ? `
      <div class="features">
        <ul class="step-list">${initial.map(renderStep).join('')}</ul>
      </div>` : ``}
  ` : `<p>No ${isPath ? 'path' : 'talent'} found.</p>`;

    // Page 3 (progression two-col), scaffold once
    const prog = byId('progression');
    if (!byId('path-progression') || !byId('talent-progression')) {
        prog.innerHTML = `
      <div class="two-column progression-columns">
        <div class="column progression-group" id="path-progression"></div>
        <div class="column progression-group" id="talent-progression"></div>
      </div>`;
    }
    const target = byId(isPath ? 'path-progression' : 'talent-progression');
    target.innerHTML = entry ? `
    <h3>${entry.name} ${originTag} ${isPath ? 'Path' : 'Talent'}</h3>
    ${rest.length ? renderStepList(rest, isPath) : `<p>No progression data.</p>`}
  ` : '';
}

// --- helpers copied from loader style ---
function renderStepList(steps = [], isPath = false) {
    const Tag = isPath ? 'ol' : 'ul';
    return `
    <div class="features">
      <${Tag} class="step-list">${steps.map(renderStep).join('')}</${Tag}>
    </div>`;
}

function renderStep(s) {
    return `
    
    <li>
      <strong>${s?.name || 'Unnamed Step'}</strong> ${renderInlineTags(s)}
      <p class="desc">${typeof parseDice === 'function' ? parseDice(s?.description || '') : (s?.description || '')}</p>
    </li>`;
}

function renderInlineTags(s) {
    const tags = [];
    if (s?.action) tags.push(`<span class="tag tag-action">[${s.action}]</span>`);
    if (s?.check) tags.push(`<span class="tag tag-check">[Check: ${s.check}]</span>`);
    if (s?.range) tags.push(`<span class="tag tag-range">[Range: ${s.range}]</span>`);
    if (s?.duration) tags.push(`<span class="tag tag-duration">[Duration: ${s.duration}]</span>`);
    if (s?.damage !== undefined && s.damage !== "") {
        const dt = s?.damageType ? ` (${s.damageType})` : "";
        tags.push(`<span class="tag tag-damage">[Damage: ${s.damage}${dt}]</span>`);
    }
    if (s?.armor !== undefined && s.armor !== "") tags.push(`<span class="tag tag-armor">[Armor: ${s.armor}]</span>`);
    if (s?.condition) tags.push(`<span class="tag tag-condition">[Condition: ${s.condition}]</span>`);
    return tags.join(' ');
}

function populate(sel, entries = [], label = "Select...") {
    sel.innerHTML = `<option value="">${label}</option>` +
        (entries || []).map(e => {
            const name = typeof e === 'string' ? e : e.name;
            const originAttr = (typeof e === 'object' && e.origin) ? ` data-origin="${e.origin}"` : '';
            return `<option value="${name}"${originAttr}>${name}</option>`;
        }).join('');
}
function setOriginPill(id, origin) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = origin || '';
}
function byId(id) { return document.getElementById(id); }