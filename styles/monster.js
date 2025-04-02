// Standard base movement speeds
const BASE_MOVEMENT = { walk: 30, burrow: 0, fly: 0 };

// Function to combine movement modifiers
const combineMovement = (modifiers) =>
    modifiers.reduce((acc, mod) => {
        Object.entries(mod).forEach(([mode, value]) => {
            acc[mode] = (acc[mode] || 0) + value;
        });
        return acc;
    }, { ...BASE_MOVEMENT });

let monsterData = {}; // Will hold the fetched monster data

// Fetch the monster data from monster.json
fetch("data/monster.json")
    .then(response => response.json())
    .then(data => {
        monsterData = data;
        populateDropdowns(); // Populate dropdowns after data loads
    })
    .catch(error => console.error("Error loading monster data:", error));


const monsterMotivations = [
    "Bloodlust", "Hunting prey", "Defending territory", "Seeking revenge", "Eliminating a perceived threat",
    "Fighting for dominance", "Following orders to kill", "Destroying intruders", "Rampaging due to pain or madness",
    "Marking territory with violence", "Scavenging for food", "Protecting young", "Guarding a nest or lair",
    "Defending a wounded ally", "Hiding from a larger predator", "Storing food or resources", "Avoiding danger",
    "Moving to a safer area", "Seeking a cure for an ailment", "Following a leader’s command", "Seeking companionship",
    "Performing a ritual", "Testing intruders before trusting them", "Enforcing order in its domain", "Looking for a mate",
    "Defending its tribe or faction", "Reclaiming lost land", "Investigating strange sounds or smells",
    "Searching for something lost", "Chasing a moving object", "Collecting shiny objects", "Observing intruders without hostility",
    "Imitating other creatures", "Seeking something familiar", "Seeking magical energy", "Guarding an ancient secret",
    "Bound by a curse to perform an action", "Absorbing souls or life force", "Being controlled by another entity",
    "Manifesting due to an old prophecy", "Enforcing a divine or eldritch law", "Reenacting an ancient battle",
    "Wandering aimlessly", "Playing tricks or misleading travelers", "Spreading destruction for fun",
    "Escaping from a captor", "Experiencing a mental break", "Acting out due to unnatural corruption",
    "Confused about its purpose", "Seeking freedom from servitude"
];

const actionTypes = ["Action", "Half-Action", "Off-Action"];
const ranges = ["Melee", "Reach", "Short", "Medium", "Long"];
const damageTypes = ["Physical", "Elemental", "Acid", "Eclipse", "Fire", "Ice", "Lighting", "Solar", "Thunder", "Toxic", "Fluid", "Realm"];
const values = ["1d6", "1d8", "2d4", "1d4!", "3"];
const condition = ["Bleeding", "Broken", "Concussion", "Coughing", "Dislocation", "Slowed", "Pinned", "Prone", "", "Blind", "Charmed", "Confused", "Deaf", "Fear", "Intangible", "Invisible", "Unconscious", "Stunned", "Exhaustion", "Constrained", "Exposed"]
const check = ["Agility", "Crafting", "Influence", "Intellect", "Luck", "Observation", "Spirit", "Stealth", "Strength", "Survival"]
const duration = ["Until the end of their next turn", "1 Minute"]
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

const formatFeature = (feature) => {
    // Get random values for your custom tokens
    const randomRange = randomItem(ranges);
    const randomValue = randomItem(values);
    const randomAction = randomItem(actionTypes);
    const randomDamage = randomItem(damageTypes);
    const randomCondition = randomItem(condition);
    const randomCheck = randomItem(check);
    const randomDuration = randomItem(duration);


    // Replace tokens in the effect string with randomized values
    let effect = feature.effect
        .replace("{range}", randomRange)
        .replace("{value}", randomValue)
        .replace("{action}", randomAction)
        .replace("{condition}", randomCondition)
        .replace("{damage}", randomDamage)
        .replace("{check}", randomCheck)
        .replace("{duration}", randomDuration)
        ;

    return { name: feature.name, action: randomAction, effect };
};

