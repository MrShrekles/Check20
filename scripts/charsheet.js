// ==========================
// ITEM MANAGEMENT FUNCTIONS
// ==========================

// Function to add a new item to the "repeating-section"
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

// ==========================
// DERIVED STAT CALCULATION
// ==========================

// Calculate all derived stats on button click
function recalculateAllStats() {
    const agility = parseInt(document.getElementById('agilityTotal').value) || 0;
    const strength = parseInt(document.getElementById('strength').value) || 0;
    const observation = parseInt(document.getElementById('observation').value) || 0;

    // Calculate wounds: Agility + Strength
    const wounds = agility + strength;
    document.getElementById('wounds').value = wounds;

    // Calculate movement: Base 30 + 5 ft per 2 Agility
    const movement = 30 + Math.floor(agility / 2) * 5;
    document.getElementById('movement').value = movement;

    // Calculate low light vision: Base 30 + 5 ft per 2 Observation
    const llv = 30 + Math.floor(observation / 2) * 5;
    document.getElementById('llv').value = llv;

    // Provide feedback in the console for debugging
    console.log(`Stats recalculated: Wounds=${wounds}, Movement=${movement}, LLV=${llv}`);
}

// ==========================
// CHARACTER SAVE/LOAD/PRINT
// ==========================

// Save character data to a JSON file
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

// ==========================
// STATIC TOOLTIP LIBRARY
// ==========================

document.addEventListener("DOMContentLoaded", () => {
    console.log("Initializing tooltips...");

    const tooltipLibrary = {
        // General stats
        "Movement Speed": "Base 30 ft + 5 ft per 2 Agility",
        "Wounds": "Agility + Strength",
        "Low Light Vision": "Base 30 ft + 5 ft per 2 Observation",
        "Hefty": "These items are excessively heavy and cumbersome, More than 2 hefty items causes pinned condition",
        "Reload": "This weapon needs to be reloaded with an action, half-action, off-action or using your movement.",

        // Ranges
        "Melee Range": "Within 5ft",
        "Reach Range": "10ft",
        "Short Range": "Within 50ft",
        "Medium Range": "50-200ft",
        "Long Range": "200-1000ft",

        // Rest and recovery
        "Press On": "After combat take a moment to recover, can only be done twice per long rest.",
        "Long Rest": "A long rest requires 10 hours of uninterrupted downtime.",
        "Morale Check": "A check from an enemy or NPC; a failed check can cause them to flee from combat.",

        // Conditions
        "Bleeding": "Cannot recover wounds or receive healing.",
        "Broken": "Physical Disadvantage",
        "Concussion": "Mental Disadvantage, Spellcasting Disadvantage",
        "Coughing": "Mental Disadvantage",
        "Dislocation": "Physical Disadvantage",
        "Slowed": "Movement halved",
        "Pinned": "Cannot move; restrained by an object or creature.",
        "Prone": "Disadvantage on ranged attacks; advantage for melee attacks against you.",
        "Blind": "Disadvantage on attack checks; attacks against you have advantage.",
        "Charmed": "Mental Disadvantage; cannot attack the source of the charm.",
        "Confused": "Mental Disadvantage, attacks against you have advantage.",
        "Deaf": "Stealth disadvantage; Spellcasting disadvantage.",
        "Fear": "Must dash away or hide until the end of your next turn.",
        "Intangible": "Immune to physical damage; cannot attack; movement halved.",
        "Invisible": "Cannot be targeted by opportunity attacks; attacks against you have disadvantage.",
        "Unconscious": "Unable to act; vulnerable to critical hits and Finishers.",
        "Stunned": "Disadvantage on all checks; movement halved.",
        "Exhaustion": "Disadvantage on all checks; movement halved.",
        "Constrained": "Cannot make attack actions; attacks against have advantage.",
        "Exposed": "Take double damage.",
        "Injured": "At 0 wounds, any further damage causes immediate Death.",
        "Death": "Character dies and cannot interact with the living world.",

    };

    function applyTooltips() {
        const allElements = document.querySelectorAll("body *");

        allElements.forEach(element => {
            const textNodes = Array.from(element.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);

            textNodes.forEach(node => {
                let text = node.textContent;

                Object.entries(tooltipLibrary).forEach(([term, description]) => {
                    const regex = new RegExp(`\\b${term}\\b`, "gi");
                    if (regex.test(text)) {
                        const replacement = text.replace(
                            regex,
                            `<span class="tooltip" data-tooltip="${description}">${term}</span>`
                        );

                        const tempContainer = document.createElement('span');
                        tempContainer.innerHTML = replacement;
                        node.replaceWith(tempContainer);
                    }
                });
            });
        });
    }

    // Apply tooltips once on page load
    applyTooltips();

    // Attach a global event listener to reapply tooltips when needed
    document.addEventListener('tooltips:update', () => {
        console.log('Reapplying tooltips for dynamic content...');
        applyTooltips();
    });
});
// ==========================
// CLASS LOADER WITH PATHS & TALENTS
// ==========================
document.addEventListener("DOMContentLoaded", () => {
    loadOptions('data/classes.json', 'class', 'class-description', 'class-features', 'class-equipment', 'path', 'talent');
});

