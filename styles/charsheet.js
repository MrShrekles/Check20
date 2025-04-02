document.addEventListener("DOMContentLoaded", () => {
    // Load class, species, and item options
    loadOptions('data/classes.json', 'class', 'class-description', 'class-features', 'class-equipment', 'path', 'talent');
    loadOptions('data/species.json', 'species', 'species-description', 'species-features', null, 'subspecies', null);
});

// Main function to load options for classes, species, paths, and talents
function loadOptions(filePath, dropdownId, descriptionId, featureListId, equipmentListId = null, pathDropdownId = null, talentDropdownId = null) {
    fetch(filePath)
        .then(response => response.json())
        .then(data => {
            const dropdown = document.getElementById(dropdownId);
            const description = document.getElementById(descriptionId);
            const featureList = document.getElementById(featureListId);
            const pathDropdown = pathDropdownId ? document.getElementById(pathDropdownId) : null;
            const talentDropdown = talentDropdownId ? document.getElementById(talentDropdownId) : null;

            // Clear and populate dropdown
            dropdown.innerHTML = `<option value="">Select ${capitalizeFirstLetter(dropdownId)}</option>`;
            const dataKey = dropdownId === "species" ? "species" : "classes";

            data[dataKey].forEach(item => {
                const option = document.createElement('option');
                option.value = item.name;
                option.textContent = item.name;
                dropdown.appendChild(option);
            });

            // Handle selection change
            dropdown.addEventListener('change', () => {
                const selectedItem = data[dataKey].find(item => item.name === dropdown.value);
                if (!selectedItem) return;

                description.textContent = selectedItem.description || "No description available.";
                featureList.innerHTML = selectedItem.features?.map(feature =>
                    `<li><strong>${feature.name}:</strong> ${feature.description}</li>`
                ).join('') || "<li>No features available.</li>";

                if (dropdownId === "class") {
                    populateDropdown(pathDropdown, selectedItem.paths, "Select a Path");
                    populateDropdown(talentDropdown, selectedItem.talents, "Select a Talent");
                }
            });

            // Path selection logic
            if (pathDropdown) {
                pathDropdown.addEventListener('change', () => {
                    const selectedPath = data[dataKey]
                        .find(item => item.name === dropdown.value)
                        ?.paths?.find(p => (typeof p === 'object' ? p.name : p) === pathDropdown.value);
                    if (selectedPath) loadPathDetails(selectedPath);
                });
            }

            // Talent selection logic
            if (talentDropdown) {
                talentDropdown.addEventListener('change', () => {
                    const selectedTalent = data[dataKey]
                        .find(item => item.name === dropdown.value)
                        ?.talents?.find(t => t.name === talentDropdown.value);
                    if (selectedTalent) loadTalentDetails(selectedTalent);
                });
            }
        })
        .catch(error => console.warn(`Failed to load ${filePath}:`, error));
}

// Populate dropdown dynamically
function populateDropdown(dropdown, items, defaultText) {
    if (!dropdown) return;
    dropdown.innerHTML = `<option value="">${defaultText}</option>` +
        items.map(item => `<option value="${item.name}">${item.name}</option>`).join('');
}

// Load path details
function loadPathDetails(selectedPath) {
    const pathContainer = document.getElementById('path-details');
    if (!pathContainer) return;
    pathContainer.innerHTML = `
        <h4>${selectedPath.name}</h4>
        <p>${selectedPath.description}</p>
        <h4>Features</h4>
        ${selectedPath.features?.map(feature => `<p><strong>${feature.name}:</strong> ${feature.description}</p>`).join('') || "<p>No special features available.</p>"}
        <details>
            <summary>Progression</summary>
            <ol>
                ${selectedPath.progressionSteps?.map(step => `<li><strong>${step.name}:</strong> ${step.description}</li>`).join('') || "<li>No progression steps available.</li>"}
            </ol>
        </details>
    `;
}

