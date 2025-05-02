document.addEventListener("DOMContentLoaded", () => {
    // Inject sidebar from HTML fragment
    fetch("components/sidebar.html")
      .then(res => res.text())
      .then(html => {
        document.getElementById("sidebar-placeholder").innerHTML = html;
        initSidebar(); // Run logic AFTER injection
      });
  });
  
  function initSidebar() {
    const sidebar = document.getElementById("sidebar");
    const toggleButton = document.getElementById("toggle-sidebar");
  
    // Toggle open/close
    toggleButton?.addEventListener("click", () => {
      sidebar.classList.toggle("closed");
      sidebar.classList.toggle("open");
    });
  
    // Roller tab toggle
    document.getElementById("toggle-roller")?.addEventListener("click", () => {
      document.getElementById("dice-roller")?.classList.remove("active");
      document.getElementById("d20-check-roller")?.classList.add("active");
      document.getElementById("toggle-roller")?.classList.add("active");
      document.getElementById("toggle-dice")?.classList.remove("active");
    });
  
    document.getElementById("toggle-dice")?.addEventListener("click", () => {
      document.getElementById("dice-roller")?.classList.add("active");
      document.getElementById("d20-check-roller")?.classList.remove("active");
      document.getElementById("toggle-dice")?.classList.add("active");
      document.getElementById("toggle-roller")?.classList.remove("active");
    });
  
    // Dice roll
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
      const historyItem = document.createElement("li");
      historyItem.classList.add("styled-roll");
  
      let successCount = finalResult >= 15 ? Math.floor((finalResult - 15) / 5) + 1 : 0;
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
  
      document.getElementById("check-history")?.prepend(historyItem);
  
      const historyList = document.getElementById("check-history");
      if (historyList && historyList.children.length > 5) {
        historyList.removeChild(historyList.lastChild);
      }
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
  }
  
  function highlightRoll(value) {
    if (value === 20) return `<span class="roll-max">${value}</span>`;
    if (value === 1) return `<span class="roll-min">${value}</span>`;
    return `<span class="roll-normal">${value}</span>`;
  }
  