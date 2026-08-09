document.addEventListener("DOMContentLoaded", async () => {
  const [baseClasses, classOptions] = await fetchClassData();
  if (!Object.keys(classOptions).length) return;

  const tabContainer = document.getElementById("class-tabs");
  const contentContainer = document.getElementById("class-content");

  Object.keys(classOptions).filter(key => key !== "specializations").forEach((classType, index) => {
    const tab = document.createElement("button");
    tab.className = "tab";
    tab.textContent = classType;
    if (index === 0) tab.classList.add("active");

    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const baseClass = baseClasses.find(c => c.name.toLowerCase() === classType.toLowerCase()) || { name: classType };
      const entries = classOptions[classType] || [];
      let classContent = renderBaseClassInfo(baseClass);
      classContent += renderPathTalentUI(entries);
      contentContainer.innerHTML = classContent;

      setupDropdownHandlers(entries);

    });

    tabContainer.appendChild(tab);
  });

  // After appending all tabs
  tabContainer.querySelector(".tab")?.click();
});

async function fetchClassData() {
  try {
    const [baseRes, optRes] = await Promise.all([
      fetch("data/classes.json"),
      fetch("data/class-new.json")
    ]);
    const base = await baseRes.json();
    const opt = await optRes.json();

    return [base.classes || [], opt.classes || {}];
  } catch (err) {
    console.error("Error loading class data:", err);
    return [[], {}];
  }
}

function renderBaseClassInfo(cls) {
  return `
    <section class="class-info">
      <h2>${cls.name}</h2>
      <p>${cls.description || "No description available."}</p>

      ${cls.features?.length ? `
        <div class="features">
          <h3>Features</h3>
          <ul>
            ${cls.features.map(f => `
              <li><strong>${f.name}</strong>: ${Array.isArray(f.description) ? f.description.join(" ") : f.description}</li>
            `).join("")}
          </ul>
        </div>
      ` : ""}

      ${cls.equipment?.length ? `
        <div class="features">
          <h3>Starting Equipment</h3>
          <ul>
            ${cls.equipment.map(eq => `
              <li>
                <strong>${eq.name}</strong>: ${eq.description || ""}
                ${eq.choices ? `
                  <ul>
                    ${eq.choices.map(choice => `
                      <li><strong>${choice.name}</strong>: ${choice.description}</li>
                    `).join("")}
                  </ul>
                ` : ""}
              </li>
            `).join("")}
          </ul>
        </div>
      ` : ""}
    </section>
  `;
}

/* ─── Origin option grid ─────────────────────────────────────────────────────
   Each class has exactly one path and one talent per origin (12 of each), so a
   dropdown hid twelve items behind a click and a scrollbar for no gain. These
   are laid out as an always-visible grid of origin-coloured buttons instead:
   every option and its origin is readable at a glance, and both columns are
   sorted by origin so the Path and Talent of the same origin line up.
   Colours come from originColor() in scripts/origin-colors.js.
   ───────────────────────────────────────────────────────────────────────── */

function byOrigin(a, b) {
  return (a.origin || "none").localeCompare(b.origin || "none");
}

function renderOriginGrid(kind, entries) {
  const items = entries.slice().sort(byOrigin).map(e => {
    const o = e.origin || "none";
    return `
      <button type="button" class="origin-opt" data-name="${e.name}" data-origin="${o}"
              style="--pill-accent:${originColor(o)}">
        <span class="origin-opt-name">${e.name}</span>
        <span class="origin-opt-origin">${o}</span>
      </button>`;
  }).join("");

  return `<div class="origin-grid" data-kind="${kind}">${items}</div>`;
}

function renderPathTalentUI(entries = []) {
  const paths = entries.filter(e => e.path?.steps?.length);
  const talents = entries.filter(e => e.talent?.steps?.length);

  return `
  <section class="path-talent-section">
    <div class="two-column">
      <div class="column">
        <h1>Path</h1>
        <p class="picker-hint">Linear progression &mdash; steps unlock in order. ${paths.length} to choose from, one per origin.</p>
        ${renderOriginGrid("path", paths)}
        <div class="path-info"></div>
      </div>

      <div class="column">
        <h1>Talent</h1>
        <p class="picker-hint">Steps may be taken in any order, +1 per talent chosen. ${talents.length} to choose from, one per origin.</p>
        ${renderOriginGrid("talent", talents)}
        <div class="talent-info"></div>
      </div>
    </div>
  </section>
`;

}

