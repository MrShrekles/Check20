document.querySelectorAll(".img-zoom").forEach(img => {
    img.addEventListener("click", function () {
        this.classList.toggle("zoomed");
    });
});

document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM fully loaded. Initializing tooltips...");

    const tooltipLibrary = {
        // Ranges
        "Melee Range": "Within 5ft",
        "reach range": "10ft",
        "Short range": "Within 50ft",
        "Medium range": "50-200ft",
        "Long range": "200-1000ft",

        // Rest and recovery
        "Press On": "After combat take a moment to recover, can only be done twice per long rest.",
        "Long Rest": "A long rest requires 10 hours of uninterrupted downtime",
        "Morale Check": "A check from an enemy or NPC, a failed check can cause them to flee from combat",

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
        "Death": "Character dies and cannot interact with the living world."
    };

    function applyTooltips() {
        const allElements = document.querySelectorAll("body *");

        if (!allElements.length) {
            console.warn("No elements found in body for tooltip processing.");
            return;
        }

        allElements.forEach(element => {
            const textNodes = Array.from(element.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);

            textNodes.forEach(node => {
                let originalText = node.textContent.trim(); // Trim whitespace

                Object.keys(tooltipLibrary).forEach(term => {
                    const regex = new RegExp(`\\b${term}\\b`, "gi"); // Match whole words, case-insensitive

                    if (regex.test(originalText)) {
                        console.log(`Match found for: "${term}" in text: "${originalText}"`); // Debugging
                        const tooltipText = tooltipLibrary[term];

                        // Ensure the node hasn't been replaced already
                        if (element.contains(node)) {
                            const html = originalText.replace(
                                regex,
                                `<span class="tooltip" data-tooltip="${tooltipText}">${term}</span>`
                            );
                            const wrapper = document.createElement("span");
                            wrapper.innerHTML = html;
                            element.replaceChild(wrapper, node);
                        }
                    }
                });
            });
        });
    }

    applyTooltips();
});

// Highlight the current page in the nav
document.querySelectorAll('nav a').forEach(link => {
    if (link.href === window.location.href) {
        link.style.fontWeight = 'bold';
    }
});

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


document.getElementById("roll-dice").addEventListener("click", () => {
    const numberOfDice = parseInt(document.getElementById("number-of-dice").value, 10);
    const diceType = parseInt(document.getElementById("dice-type").value, 10);
    const modifier = parseInt(document.getElementById("modifier").value, 10);
    const advantage = document.getElementById("advantage").value;

    if (numberOfDice <= 0 || diceType <= 0) {
        alert("Please enter valid values for dice and modifiers.");
        return;
    }

    let rolls = [];
    let secondaryRolls = [];

    for (let i = 0; i < numberOfDice; i++) {
        const roll = Math.floor(Math.random() * diceType) + 1;
        rolls.push(roll);
        if (advantage !== "none") {
            // Roll secondary dice for advantage/disadvantage
            const secondaryRoll = Math.floor(Math.random() * diceType) + 1;
            secondaryRolls.push(secondaryRoll);
        }
    }

    let finalResult = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;

    if (advantage === "advantage") {
        const advantageResult = secondaryRolls.reduce((sum, roll) => sum + roll, 0);
        finalResult = Math.max(finalResult, advantageResult + modifier);
        rolls = rolls.map((roll, i) => `${roll}/${secondaryRolls[i]}`);
    } else if (advantage === "disadvantage") {
        const disadvantageResult = secondaryRolls.reduce((sum, roll) => sum + roll, 0);
        finalResult = Math.min(finalResult, disadvantageResult + modifier);
        rolls = rolls.map((roll, i) => `${roll}/${secondaryRolls[i]}`);
    }

    // Add roll history with color coding for min/max
    const historyItem = document.createElement("li");
    historyItem.innerHTML = `Rolled: ${numberOfDice}d${diceType} (${rolls.map(roll => highlightRoll(roll, diceType)).join(", ")}) + ${modifier} = ${finalResult}`;
    rollHistory.prepend(historyItem);

    // Limit history to the last 10 rolls
    if (rollHistory.children.length > 10) {
        rollHistory.removeChild(rollHistory.lastChild);
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

document.getElementById("roll-d20-check").addEventListener("click", () => {
    const modifier = parseInt(document.getElementById("check-modifier").value, 10);
    const advantage = document.getElementById("check-advantage").value;

    const roll1 = Math.floor(Math.random() * 20) + 1; // First d20 roll
    const roll2 = Math.floor(Math.random() * 20) + 1; // Second d20 roll
    let chosenValue; // To track which value is chosen
    let finalRoll; // The final result after applying modifiers

    if (advantage === "advantage") {
        const higherRoll = Math.max(roll1, roll2); // Higher roll
        const adjustedRoll = roll1 + 4; // Add +4 to the first roll
        chosenValue = Math.max(higherRoll, adjustedRoll); // Choose the best value
        finalRoll = chosenValue + modifier;
    } else if (advantage === "disadvantage") {
        const lowerRoll = Math.min(roll1, roll2); // Lower roll
        const adjustedRoll = roll1 - 4; // Add +4 to the first roll
        chosenValue = Math.max(lowerRoll, adjustedRoll); // Choose the best value
        finalRoll = chosenValue + modifier;
    } else {
        chosenValue = roll1; // No advantage/disadvantage
        finalRoll = roll1 + modifier;
    }

    // Add result to history
    const historyItem = document.createElement("li");
    historyItem.innerHTML = `
        Rolled: d20 (${highlightRoll(roll1)}${advantage !== "none" ? `/${highlightRoll(roll2)}` : ""}) + ${modifier} = ${finalRoll} [Chose: ${chosenValue}]
    `;
    document.getElementById("check-history").prepend(historyItem);

    // Limit history to the last 10 rolls
    if (document.getElementById("check-history").children.length > 10) {
        document.getElementById("check-history").removeChild(document.getElementById("check-history").lastChild);
    }
});

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