// Load talent details
function loadTalentDetails(selectedTalent) {
    const talentContainer = document.getElementById('talent-details');
    if (!talentContainer) return;
    talentContainer.innerHTML = `
        <h4>${selectedTalent.name}</h4>
        <p>${selectedTalent.description}</p>
        <h4>Features</h4>
        ${selectedTalent.features?.map(feature => `<p><strong>${feature.name}:</strong> ${feature.description}</p>`).join('') || "<p>No special features available.</p>"}
        <details>
            <summary>Progression</summary>
            <ol>
                ${selectedTalent.progressionSteps?.map(step => `<li><strong>${step.name}:</strong> ${step.description}</li>`).join('') || "<li>No progression steps available.</li>"}
            </ol>
        </details>
    `;
}

// Capitalize first letter for dropdown labels
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

document.addEventListener("DOMContentLoaded", () => {
    loadSpeciesOptions('data/species.json', 'species', 'species-description', 'species-features', 'subspecies');
});

// Load species and handle selection
function loadSpeciesOptions(filePath, speciesDropdownId, descriptionId, featureListId, subspeciesDropdownId) {
    fetch(filePath)
        .then(response => response.json())
        .then(data => {
            const speciesDropdown = document.getElementById(speciesDropdownId);
            const description = document.getElementById(descriptionId);
            const featureList = document.getElementById(featureListId);
            const subspeciesDropdown = document.getElementById(subspeciesDropdownId);

            speciesDropdown.innerHTML = `<option value="">Select Species</option>`;

            // Populate species dropdown
            data.species.forEach(species => {
                const option = document.createElement('option');
                option.value = species.name;
                option.textContent = species.name;
                speciesDropdown.appendChild(option);
            });

            // Handle species selection
            speciesDropdown.addEventListener('change', () => {
                const selectedSpeciesName = speciesDropdown.value;
                const selectedSpecies = data.species.find(s => s.name === selectedSpeciesName);

                if (!selectedSpecies) return;

                // Update species details
                description.textContent = selectedSpecies.description || "No description available.";
                featureList.innerHTML = selectedSpecies.features?.map(feature =>
                    `<li><strong>${feature.name}:</strong> ${feature.description}</li>`
                ).join('') || "<li>No features available.</li>";

                // Handle subspecies dropdown
                if (selectedSpecies.subspecies && selectedSpecies.subspecies.length > 0) {
                    populateDropdown(subspeciesDropdown, selectedSpecies.subspecies, "Select Subspecies");
                    subspeciesDropdown.style.display = "block";
                } else {
                    subspeciesDropdown.innerHTML = "";
                    subspeciesDropdown.style.display = "none";
                }
            });

            // Handle subspecies selection
            subspeciesDropdown.addEventListener('change', () => {
                const selectedSpeciesName = speciesDropdown.value;
                const selectedSubspeciesName = subspeciesDropdown.value;
                const selectedSpecies = data.species.find(s => s.name === selectedSpeciesName);

                if (!selectedSpecies || !selectedSpecies.subspecies) return;

                const selectedSubspecies = selectedSpecies.subspecies.find(s => s.name === selectedSubspeciesName);
                if (selectedSubspecies) {
                    loadSubspeciesDetails(selectedSubspecies);
                }
            });
        })
        .catch(error => console.error(`Failed to load ${filePath}:`, error));
}

// Populate dropdown dynamically
function populateDropdown(dropdown, items, defaultText) {
    if (!dropdown) return;

    dropdown.innerHTML = `<option value="">${defaultText}</option>` +
        items.map(item => `<option value="${item.name}">${item.name}</option>`).join('');
}

// Load subspecies details dynamically
function loadSubspeciesDetails(selectedSubspecies) {
    const subspeciesContainer = document.getElementById('subspecies-details');
    if (!subspeciesContainer) return;

    subspeciesContainer.innerHTML = `
        <h4>${selectedSubspecies.name}</h4>
        <p>${selectedSubspecies.description}</p>

        <div class="features">
            <h4>Traits</h4>
            ${selectedSubspecies.traits?.map(trait => `<p><strong>${trait.name}:</strong> ${trait.description}</p>`).join('') || "<p>No special traits available.</p>"}
        </div>
    `;
}

