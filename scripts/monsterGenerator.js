// ===== Constants ===== //
const BASE_MOVEMENT = { walk: 30, burrow: 0, fly: 0 };
const monsterMotivations = [
  "Bloodlust", "Hunting prey", "Defending territory", "Seeking revenge", "Eliminating a perceived threat",
  "Fighting for dominance", "Following orders to kill", "Destroying intruders", "Rampaging due to pain or madness",
  "Marking territory with violence", "Scavenging for food", "Protecting young", "Guarding a nest or lair",
  "Defending a wounded ally", "Hiding from a larger predator", "Storing food or resources", "Avoiding danger",
  "Moving to a safer area", "Seeking a cure for an ailment", "Following a leader’s command", "Seeking companionship",
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

const actionTypes = ["Action", "Half-Action", "Off-Action"];
const ranges = ["Melee", "Reach", "Short", "Medium", "Long"];
const damageTypes = ["Physical", "Elemental", "Acid", "Eclipse", "Fire", "Ice", "Lighting", "Solar", "Thunder", "Toxic", "Fluid", "Realm"];
const values = ["1d6", "1d8", "2d4", "1d4!", "3"];
const conditions = ["Bleeding", "Broken", "Concussion", "Coughing", "Dislocation", "Slowed", "Pinned", "Prone", "", "Blind", "Charmed", "Confused", "Deaf", "Fear", "Intangible", "Invisible", "Unconscious", "Stunned", "Exhaustion", "Constrained", "Exposed"];
const checks = ["Agility", "Crafting", "Influence", "Intellect", "Luck", "Observation", "Spirit", "Stealth", "Strength", "Survival"];
const durations = ["Until the end of their next turn", "1 Minute"];

let monsterData = {};
let savedMonsters = JSON.parse(localStorage.getItem("check20-monster-cards") || "[]");

// ===== Utility Functions ===== //
const randomItem = arr => arr[Math.floor(Math.random() * arr.length)];

const combineMovement = (modifiers) =>
  modifiers.reduce((acc, mod) => {
    Object.entries(mod).forEach(([mode, value]) => {
      acc[mode] = (acc[mode] || 0) + value;
    });
    return acc;
  }, { ...BASE_MOVEMENT });

const formatFeature = (feature) => {
  return {
    name: feature.name,
    action: randomItem(actionTypes),
    effect: feature.effect
      .replace("{range}", randomItem(ranges))
      .replace("{value}", randomItem(values))
      .replace("{action}", randomItem(actionTypes))
      .replace("{condition}", randomItem(conditions))
      .replace("{damage}", randomItem(damageTypes))
      .replace("{check}", randomItem(checks))
      .replace("{duration}", randomItem(durations))
  };
};

const toTitleCase = str =>
  str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

// ===== Core Monster Class ===== //
class Monster {
  constructor() {
    if (!monsterData.base || !monsterData.additional || !monsterData.mod) {
      console.error("Monster data not loaded yet.");
      return;
    }

    this.baseKey = document.getElementById("randomize-base").checked
      ? randomItem(Object.keys(monsterData.base))
      : document.getElementById("base-type").value;

    this.addKey = document.getElementById("randomize-additional").checked
      ? randomItem(Object.keys(monsterData.additional))
      : document.getElementById("additional-type").value;

    this.modKey = document.getElementById("randomize-mod").checked
      ? randomItem(Object.keys(monsterData.mod))
      : document.getElementById("mod-type").value;

    this.base = monsterData.base[this.baseKey];
    this.additional = monsterData.additional[this.addKey];
    this.mod = monsterData.mod[this.modKey];

    this.subtypeChain = [];
    this.mergedBaseFeatures = [...(this.base.features || [])];
    this.mergedBaseDescription = this.base.description;

    let current = this.base;
    while (current.subtypes) {
      const subtype = randomItem(Object.keys(current.subtypes));
      this.subtypeChain.push(subtype);
      const subData = current.subtypes[subtype];
      this.mergedBaseDescription += " " + subData.description;
      if (subData.features) this.mergedBaseFeatures.push(...subData.features);
      current = subData;
    }

    this.motivation = randomItem(monsterMotivations);
    this.name = `${randomItem(this.mod.names)} ${randomItem(this.base.names)} ${randomItem(this.additional.names)}`;
    this.features = [
      randomItem(this.mergedBaseFeatures),
      randomItem(this.additional.features),
      randomItem(this.mod.features)
    ].filter(Boolean).map(formatFeature);

    const movementMods = [this.base, this.additional, this.mod]
      .map(m => m.movementModifier)
      .filter(Boolean);
    this.movement = combineMovement(movementMods);
  }
}

// ===== UI & DOM Functions ===== //
const createMonsterCard = (monster) => {
  const div = document.createElement("div");
  div.className = "monster-card";

  const subtypeText = monster.subtypeChain?.length
    ? ` (${monster.subtypeChain.map(toTitleCase).join(" > ")})`
    : "";

  div.innerHTML = `
    <h1 contenteditable="true">${monster.name}</h1>
    <b>${toTitleCase(monster.baseKey)}${subtypeText} - ${toTitleCase(monster.addKey)} - ${toTitleCase(monster.modKey)}</b>
    <p>${monster.mergedBaseDescription} ${monster.additionalDesc || monster.additional.description} ${monster.modDesc || monster.mod.description}</p>
    <p><strong>Movement Speed:</strong> Walk: ${monster.movement.walk} ft${monster.movement.burrow ? `, Burrow: ${monster.movement.burrow} ft` : ""}${monster.movement.fly ? `, Fly: ${monster.movement.fly} ft` : ""}</p>
    <p><strong>Motivation:</strong> ${monster.motivation}</p>
    <hr>
    <ul>
      ${monster.features.map(f => `<li contenteditable="true"><strong>${f.name}</strong> (${f.action}): ${f.effect}</li>`).join("")}
    </ul>
  `;

  const buttonRow = document.createElement("div");
  buttonRow.className = "button-row";

  const copyBtn = document.createElement("button");
  copyBtn.className = "copy-npc";
  copyBtn.textContent = "Copy";

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-monster";
  deleteBtn.textContent = "Remove";

  copyBtn.addEventListener("click", () => {
    copyBtn.style.display = "none";
    deleteBtn.style.display = "none";
    const text = div.innerText.trim();
    copyBtn.style.display = "";
    deleteBtn.style.display = "";
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.textContent = "Copied!";
      setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
    });
  });

  deleteBtn.addEventListener("click", () => {
    div.remove();
    savedMonsters = savedMonsters.filter(m =>
      m.name !== monster.name || m.motivation !== monster.motivation
    );
    localStorage.setItem("check20-monster-cards", JSON.stringify(savedMonsters));
  });

  buttonRow.append(copyBtn, deleteBtn);
  div.append(buttonRow);
  return div;
};

