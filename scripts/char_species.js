document.addEventListener("DOMContentLoaded", () => {
    const speciesDropdown = document.getElementById('species');
    const subspeciesDropdown = document.getElementById('subspecies');
    const speciesDetails = document.getElementById('species-details');
    const subspeciesDetails = document.getElementById('subspecies-details');

    if (!speciesDropdown || !subspeciesDropdown || !speciesDetails || !subspeciesDetails) {
        console.warn("Missing required DOM elements for species script.");
        return;
    }

    fetch('data/species.json')
        .then(response => response.json())
        .then(data => {
            data.species.forEach(spec => {
                const label = spec.option && spec.option.toLowerCase() !== spec.name.toLowerCase()
                    ? `${spec.option}: ${spec.name}`
                    : spec.name;
                const option = document.createElement("option");
                option.value = spec.name;
                option.textContent = label;
                speciesDropdown.appendChild(option);
            });

            speciesDropdown.addEventListener('change', () => {
                const selected = data.species.find(s => s.name === speciesDropdown.value);
                if (!selected) return;

                speciesDetails.innerHTML = Array.isArray(selected.features)
                    ? selected.features.map(f => {
                        let base = `<li><strong>${f.name}:</strong> ${f.description}`;
                        if (Array.isArray(f.options)) {
                            base += `<ul>${f.options.map(opt => `<li><strong>${opt.name}:</strong> ${opt.effect}</li>`).join('')}</ul>`;
                        }
                        return base + `</li>`;
                    }).join('')
                    : `<li>${selected.features || "No features available."}</li>`;

                if (selected.subspecies?.length) {
                    populateDropdown(subspeciesDropdown, selected.subspecies, "Select Subspecies");
                    subspeciesDropdown.style.display = "block";
                } else {
                    subspeciesDropdown.innerHTML = "";
                    subspeciesDropdown.style.display = "none";
                    subspeciesDetails.innerHTML = "";
                }
            });

            subspeciesDropdown.addEventListener('change', () => {
                const selected = data.species.find(s => s.name === speciesDropdown.value);
                const sub = selected?.subspecies?.find(s => s.name === subspeciesDropdown.value);
                subspeciesDetails.innerHTML = sub
                    ? `<h4>${sub.name}</h4>` +
                      (sub.traits?.map(t => `<p><strong>${t.name}:</strong> ${t.description}</p>`).join('') || "<p>No traits available.</p>")
                    : "";
            });
        })
        .catch(err => console.error("Failed to load species.json:", err));
});

function populateDropdown(dropdown, items, label) {
    dropdown.innerHTML = `<option value="">${label}</option>` +
        items.map(i => `<option value="${i.name}">${i.name}</option>`).join('');
}
