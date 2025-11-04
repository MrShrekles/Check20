// -------------------------------
// Medicine Generator (simple)
// -------------------------------
const POTENCY_MODE = "random"; // "random" | "fixed"
const FIXED_POTENCY = 4;       // used when POTENCY_MODE === "fixed"
const EFFECT_COUNT = 1;       // always 1 effect (set to 2 if you want doubles)
const PRICE_ROUND_TO = 10;     // round prices to nearest 10

let DATA = null;

// load data once
fetch("data/medicine.json").then(r => r.json()).then(j => { DATA = j; });

// utils
const rand = (n) => Math.floor(Math.random() * n);
const random = (arr) => arr[rand(arr.length)];

function genMedicineName() {
    const { prefix, base, suffix } = DATA;
    return [random(prefix), random(base), random(suffix)].filter(Boolean).join(" ");
}

function genMedicineDesc() {
    const t = random(DATA.desc_templates);
    const map = {
        "{flavor}": random(DATA.flavor),
        "{maker}": random(DATA.maker),
        "{place}": random(DATA.place),
        "{symbol}": random(DATA.symbol),
        "{folk}": random(DATA.folk)
    };
    return Object.entries(map).reduce((s, [k, v]) => s.replace(k, v), t);
}

function genPotency() {
    return POTENCY_MODE === "fixed"
        ? Math.max(1, Math.min(10, FIXED_POTENCY))
        : 1 + rand(10); // 1–10
}

// potency math tokens
function effectNumbers(p) {
    return { P: p, HALF: Math.floor(p / 2), CEILHALF: Math.ceil(p / 2), ARMOR: 2 * p };
}

// naive pluralize
function pluralize(word, n) {
    if (n === 1) return word;
    if (word.endsWith("y") && !/[aeiou]y$/i.test(word)) return word.slice(0, -1) + "ies";
    if (word.endsWith("s")) return word + "es";
    return word + "s";
}

// render tokens: {{P}} and count-macros [[word:KEY]]
function renderTemplate(tpl, p) {
    const nums = effectNumbers(p);
    let out = tpl.replace(/\{\{([A-Z]+)\}\}/g, (_, k) => nums[k] ?? 0);
    out = out.replace(/\[\[([a-zA-Z]+):([A-Z]+|\d+)\]\]/g, (_, w, key) => {
        const n = /^\d+$/.test(key) ? parseInt(key, 10) : (nums[key] ?? 0);
        return `${n} ${pluralize(w, n)}`;
    });
    return out;
}

// pick N unique effects and render
function genEffects(p) {
    const pool = DATA.effects.slice();
    const picked = [];
    for (let i = 0; i < EFFECT_COUNT && pool.length; i++) {
        picked.push(pool.splice(rand(pool.length), 1)[0]);
    }
    return picked.map(e => ({ name: e.name, desc: renderTemplate(e.tmpl, p) }));
}

// price: quadratic curve ~10 @ P=1 → ~260 @ P=10, rounded to PRICE_ROUND_TO
function computePrice(p) {
    const raw = 7.5 + 2.5 * p * p; // tweak 2.5 or 7.5 to reshape curve
    return Math.round(raw / PRICE_ROUND_TO) * PRICE_ROUND_TO;
}

function generateMedicine() {
    if (!DATA) return { name: "Loading...", desc: "", potency: null, effects: [], price: null };
    const potency = genPotency();
    const effects = genEffects(potency);
    return {
        name: genMedicineName(),
        desc: genMedicineDesc(),
        potency,
        effects,
        price: computePrice(potency)
    };
}

// DOM
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("go");
    const out = document.getElementById("out");
    btn.onclick = () => {
        const m = generateMedicine();
        const effLines = m.effects.map(e => `${e.name}: ${e.desc}`).join("\n\n");
        out.textContent =
            `${m.name}
---
${m.desc}
Potency: ${m.potency}
Price: ${m.price}

${effLines}`;
    };
});

// ===== Persistence =====
const STORAGE_KEY = "check20_medicines";

function loadSaved() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
}
function saveAll(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
function addSaved(med) {
    const list = loadSaved();
    list.unshift(med);
    saveAll(list);
}
function removeSaved(id) {
    const list = loadSaved().filter(x => x.id !== id);
    saveAll(list);
}
function clearSaved() {
    saveAll([]);
}

// ===== Card builder (updates storage when removed) =====
function createMedicineCard(m) {
    const div = document.createElement("div");
    div.className = "medicine-card";
    div.dataset.id = m.id;

    const effHtml = m.effects.map(e => `<li contenteditable="true"><strong>${e.name}</strong>: ${e.desc}</li>`).join("");

    div.innerHTML = `
    <h2 contenteditable="true">${m.name}</h2>
    <p>${m.desc}</p>
    <p class="medicine-meta"><strong>Potency:</strong> ${m.potency} &nbsp;•&nbsp; <strong>Price:</strong> ${m.price}</p>
    <ul>${effHtml}</ul>
    <div class="button-row">
      <button class="btn-copy">Copy</button>
      <button class="btn-remove">Remove</button>
    </div>
  `;

    // copy
    div.querySelector(".btn-copy").addEventListener("click", () => {
        const text = `${m.name}\n${m.desc}\nPotency: ${m.potency}\nPrice: ${m.price}\n\n${m.effects.map(e => `${e.name}: ${e.desc}`).join("\n")}`;
        navigator.clipboard.writeText(text).then(() => {
            const btn = div.querySelector(".btn-copy");
            btn.textContent = "Copied!";
            setTimeout(() => (btn.textContent = "Copy"), 1000);
        });
    });

    // remove (DOM + storage)
    div.querySelector(".btn-remove").addEventListener("click", () => {
        removeSaved(m.id);
        div.remove();
    });

    return div;
}

// ===== Render all saved on load =====
function renderAll(container) {
    container.innerHTML = "";
    const list = loadSaved();
    for (const m of list) container.append(createMedicineCard(m));
}

// ===== Single source of truth for DOM wiring =====
document.addEventListener("DOMContentLoaded", () => {
    const genBtn = document.getElementById("go");
    const clearBtn = document.getElementById("clear-medicine");
    const container = document.getElementById("medicine-output");

    // show saved cards on refresh
    renderAll(container);

    // generate + save + render
    genBtn.onclick = () => {
        const m = generateMedicine();
        m.id = crypto?.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2));
        addSaved(m);
        container.prepend(createMedicineCard(m));
    };

    // clear all
    clearBtn.onclick = () => {
        clearSaved();
        container.innerHTML = "";
    };
});
