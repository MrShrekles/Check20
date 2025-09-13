// char_class.js — Path/Talent wired like class-loader, but to sheet targets.

document.addEventListener('DOMContentLoaded', async () => {
    const [baseClasses, optClasses, specializations] = await fetchClassData();

    const clsSel = document.getElementById('class');
    const pathSel = document.getElementById('path');
    const talentSel = document.getElementById('talent');
    const specSel = document.getElementById('special');
    const specWrap = document.getElementById('specialization-wrapper');

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
        // Build selects the same way as class-loader: only items with steps
        populate(pathSel, entries.filter(e => Array.isArray(e?.path?.steps) && e.path.steps.length).map(e => e.name), "Select a Path");
        populate(talentSel, entries.filter(e => Array.isArray(e?.talent?.steps) && e.talent.steps.length).map(e => e.name), "Select a Talent");

        // Specializations (Professional only) from root
        const isPro = classKey === 'professional';
        specWrap?.classList.toggle('hidden', !isPro);
        specSel.innerHTML = `<option value="">Select Specialization</option>` +
            (isPro ? (specializations || []).map(s => `<option value="${s.name}">${s.name}</option>`).join('') : '');

        // Clear detail panes + progression page
        byId('path-details').innerHTML = '';
        byId('talent-details').innerHTML = '';
        byId('progression').innerHTML = '';

        // Hook up change handlers (mirror class-loader behavior)
        wireBranchHandlers(entries);
        wireSpecHandler(specializations);
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
        return [base?.classes || [], opt?.classes || {}, opt?.specializations || []];
    } catch (e) { console.error(e); return [[], {}, []]; }
}

function wireBranchHandlers(entries) {
    const pathSel = byId('path');
    const talentSel = byId('talent');

    pathSel.onchange = () => {
        const chosen = entries.find(e => e.name === pathSel.value && Array.isArray(e?.path?.steps));
        renderBranch(chosen, true);
    };
    talentSel.onchange = () => {
        const chosen = entries.find(e => e.name === talentSel.value && Array.isArray(e?.talent?.steps));
        renderBranch(chosen, false);
    };
}

// Render to sheet targets, but use class-loader’s split: step 0 vs rest
function renderBranch(entry, isPath) {
    const paneId = isPath ? 'path-details' : 'talent-details';
    const data = isPath ? entry?.path : entry?.talent;
    const steps = Array.isArray(data?.steps) ? data.steps : [];
    const initial = steps.filter(s => Number(s?.step) === 0);
    const rest = steps.filter(s => Number(s?.step) !== 0);

    // Page 1 (summary + initial)
    byId(paneId).innerHTML = entry ? `
    <h4>${entry.name}</h4>
    ${initial.length ? `
      <div class="features">
        <ul class="step-list">${initial.map(renderStep).join('')}</ul>
      </div>` : ``}
  ` : `<p>No ${isPath ? 'path' : 'talent'} found.</p>`;

    // Page 2 (progression two-col), scaffold once
    const prog = byId('progression');
    if (!byId('path-progression') || !byId('talent-progression')) {
        prog.innerHTML = `
      <h2>Progression</h2>
      <div class="two-column">
        <div class="column progression-group" id="path-progression"></div>
        <div class="column progression-group" id="talent-progression"></div>
      </div>`;
    }
    const target = byId(isPath ? 'path-progression' : 'talent-progression');
    target.innerHTML = entry ? `
    <h3>${entry.name} ${isPath ? 'Path' : 'Talent'}</h3>
    ${rest.length ? renderStepList(rest, isPath) : `<p>No progression data.</p>`}
  ` : '';
}

// --- helpers copied from loader style ---
function renderStepList(steps = [], isPath = false) {
    const Tag = isPath ? 'ol' : 'ul';
    return `
    <div class="features">
      <h3>Progression</h3>
      <${Tag} class="step-list">${steps.map(renderStep).join('')}</${Tag}>
    </div>`;
}

function renderStep(s) {
    return `
    
    <li>
      <strong>${s?.name || 'Unnamed Step'}</strong> ${renderInlineTags(s)}
      <p class="desc">${s?.description || ''}</p>
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

function wireSpecHandler(specializations = []) {
    const clsSel = byId('class');
    const specSel = byId('special');
    const specDetails = byId('specialization-details');
    if (!specSel) return;

    specSel.onchange = () => {
        const isPro = (clsSel.value || '').toLowerCase() === 'professional';
        if (!isPro) { specDetails.innerHTML = ''; return; }

        const s = specializations.find(x => x?.name === specSel.value);
        if (!s) { specDetails.innerHTML = ''; return; }

        let featureBlock = '';
        if (s.feature) {
            // Case: single 'feature' object
            featureBlock = `<div class="features">
                <ul class="step-list">${renderSpecFeature(s.feature)}</ul>
            </div>`;
        } else if (Array.isArray(s.features) && s.features.length) {
            // Case: 'features' array
            featureBlock = `<div class="features">
                <ul class="step-list">${s.features.map(renderSpecFeature).join('')}</ul>
            </div>`;
        } else if (s.features && typeof s.features === 'object') {
            // Case: single 'features' object (like 'warrior')
            featureBlock = `<div class="features">
                <ul class="step-list">${renderSpecFeature(s.features)}</ul>
            </div>`;
        }

        specDetails.innerHTML = `
            <h4>${s.name}</h4>
            ${featureBlock}
        `;
    };
}

function renderSpecFeature(f) {
    return `<li><strong>${f?.name || 'Feature'}</strong> ${renderInlineTags(f)}
    <p class="features">${f?.description || ''}</p></li>`;
}

function populate(sel, names = [], label = "Select...") {
    sel.innerHTML = `<option value="">${label}</option>` + (names || []).map(n => `<option value="${n}">${n}</option>`).join('');
}
function byId(id) { return document.getElementById(id); }
