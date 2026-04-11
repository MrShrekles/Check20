// ===== Monster Book =====
let bookData = [];
let bookFiltered = [];
const STORAGE_KEY = "monsterbook_custom";

const bookRand = arr => arr[Math.floor(Math.random() * arr.length)];

function getCustomEntries() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
    catch { return []; }
}

function saveCustomEntries(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

async function loadMonsterBook() {
    try {
        const res = await fetch("data/monsterbook.json");
        const jsonData = await res.json();
        const custom = getCustomEntries().map(m => ({ ...m, _custom: true }));
        bookData = [...jsonData, ...custom];
        bookFiltered = [...bookData];
        renderBook();
    } catch (e) {
        console.error("Failed to load monsterbook.json:", e);
        document.getElementById("bookOutput").innerHTML = "<p>Failed to load monster book.</p>";
    }
}

function filterBook() {
    const q = document.getElementById("bookSearch").value.toLowerCase();
    bookFiltered = q
        ? bookData.filter(m => JSON.stringify(m).toLowerCase().includes(q))
        : [...bookData];
    renderBook();
}

function renderBook() {
    const out = document.getElementById("bookOutput");
    if (!bookFiltered.length) {
        out.innerHTML = `<p style="opacity:0.5">No monsters found.</p>`;
        return;
    }
    out.innerHTML = "";
    bookFiltered.forEach(m => out.append(createBookCard(m)));
}

function createBookCard(m) {
    const card = document.createElement("div");
    card.className = "monster-card";

    const moveParts = [];
    if (m.walk)  moveParts.push(`Walk ${m.walk} ft`);
    if (m.fly)   moveParts.push(`Fly ${m.fly} ft`);
    if (m.swim)  moveParts.push(`Swim ${m.swim} ft`);
    if (m.climb) moveParts.push(`Climb ${m.climb} ft`);
    const moveText = moveParts.join(" • ") || "—";

    const tags = [m.size, m.rarity, m.environment].filter(Boolean)
        .map(t => `<span class="tag">${t}</span>`).join(" ");

    const safeName = m.name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const deleteBtn = m._custom
        ? `<div style="margin-top:8px"><button class="btn-remove" onclick="deleteCustomMonster('${safeName}')">Delete</button></div>`
        : "";

    card.innerHTML = `
        <h3 class="title">${m.name}${m._custom ? ` <span style="font-size:0.65em;opacity:0.45;font-weight:normal">[custom]</span>` : ""}</h3>
        ${m._group ? `<div class="pillline">${m._group}${m.origin ? ` · ${m.origin}` : ""}</div>` : ""}
        ${tags ? `<div style="margin:4px 0">${tags}</div>` : ""}
        ${m.description ? `<p class="mon-meta">${m.description}</p>` : ""}
        <div class="info-mon">
            <span><strong>Move:</strong> ${moveText}</span>
            ${m.behavior   ? `<span><strong>Behav:</strong> ${m.behavior}</span>`   : ""}
            ${m.motivation ? `<span><strong>Motiv:</strong> ${m.motivation}</span>` : ""}
        </div>
        ${m.feature_name ? `
        <div class="feature-block">
            <ul class="features">
                <li><strong>${m.feature_name}</strong>${m.feature_type ? ` (${m.feature_type}${m.feature_range ? ` · ${m.feature_range}` : ""})` : ""}: ${m.feature_effect || ""}</li>
            </ul>
        </div>` : ""}
        ${m.lore ? `<p style="font-style:italic;opacity:0.7;margin-top:8px;font-size:0.9em">${m.lore}</p>` : ""}
        ${deleteBtn}
    `;

    return card;
}

function submitNewMonster() {
    const get    = id => document.getElementById(id)?.value.trim() || "";
    const getNum = id => parseInt(document.getElementById(id)?.value) || 0;

    const name = get("new-name");
    if (!name) { alert("Name is required."); return; }

    const entry = {
        name,
        _group:           get("new-group"),
        origin:           get("new-origin"),
        size:             get("new-size"),
        rarity:           get("new-rarity"),
        environment:      get("new-environment"),
        behavior:         get("new-behavior"),
        description:      get("new-description"),
        lore:             get("new-lore"),
        walk:             getNum("new-walk"),
        fly:              getNum("new-fly"),
        swim:             getNum("new-swim"),
        climb:            getNum("new-climb"),
        feature_name:     get("new-feat-name"),
        feature_type:     get("new-feat-type"),
        feature_range:    get("new-feat-range"),
        feature_effect:   get("new-feat-effect"),
        feature_duration: get("new-feat-duration"),
        feature_damage:   get("new-feat-damage"),
        motivation:       get("new-motivation"),
    };

    // Remove empty/zero fields to keep it clean
    Object.keys(entry).forEach(k => {
        if (entry[k] === "" || entry[k] === 0) delete entry[k];
    });

    const custom = getCustomEntries();
    custom.push(entry);
    saveCustomEntries(custom);

    bookData.push({ ...entry, _custom: true });
    bookFiltered = [...bookData];
    renderBook();

    document.getElementById("new-monster-form").reset();
    document.getElementById("new-monster-details").open = false;

    // Scroll new card into view
    requestAnimationFrame(() => {
        document.getElementById("bookOutput").lastElementChild?.scrollIntoView({ behavior: "smooth" });
    });
}

function deleteCustomMonster(name) {
    if (!confirm(`Delete "${name}"?`)) return;
    const custom = getCustomEntries().filter(m => m.name !== name);
    saveCustomEntries(custom);
    loadMonsterBook();
}

function exportMonsterBook() {
    const custom = getCustomEntries();
    if (!custom.length) { alert("No custom entries to export."); return; }
    const blob = new Blob([JSON.stringify(custom, null, 4)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "monsterbook_custom.json";
    a.click();
    URL.revokeObjectURL(a.href);
}

// Tab switching
function showTab(tab) {
    document.getElementById("tab-generator").hidden = tab !== "generator";
    document.getElementById("tab-monsterbook").hidden = tab !== "monsterbook";
    document.querySelectorAll("#monster-tabs .tab-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === tab);
    });
    if (tab === "monsterbook" && !bookData.length) loadMonsterBook();
}
