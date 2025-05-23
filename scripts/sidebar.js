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

  // Toggle sidebar open/close
  toggleButton?.addEventListener("click", () => {
    sidebar.classList.toggle("closed");
    sidebar.classList.toggle("open");
  });

  // Roller tab toggle via radio buttons
  const checkRadio = document.getElementById("check-mode");
  const standardRadio = document.getElementById("standard-mode");
  const checkBlock = document.getElementById("check-block");
  const standardBlock = document.getElementById("standard-block");

  // Set initial block visibility
  if (checkRadio?.checked) {
    checkBlock?.classList.add("active");
    standardBlock?.classList.remove("active");
  } else if (standardRadio?.checked) {
    standardBlock?.classList.add("active");
    checkBlock?.classList.remove("active");
  }

  // Toggle listeners
  checkRadio?.addEventListener("change", () => {
    checkBlock?.classList.add("active");
    standardBlock?.classList.remove("active");
  });

  standardRadio?.addEventListener("change", () => {
    standardBlock?.classList.add("active");
    checkBlock?.classList.remove("active");
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
      <div class="mod-line">
        <span class="roll-label"> Modifier:</span> <span class="roll-mod">${modifier >= 0 ? "+" : ""}${modifier}</span>
      </div>
      <div class="total-line">
        <hr>
        <span class="roll-label"> Total:</span> <strong class="roll-total">${finalResult}</strong>
        ${successCount > 0 ? `<span class="success-count">(${successCount} success${successCount > 1 ? "es" : ""})</span>` : ""}
      </div>
      <div class="choice-line">
        <span class="roll-label"> Chose:</span> <em class="roll-chosen">${chosenRaw}</em>
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

function highlightRoll(value) {
  if (value === 20) return `<span class="roll-max">${value}</span>`;
  if (value === 1) return `<span class="roll-min">${value}</span>`;
  return `<span class="roll-normal">${value}</span>`;
}
