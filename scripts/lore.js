document.addEventListener("DOMContentLoaded", () => {
  console.log("✨ Lore copy active.");

  function removeEmojis(text) {
    return text.replace(/[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F9FF}]/gu, '');
  }

  function formatForRoll20(li) {
    const strong = li.querySelector("strong");
    if (!strong) return null;

    const label = strong.textContent.replace(/[:\s]+$/, "").trim();
    let fullText = li.textContent.replace(strong.textContent, "").trim();
    fullText = removeEmojis(fullText).replace(/\s+/g, " ");

    return `&{template:shek} {{${label}=${fullText}}}`;
  }

  function attachLoreButtons() {
    const targets = document.querySelectorAll("li");
    targets.forEach(li => {
      if (li.querySelector("strong") && !li.querySelector(".lore-copy")) {
        const btn = document.createElement("button");
        btn.className = "lore-copy";
        btn.textContent = "📋";
        btn.title = "Copy to Roll20";
        btn.style.marginLeft = "0.5rem";
        btn.style.fontSize = "0.8rem";
        btn.style.background = "none";
        btn.style.border = "none";
        btn.style.cursor = "pointer";
        btn.style.color = "var(--theme-3)";
        btn.style.transition = "color 0.2s ease";
        btn.addEventListener("click", () => {
          const formatted = formatForRoll20(li);
          if (formatted) {
            navigator.clipboard.writeText(formatted).then(() => {
              btn.textContent = "✅";
              setTimeout(() => btn.textContent = "📋", 1000);
            });
          }
        });
        li.appendChild(btn);
      }
    });
  }

  attachLoreButtons();
});
