document.addEventListener("DOMContentLoaded", async () => {
  const generateBtn = document.getElementById("generate-business");
  const outputContainer = document.getElementById("business-output");
  const clearBtn = document.getElementById("clear-businesses");

  let businessData = {};
  let savedBusinesses = JSON.parse(localStorage.getItem("check20-business-cards") || "[]");

  async function loadBusinessData() {
    try {
      const res = await fetch("data/business.json");
      businessData = await res.json();
    } catch (err) {
      console.error("Failed to load business.json:", err);
    }
  }

  function getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function generateBusiness() {
    const name = `The ${getRandom(businessData.namePrefixes)} ${getRandom(businessData.nameSubjects)} ${getRandom(businessData.businessTypes)}`;
    const type = getRandom(businessData.businessTypes);
    const owner = `${getRandom(businessData.titles)} ${getRandom(businessData.firstNames)} ${getRandom(businessData.lastNames)}`;
    const specialty = getRandom(["Weapon upgrades", "Illegal potions", "Rumor trading", "Ghost insurance"]);
    const reputation = getRandom(businessData.reputations);
    const secret = getRandom(businessData.secrets);

    return { name, type, owner, specialty, reputation, secret };
  }

  function createBusinessCard(biz) {
    const div = document.createElement("div");
    div.className = "monster-card";

    div.innerHTML = `
      <h1 contenteditable="true">${biz.name}</h1>
      <b>${biz.type}</b>
      <p><strong>Owner:</strong> ${biz.owner}</p>
      <p><strong>Specialty:</strong> ${biz.specialty}</p>
      <p><strong>Reputation:</strong> ${biz.reputation}</p>
      <p><strong>Secret:</strong> ${biz.secret}</p>
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
      savedBusinesses = savedBusinesses.filter(b => b.name !== biz.name || b.owner !== biz.owner);
      localStorage.setItem("check20-business-cards", JSON.stringify(savedBusinesses));
    });

    buttonRow.append(copyBtn, deleteBtn);
    div.append(buttonRow);

    return div;
  }

  await loadBusinessData();

  // Render saved cards
  savedBusinesses.forEach(b => {
    const card = createBusinessCard(b);
    outputContainer.prepend(card);
  });

  generateBtn.addEventListener("click", () => {
    const business = generateBusiness();
    const card = createBusinessCard(business);
    outputContainer.prepend(card);

    savedBusinesses.push(business);
    localStorage.setItem("check20-business-cards", JSON.stringify(savedBusinesses));
  });

  clearBtn.addEventListener("click", () => {
    localStorage.removeItem("check20-business-cards");
    savedBusinesses = [];
    outputContainer.innerHTML = "";
  });
});
