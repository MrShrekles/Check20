document.addEventListener("DOMContentLoaded", async () => {
    const classSections = document.querySelectorAll(".class-section");

    async function fetchClassesData() {
        try {
            const response = await fetch("data/classes.json");
            const data = await response.json();
            return data.classes || [];
        } catch (error) {
            console.error("Error fetching classes.json:", error);
            return [];
        }
    }

    async function initializeClassSections() {
        const classesData = await fetchClassesData();
        if (!classesData.length) return;

        classSections.forEach(section => {
            const className = section.dataset.class?.toLowerCase();
            const classData = classesData.find(c => c.name.toLowerCase() === className);

            if (!classData) {
                section.innerHTML = `<p>Category "${className}" not found.</p>`;
                return;
            }

            // Select elements
            const specializationDropdown = section.querySelector(".specialization-selection");
            const specializationInfo = section.querySelector(".specialization-info");
            const pathSelection = section.querySelector(".path-selection");
            const classContainer = section.querySelector(".class-info");
            const talentDropdown = section.querySelector(".talent-selection");
            const talentInfo = section.querySelector(".talent-info");

            // Populate Dropdown
            populateDropdown(pathSelection, classData.paths, "Select a Path");
            populateDropdown(talentDropdown, classData.talents, "Select a Talent");

            // Populate Specializations if the class is Professional
            if (className === "professional" && classData.specializations) {
                populateDropdown(specializationDropdown, classData.specializations, "Select a Specialization");
            }

            // Event Listeners
            pathSelection?.addEventListener("change", event => {
                const selectedPath = classData.paths.find(p => p.name === event.target.value);
                if (selectedPath) {
                    loadPathDetails(selectedPath, classContainer);
                }
            });

            talentDropdown?.addEventListener("change", event => {
                const selectedTalent = classData.talents.find(t => t.name === event.target.value);
                loadTalentDetails(selectedTalent, talentInfo);
            });

            specializationDropdown?.addEventListener("change", event => {
                const selectedSpecialization = classData.specializations.find(s => s.name === event.target.value);
                loadSpecializationDetails(selectedSpecialization, specializationInfo);
            });
        });
    }

    function populateDropdown(dropdown, items, defaultText) {
        if (!dropdown) return;

        dropdown.innerHTML = `<option value="">${defaultText}</option>` +
            items.map(item => `<option value="${item.name}">${item.name}</option>`).join('');
    }

    function loadPathDetails(selectedPath, container) {
        if (!container) return;

        container.innerHTML = `
            <h4>${selectedPath.name}</h4>
            <p>${selectedPath.description}</p>
    
            ${formatFeatures(selectedPath.features)}
    
            <h3>Progression</h3>
            <p>
                Path progression is linear, you will select these progression steps in order. At level 1, 3, 6 and 9 get an increase of +3 points to put into your checks, but no check can exceed 15. Additionally gain +1 Class resource at each of these levels as well.
            </p>                   
    
            <div class="features">
                <h4>Progression Steps</h4>
                <ol>
                    ${selectedPath.progressionSteps.map(step => `
                        <li>
                            <strong>${step.name}:</strong> ${step.description}
                            ${step.options ? formatFeatureOptions(step.options) : ""}
                        </li>
                    `).join('')}
                </ol>
            </div>
        `;
    }

    function loadTalentDetails(selectedTalent, container) {
        if (!container) return;
        if (!selectedTalent) {
            container.innerHTML = "<p>No talent selected.</p>";
            return;
        }

        container.innerHTML = `
            <h4>${selectedTalent.name}</h4>
            <p>${selectedTalent.description}</p>

            ${formatFeatures(selectedTalent.features)}

            <h3>Progression</h3>
            <p>You may freely select talent progression steps in any order. With each step, gain a +1 bonus to any one of your checks, though no check can exceed a maximum of 15.
            </p>

            <div class="features">
                <h4>Progression Steps</h4>
                    ${selectedTalent.progressionSteps.map(step => `<li><strong>${step.name}:</strong> ${step.description}</li>`).join('')}
            </div>
        `;
    }

    function loadSpecializationDetails(selectedSpecialization, container) {
        if (!container) return;
        if (!selectedSpecialization) {
            container.innerHTML = "<p>No specialization selected.</p>";
            return;
        }

        container.innerHTML = `
            <div class="two-column">
                <div class="column">
                    <h4>${selectedSpecialization.name}</h4>
                    <p>${selectedSpecialization.description}</p>
                </div>
                <div class="column">
                    <div class="features">
                        <h3>Feature</h3>
                        <p><strong>${selectedSpecialization.featureName}:</strong> ${selectedSpecialization.featureDescription}</p>
                    </div>
                </div>
            </div>
        `;
    }

    function formatFeatures(features) {
        if (!features || !features.length) return "<p>No features available.</p>";

        return `
            <div class="features">
                <h3>Features</h3>
                <ul>
                    ${features.map(feature => `
                        <li>
                            <strong>${feature.name}:</strong> ${feature.description}
                            ${feature.options ? formatFeatureOptions(feature.options) : ""}
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    function formatFeatureOptions(options) {
        return `
            <ul class="feature-options">
                ${options.map(option => `<li><strong>${option.name}:</strong> ${option.effect}</li>`).join('')}
            </ul>
        `;
    }

    initializeClassSections();
});

// Highlight the current page in the nav
document.querySelectorAll('nav a').forEach(link => {
    if (link.href === window.location.href) {
        link.style.fontWeight = 'bold';
    }
});

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".responsive-table").forEach((wrapper) => {
        const headers = Array.from(wrapper.querySelectorAll("thead th")).map(th => th.textContent.trim());
        wrapper.querySelectorAll("tbody tr").forEach(row => {
            Array.from(row.children).forEach((td, index) => {
                td.setAttribute("data-label", headers[index] || "");
            });
        });
    });
});

async function loadClasses() {
    const response = await fetch('data/classes.json');
    const data = await response.json();
    renderClassPage(data.classes[0]);
}

function renderClassPage(classData) {
    const container = document.getElementById('class-content');
    container.innerHTML = '';

    const description = document.createElement('div');
    description.innerHTML = `<p>${classData.description}</p>`;
    container.appendChild(description);
}

// other helper functions...

loadClasses(); // <- THIS IS CRITICAL
