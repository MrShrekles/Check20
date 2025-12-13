document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Tooltips active.");

    const tooltipLibrary = {
        "Provoke":"This happens if an attack misses, or when a creature willingly moves out of another’s melee range. The target is granted a counterattack",
        "Advantage": "Roll a d20+4 then roll a d20, take the higher result", 
        "Disadvantage": "Roll a d20-4 then roll a d20, take the lower result",
        // Actions
        "Attack": "Make a melee, ranged, or spell attack against a creature or object within range.",
        "Reaction": "A special action taken out of turn, like an opportunity attack.",
        "Opportunity Attacks": "Attack creatures leaving your melee range without disengaging.",
        "Drink Something": "Use an Off-Action to drink or hand off a potion.",
        "Disrupt": "Impose disadvantage on an enemy's attack with a successful check.",
        "Block": "Reduce melee damage by half using a shield.",
        "Demoralize": "Force enemies to make a morale check with an Influence (Intimidate) roll.",
        "Stealth": "Attempt to hide from creatures to gain an advantage on your next Attack. Attacking reveals your position.",

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
        "Exhausted": "Disadvantage on all checks; movement halved.",
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
                let originalText = node.textContent;

                Object.keys(tooltipLibrary).forEach(term => {
                    const regex = new RegExp(`(?<![\\w>])(${term})(?![\\w<])`, "gi");

                    if (regex.test(originalText) && element.contains(node)) {
                        const tooltipText = tooltipLibrary[term];
                        const html = originalText.replace(
                            regex,
                            `<span class="tooltip" data-tooltip="${tooltipText}">${term}</span>`
                        );
                        const wrapper = document.createElement("span");
                        wrapper.innerHTML = html;
                        element.replaceChild(wrapper, node);
                    }
                });
            });
        });
    }

    applyTooltips();
});

// Highlight nav link
document.querySelectorAll('nav a').forEach(link => {
    if (link.href === window.location.href) {
        link.style.fontWeight = 'bold';
    }
});