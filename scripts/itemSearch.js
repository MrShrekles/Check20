document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("search-input");
    const table = document.getElementById("item-table");
    const rows = Array.from(table.querySelectorAll("tbody tr"));

    // Search Functionality
    searchInput.addEventListener("input", () => {
        const query = searchInput.value.toLowerCase();
        rows.forEach(row => {
            const cells = Array.from(row.children);
            const matches = cells.some(cell => cell.textContent.toLowerCase().includes(query));
            row.style.display = matches ? "" : "none";
        });
    });

    // Sort Functionality
    const headers = table.querySelectorAll("thead th[data-sort]");
    headers.forEach(header => {
        header.addEventListener("click", () => {
            const sortKey = header.getAttribute("data-sort");
            const columnIndex = Array.from(header.parentElement.children).indexOf(header);

            const sortedRows = rows.sort((a, b) => {
                const aText = a.children[columnIndex].textContent.trim().toLowerCase();
                const bText = b.children[columnIndex].textContent.trim().toLowerCase();

                if (sortKey === "cost") {
                    return parseFloat(aText.replace("$", "")) - parseFloat(bText.replace("$", ""));
                }
                return aText.localeCompare(bText);
            });

            sortedRows.forEach(row => table.querySelector("tbody").appendChild(row));
        });
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const table = document.getElementById("item-table");
    const search = document.getElementById("search-input");
    if (!table || !search) return; // ⛔ Skip if not found
  
    const rows = Array.from(table.querySelectorAll("tbody tr"));
  
    search.addEventListener("input", () => {
      const query = search.value.toLowerCase();
      rows.forEach(row => {
        const match = Array.from(row.children).some(cell =>
          cell.textContent.toLowerCase().includes(query)
        );
        row.style.display = match ? "" : "none";
      });
    });
  });
  