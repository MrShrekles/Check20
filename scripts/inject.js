document.addEventListener("DOMContentLoaded", async () => {
  // Back-compat: auto-wire old #sidebar-placeholder to components/sidebar.html
  const sidebarTarget = document.getElementById("sidebar-placeholder");
  if (sidebarTarget && !sidebarTarget.hasAttribute("data-include")) {
    sidebarTarget.setAttribute("data-include", "/components/sidebar.html"); // absolute path for safety
  }

  // Load all includes (and nested), then init the sidebar if present
  await injectIncludes();
  if (typeof initSidebar === "function" && document.getElementById("sidebar")) {
    initSidebar();
  }
});

// Generic include injector for any <div data-include="...">
async function injectIncludes(root = document) {
  const nodes = Array.from(root.querySelectorAll("[data-include]"));
  if (!nodes.length) return;

  await Promise.all(nodes.map(async el => {
    const url = el.getAttribute("data-include");
    if (!url) return;

    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const html = await res.text();

      el.innerHTML = html;
      executeInlineScripts(el);

      // Process nested includes inside this freshly injected chunk
      await injectIncludes(el);
    } catch (err) {
      console.error("Failed to load include:", url, err);
      el.innerHTML = `<p style="color:#b00">Failed to load ${url}</p>`;
    }
  }));
}

// Ensure any <script> inside injected components actually runs
function executeInlineScripts(container) {
  const scripts = container.querySelectorAll("script");
  scripts.forEach(old => {
    const s = document.createElement("script");

    // Copy attributes
    [...old.attributes].forEach(a => s.setAttribute(a.name, a.value));

    // Copy code/src
    if (old.src) s.src = old.src;
    else s.textContent = old.textContent;

    old.replaceWith(s);
  });
}