class Monster {
    constructor() {
        if (!monsterData.base || !monsterData.additional || !monsterData.mod) {
            console.error("Monster data not loaded yet.");
            return;
        }

        this.baseKey = document.getElementById("randomize-base").checked
            ? randomItem(Object.keys(monsterData.base))
            : document.getElementById("base-type").value;
        this.addKey = document.getElementById("randomize-additional").checked
            ? randomItem(Object.keys(monsterData.additional))
            : document.getElementById("additional-type").value;
        this.modKey = document.getElementById("randomize-mod").checked
            ? randomItem(Object.keys(monsterData.mod))
            : document.getElementById("mod-type").value;

        this.base = monsterData.base[this.baseKey];
        this.mergedBaseFeatures = [...(this.base.features || [])];
        this.mergedBaseDescription = this.base.description;
        this.subtypeChain = [];

        let current = this.base;
        while (current.subtypes) {
            const chosenSubtype = randomItem(Object.keys(current.subtypes));
            this.subtypeChain.push(chosenSubtype);
            const subtypeData = current.subtypes[chosenSubtype];
            this.mergedBaseDescription += " " + subtypeData.description;
            if (subtypeData.features) {
                this.mergedBaseFeatures = this.mergedBaseFeatures.concat(subtypeData.features);
            }
            current = subtypeData;
        }

        this.additional = monsterData.additional[this.addKey];
        this.mod = monsterData.mod[this.modKey];
        this.motivation = randomItem([
            "Hunting prey", "Defending territory", "Seeking revenge", "Rampaging from pain"
        ]);

        this.name = `${randomItem(this.mod.names)} ${randomItem(this.base.names)} ${randomItem(this.additional.names)}`;

        this.features = [
            randomItem(this.mergedBaseFeatures || []),
            randomItem(this.additional.features || []),
            randomItem(this.mod.features || [])
        ].filter(Boolean).map(formatFeature);

        const movementMods = [
            this.base.movementModifier,
            this.additional.movementModifier,
            this.mod.movementModifier
        ].filter(Boolean);
        this.movement = combineMovement(movementMods);
    }
}

const createMonsterCard = (monster) => {
    if (!monster) return;
    
    const monsterDiv = document.createElement("div");
    monsterDiv.className = "monster-card";

    const subtypeDisplay = monster.subtypeChain.length > 0
        ? ` (${monster.subtypeChain.map(s => toTitleCase(s)).join(" > ")})`
        : "";

    const featuresHtml = monster.features
        .map(f => `<li contenteditable="true"><strong>${f.name}</strong> (${f.action}): ${f.effect}</li>`)
        .join("");

    monsterDiv.innerHTML = `
      <h4 contenteditable="true">${monster.name}</h4>
      <p><strong>${toTitleCase(monster.baseKey)}${subtypeDisplay} - ${toTitleCase(monster.addKey)} - ${toTitleCase(monster.modKey)}</strong></p>
      <p>${monster.mergedBaseDescription} ${monster.additional.description} ${monster.mod.description}</p>
      <p><strong>Movement Speed:</strong> Walk: ${monster.movement.walk} ft${monster.movement.burrow ? `, Burrow: ${monster.movement.burrow} ft` : ""}${monster.movement.fly ? `, Fly: ${monster.movement.fly} ft` : ""}</p>
      <p><strong>Motivation:</strong> ${monster.motivation}</p>
      <h3>Features:</h3>
      <ul>${featuresHtml}</ul>
      <button class="delete-monster">Remove</button>`;

    monsterDiv.querySelector(".delete-monster")
        .addEventListener("click", () => monsterDiv.remove());

    return monsterDiv;
};

// Helper to convert a string to Title Case
function toTitleCase(str) {
    return str.replace(/\w\S*/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

function populateDropdowns() {
    ["base", "additional", "mod"].forEach(type => {
        const select = document.getElementById(`${type}-type`);
        if (!select) return;

        select.innerHTML = "";
        Object.keys(monsterData[type]).forEach(key => {
            const option = document.createElement("option");
            option.value = key;
            option.textContent = toTitleCase(key);
            select.appendChild(option);
        });
    });
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("generate-monster").addEventListener("click", function () {
        const monster = new Monster();
        if (monster) {
            document.getElementById("monster-output").prepend(createMonsterCard(monster));
        }
    });
});


// -----------------------------------------------------------------------//
// Sidebar toggle functionality
document.addEventListener("DOMContentLoaded", function () {
    const sidebar = document.getElementById("sidebar");
    const toggleButton = document.getElementById("toggle-sidebar");

    toggleButton.addEventListener("click", function () {
        if (sidebar.classList.contains("closed")) {
            sidebar.classList.remove("closed");
            sidebar.classList.add("open");
        } else {
            sidebar.classList.remove("open");
            sidebar.classList.add("closed");
        }
    });
});

// Dice roller functionality
let selectedDiceType = 6; // Default dice type (d6)
const rollHistory = document.getElementById("roll-history");

// Update dice type on button click
document.querySelectorAll(".dice-button").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".dice-button").forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");
        selectedDiceType = parseInt(button.dataset.dice, 10);
    });
});

