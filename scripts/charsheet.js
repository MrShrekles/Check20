// --------------ITEM MANAGEMENT FUNCTIONS-----------------------
function addItem() {
    let container = document.getElementById("repeating-section");
    let newItem = document.createElement("div");
    newItem.classList.add("item-entry");

    newItem.innerHTML = `
        <select>
            <option value="weapon">Weapon</option>
            <option value="armor">Armor</option>
            <option value="potion">Potion</option>
            <option value="misc">Miscellaneous</option>
        </select>
        <input type="text" placeholder="Item Name">
        <input type="text" placeholder="Stats/Effects">
        <button onclick="this.parentElement.remove()">Remove</button>
    `;
    container.appendChild(newItem);
}


function removeResource(btn) {
    btn.parentElement.remove();
}

// ----------- STATS ------------
function recalculateAllStats() {
    const agility = parseInt(document.getElementById('agilityTotal')?.value) || 0;
    const strength = parseInt(document.getElementById('strength')?.value) || 0;
    const observation = parseInt(document.getElementById('observation')?.value) || 0;

    document.getElementById('wounds').value = agility + strength;
    document.getElementById('movement').value = 30 + Math.floor(agility / 2) * 5;
    document.getElementById('llv').value = 30 + Math.floor(observation / 2) * 5;
}

function calculateTotalChecksSum() {
    const inputs = document.querySelectorAll('.checks-table input[name$="Total"]');
    let sum = 0;
    inputs.forEach(input => sum += parseInt(input.value) || 0);
    document.getElementById('totalChecksSum').value = sum;
}

function adjustAllTotals(amount) {
    document.querySelectorAll('.checks-table input[name$="Total"]').forEach(input => {
        input.value = (parseInt(input.value) || 0) + amount;
    });
    calculateTotalChecksSum();
}

function clearAllTotals() {
    document.querySelectorAll('.checks-table input[name$="Total"]').forEach(input => input.value = 0);
    calculateTotalChecksSum();
}

document.addEventListener('DOMContentLoaded', () => {
    calculateTotalChecksSum();
    document.querySelectorAll('.checks-table input[name$="Total"]').forEach(input => {
        input.addEventListener('input', calculateTotalChecksSum);
    });
});