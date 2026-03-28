document.addEventListener("DOMContentLoaded", () => {
  const sidebarTarget = document.getElementById("sidebar-placeholder");
  if (!sidebarTarget) {
    console.error("Sidebar placeholder not found in DOM.");
    return;
  }

  fetch("components/sidebar.html")
    .then(res => res.text())
    .then(html => {
      sidebarTarget.innerHTML = html;
      initSidebar();
    })
    .catch(err => console.error("Failed to load sidebar:", err));
});

function initSidebar() {
  const sidebar = document.getElementById("sidebar");
  const toggleButton = document.getElementById("toggle-sidebar");

  function setSidebarMode(mode) {
    sidebar.classList.remove("mode-dice", "mode-reference", "mode-lore");
    sidebar.classList.add(`mode-${mode}`);
    sidebar.classList.remove("closed");
    sidebar.classList.add("open");
    document.body.classList.add("sidebar-open");
  }

  function activateRadio(id) {
    const radio = document.getElementById(id);
    if (radio) { radio.checked = true; radio.dispatchEvent(new Event("change")); }
  }

  // Dice toggle: open to dice mode (or close if already open in dice mode)
  toggleButton?.addEventListener("click", () => {
    const isOpen = sidebar.classList.contains("open");
    const isDiceMode = sidebar.classList.contains("mode-dice");
    if (isOpen && isDiceMode) {
      sidebar.classList.remove("open");
      sidebar.classList.add("closed");
      document.body.classList.remove("sidebar-open");
    } else {
      setSidebarMode("dice");
      activateRadio("check-mode");
    }
  });

  document.getElementById("toggle-spellbook")?.addEventListener("click", () => {
    window.location.href = "spellcasting.html#spells";
  });

  // Reference button — open sidebar to the Reference panel
  document.getElementById("toggle-reference")?.addEventListener("click", () => {
    setSidebarMode("reference");
    activateRadio("reference-mode");
  });

  // Lore button — open sidebar to the Lore panel
  document.getElementById("toggle-lore")?.addEventListener("click", () => {
    setSidebarMode("lore");
    activateRadio("lore-mode");
  });

  // Floating search expand/collapse
  document.getElementById("toggle-search")?.addEventListener("click", () => {
    const fs = document.getElementById("floating-search");
    const isExpanding = !fs.classList.contains("expanded");
    fs.classList.toggle("expanded", isExpanding);
    if (isExpanding) {
      document.getElementById("sidebar-search-input")?.focus();
    }
  });

  // Sidebar search
  initSidebarSearch();

  // Dynamically connect all radios to their matching blocks
  const radios = document.querySelectorAll('input[type="radio"][name="roller-mode"]');
  const blocks = document.querySelectorAll('.roller-block');

  radios.forEach(radio => {
    const mode = radio.id.replace("-mode", ""); // e.g. check, standard
    const targetBlock = document.getElementById(`${mode}-block`);

    // On change, show matching block and hide others
    radio.addEventListener("change", () => {
      if (radio.checked) {
        blocks.forEach(block => {
          block.classList.toggle("active", block === targetBlock);
        });
      }
    });

    // Apply correct visibility on initial load
    if (radio.checked) {
      blocks.forEach(block => {
        block.classList.toggle("active", block === targetBlock);
      });
    }
  });

  // Union hover — highlight hovered union green, opposed union red
  const unionItems = document.querySelectorAll(".union-list li");
  const unionMap = {};
  unionItems.forEach(li => {
    const name = li.querySelector(".union-name")?.textContent.trim().toLowerCase();
    if (name) unionMap[name] = li;
  });

  unionItems.forEach(li => {
    li.addEventListener("mouseenter", () => {
      const opposesText = li.querySelector(".union-opposes")?.textContent ?? "";
      const match = opposesText.match(/Opposes:\s*(.+)/i);
      const opposedName = match?.[1]?.trim().toLowerCase();
      const opposedLi = opposedName ? unionMap[opposedName] : null;

      li.classList.add("union-active");
      opposedLi?.classList.add("union-opposed");
    });

    li.addEventListener("mouseleave", () => {
      unionItems.forEach(el => el.classList.remove("union-active", "union-opposed"));
    });
  });

  // Check20 Roller
  document.getElementById("roll-d20-check")?.addEventListener("click", () => {
    const modifier = parseInt(document.getElementById("check-modifier").value, 10);
    const advantage = document.getElementById("check-advantage").value;
    const roll1 = Math.floor(Math.random() * 20) + 1;
    const roll2 = Math.floor(Math.random() * 20) + 1;

    let adjustedRoll1 = roll1;
    let chosenRaw;

    if (advantage === "advantage") {
      adjustedRoll1 += 4;
      chosenRaw = Math.max(adjustedRoll1, roll2);
    } else if (advantage === "disadvantage") {
      adjustedRoll1 -= 4;
      chosenRaw = Math.min(adjustedRoll1, roll2);
    } else {
      chosenRaw = roll1;
    }

    const finalResult = chosenRaw + modifier;
    const successCount = finalResult >= 15 ? Math.floor((finalResult - 15) / 5) + 1 : 0;

    const historyItem = document.createElement("li");
    historyItem.classList.add("styled-roll");
    if (successCount > 0) historyItem.classList.add("roll-success");

    historyItem.innerHTML = `
      <div class="roll-line">
        <span class="roll-label">🎲 Rolled:</span> 
        d20: <span class="roll-val">${highlightRoll(roll1)}</span>
        ${advantage !== "none" ? `→ <span class="roll-val">${adjustedRoll1}</span> / <span class="roll-val">${highlightRoll(roll2)}</span>` : ""}
        <hr>
      </div>
      <div class="choice-line">
        <span class="roll-label"> Chose:</span> <em class="roll-chosen">${chosenRaw}</em>
      </div>
      <div class="mod-line">
        <span class="roll-label"> Modifier:</span> <span class="roll-mod">${modifier >= 0 ? "+" : ""}${modifier}</span>
      </div>
      <div class="total-line">
        <hr>
        <span class="roll-label"> Total:</span> <strong class="roll-total">${finalResult}</strong>
        ${successCount > 0 ? `<span class="success-count">(${successCount} success${successCount > 1 ? "es" : ""})</span>` : ""}
      </div>
      
    `;

    const historyList = document.getElementById("check-history");
    historyList?.prepend(historyItem);
    if (historyList?.children.length > 5) {
      historyList.removeChild(historyList.lastChild);
    }
  });

  // Standard Dice Roller
  document.getElementById("roll-dice")?.addEventListener("click", () => {
    const numDice = parseInt(document.getElementById("number-of-dice").value, 10);
    const dieType = parseInt(document.getElementById("dice-type").value, 10);
    const modifier = parseInt(document.getElementById("modifier").value, 10);
    const advantage = document.getElementById("advantage").value;

    if (isNaN(numDice) || isNaN(dieType)) return;

    const rolls = Array.from({ length: numDice }, () => Math.floor(Math.random() * dieType) + 1);
    let selectedRolls = [...rolls];

    if (advantage === "advantage") {
      selectedRolls = [Math.max(...rolls)];
    } else if (advantage === "disadvantage") {
      selectedRolls = [Math.min(...rolls)];
    }

    const total = selectedRolls.reduce((sum, r) => sum + r, 0) + modifier;

    const historyItem = document.createElement("li");
    historyItem.classList.add("styled-roll");

    historyItem.innerHTML = `
      <div class="roll-line">
        <span class="roll-label">🎲 Rolled:</span> 
        ${numDice}d${dieType}: ${rolls.map(r => `<span class="roll-val">${r}</span>`).join(", ")}
        ${advantage !== "none" ? `→ <em class="roll-chosen">${selectedRolls.join(", ")}</em>` : ""}
        <hr>
      </div>
      <div class="mod-line">
        <span class="roll-label"> Modifier:</span> <span class="roll-mod">${modifier >= 0 ? "+" : ""}${modifier}</span>
      </div>
      <div class="total-line">
        <hr>
        <span class="roll-label"> Total:</span> <strong class="roll-total">${total}</strong>
      </div>
    `;

    const historyList = document.getElementById("roll-history");
    historyList?.prepend(historyItem);
    if (historyList?.children.length > 5) {
      historyList.removeChild(historyList.lastChild);
    }
  });

  // Dice increment/decrement buttons
  document.getElementById("increase-dice")?.addEventListener("click", () => {
    const input = document.getElementById("number-of-dice");
    const val = parseInt(input.value, 10) || 1;
    input.value = val + 1;
  });

  document.getElementById("decrease-dice")?.addEventListener("click", () => {
    const input = document.getElementById("number-of-dice");
    const val = parseInt(input.value, 10) || 1;
    input.value = Math.max(1, val - 1);
  });

  document.getElementById("increase-mod")?.addEventListener("click", () => {
    const input = document.getElementById("modifier");
    const val = parseInt(input.value, 10) || 0;
    input.value = val + 1;
  });

  document.getElementById("decrease-mod")?.addEventListener("click", () => {
    const input = document.getElementById("modifier");
    const val = parseInt(input.value, 10) || 0;
    input.value = val - 1;
  });

  document.getElementById("increase-check-mod")?.addEventListener("click", () => {
    const input = document.getElementById("check-modifier");
    const val = parseInt(input.value, 10) || 0;
    input.value = val + 1;
  });

  document.getElementById("decrease-check-mod")?.addEventListener("click", () => {
    const input = document.getElementById("check-modifier");
    const val = parseInt(input.value, 10) || 0;
    input.value = val - 1;
  });

  // Responsive table labeling
  document.querySelectorAll(".responsive-table").forEach(wrapper => {
    const headers = Array.from(wrapper.querySelectorAll("thead th")).map(th => th.textContent.trim());
    wrapper.querySelectorAll("tbody tr").forEach(row => {
      Array.from(row.children).forEach((td, index) => {
        td.setAttribute("data-label", headers[index] || "");
      });
    });
  });

  console.log("Dice adjustment buttons loaded");
}

