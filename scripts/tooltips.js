// ── Roll20 [[expression]] → readable badge ─────────────────────────────────
// Call parseDice(text) before setting innerHTML anywhere [[...]] may appear.
function parseDice(text) {
    if (!text) return text;
    return String(text).replace(/\[\[([^\]]+)\]\]/g, (_, inner) => {
        const expr = inner.trim()
            .replace(/@\{pl\}/gi, 'PL')   // only attribute used in current data
            .replace(/\s*\*\s*/g, '×')    // 5 * PL  →  5×PL
            .replace(/\s*\+\s*/g, '+')    // 1 + PL  →  1+PL
            .replace(/\s*-\s*/g, '-')
            .trim();
        return ` <span class="dice-expr">${expr}</span> `;
    });
}

document.addEventListener("DOMContentLoaded", async () => {

    const tooltipLibrary = {
        "Provoke": "This happens if an attack misses, or when a creature willingly moves out of another’s melee range. The target is granted a counterattack",
        "Advantage": "Roll a d20+4 then roll a d20, take the higher result",
        "Disadvantage": "Roll a d20-4 then roll a d20, take the lower result",
        // Actions
        "Attack": "Make a melee, ranged, or spell attack against a creature or object within range.",
        "Reaction": "A special action taken out of turn, like an opportunity attack.",
        "Opportunity Attacks": "Attack creatures leaving your melee range without disengaging.",
        "Drink Something": "Use an Off-Action to drink or hand off a potion.",
        "Disrupt": "Impose disadvantage on an enemy’s attack with a successful check.",
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
    };

    try {
        const resp = await fetch(‘/data/conditions.json’);
        if (resp.ok) {
            const conditions = await resp.json();
            conditions.forEach(c => {
                tooltipLibrary[c.name] = `${c.effect} — ${c.duration}`;
            });
            // "Exhausted" is a common synonym for Exhaustion used in text
            if (tooltipLibrary["Exhaustion"]) {
                tooltipLibrary["Exhausted"] = tooltipLibrary["Exhaustion"];
            }
        }
    } catch (e) {
        // conditions tooltips unavailable
    }

    applyTooltips(tooltipLibrary);

    function applyTooltips(library) {
        const allElements = document.querySelectorAll("body *");

        if (!allElements.length) {
            console.warn("No elements found in body for tooltip processing.");
            return;
        }

        allElements.forEach(element => {
            const textNodes = Array.from(element.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);

            textNodes.forEach(node => {
                let originalText = node.textContent;

                Object.keys(library).forEach(term => {
                    const regex = new RegExp(`(?<![\\w>])(${term})(?![\\w<])`, "gi");

                    if (regex.test(originalText) && element.contains(node)) {
                        const tooltipText = library[term];
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
});

// Highlight nav link
document.querySelectorAll('nav a').forEach(link => {
    if (link.href === window.location.href) {
        link.style.fontWeight = 'bold';
    }
});