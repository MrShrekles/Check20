document.addEventListener("DOMContentLoaded", async () => {
    highlightNav();
    labelResponsiveTables();

    const classesData = await fetchClassesData();
    if (!classesData.length) return;

    document.querySelectorAll(".class-section").forEach(section => initClassSection(section, classesData));
    loadClasses(); // Critical external call
});

// --- Data Fetch ---
async function fetchClassesData() {
    try {
        const res = await fetch("data/classes.json");
        const data = await res.json();
        return data.classes || [];
    } catch (err) {
        console.error("Error loading classes.json:", err);
        return [];
    }
}

// --- Section Init ---
function initClassSection(section, classesData) {
    const className = section.dataset.class?.toLowerCase();
    const classData = classesData.find(c => c.name.toLowerCase() === className);

    if (!classData) {
        section.innerHTML = `<p>Class "${className}" not found.</p>`;
        return;
    }

    const [specDropdown, specInfo] = [".specialization-selection", ".specialization-info"].map(sel => section.querySelector(sel));
    const pathSel = section.querySelector(".path-selection");
    const classInfo = section.querySelector(".class-info");
    const talentSel = section.querySelector(".talent-selection");
    const talentInfo = section.querySelector(".talent-info");

    populateDropdown(pathSel, classData.paths, "Select a Path");
    populateDropdown(talentSel, classData.talents, "Select a Talent");
    if (className === "professional" && classData.specializations)
        populateDropdown(specDropdown, classData.specializations, "Select a Specialization");

    pathSel?.addEventListener("change", e => {
        const path = classData.paths.find(p => p.name === e.target.value);
        loadPathDetails(path, classInfo);
    });

    talentSel?.addEventListener("change", e => {
        const talent = classData.talents.find(t => t.name === e.target.value);
        loadTalentDetails(talent, talentInfo);
    });

    specDropdown?.addEventListener("change", e => {
        const spec = classData.specializations.find(s => s.name === e.target.value);
        loadSpecializationDetails(spec, specInfo);
    });
}

// --- UI Builders ---
function populateDropdown(dropdown, items, defaultText) {
    if (!dropdown) return;
    dropdown.innerHTML = `<option value="">${defaultText}</option>` +
        items.map(item => `<option value="${item.name}">${item.name}</option>`).join('');
}

function formatFeatures(features = []) {
    if (!features.length) return "<p>No features available.</p>";
    return `<div class="features"><h3>Features</h3><ul>${
        features.map(f => `
            <li><strong>${f.name}:</strong> ${f.description}
            ${f.options ? formatFeatureOptions(f.options) : ''}</li>
        `).join('')
    }</ul></div>`;
}

function formatFeatureOptions(options = []) {
    return `<ul class="feature-options">${
        options.map(o => `<li><strong>${o.name}:</strong> ${o.effect}</li>`).join('')
    }</ul>`;
}

// --- Loaders ---
function loadPathDetails(path, container) {
    if (!path || !container) return;
    container.innerHTML = `
        <h4>${path.name}</h4>
        <p>${path.description}</p>
        ${formatFeatures(path.features)}
        <h3>Progression</h3>
        <p><strong>Path progression</strong> is linear, you will select these steps in order. With each step, gain a +1 to any one of your checks, but no check can exceed 15. You can choose to take +1 Spell point or +1 Class resource at step 1, 3, 6, and 9</p>
        <div class="features">
            <h4>Progression Steps</h4>
            <ol>${path.progressionSteps.map(s => `
                <li><strong>${s.name}:</strong> ${s.description}
                ${s.options ? formatFeatureOptions(s.options) : ''}</li>`).join('')}
            </ol>
        </div>
    `;
}

function loadTalentDetails(talent, container) {
    if (!container) return;
    if (!talent) return container.innerHTML = "<p>No talent selected.</p>";

    container.innerHTML = `
        <h4>${talent.name}</h4>
        <p>${talent.description}</p>
        ${formatFeatures(talent.features)}
        <h3>Progression</h3>
        <p><strong>Talent progression</strong> is not linear, you can select these steps in any order. With each step, gain a +1 to any one of your checks, but no check can exceed 15. You can choose to take +1 Spell point or +1 Class resource at step 1, 3, 6, and 9</p>
        <div class="features"><h4>Progression Steps</h4><ul>
            ${talent.progressionSteps.map(s => `<li><strong>${s.name}:</strong> ${s.description}</li>`).join('')}
        </ul></div>
    `;
}

function loadSpecializationDetails(spec, container) {
    if (!spec || !container) return;
    container.innerHTML = `
        <div class="two-column">
            <div class="column">
                <h4>${spec.name}</h4>
                <p>${spec.description}</p>
            </div>
            <div class="column">
                <div class="features">
                    <h3>Feature</h3>
                    <p><strong>${spec.featureName}:</strong> ${spec.featureDescription}</p>
                </div>
            </div>
        </div>
    `;
}

// --- Utility ---
function highlightNav() {
    document.querySelectorAll("nav a").forEach(link => {
        if (link.href === window.location.href) link.style.fontWeight = "bold";
    });
}

function labelResponsiveTables() {
    document.querySelectorAll(".responsive-table").forEach(wrapper => {
        const headers = Array.from(wrapper.querySelectorAll("thead th")).map(th => th.textContent.trim());
        wrapper.querySelectorAll("tbody tr").forEach(row => {
            Array.from(row.children).forEach((td, i) => td.setAttribute("data-label", headers[i] || ""));
        });
    });
}

async function loadClasses() {
    const res = await fetch('data/classes.json');
    const data = await res.json();
    renderClassPage(data.classes[0]);
}

function renderClassPage(classData) {
    const container = document.getElementById('class-content');
    if (!container || !classData) return;
    container.innerHTML = `<p>${classData.description}</p>`;
}