function initSidebarSearch() {
  const input = document.getElementById("sidebar-search-input");
  if (!input) return;

  if (typeof renderSpells === "function") {
    // Spell page: feed into renderSpells
    input.addEventListener("input", renderSpells);
  } else {
    // All other pages: highlight text matches
    input.addEventListener("input", () => highlightPageText(input.value.trim()));
  }
}

function highlightPageText(term) {
  // Clear previous highlights
  document.querySelectorAll("mark.sb-highlight").forEach(m => {
    m.parentNode.replaceChild(document.createTextNode(m.textContent), m);
    m.parentNode?.normalize();
  });

  const countEl = document.getElementById("sidebar-search-count");
  if (!term || term.length < 2) {
    if (countEl) countEl.textContent = "";
    return;
  }

  const root = document.querySelector("main") || document.querySelector("#content") || document.body;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "gi");

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const tag = node.parentElement?.tagName;
      if (["SCRIPT", "STYLE", "MARK", "INPUT", "TEXTAREA", "SELECT"].includes(tag)) {
        return NodeFilter.FILTER_REJECT;
      }
      return node.textContent.toLowerCase().includes(term.toLowerCase())
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    }
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  let count = 0;
  nodes.forEach(node => {
    const text = node.textContent;
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      const mark = document.createElement("mark");
      mark.className = "sb-highlight";
      mark.textContent = match[0];
      fragment.appendChild(mark);
      lastIndex = match.index + match[0].length;
      count++;
    }
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    node.parentNode.replaceChild(fragment, node);
  });

  if (countEl) countEl.textContent = count > 0 ? `${count} match${count !== 1 ? "es" : ""}` : "No matches";
  document.querySelector("mark.sb-highlight")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function highlightRoll(value) {
  if (value === 20) return `<span class="roll-max">${value}</span>`;
  if (value === 1) return `<span class="roll-min">${value}</span>`;
  return `<span class="roll-normal">${value}</span>`;
}

document.getElementById("toggle-monsters")?.addEventListener("click", () => {
  window.location.href = "worldbuilding.html";
});

document.getElementById("toggle-top")?.addEventListener("click", () => {
  document.getElementById("header-placeholder")?.scrollIntoView({ behavior: "smooth" });
});

// When you open/close the sidebar, add/remove a class on <body>
const sidebar = document.getElementById("sidebar");
const toggleBtn = document.getElementById("toggle-sidebar");

toggleBtn?.addEventListener("click", () => {
  const open = sidebar.classList.toggle("open");
  document.body.classList.toggle("sidebar-open", open);
});

// Mark floaters to shift with the sidebar
["toggle-top", "toggle-sidebar", "toggle-reference", "toggle-lore", "toggle-worldbuilding", "toggle-monsters", "toggle-spellbook", "floating-search"]
  .forEach(id => document.getElementById(id)?.classList.add("shift-with-sidebar"));