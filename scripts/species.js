document.querySelectorAll(".img-zoom").forEach(img => {
    img.addEventListener("click", function () {
        this.classList.toggle("zoomed");
    });
});

// Highlight the current page in the nav
document.querySelectorAll('nav a').forEach(link => {
    if (link.href === window.location.href) {
        link.style.fontWeight = 'bold';
    }
});