// Main function to load class, path, and talent options
function loadOptions(filePath, dropdownId, descriptionId, featureListId, equipmentListId, pathDropdownId, talentDropdownId) {
    fetch(filePath)
        .then(response => response.json())
        .then(data => {
            const classDropdown = document.getElementById(dropdownId);
            const description = document.getElementById(descriptionId);
            const featureList = document.getElementById(featureListId);
            const equipmentList = document.getElementById(equipmentListId);
            const pathDropdown = document.getElementById(pathDropdownId);
            const talentDropdown = document.getElementById(talentDropdownId);
            const pathDetails = document.getElementById('path-details');
            const talentDetails = document.getElementById('talent-details');

            // Clear existing dropdowns
            classDropdown.innerHTML = '<option value="">Select Class</option>';
            pathDropdown.innerHTML = '<option value="">Select Path</option>';
            talentDropdown.innerHTML = '<option value="">Select Talent</option>';
            pathDetails.innerHTML = '';
            talentDetails.innerHTML = '';

            // Load classes into dropdown
            data.classes.forEach(item => {
                const option = document.createElement('option');
                option.value = item.name;
                option.textContent = item.name;
                classDropdown.appendChild(option);
            });

            // Event listener for class selection
            classDropdown.addEventListener('change', () => {
                const selectedClass = classDropdown.value;
                const selectedItem = data.classes.find(item => item.name === selectedClass);

                if (!selectedItem) return;

                // Update class description
                description.textContent = selectedItem.description || "No description available.";

                // Update features
                featureList.innerHTML = selectedItem.features?.map(feature =>
                    `<li><strong>${feature.name}:</strong> ${feature.description}</li>`
                ).join('') || "<li>No features available.</li>";

                // Update equipment
                equipmentList.innerHTML = selectedItem.equipment?.map(item =>
                    `<li><strong>${item.name}:</strong> ${item.description}</li>`
                ).join('') || "<li>No equipment available.</li>";

                // Populate path dropdown
                pathDropdown.innerHTML = '<option value="">Select Path</option>';
                if (Array.isArray(selectedItem.paths)) {
                    selectedItem.paths.forEach(path => {
                        const pathName = typeof path === 'object' ? path.name : path;
                        const option = document.createElement('option');
                        option.value = pathName;
                        option.textContent = pathName;
                        pathDropdown.appendChild(option);
                    });
                } else {
                    pathDropdown.innerHTML = '<option value="">No Paths Available</option>';
                }

                talentDropdown.innerHTML = '<option value="">Select Talent</option>';
                if (Array.isArray(selectedItem.talents)) {
                    selectedItem.talents.forEach(talent => {
                        const option = document.createElement('option');
                
                        // Handle both string and object formats
                        if (typeof talent === 'object' && talent.name) {
                            option.value = talent.name;
                            option.textContent = talent.name;
                        } else if (typeof talent === 'string') {
                            option.value = talent;
                            option.textContent = talent; // If talents are strings, just use the value
                        }
                
                        talentDropdown.appendChild(option);
                    });
                } else {
                    talentDropdown.innerHTML = '<option value="">No Talents Available</option>';
                }
                

                // Auto-clear path and talent details when class changes
                pathDetails.innerHTML = '';
                talentDetails.innerHTML = '';
            });

            // Event listener for path selection
            pathDropdown.addEventListener('change', () => {
                const selectedClass = classDropdown.value;
                const selectedPathName = pathDropdown.value;
                const selectedItem = data.classes.find(item => item.name === selectedClass);

                if (!selectedItem || !selectedItem.paths) return;

                const selectedPath = selectedItem.paths.find(p => (typeof p === 'object' ? p.name : p) === selectedPathName);
                
                if (selectedPath && typeof selectedPath === 'object') {
                    displayPathDetails(selectedPath);
                } else {
                    pathDetails.innerHTML = '<p>No details available for this path.</p>';
                }
            });

            // Event listener for talent selection
            talentDropdown.addEventListener('change', () => {
                const selectedClass = classDropdown.value;
                const selectedTalentName = talentDropdown.value;
                const selectedItem = data.classes.find(item => item.name === selectedClass);

                if (!selectedItem || !selectedItem.talents) return;

                const selectedTalent = selectedItem.talents.find(t => t.name === selectedTalentName);
                
                if (selectedTalent) {
                    displayTalentDetails(selectedTalent);
                } else {
                    talentDetails.innerHTML = '<p>No details available for this talent.</p>';
                }
            });
        })
        .catch(error => console.error(`Failed to load ${filePath}:`, error));
}

