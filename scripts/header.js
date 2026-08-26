document.addEventListener("DOMContentLoaded", () => {
  fetch("components/header.html")
    .then(res => res.text())
    .then(html => {
      document.getElementById("header-placeholder").innerHTML = html;

      // Optional: set dynamic title
      const title = document.body.dataset.pageTitle;
      if (title) {
        const titleEl = document.querySelector(".header-title");
        if (titleEl) titleEl.textContent = title;
      }
    });
});