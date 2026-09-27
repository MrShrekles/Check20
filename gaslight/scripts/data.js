/* Loader for the shared Check20 game data in ../../data/.

   These files are the same ones companion/ reads, so the VTT must treat
   them as read-only: never write back, never reshape in place.

   Every file is fetched at most once and cached. Call `load(...names)` for the
   ones a feature needs, then read them synchronously with `get(name)`. */

const BASE = '../data/';

/* Files whose top level wraps the useful payload. The loader unwraps them so
   callers always get the collection itself. */
const UNWRAP = {
  species: d => d.species,
  classes: d => d.classes,
  'class-new': d => d.classes,
  progression: d => d.progression_items,
};

const cache = new Map();
const inflight = new Map();

function fetchOne(name) {
  if (cache.has(name)) return Promise.resolve(cache.get(name));
  if (inflight.has(name)) return inflight.get(name);

  const p = fetch(BASE + name + '.json')
    .then(r => {
      if (!r.ok) throw new Error(`${name}.json: ${r.status}`);
      return r.json();
    })
    .then(json => {
      const value = UNWRAP[name] ? UNWRAP[name](json) : json;
      cache.set(name, value);
      inflight.delete(name);
      return value;
    })
    .catch(err => {
      inflight.delete(name);
      throw err;
    });

  inflight.set(name, p);
  return p;
}

/** Fetch one or more data files. Resolves once all of them are cached. */
export function load(...names) {
  return Promise.all(names.map(fetchOne));
}

/** The cached collection, or null if it has not been loaded yet. */
export const get = name => cache.get(name) ?? null;

/* ---- shaped accessors ----
   Thin helpers over the raw files, so callers do not repeat the same
   normalisation. Each returns [] or null until its file is loaded. */

/** species.json is keyed by index; callers want a plain array. */
export const speciesList = () => Object.values(get('species') || {});

/** Path and talent entries for one class key. */
export const classEntries = key => Object.values(get('class-new')?.[key] || {});

