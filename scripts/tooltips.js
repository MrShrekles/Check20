// ── Roll20 [[expression]] → readable badge ─────────────────────────────────
// Call parseDice(text) before setting innerHTML anywhere [[...]] may appear.
function parseDice(text) {
    if (!text) return text;
    return String(text).replace(/\[\[([^\]]+)\]\]/g, (_, inner) => {
        const expr = inner.trim()
            .replace(/@\{pl\}/gi, 'PL')
            .replace(/\s*\*\s*/g, '×')
            .replace(/\s*\+\s*/g, '+')
            .replace(/\s*-\s*/g, '-')
            .trim();
        return ` <span class="dice-expr">${expr}</span> `;
    });
}

document.addEventListener("DOMContentLoaded", async () => {

    const tooltipLibrary = {};

    try {
        const resp = await fetch('/data/glossary.json');
        if (resp.ok) {
            const glossary = await resp.json();
            glossary.forEach(entry => {
                const text = entry.duration
                    ? `${entry.definition} - ${entry.duration}`
                    : entry.definition;
                tooltipLibrary[entry.term] = text;
            });
        }
    } catch (e) {
        // glossary tooltips unavailable
    }

    applyTooltips(tooltipLibrary);

    function applyTooltips(library) {
        const allElements = document.querySelectorAll("body *");

        if (!allElements.length) {
            console.warn("No elements found in body for tooltip processing.");
            return;
        }

        allElements.forEach(element => {
            if (element.closest('header, nav, #header-placeholder, #sidebar-placeholder')) return;
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
