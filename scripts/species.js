document.querySelectorAll(".img-zoom").forEach(img => {
    img.addEventListener("click", function () {
        this.classList.toggle("zoomed");
    });
});
