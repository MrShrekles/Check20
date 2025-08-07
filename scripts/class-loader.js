document.addEventListener("DOMContentLoaded", async () => {
  const [baseClasses, classOptions] = await fetchClassData();
  if (!Object.keys(classOptions).length) return;

  const tabContainer = document.getElementById("class-tabs");
  const contentContainer = document.getElementById("class-content");

  Object.keys(classOptions).forEach((classType, index) => {
    const tab = document.createElement("button");
    tab.className = "tab";
    tab.textContent = classType;
    if (index === 0) tab.classList.add("active");

    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const baseClass = baseClasses.find(c => c.name.toLowerCase() === classType.toLowerCase()) || { name: classType };
      const entries = classOptions[classType] || [];

      contentContainer.innerHTML = `
        ${renderBaseClassInfo(baseClass)}
        ${renderPathTalentUI(entries)}
      `;

      setupDropdownHandlers(entries);
    });

    tabContainer.appendChild(tab);
  });

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

function renderPathTalentUI(entries = []) {
  const paths = entries.filter(e => e.path?.steps?.length);
  const talents = entries.filter(e => e.talent?.steps?.length);

return `
  <section class="path-talent-section">
    <div class="two-column">
      <div class="column">
        <h1>Path</h1>
        <label>Select a Path:
          <select class="path-dropdown">
            <option disabled selected>Select...</option>
            ${paths.map(p => `<option value="${p.name}">${p.name}</option>`).join("")}
          </select>
        </label>
        <div class="path-info"></div>
      </div>

      <div class="column">
        <h1>Talent</h1>
        <label>Select a Talent:
          <select class="talent-dropdown">
            <option disabled selected>Select...</option>
            ${talents.map(t => `<option value="${t.name}">${t.name}</option>`).join("")}
          </select>
        </label>
        <div class="talent-info"></div>
      </div>
    </div>
  </section>
`;

}

function setupDropdownHandlers(entries) {
  const pathSelect = document.querySelector(".path-dropdown");
  const talentSelect = document.querySelector(".talent-dropdown");
  const pathInfo = document.querySelector(".path-info");
  const talentInfo = document.querySelector(".talent-info");

  pathSelect?.addEventListener("change", () => {
    const chosen = entries.find(e => e.name === pathSelect.value && e.path?.steps?.length);
    pathInfo.innerHTML = chosen ? renderPathTalentDetails(chosen, true) : "<p>No path found.</p>";
  });

  talentSelect?.addEventListener("change", () => {
    const chosen = entries.find(e => e.name === talentSelect.value && e.talent?.steps?.length);
    talentInfo.innerHTML = chosen ? renderPathTalentDetails(chosen, false) : "<p>No talent found.</p>";
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
        <span class="origin-tag ${entry.origin?.toLowerCase() || "none"}">${entry.origin || "None"}</span>
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