document.getElementById("roll-d20-check").addEventListener("click", () => {
    const modifier = parseInt(document.getElementById("check-modifier").value, 10);
    const advantage = document.getElementById("check-advantage").value;

    const roll1 = Math.floor(Math.random() * 20) + 1;
    const roll2 = Math.floor(Math.random() * 20) + 1;

    let adjustedRoll1 = roll1;
    let chosenRaw;

    if (advantage === "advantage") {
        adjustedRoll1 += 4;
        chosenRaw = Math.max(adjustedRoll1, roll2);
    } else if (advantage === "disadvantage") {
        adjustedRoll1 -= 4;
        chosenRaw = Math.min(adjustedRoll1, roll2);
    } else {
        chosenRaw = roll1;
    }

    const finalResult = chosenRaw + modifier;
    const historyItem = document.createElement("li");
    historyItem.classList.add("styled-roll");
    
    // Determine success count
    let successCount = 0;
    if (finalResult >= 15) {
      successCount = Math.floor((finalResult - 15) / 5) + 1;
    }
    
    // Optional highlight
    if (finalResult >= 15) {
      historyItem.classList.add("roll-success");
    }
    
    historyItem.innerHTML = `
      <div class="roll-line">
        <span class="roll-label">🎲 Rolled:</span> 
        d20: <span class="roll-val">${highlightRoll(roll1)}</span>
        ${advantage !== "none" ? `→ <span class="roll-val">${adjustedRoll1}</span> / <span class="roll-val">${highlightRoll(roll2)}</span>` : ""}
        <hr>
      </div>
      <div class="mod-line">
        <span class="roll-label"> Modifier:</span> <span class="roll-mod">${modifier >= 0 ? "+" : ""}${modifier}</span>
      </div>
      <div class="total-line">
        <hr>
        <span class="roll-label"> Total:</span> <strong class="roll-total">${finalResult}</strong>
        ${successCount > 0 ? `<span class="success-count">(${successCount} success${successCount > 1 ? "es" : ""})</span>` : ""}
      </div>
      <div class="choice-line">
        <span class="roll-label"> Chose:</span> <em class="roll-chosen">${chosenRaw}</em>
      </div>
    `;
    
    
    
    document.getElementById("check-history").prepend(historyItem);

    // Limit history to 10 entries
    const historyList = document.getElementById("check-history");
    if (historyList.children.length > 5) {
        historyList.removeChild(historyList.lastChild);
    }
});



// Highlight rolls based on value
function highlightRoll(roll, diceType) {
    const [primary, secondary] = roll.toString().split("/").map(Number); // Support for advantage/disadvantage
    const highlight = value => {
        if (value === diceType) return `<span class="roll-max">${value}</span>`; // Max roll
        if (value === 1) return `<span class="roll-min">${value}</span>`; // Min roll
        return `<span class="roll-normal">${value}</span>`; // Default
    };

    return secondary
        ? `${highlight(primary)}/${highlight(secondary)}` // Advantage/Disadvantage case
        : highlight(primary); // Normal roll
}

// Highlight rolls based on value
function highlightRoll(value) {
    if (value === 20) {
        return `<span class="roll-max">${value}</span>`; // Natural 20
    } else if (value === 1) {
        return `<span class="roll-min">${value}</span>`; // Natural 1
    } else {
        return `<span class="roll-normal">${value}</span>`; // Default roll
    }
}

document.getElementById("toggle-roller").addEventListener("click", () => {
    document.getElementById("dice-roller").classList.remove("active");
    document.getElementById("d20-check-roller").classList.add("active");
    document.getElementById("toggle-roller").classList.add("active");
    document.getElementById("toggle-dice").classList.remove("active");
});

document.getElementById("toggle-dice").addEventListener("click", () => {
    document.getElementById("dice-roller").classList.add("active");
    document.getElementById("d20-check-roller").classList.remove("active");
    document.getElementById("toggle-dice").classList.add("active");
    document.getElementById("toggle-roller").classList.remove("active");
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