function setupDropdownHandlers(entries) {
  wireOriginGrid("path", entries, true, document.querySelector(".path-info"));
  wireOriginGrid("talent", entries, false, document.querySelector(".talent-info"));
}

function wireOriginGrid(kind, entries, isPath, infoEl) {
  const grid = document.querySelector(`.origin-grid[data-kind="${kind}"]`);
  if (!grid || !infoEl) return;

  const opts = [...grid.querySelectorAll(".origin-opt")];

  opts.forEach(opt => {
    opt.addEventListener("click", () => {
      // Clicking the active option again clears the selection.
      if (opt.classList.contains("selected")) {
        opt.classList.remove("selected");
        infoEl.innerHTML = "";
        return;
      }

      opts.forEach(o => o.classList.toggle("selected", o === opt));

      const chosen = entries.find(e =>
        e.name === opt.dataset.name && (isPath ? e.path?.steps?.length : e.talent?.steps?.length)
      );

      infoEl.innerHTML = chosen
        ? renderPathTalentDetails(chosen, isPath)
        : `<p>No ${isPath ? "path" : "talent"} found.</p>`;
    });
  });
}

function renderPathTalentDetails(entry, isPath = true) {
  const data = isPath ? entry.path : entry.talent;
  const initialSteps = data?.steps?.filter(s => Number(s.step) === 0) || [];
  const rest = data?.steps?.filter(s => Number(s.step) !== 0);

  return `
    <div class="feature-block">
      <div class="feature-header">
        <h1>${entry.name}</h1>
        <span class="origin-tag ${originClass(entry.origin)}">${entry.origin || "None"}</span>
      </div>
      <div class="feature-meta">
        <span><strong>Type</strong> ${isPath ? "Path" : "Talent"}</span>
        <span><strong>Origin</strong> ${entry.origin || "None"}</span>
        <span><strong>Steps</strong> ${rest?.length || 0}</span>
        <span><strong>Order</strong> ${isPath ? "Sequential" : "Any order"}</span>
      </div>
      <p>${entry.desc || "No description available."}</p>

${initialSteps.length ? `
  <div class="features">
    <h3>Initial Feature</h3>
    <ul class="step-list">
      ${initialSteps.map(renderStep).join("")}
    </ul>
  </div>
` : ""}
      ${rest?.length ? renderStepList(rest, isPath) : ""}
    </div>
  `;
}


function renderFeature(label, step) {
  return `
    <div class="features">
      <h3>${label}</h3>
      <div class="initial-feature">
        <strong>${step.name}</strong>
        ${renderInlineTags(step)}
        <p>${step.description}</p>
      </div>
    </div>
  `;
}

function renderStepList(steps = [], isPath = false) {
  const Tag = isPath ? "ol" : "ul";
  return `
    <div class="features">
      <h3>Progression</h3>
      <${Tag} class="step-list">
        ${steps.map(renderStep).join("")}
      </${Tag}>
    </div>
  `;
}

function renderStep(step) {
  return `
    <li>
      <strong>${step.name}</strong>
      ${renderInlineTags(step)}
      <p>${step.description}</p>
    </li>
  `;
}

function renderInlineTags(step) {
  const tags = [];
  if (step.action) tags.push(`<span class="tag tag-action">${step.action}</span>`);
  if (step.check) tags.push(`<span class="tag tag-check">Check: ${step.check}</span>`);
  if (step.range) tags.push(`<span class="tag tag-range">Range: ${step.range}</span>`);
  if (step.duration) tags.push(`<span class="tag tag-duration">Duration: ${step.duration}</span>`);
  if (step.damage) tags.push(`<span class="tag tag-damage">Damage: ${step.damage}${step.damageType ? ` (${step.damageType})` : ""}</span>`);
  if (step.armor) tags.push(`<span class="tag tag-armor">Armor: ${step.armor}</span>`);
  if (step.condition) tags.push(`<span class="tag tag-condition">Condition: ${step.condition}</span>`);
  return tags.join(" ");
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
