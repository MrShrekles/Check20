/* Session notes, handouts and lore.

   An entry is the narrator's: title, body, and a Hand out button that reads it
   into the chat log. Underneath it, anyone at the table can leave a note —
   what the party made of the thing, who they suspect, what they wrote down.
   Notes are attributed to whoever the chat's speaker box is set to, so a
   player's notes come from their character.

   In player mode the entry itself is read-only; the notes are not. */

import { state, id } from './state.js';
import { $, esc, toast, sendButton } from './dom.js';
import { postNote, now } from './chat.js';
import { isPlayerMode } from './session.js';

const noteSvg = '<svg width="12" height="12" viewBox="0 0 24 24" style="stroke:var(--gold-2);fill:none;stroke-width:1.6"><path d="M5 4h11l3 3v13H5z"/><path d="M9 9h6M9 13h6M9 17h4"/></svg>';
const delSvg = '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13"/></svg>';
const xSvg = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';

/** Who a note is from: the chat speaker, so players sign as their character. */
const speaker = () => $('speaker')?.value || (isPlayerMode() ? 'Player' : 'Narrator');

const notesOf = j => (j.notes ||= []);

function noteRow(j, n) {
  const row = document.createElement('div');
  row.className = 'jnote';
  row.innerHTML = `
    <div class="jnotehead">
      <b>${esc(n.who || 'Someone')}</b>
      <span>${esc(n.time || '')}</span>
      <button class="icobtn" data-a="delnote" title="Remove this note">${xSvg}</button>
    </div>
    <p>${esc(n.text)}</p>`;
  row.querySelector('[data-a=delnote]').addEventListener('click', () => {
    j.notes = notesOf(j).filter(x => x !== n);
    renderJournal();
  });
  return row;
}

/* Folders are a field on the entry, not a container holding it. Entries keep
   their order; the list is grouped for display only. An entry with no folder
   sits under "Unfiled", which is always last. Collapsed folders are remembered
   for the session but not saved: which drawers you had open is not table state. */
const UNFILED = 'Unfiled';
const collapsed = new Set();

export const folderOf = j => String(j.folder || '').trim() || UNFILED;

/** Every folder in use, alphabetical, with Unfiled pushed to the end. */
export function folderNames() {
  const names = [...new Set(state.journal.map(folderOf))];
  const real = names.filter(n => n !== UNFILED).sort((a, b) => a.localeCompare(b));
  return names.includes(UNFILED) ? [...real, UNFILED] : real;
}

export function renderJournal() {
  const list = $('journalList');
  const readOnly = isPlayerMode();
  list.innerHTML = '';
  if (!state.journal.length) {
    list.innerHTML = '<div class="hint" style="text-align:center;padding:20px 0">The journal is empty. Session notes, handouts, and lore go here.</div>';
  }

  /* One pass, grouped. A single Unfiled folder and nothing else is just a
     flat list, so the header is not drawn at all. */
  const names = folderNames();
  const onlyUnfiled = names.length === 1 && names[0] === UNFILED;

  for (const name of names) {
    const inFolder = state.journal.filter(j => folderOf(j) === name);
    if (!onlyUnfiled) {
      const shut = collapsed.has(name);
      const head = document.createElement('div');
      head.className = 'jfolder' + (shut ? ' shut' : '');
      head.innerHTML = `
        <span class="jfcaret">${shut ? '▸' : '▾'}</span>
        <span class="jfname">${esc(name)}</span>
        <span class="jfcount">${inFolder.length}</span>`;
      head.addEventListener('click', () => {
        if (shut) collapsed.delete(name); else collapsed.add(name);
        renderJournal();
      });
      list.appendChild(head);
      if (shut) continue;
    }
    renderEntries(inFolder, list, readOnly, names);
  }
}

function renderEntries(entries, list, readOnly, names) {
  entries.forEach(j => {
    const notes = notesOf(j);
    const c = document.createElement('div');
    c.className = 'card' + (j.open ? ' open' : '');
    c.innerHTML = `
      <div class="cardhead">
        ${noteSvg}
        <span class="title">${esc(j.title || 'Untitled')}</span>
        ${notes.length ? `<span class="jcount" title="${notes.length} note${notes.length === 1 ? '' : 's'}">${notes.length}</span>` : ''}
        ${readOnly ? '' : `<button class="icobtn" data-a="del" title="Delete entry">${delSvg}</button>`}
      </div>
      <div class="cardbody">
        <input class="full" data-f="title" value="${esc(j.title)}" placeholder="Title" ${readOnly ? 'readonly' : ''}>
        ${readOnly ? '' : `
        <div class="jfolderpick">
          <label>Folder</label>
          <input data-f="folder" list="jfolders" value="${esc(j.folder || '')}"
            placeholder="${UNFILED}" maxlength="40" autocomplete="off">
          <datalist id="jfolders">
            ${names.filter(n => n !== UNFILED).map(n => `<option value="${esc(n)}"></option>`).join('')}
          </datalist>
        </div>`}
        <textarea data-f="body" placeholder="Write..." ${readOnly ? 'readonly' : ''}>${esc(j.body)}</textarea>
        ${readOnly ? '' : `
        <div class="gearacts">
          ${sendButton('Read this out: it goes to the chat log', 'data-a="hand"', 'Hand out')}
        </div>`}
        <div class="jnotes"></div>
        <div class="jnoteadd">
          <input data-f="note" placeholder="Add a note…" maxlength="400">
          <button class="tbbtn" data-a="addnote">Note</button>
        </div>
      </div>`;

    c.querySelector('.cardhead').addEventListener('click', e => {
      if (e.target.closest('[data-a=del]')) {
        if (confirm('Delete this entry?')) { state.journal = state.journal.filter(x => x !== j); renderJournal(); }
        return;
      }
      j.open = !j.open; renderJournal();
    });

    const notesEl = c.querySelector('.jnotes');
    notes.forEach(n => notesEl.appendChild(noteRow(j, n)));

    const field = c.querySelector('[data-f=note]');
    const addNote = () => {
      const text = field.value.trim();
      if (!text) return;
      notesOf(j).push({ id: id(), who: speaker(), text, time: now() });
      field.value = '';
      j.open = true;
      renderJournal();
    };
    c.querySelector('[data-a=addnote]').addEventListener('click', addNote);
    field.addEventListener('keydown', e => { if (e.key === 'Enter') addNote(); });

    if (!readOnly) {
      c.querySelector('[data-f=title]').addEventListener('input', function () {
        j.title = this.value;
        c.querySelector('.title').textContent = this.value || 'Untitled';
      });
      c.querySelector('[data-f=body]').addEventListener('input', function () { j.body = this.value; });
      // Regroup only once the field is left, so the card is not torn out from
      // under the caret on every keystroke.
      c.querySelector('[data-f=folder]').addEventListener('change', function () {
        const v = this.value.trim();
        if (v) j.folder = v; else delete j.folder;
        renderJournal();
      });
      c.querySelector('[data-a=hand]').addEventListener('click', () => {
        if (!j.body?.trim() && !j.title?.trim()) return toast('There is nothing in this entry yet');
        postNote({ charName: 'Narrator', label: j.title || 'Handout', text: j.body || '' });
      });
    }

    list.appendChild(c);
  });
}

export function initJournal() {
  $('journalAdd').onclick = () => {
    state.journal.unshift({ id: id(), title: '', body: '', notes: [], open: true });
    renderJournal();
    $('journalList').querySelector('[data-f=title]')?.focus();
  };
}
