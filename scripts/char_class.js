document.addEventListener("DOMContentLoaded", () => {
    fetch('data/classes.json')
        .then(res => res.json())
        .then(data => {
            const clsSel = document.getElementById('class');
            const pathSel = document.getElementById('path');
            const talentSel = document.getElementById('talent');
            const specSel = document.getElementById('special');
            const specWrap = document.getElementById('specialization-wrapper');
            const specDetails = document.getElementById('specialization-details');
            const classDetails = document.getElementById('class-features');
            const equipList = document.getElementById('class-equipment');

            clsSel.innerHTML = `<option value="">Select Class</option>`;
            data.classes.forEach(cls => {
                clsSel.innerHTML += `<option value="${cls.name}">${cls.name}</option>`;
            });

            clsSel.addEventListener('change', () => {
                const cls = data.classes.find(c => c.name === clsSel.value);
                if (!cls) return;

                classDetails.innerHTML = cls.features?.map(f => `<li><strong>${f.name}:</strong> ${f.description}</li>`).join('') || '';
                equipList.innerHTML = `<h4>Starting Equipment</h4>` + (cls.equipment?.map(e =>
                    `<li><strong>${e.name}:</strong> ${e.description}${e.choices?.length ? `<ul>${e.choices.map(c => `<li><em>${c.name}:</em> ${c.description}</li>`).join('')}</ul>` : ''}</li>`
                ).join('') || '');

                populateDropdown(pathSel, cls.paths, "Select a Path");
                populateDropdown(talentSel, cls.talents, "Select a Talent");

                specSel.innerHTML = `<option value="">Select Specialization</option>`;
                specWrap.classList.toggle('hidden', cls.name !== "Professional");
                specDetails.innerHTML = '';

                if (cls.name === "Professional" && cls.specializations?.length) {
                    cls.specializations.forEach(spec => {
                        specSel.innerHTML += `<option value="${spec.name}">${spec.name}</option>`;
                    });
                }
            });

            pathSel.addEventListener('change', () => {
                const cls = data.classes.find(c => c.name === clsSel.value);
                const path = cls?.paths?.find(p => (typeof p === 'object' ? p.name : p) === pathSel.value);
                if (path) loadPathDetails(path);
            });

            talentSel.addEventListener('change', () => {
                const cls = data.classes.find(c => c.name === clsSel.value);
                const talent = cls?.talents?.find(t => t.name === talentSel.value);
                if (talent) loadTalentDetails(talent);
            });

            specSel.addEventListener('change', () => {
                const cls = data.classes.find(c => c.name === clsSel.value);
                if (cls?.name !== "Professional") return;
                const spec = cls.specializations?.find(s => s.name === specSel.value);
                if (spec) {
                    specDetails.innerHTML = `
                        <h4>${spec.name}</h4>
                        <p>${spec.description || ""}</p>
                        <p><strong>${spec.featureName}:</strong> ${spec.featureDescription}</p>
                    `;
                }
            });
        });
});

function populateDropdown(dropdown, items, label) {
    dropdown.innerHTML = `<option value="">${label}</option>` +
        items.map(item => `<option value="${item.name || item}">${item.name || item}</option>`).join('');
}

function loadPathDetails(path) {
    document.getElementById('path-details').innerHTML = `
        <h4>${path.name}</h4>
        ${path.features?.map(f => `<p><strong>${f.name}:</strong> ${f.description}</p>`).join('') || "<p>No features available.</p>"}
        <details><summary>Progression</summary><ol>
            ${path.progressionSteps?.map(p => `<li><strong>${p.name}:</strong> ${p.description}</li>`).join('') || "<li>No progression data.</li>"}
        </ol></details>
    `;
}

function loadTalentDetails(talent) {
    document.getElementById('talent-details').innerHTML = `
        <h4>${talent.name}</h4>
        ${talent.features?.map(f => `<p><strong>${f.name}:</strong> ${f.description}</p>`).join('') || "<p>No features available.</p>"}
        <details><summary>Progression</summary><ol>
            ${talent.progressionSteps?.map(p => `<li><strong>${p.name}:</strong> ${p.description}</li>`).join('') || "<li>No progression data.</li>"}
        </ol></details>
    `;
}
