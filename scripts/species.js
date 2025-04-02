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
