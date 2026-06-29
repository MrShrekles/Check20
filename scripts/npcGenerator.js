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

const REGIONS = {
    none:       { label: "Any Region",  nameStyles: [],                   excludeLineages: [],              lowWeight: [],              highWeight: [] },
    ostrio:     { label: "Ostrio",      nameStyles: ["twenties","fantasy"], excludeLineages: ["Chitnari","Jotun"], lowWeight: ["Strigoi","Symbiotes"], highWeight: [] },
    kingslands: { label: "Kingslands",  nameStyles: ["victorian"],         excludeLineages: ["Chitnari"],    lowWeight: ["Jotun","Dragon"],       highWeight: ["Strigoi","Symbiotes"] },
    khunfaris:  { label: "Khunfaris",   nameStyles: [],                   excludeLineages: ["Strigoi"],     lowWeight: [],              highWeight: [] },
};

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

function regionWeightFn(regionKey) {
    const cfg = REGIONS[regionKey];
    if (!cfg) return rarityWeight;
    return (species) => {
        if (cfg.excludeLineages.includes(species.lineage)) return 0;
        let w = rarityWeight(species);
        if (cfg.lowWeight.includes(species.lineage))  w *= 0.15;
        if (cfg.highWeight.includes(species.lineage)) w *= 4;
        return w;
    };
}

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
const titleCase = s => s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/ \w/g, c => c.toUpperCase()) : '';

function formatTextWithBreaks(str) {
    return (str || "").replace(/\n/g, "<br>");
}

function formatSpecies(s) {
    const name = titleCase(s.name || "Unknown");
    const lineage = s.lineage || "";
    const option = s.option || "";

    if (option && lineage) return `${capitalize(option)} ${name}`;
    if (lineage && lineage.toLowerCase() !== name.toLowerCase()) return `${capitalize(lineage)} - ${name}`;
    return name;
}

function extractFeature(species) {
    const features = [];

    // species.json flat format: feature_name / feature_effect / fetAction / fetCheck etc.
    if (species.feature_name) {
        let line = species.feature_name;
        if (species.feature_effect) line += `: ${species.feature_effect}`;
        const tags = [];
        if (species.fetAction)   tags.push(species.fetAction);
        if (species.fetCheck)    tags.push(`Check: ${species.fetCheck}`);
        if (species.fetRange)    tags.push(`Range: ${species.fetRange}`);
        if (species.fetDuration) tags.push(`Duration: ${species.fetDuration}`);
        if (tags.length) line += ` [${tags.join(' · ')}]`;
        features.push(line);
    }

    if (species['sub-fet-name']) {
        let sub = species['sub-fet-name'];
        if (species['sub-fet-effect']) sub += `: ${species['sub-fet-effect']}`;
        features.push(sub);
    }

    // Legacy format (species.json array)
    if (!features.length && species.features) {
        if (Array.isArray(species.features)) {
            return species.features.flatMap(f => {
                const baseDesc = `${f.name}: ${f.description}`;
                const optionLines = Array.isArray(f.options)
                    ? f.options.map(opt => `<b> ${opt.name}:</b> ${opt.effect}`)
                    : [];
                return [baseDesc, ...optionLines];
            });
        }
        return [species.features];
    }

    return features;
}

class NPC {
    constructor() {
        const regionKey = document.getElementById("region-filter")?.value || "none";
        const species = weightedRandom(speciesData.species, regionWeightFn(regionKey));
        this.speciesName = formatSpecies(species);
        this.features = extractFeature(species);

        const dragonLineages = ["kobari", "drakonari"];
        const lowerName = species.name?.toLowerCase();

        if (dragonLineages.includes(lowerName) && speciesData.dragonTypes?.length) {
            const dragon = getRandomItem(speciesData.dragonTypes);
            this.speciesName += ` (${dragon.name})`;
            if (dragon.features) this.features.push(`🐉 ${dragon.features}`);
        }

        const selectedStyle = document.getElementById("name-style")?.value || "auto";
        let style;
        if (selectedStyle !== "auto") {
            style = selectedStyle;
        } else if (species.namingStyle) {
            style = species.namingStyle;
        } else {
            const regionStyles = REGIONS[regionKey]?.nameStyles || [];
            style = regionStyles.length ? getRandomItem(regionStyles) : "fantasy";
        }
        this.name = generateName(style);
        this.affinity = `${getRandomItem(npcData.affinities)} from ${getRandomItem(npcData.habitats)}`;
        this.religion = getRandomItem(npcData.gods);
        this.item = getRandomItem(npcData.signatureItems);
        this.motivation = getRandomItem(npcData.motivations);
    }
}

function generateName(style = "fantasy") {
    const names = npcData.names;
    if (style === "twenties" || style === "victorian") {
        const pool = names[style].first;
        const genderPool = Math.random() < 0.5 ? pool.male : pool.female;
        const first = getRandomItem(genderPool);
        const last = getRandomItem(names[style].last);
        return `${first} ${last}`;
    }
    if (style === "goblin") {
        return getRandomItem(names.goblin.prefix) + getRandomItem(names.goblin.suffix);
    }
    // fantasy syllable default
    const first = getRandomItem(names.fantasy.start);
    const core = getRandomItem(names.fantasy.core);
    const last = getRandomItem(names.fantasy.end);
    let middle = core;
    if (middle && first.endsWith(middle[0])) middle = middle.substring(1);
    if (middle && middle.endsWith(last[0])) middle = middle.slice(0, -1);
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
        <button class="gc-seed npc-seed-quest">→ Quest</button>
        <button class="gc-pin npc-pin" title="Pin to Session Board">📌</button>
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


    div.querySelector(".npc-seed-quest").addEventListener("click", () => {
        document.dispatchEvent(new CustomEvent("worldgen:seed-quest", { detail: { giver: npc.name } }));
    });

    const pinBtn = div.querySelector(".npc-pin");
    pinBtn.addEventListener("click", () => {
        document.dispatchEvent(new CustomEvent("worldgen:pin", { detail: {
            type: "npc",
            data: {
                name: npc.name,
                speciesName: npc.speciesName,
                features: npc.features,
                affinity: npc.affinity,
                religion: npc.religion,
                item: npc.item,
                motivation: npc.motivation,
            },
        }}));
        pinBtn.textContent = "✓";
        pinBtn.disabled = true;
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
        const count = parseInt(document.getElementById("batch-npc")?.value || "1", 10);
        for (let i = 0; i < count; i++) {
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
                motivation: npc.motivation,
            });
        }
        localStorage.setItem("check20-npc-cards", JSON.stringify(savedNpcs));
    });

    document.getElementById("clear-npcs").addEventListener("click", () => {
        localStorage.removeItem("check20-npc-cards");
        savedNpcs = [];
        outputEl.innerHTML = "";
    });
});
