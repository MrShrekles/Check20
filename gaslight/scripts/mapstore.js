/* Battlemaps kept in this browser.

   Cloud Storage needs a billing account, and until scenes sync there is
   nothing for a shared bucket to share — the map URL lives on the scene and
   the scene does not leave this laptop. So a dropped map goes in IndexedDB,
   where it works today, for free, offline, with no account.

   **Not localStorage.** That is a string store with a five-megabyte quota that
   `snapshot()` is already filling every two seconds; one base64 battlemap
   would blow it, and `autosave.js` would warn once to a console nobody is
   reading and then lose the table in silence. IndexedDB takes the Blob as it
   is, has a quota in the hundreds of megabytes, and is a different bucket
   entirely from the autosave.

   The scene stores a key, never the bytes and never an object URL: an object
   URL belongs to one page load and would be a dead link in a saved table. */

const DB_NAME = 'gaslight-maps';
const STORE = 'maps';
const VERSION = 1;

let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) return reject(new Error('This browser has no IndexedDB.'));
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Local storage could not be opened.'));
    /* Private mode, blocked site data, or a second tab holding an older
       version open. None of these should hang the caller for ever. */
    req.onblocked = () => reject(new Error('Another tab is holding the map store open.'));
  }).catch(err => { dbPromise = null; throw err; });
  return dbPromise;
}

const tx = async (mode, fn) => {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('The map store rejected that.'));
  });
};

const newKey = () => `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/**
 * Keep a map in this browser.
 * @param {Blob} blob
 * @param {{name?: string, w?: number, h?: number}} meta
 * @returns {Promise<string>} the key the scene stores
 */
export async function putMap(blob, meta = {}) {
  const key = newKey();
  try {
    await tx('readwrite', store => store.put({
      key, blob,
      name: meta.name || '',
      w: meta.w || 0,
      h: meta.h || 0,
      bytes: blob.size,
      added: Date.now(),
    }));
  } catch (err) {
    if (err?.name === 'QuotaExceededError') {
      throw new Error('This browser is out of room for maps. Take an old one off a scene first.');
    }
    throw err;
  }
  return key;
}

/** The stored record, or null if it is not here — a table opened on another
    machine, or site data that has been cleared. */
export async function getMap(key) {
  if (!key) return null;
  try {
    return (await tx('readonly', store => store.get(key))) || null;
  } catch {
    return null;
  }
}

export async function deleteMap(key) {
  if (!key) return false;
  try {
    await tx('readwrite', store => store.delete(key));
    return true;
  } catch {
    return false;
  }
}

/** Everything kept here, newest first, without the blobs. */
export async function listMaps() {
  try {
    const all = await tx('readonly', store => store.getAll());
    return (all || [])
      .map(({ key, name, w, h, bytes, added }) => ({ key, name, w, h, bytes, added }))
      .sort((a, b) => b.added - a.added);
  } catch {
    return [];
  }
}

/** How much room the maps are taking, for a narrator wondering. */
export async function mapUsage() {
  const rows = await listMaps();
  return { count: rows.length, bytes: rows.reduce((n, r) => n + (r.bytes || 0), 0) };
}

/* There is deliberately no automatic tidy-up.

   A key that no OPEN table is using may still belong to a table saved in a
   file you have not loaded today, so sweeping unused keys on boot would
   quietly delete maps from other campaigns. A map is dropped when a narrator
   takes it off the scene, and at no other time. */

export const prettyBytes = n =>
  n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`;