const populateDropdowns = () => {
  ["base", "additional", "mod"].forEach(type => {
    const select = document.getElementById(`${type}-type`);
    if (!select) return;

    select.innerHTML = "";
    Object.keys(monsterData[type]).sort().forEach(key => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = toTitleCase(key);
      select.appendChild(option);
    });
  });
};

// ===== Initialization ===== //
document.addEventListener("DOMContentLoaded", () => {
  fetch("data/monster.json")
    .then(res => res.json())
    .then(data => {
      monsterData = data;
      populateDropdowns();
    })
    .catch(err => console.error("Error loading monster data:", err));

  const retryInterval = setInterval(() => {
    if (monsterData?.base && monsterData?.additional && monsterData?.mod) {
      populateDropdowns();
      clearInterval(retryInterval);
    }
  }, 100);

  const outputEl = document.getElementById("monster-output");

  // Render stored monsters
  savedMonsters.forEach(m => {
    const card = createMonsterCard(m);
    outputEl.prepend(card);
  });

  document.getElementById("generate-monster").addEventListener("click", () => {
    const monster = new Monster();
    if (!monster) return;

    const card = createMonsterCard(monster);
    outputEl.prepend(card);

    savedMonsters.push({
      name: monster.name,
      motivation: monster.motivation,
      movement: monster.movement,
      baseKey: monster.baseKey,
      addKey: monster.addKey,
      modKey: monster.modKey,
      mergedBaseDescription: monster.mergedBaseDescription,
      additionalDesc: monster.additional.description,
      modDesc: monster.mod.description,
      features: monster.features,
      subtypeChain: monster.subtypeChain
    });

    localStorage.setItem("check20-monster-cards", JSON.stringify(savedMonsters));
  });

  document.getElementById("clear-monsters").addEventListener("click", () => {
    localStorage.removeItem("check20-monster-cards");
    savedMonsters = [];
    outputEl.innerHTML = "";
  });
});
