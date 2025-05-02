let npcData = {};
let speciesData = { species: [], dragonTypes: [] };

// Load both JSONs
Promise.all([
    fetch("data/worldbuilding.json").then(res => res.json()),
    fetch("data/species.json").then(res => res.json())
]).then(([worldbuilding, species]) => {
    npcData = worldbuilding;
    speciesData = species;
}).catch(err => console.error("❌ Error loading data:", err));

// Rarity-weighted selector
const rarityWeight = (species) => {
    switch ((species.rarity || "").toLowerCase()) {
        case "now": return 100;
        case "common": return 30;
        case "uncommon": return 16;
        case "rare": return 8;
        case "very rare": return 4;
        case "legendary": return 2;
        case "unique": return 1;
        default: return 5;
    }
};
const weightedRandom = (list, weightFn) => {
    const pool = [];
    list.forEach(item => {
        const weight = Math.floor(weightFn(item) * 10); // support decimals
        for (let i = 0; i < weight; i++) pool.push(item);
    });
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : list[Math.floor(Math.random() * list.length)];
};

const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);

function formatTextWithBreaks(str) {
    return (str || "").replace(/\n/g, "<br>");
}

function formatSpecies(s) {
    const name = s.name || "Unknown";
    const lineage = s.lineage || "";
    const option = s.option || "";

    if (option && lineage) return `${capitalize(option)} ${name}`;
    if (lineage && lineage.toLowerCase() !== name.toLowerCase()) return `${capitalize(lineage)} - ${name}`;
    return name;
}

function extractFeature(species) {
    if (!species.features) return [];

    // If it's an array of features
    if (Array.isArray(species.features)) {
        return species.features.flatMap(f => {
            const baseDesc = `${f.name}: ${f.description}`;
            const optionLines = Array.isArray(f.options)
                ? f.options.map(opt => `<b> ${opt.name}:</b> ${opt.effect}`)
                : [];

            return [baseDesc, ...optionLines];
        });
    }

    // Fallback for simple string-style feature blocks
    return [species.features];
}

class NPC {
    constructor() {
        const species = weightedRandom(speciesData.species, rarityWeight);
        this.speciesName = formatSpecies(species);
        this.features = extractFeature(species);

        const dragonLineages = ["kobari", "drakonari"];
        const lowerName = species.name?.toLowerCase();

        if (dragonLineages.includes(lowerName)) {
            const dragon = getRandomItem(speciesData.dragonTypes);
            this.speciesName += ` (${dragon.name})`;

            // Add the dragon feature too
            if (dragon.features) {
                this.features.push(`🐉 ${dragon.features}`);
            }
        }

        this.name = generateName();
        this.affinity = `${getRandomItem(npcData.affinities)} from ${getRandomItem(npcData.habitats)}`;
        this.religion = getRandomItem(npcData.gods);
        this.item = getRandomItem(npcData.signatureItems);
        this.motivation = getRandomItem(npcData.motivations);
    }
}

function generateName() {
    const first = getRandomItem(npcData.names.start);
    const core = getRandomItem(npcData.names.core);
    const last = getRandomItem(npcData.names.end);

    let middle = core;
    if (first.endsWith(middle[0])) middle = middle.substring(1);
    if (middle.endsWith(last[0])) middle = middle.slice(0, -1);

    return first + middle + last;
}

function splitFeaturesString(str) {
    const [name, ...rest] = str.split(":");
    const effect = rest.join(":").trim();
    return {
        name: name.trim(),
        effect: effect || ""
    };
}


function createNpcCard(npc) {
    const div = document.createElement("div");
    div.className = "monster-card";

    const featureHTML = npc.features.map(f => {
        const { name, effect } = splitFeaturesString(f);
        return `<p><strong>${name}</strong>: ${formatTextWithBreaks(effect)}</p>`;
    }).join("");

    div.innerHTML = `
    <h1 contenteditable="true">${npc.name}</h1>
    <b>${npc.speciesName}</b>
    ${featureHTML}
    <hr>
    <p><strong>Affinity:</strong> ${npc.affinity}</p>
    <p><strong>Religion:</strong> ${npc.religion}</p>
    <p><strong>Signature Item:</strong> ${npc.item}</p>
    <p><strong>Motivation:</strong> ${npc.motivation}</p>
    <div class="button-row">
        <button class="copy-npc">Copy</button>
        <button class="delete-monster">Remove</button>
    </div>
`;


    div.querySelector(".delete-monster").addEventListener("click", () => {
        // Remove from DOM
        div.remove();

        // Remove from savedNpcs
        savedNpcs = savedNpcs.filter(n =>
            n.name !== npc.name || n.speciesName !== npc.speciesName
        );

        // Update localStorage
        localStorage.setItem("check20-npc-cards", JSON.stringify(savedNpcs));
    });


    // Copy button
    div.querySelector(".copy-npc").addEventListener("click", () => {
        const copyBtn = div.querySelector(".copy-npc");
        const deleteBtn = div.querySelector(".delete-monster");

        // Temporarily hide buttons during copy
        copyBtn.style.display = "none";
        deleteBtn.style.display = "none";

        // Grab just the visible text without buttons
        const text = div.innerText.trim();

        // Restore buttons
        copyBtn.style.display = "";
        deleteBtn.style.display = "";

        // Copy text
        navigator.clipboard.writeText(text).then(() => {
            copyBtn.textContent = "Copied!";
            setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
        });

        navigator.clipboard.writeText(text).then(() => {
            const copyBtn = div.querySelector(".copy-npc");
            copyBtn.textContent = "Copied!";
            setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
        });
    });

    return div;
}

let savedNpcs = JSON.parse(localStorage.getItem("check20-npc-cards") || "[]");

document.addEventListener("DOMContentLoaded", () => {
    const outputEl = document.getElementById("npc-output");

    // Render stored NPCs
    savedNpcs.forEach(npc => {
        const safeNpc = { ...npc, features: npc.features.map(f => `${f}`) };
        const card = createNpcCard(safeNpc);
        outputEl.prepend(card);
    });

    document.getElementById("generate-npc").addEventListener("click", () => {
        const npc = new NPC();
        const card = createNpcCard(npc);
        outputEl.prepend(card);

        savedNpcs.push({
            name: npc.name,
            speciesName: npc.speciesName,
            features: npc.features,
            affinity: npc.affinity,
            religion: npc.religion,
            item: npc.item,
            motivation: npc.motivation
        });

        localStorage.setItem("check20-npc-cards", JSON.stringify(savedNpcs));
    });

    document.getElementById("clear-npcs").addEventListener("click", () => {
        localStorage.removeItem("check20-npc-cards");
        savedNpcs = [];
        outputEl.innerHTML = "";
    });
});
