// ===== Constants ===== //
const monsterMotivations = [
  "Bloodlust", "Hunting prey", "Defending territory", "Seeking revenge", "Eliminating a perceived threat",
  "Fighting for dominance", "Following orders to kill", "Destroying intruders", "Rampaging due to pain or madness",
  "Marking territory with violence", "Scavenging for food", "Protecting young", "Guarding a nest or lair",
  "Defending a wounded ally", "Hiding from a larger predator", "Storing food or resources", "Avoiding danger",
  "Moving to a safer area", "Seeking a cure for an ailment", "Following a leader's command", "Seeking companionship",
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

const STORAGE_KEY = "check20-monster-cards";
const randomItem = arr => arr[Math.floor(Math.random() * arr.length)];
const toTitleCase = str => str.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
const toNum = v => parseFloat(v) || 0;

let monsterData = { base: [], add: [] };
let savedMonsters = [];

// ===== Data Loading ===== //
async function loadMonsterData() {
  const res = await fetch("data/monstertype.json");
  monsterData = await res.json();
  populateDropdowns();
}

function populateDropdowns() {
  populateSelect("selBase", monsterData.base, "baseType");
  populateSelect("selAdd", monsterData.add, "addType");
  populateFilter("filterSize",        monsterData.base, "size");
  populateFilter("filterRarity",      monsterData.base, "rarity");
  populateFilter("filterBehavior",    monsterData.base, "behavior");
  populateFilter("filterEnvironment", monsterData.base, "environment");
}

function populateSelect(id, arr, typeKey) {
  const sel = document.getElementById(id);
  if (!sel) return;
  const types = [...new Set(arr.map(e => e[typeKey]))].filter(Boolean).sort();
  sel.innerHTML = types.map(t => `<option value="${t}">${toTitleCase(t)}</option>`).join("");
}

function populateFilter(id, arr, key) {
  const sel = document.getElementById(id);
  if (!sel) return;
  const vals = [...new Set(arr.map(e => e[key]))].filter(Boolean).sort();
  sel.innerHTML = `<option value="">Any</option>` +
    vals.map(v => `<option value="${v}">${v}</option>`).join("");
}

// ===== Generation ===== //
function applyFilters(arr) {
  const size    = document.getElementById("filterSize").value;
  const rarity  = document.getElementById("filterRarity").value;
  const behav   = document.getElementById("filterBehavior").value;
  const env     = document.getElementById("filterEnvironment").value;
  const filtered = arr.filter(e =>
    (!size   || e.size        === size)   &&
    (!rarity || e.rarity      === rarity) &&
    (!behav  || e.behavior    === behav)  &&
    (!env    || e.environment === env)
  );
  return filtered.length ? filtered : arr; // fall back to full pool if filters exclude everything
}

function pickEntry(arr, typeKey, randomCheckId, selectId, applyFiltersFn) {
  const pool = applyFiltersFn ? applyFiltersFn(arr) : arr;
  if (document.getElementById(randomCheckId).checked) return randomItem(pool);
  const type = document.getElementById(selectId).value;
  const typed = pool.filter(e => e[typeKey] === type);
  return typed.length ? randomItem(typed) : randomItem(pool);
}

function resolveFly(flyVal, walkSpeed) {
  if (!flyVal || flyVal === "None") return null;
  if (flyVal === "Equal to movement speed") return { speed: walkSpeed, label: null };
  if (flyVal === "Half movement speed")     return { speed: Math.floor(walkSpeed / 2), label: null };
  return { speed: null, label: flyVal }; // "Hover", "Glide"
}

function combinedMovement(base, add) {
  const walk = 30 + toNum(base.movement) + toNum(add.movementAdd);

  // Fly: base takes precedence; add can grant fly if base has none
  let fly = resolveFly(base.fly, walk);
  if (!fly && add.flyAdd === "Equal to movement speed") fly = { speed: walk, label: null };

  return {
    walk,
    fly,
    swim:  toNum(base.swim)  + toNum(add.swimAdd),
    climb: toNum(base.climb) + toNum(add.climbAdd)
  };
}

function generateMonster() {
  const base = pickEntry(monsterData.base, "baseType", "chkRandomBase", "selBase", applyFilters);
  const add  = pickEntry(monsterData.add,  "addType",  "chkRandomAdd",  "selAdd",  null);
  const concatName = document.getElementById("chkConcatName").checked;

  return {
    id:          crypto.randomUUID?.() ?? Date.now().toString(36),
    name:        concatName ? `${add.name} ${base.name}` : base.name,
    baseType:    base.baseType,
    addType:     add.addType,
    description: base.description,
    addDesc:     add.description,
    features: [
      { name: base.featureName, action: base.featureAction, effect: base.featureEffect },
      { name: add.featureName,  action: add.featureAction,  effect: add.featureEffect  }
    ].filter(f => f.name),
    movement:    combinedMovement(base, add),
    motivation:  randomItem(monsterMotivations),
    size:        base.size        || "",
    rarity:      base.rarity      || "",
    environment: base.environment || ""
  };
}

// ===== Card Rendering ===== //
function movementText(mv) {
  const parts = [];
  if (mv.walk)  parts.push(`Walk ${mv.walk} ft`);
  if (mv.fly?.label)  parts.push(mv.fly.label);
  else if (mv.fly?.speed) parts.push(`Fly ${mv.fly.speed} ft`);
  if (mv.swim)  parts.push(`Swim ${mv.swim} ft`);
  if (mv.climb) parts.push(`Climb ${mv.climb} ft`);
  return parts.join(" • ") || "—";
}

function createMonsterCard(m) {
  const div = document.createElement("div");
  div.className = "monster-card";
  div.dataset.id = m.id;

  const meta = [m.baseType, m.addType].filter(Boolean).map(toTitleCase).join(" + ");
  const tags = [m.size, m.rarity, m.environment].filter(Boolean)
    .map(t => `<span class="tag">${t}</span>`).join(" ");

  const featuresHtml = m.features.map(f =>
    `<li contenteditable="true"><strong>${f.name}</strong>${f.action ? ` (${f.action})` : ""}: ${f.effect}</li>`
  ).join("");

  div.innerHTML = `
    <h1 contenteditable="true">${m.name}</h1>
    <p><strong>${meta}</strong>${tags ? " &nbsp;" + tags : ""}</p>
    <p>${m.description}${m.addDesc ? " " + m.addDesc : ""}</p>
    <p><strong>Movement:</strong> ${movementText(m.movement)}</p>
    <p><strong>Motivation:</strong> ${m.motivation}</p>
    <hr>
    <ul>${featuresHtml}</ul>
  `;

  const row = document.createElement("div");
  row.className = "button-row";

  const copyBtn = document.createElement("button");
  copyBtn.className = "copy-npc";
  copyBtn.textContent = "Copy";
  copyBtn.addEventListener("click", () => {
    row.style.display = "none";
    const text = div.innerText.trim();
    row.style.display = "";
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.textContent = "Copied!";
      setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
    });
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-monster";
  deleteBtn.textContent = "Remove";
  deleteBtn.addEventListener("click", () => {
    div.remove();
    savedMonsters = savedMonsters.filter(s => s.id !== m.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedMonsters));
  });

  row.append(copyBtn, deleteBtn);
  div.append(row);
  return div;
}

// ===== Initialization ===== //
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadMonsterData();
  } catch (e) {
    console.error("Failed to load monster data:", e);
  }

  savedMonsters = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  const outputEl = document.getElementById("monsterOutput");

  // Sync select enabled/disabled state with checkboxes
  ["Base", "Add"].forEach(type => {
    const chk = document.getElementById(`chkRandom${type}`);
    const sel = document.getElementById(`sel${type}`);
    if (!chk || !sel) return;
    sel.disabled = chk.checked;
    chk.addEventListener("change", () => { sel.disabled = chk.checked; });
  });

  // Render saved cards
  savedMonsters.forEach(m => outputEl.prepend(createMonsterCard(m)));

  document.getElementById("btnGenerate").addEventListener("click", () => {
    const m = generateMonster();
    savedMonsters.unshift(m);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedMonsters));
    outputEl.prepend(createMonsterCard(m));
  });

  document.getElementById("btnClearAll").addEventListener("click", () => {
    savedMonsters = [];
    localStorage.removeItem(STORAGE_KEY);
    outputEl.innerHTML = "";
  });
});
