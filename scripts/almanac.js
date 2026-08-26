document.addEventListener("DOMContentLoaded", () => {
  console.log("✨ Question generator active.");

  function getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  fetch('data/worldbuilding.json')
    .then(res => res.json())
    .then(data => {
      const btn = document.getElementById("generate-question-btn");
      const output = document.getElementById("generated-question");

      if (btn && output) {
        btn.addEventListener("click", () => {
          const template = getRandom(data.questionTemplates);
          const filled = template
            .replaceAll("{person}", getRandom(data.people))
            .replaceAll("{motivation}", getRandom(data.motivations))
            .replaceAll("{location}", getRandom(data.locations))
            .replaceAll("{object}", getRandom(data.objects))
            .replaceAll("{conflict}", getRandom(data.conflicts));
          output.textContent = filled;
        });
      }
    })
    .catch(err => console.error("❌ Failed to load worldbuilding.json", err));
});