// Capitalize first letter for dropdown labels
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function formatFeatureOptions(options) {
    if (!options || options.length === 0) return ""; // No options, return empty string

    return `
        <ul class="feature-options">
            ${options.map(option => {
        if (typeof option === "string") {
            return `<li>${option}</li>`; // Simple list item if it's just a string
        } else if (option.name && option.effect) {
            return `<li><strong>${option.name}:</strong> ${option.effect}</li>`; // Name + Effect format
        } else {
            return `<li>${JSON.stringify(option)}</li>`; // Fallback for unknown formats
        }
    }).join('')}
        </ul>
    `;
}

function loadSpeciesDetails(selectedSpecies) {
    const speciesContainer = document.getElementById('species-details');
    if (!speciesContainer) return;

    speciesContainer.innerHTML = `
        <h4>${selectedSpecies.name}</h4>
        <p>${selectedSpecies.description}</p>

            ${selectedSpecies.features?.map(feature => `
                <p><strong>${feature.name}:</strong> ${feature.description}</p>
                ${feature.options ? formatFeatureOptions(feature.options) : ""}
            `).join('') || "<p>No special features available.</p>"}
    `;
}

document.addEventListener("DOMContentLoaded", () => {
    loadSpeciesOptions('data/species.json', 'species', 'species-description', 'species-features');
});

function loadSpeciesOptions(filePath, speciesDropdownId) {
    fetch(filePath)
        .then(response => response.json())
        .then(data => {
            const speciesDropdown = document.getElementById(speciesDropdownId);
            speciesDropdown.innerHTML = `<option value="">Select Species</option>`;

            data.species.forEach(species => {
                const option = document.createElement('option');
                option.value = species.name;
                option.textContent = species.name;
                speciesDropdown.appendChild(option);
            });

            speciesDropdown.addEventListener('change', () => {
                const selectedSpeciesName = speciesDropdown.value;
                const selectedSpecies = data.species.find(s => s.name === selectedSpeciesName);
                if (selectedSpecies) loadSpeciesDetails(selectedSpecies);
            });
        })
        .catch(error => console.error(`Failed to load ${filePath}:`, error));
}

// --------------- Auto Pop -------------------
document.addEventListener("DOMContentLoaded", () => {
    fetch("data/species.json") // Adjust path if needed
        .then(response => response.json())
        .then(data => {
            const speciesList = document.getElementById("species-list");
            
            // Populate datalist options dynamically
            data.species.forEach(species => {
                let option = document.createElement("option");
                option.value = species.name;
                speciesList.appendChild(option);
            });
        })
        .catch(error => console.error("Failed to load species data:", error));
});


// --------------ITEM MANAGEMENT FUNCTIONS-----------------------
function addItem() {
    let container = document.getElementById("repeating-section");

    // Create a new item container
    let newItem = document.createElement("div");
    newItem.classList.add("item-entry");

    // Dropdown for selecting item type
    let select = document.createElement("select");
    select.innerHTML = `
        <option value="weapon">Weapon</option>
        <option value="armor">Armor</option>
        <option value="potion">Potion</option>
        <option value="misc">Miscellaneous</option>
    `;

    // Input field for item name
    let nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.placeholder = "Item Name";

    // Input field for item stats/effects
    let statInput = document.createElement("input");
    statInput.type = "text";
    statInput.placeholder = "Stats/Effects";

    // Button to remove the item
    let removeBtn = document.createElement("button");
    removeBtn.innerText = "Remove";
    removeBtn.onclick = function () {
        container.removeChild(newItem);
    };

    // Append all elements to the item container
    newItem.appendChild(select);
    newItem.appendChild(nameInput);
    newItem.appendChild(statInput);
    newItem.appendChild(removeBtn);
    container.appendChild(newItem);
}

// Function to add a new custom resource field
function addOtherResource() {
    const container = document.getElementById('other-resources');
    const newEntry = document.createElement('div');
    newEntry.className = 'item-entry';

    // Create inputs for resource name and value
    newEntry.innerHTML = `
        <input type="text" name="otherResourceName[]" placeholder="Name">
        <input type="number" name="otherResourceValue[]" placeholder="Value">
        <button type="button" onclick="removeResource(this)">Remove</button>
    `;
    container.appendChild(newEntry);
}