// Function to display path details
function displayPathDetails(path) {
    const pathContainer = document.getElementById('path-details');

    // Ensure path object is valid before trying to display
    if (!path || typeof path !== 'object') {
        pathContainer.innerHTML = '<p>No path details available.</p>';
        return;
    }

    pathContainer.innerHTML = `
        <h3><strong>${path.name}</strong></h3>
        <p>${path.description || "No description available."}</p>

        <div class="features">
            <h4><strong>Path Feature</strong></h4>
            ${path.feature ? `<p><strong>${path.feature.name}:</strong> ${path.feature.description}</p>` : `<p>No special feature available.</p>`}
        </div>

        <details>
            <summary>Progression</summary>
            <p>Path progression is linear; you will select these progression steps in order.</p>
            <ol>
                ${path.progressionSteps ? path.progressionSteps.map(step => `<li><strong>${step.name}:</strong> ${step.description}</li>`).join('') : `<li>No progression steps available.</li>`}
            </ol>
        </details>
    `;

    document.dispatchEvent(new Event('tooltips:update'));
}

// Function to display talent details
function displayTalentDetails(talent) {
    const talentContainer = document.getElementById('talent-details');

    // Ensure talent object is valid before trying to display
    if (!talent || typeof talent !== 'object') {
        talentContainer.innerHTML = '<p>No talent details available.</p>';
        return;
    }

    talentContainer.innerHTML = `
        <h3><strong>${talent.name}</strong></h3>
        <p>${talent.description || "No description available."}</p>

        <div class="features">
            <h4><strong>Talent Feature</strong></h4>
            ${talent.feature ? `<p><strong>${talent.feature.name}:</strong> ${talent.feature.description}</p>` : `<p>No special feature available.</p>`}
        </div>

        <details>
            <summary>Progression</summary>
            <p>You may freely select talent progression steps in any order.</p>
            <ol>
                ${talent.progressionSteps ? talent.progressionSteps.map(step => `<li><strong>${step.name}:</strong> ${step.description}</li>`).join('') : `<li>No progression steps available.</li>`}
            </ol>
        </details>
    `;

    document.dispatchEvent(new Event('tooltips:update'));
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
