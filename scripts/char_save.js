// --------- CHARACTER SAVE/LOAD ----------
function saveCharacter() {
    const allFields = document.querySelectorAll('input, select, textarea');
    const character = {};
    allFields.forEach(field => {
        if (field.name) character[field.name] = field.value;
    });
    const blob = new Blob([JSON.stringify(character, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${character.charName || 'character'}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function loadCharacter() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = event => {
            const data = JSON.parse(event.target.result);
            localStorage.setItem('check20Character', JSON.stringify(data));
            location.reload(); // Full refresh to reinitialize dropdowns properly
        };
        reader.readAsText(file);
    };
    input.click();
}

function printCharacter() {
    window.print();
}

// -------- AUTOSAVE ----------
function autoSave() {
    const allFields = document.querySelectorAll('input, select, textarea');
    const data = {};
    allFields.forEach(field => {
        if (field.name) data[field.name] = field.value;
    });
    localStorage.setItem('check20Character', JSON.stringify(data));
}

// Wait until dropdowns are populated
function autoLoadAfterReady(callback) {
    const interval = setInterval(() => {
        const species = document.getElementById('species');
        const classEl = document.getElementById('class');
        if (species?.options.length > 1 && classEl?.options.length > 1) {
            clearInterval(interval);
            callback();
        }
    }, 50);
}

function autoLoad() {
    const data = JSON.parse(localStorage.getItem('check20Character'));
    if (!data) return;

    autoLoadAfterReady(() => {
        document.querySelectorAll('input, select, textarea').forEach(field => {
            if (field.name && data[field.name] !== undefined) {
                field.value = data[field.name];
                const eventType = field.tagName === "SELECT" ? "change" : "input";
                field.dispatchEvent(new Event(eventType));
            }
        });
    });
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    autoLoad();
    document.querySelectorAll('input, select, textarea').forEach(field => {
        field.addEventListener('input', autoSave);
        field.addEventListener('change', autoSave);
    });
});

function setValueAndSave(fieldId, value) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.value = value;
    field.dispatchEvent(new Event('input'));
}

function clearCharacter() {
    if (!confirm('Clear all fields and reset this character?')) return;

    // Remove saved data
    localStorage.removeItem('check20Character');

    // Clear all form fields
    document.querySelectorAll('input, select, textarea').forEach(field => {
        if (!field.name) return;

        if (field.type === 'checkbox' || field.type === 'radio') {
            field.checked = false;
        } else if (field.tagName === 'SELECT') {
            field.selectedIndex = 0;
        } else {
            field.value = '';
        }
    });

    // Re-save the now-empty state so it stays clean on reload
    autoSave();
}