// Function to remove a resource entry
function removeResource(btn) {
    const entry = btn.parentElement;
    entry.parentElement.removeChild(entry);
}

// Derived stat calculation
function recalculateAllStats() {
    const agility = parseInt(document.getElementById('agilityTotal')?.value) || 0;
    const strength = parseInt(document.getElementById('strength')?.value) || 0;
    const observation = parseInt(document.getElementById('observation')?.value) || 0;

    document.getElementById('wounds').value = agility + strength;
    document.getElementById('movement').value = 30 + Math.floor(agility / 2) * 5;
    document.getElementById('llv').value = 30 + Math.floor(observation / 2) * 5;
}

// CHARACTER SAVE/LOAD/PRINT
function saveCharacter() {
    const character = {
        name: document.getElementById('charName').value,
        class: document.getElementById('class').value,
        path: document.getElementById('path').value,
        talent: document.getElementById('talent').value,
        health: {
            armor: document.getElementById('armor').value,
            wounds: document.getElementById('wounds').value,
            movement: document.getElementById('movement').value,
            llv: document.getElementById('llv').value
        },
        checks: {
            agility: document.getElementById('agility').value,
            strength: document.getElementById('strength').value,
            observation: document.getElementById('observation').value
        },
        resources: {
            gp: document.getElementById('gp').value,
            spellPoints: document.getElementById('spellPoints').value
        }
    };

    // Create a downloadable JSON file
    const blob = new Blob([JSON.stringify(character, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${character.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Load character data from a JSON file
function loadCharacter() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = event => {
            const char = JSON.parse(event.target.result);

            // Populate the character sheet with loaded data
            document.getElementById('charName').value = char.name;
            document.getElementById('class').value = char.class;
            document.getElementById('path').value = char.path;
            document.getElementById('talent').value = char.talent;
            document.getElementById('armor').value = char.health.armor;
            document.getElementById('wounds').value = char.health.wounds;
            document.getElementById('movement').value = char.health.movement;
            document.getElementById('llv').value = char.health.llv;
            document.getElementById('agility').value = char.checks.agility;
            document.getElementById('strength').value = char.checks.strength;
            document.getElementById('observation').value = char.checks.observation;
            document.getElementById('gp').value = char.resources.gp;
            document.getElementById('spellPoints').value = char.resources.spellPoints;
        };
        reader.readAsText(file);
    };
    input.click();
}

// Print the character sheet
function printCharacter() {
    window.print();
}

// Enable mouse wheel scrolling for all number inputs
document.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('wheel', event => {
        event.preventDefault();
        const step = parseInt(input.step) || 1;
        const direction = event.deltaY < 0 ? step : -step;
        input.value = (parseInt(input.value) || 0) + direction;
        input.dispatchEvent(new Event('input'));
    });
});

// Calculate the total sum of all "Total" inputs
function calculateTotalChecksSum() {
    const inputs = document.querySelectorAll('.checks-table input[name$="Total"]');
    let sum = 0;
    inputs.forEach(input => {
        sum += parseInt(input.value) || 0;
    });
    document.getElementById('totalChecksSum').value = sum;
}

// Adjust all total inputs by a given amount
function adjustAllTotals(amount) {
    const inputs = document.querySelectorAll('.checks-table input[name$="Total"]');
    inputs.forEach(input => {
        let currentValue = parseInt(input.value) || 0;
        input.value = currentValue + amount;
    });
    calculateTotalChecksSum();
}

// Clear all total inputs
function clearAllTotals() {
    const inputs = document.querySelectorAll('.checks-table input[name$="Total"]');
    inputs.forEach(input => {
        input.value = 0;
    });
    calculateTotalChecksSum();
}

// Initialize total calculation on page load and input changes
document.addEventListener('DOMContentLoaded', calculateTotalChecksSum);
document.querySelectorAll('.checks-table input[name$="Total"]').forEach(input => {
    input.addEventListener('input', calculateTotalChecksSum);
});
