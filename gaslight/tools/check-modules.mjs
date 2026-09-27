/* Every module under scripts/ parses as an ES module, and every named
 * import resolves to something the other file actually exports.
 *
 *   node tools/check-modules.mjs
 *
 * Why this exists rather than `node --check scripts/*.js`: on a .js file
 * Node parses as CommonJS, meets `import`, falls back to ESM detection, and
 * SWALLOWS the syntax error, exiting 0. A literal newline inside a string in
 * generators.js passed `node --check` and took the whole app down in the
 * browser. Copying each file to .mjs first makes Node parse it as what it is.
 *
 * The import check is the second half. A missing export is not a parse error:
 * the file is fine, the graph is not, and the browser fails the whole thing at
 * link time with every handler unwired.
 *
 * The third half is the one that cost an evening. `w2s(...)` was called in
 * tools.js and never imported there. That parses, it links, and it throws a
 * ReferenceError on the first pointerdown \u2014 so every click in the app stopped
 * working, with nothing in the console until someone clicked. Neither check
 * above sees it, because nothing is missing; a name is simply not there.
 *
 * So: every name any module exports is known project-wide. If a file uses one
 * of those names and neither imports it nor declares it itself, say so. That
 * is exactly the shape of the bug and it costs one more pass over the source.
 *
 * The fourth pass is the same machinery pointed the other way: a name that is
 * imported and never used. That breaks nothing, but it is what is left behind
 * when code moves out of a file, and it is how you find out you moved less
 * than you meant to.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';

const DIR = 'scripts';
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.js')).sort();
let problems = 0;

/* ---- 1. does each file parse as an ES module? ---- */

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gaslight-check-'));
for (const f of files) {
  const as = path.join(tmp, f.replace(/\.js$/, '.mjs'));
  fs.copyFileSync(path.join(DIR, f), as);
  try {
    execFileSync(process.execPath, ['--check', as], { stdio: 'pipe' });
  } catch (err) {
    const msg = String(err.stderr || err.message).split('\n').slice(0, 4).join('\n      ');
    console.log(`  SYNTAX  ${f}\n      ${msg}`);
    problems++;
  }
}
fs.rmSync(tmp, { recursive: true, force: true });

/* ---- 2. does every named import resolve? ---- */

const exports = {};
const imports = {};

for (const f of files) {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  const names = new Set();

  for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm)) {
    names.add(m[1]);
  }
  for (const m of src.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const part of m[1].split(',')) {
      const as = part.trim().split(/\s+as\s+/).pop();
      if (as) names.add(as.trim());
    }
  }
  exports[f] = names;

  const got = [];
  for (const m of src.matchAll(/import\s+([^;]*?)\s+from\s*['"](\.\/[^'"]+)['"]/g)) {
    const braces = m[1].match(/\{([^}]*)\}/);
    const wanted = braces
      ? braces[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean)
      : [];
    got.push({ from: m[2].replace('./', ''), wanted });
  }
  imports[f] = got;
}

for (const f of files) {
  for (const imp of imports[f]) {
    if (!exports[imp.from]) {
      console.log(`  MISSING FILE    ${f} imports './${imp.from}', which is not there`);
      problems++;
      continue;
    }
    for (const name of imp.wanted) {
      if (!exports[imp.from].has(name)) {
        console.log(`  MISSING EXPORT  ${f} imports { ${name} } from './${imp.from}', which does not export it`);
        problems++;
      }
    }
  }
}

/* ---- 3. is every cross-module name a file uses actually imported? ---- */

/* Anything a module can legitimately reach without importing it: the language,
   the browser, and the handful of globals this app puts there itself. */
const AMBIENT = new Set([
  'window', 'document', 'console', 'navigator', 'localStorage', 'sessionStorage',
  'indexedDB', 'location', 'history', 'fetch', 'Image', 'Blob', 'File',
  'FileReader', 'URL', 'Date', 'Math', 'JSON', 'Object', 'Array', 'String',
  'Number', 'Boolean', 'Set', 'Map', 'WeakMap', 'WeakSet', 'Promise', 'Error',
  'RegExp', 'Symbol', 'Infinity', 'NaN', 'undefined', 'globalThis', 'structuredClone',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask',
  'requestAnimationFrame', 'cancelAnimationFrame', 'ResizeObserver', 'IntersectionObserver',
  'alert', 'confirm', 'prompt', 'getComputedStyle', 'CustomEvent', 'Event',
  'DOMParser', 'TextEncoder', 'TextDecoder', 'crypto', 'performance', 'Intl',
  'HTMLElement', 'Node', 'CanvasRenderingContext2D', 'AbortController',
]);

// Every name that some module exports, and which module exports it.
const owner = new Map();
for (const f of files) for (const n of exports[f]) {
  if (!owner.has(n)) owner.set(n, []);
  owner.get(n).push(f);
}

/* What a file declares for itself: imports, top-level and nested bindings,
   function parameters, catch bindings, labels. Deliberately generous \u2014 a name
   this misses is a false alarm, and a checker that cries wolf gets muted. */
function declaredIn(src) {
  const names = new Set();
  const add = n => n && names.add(n);

  // import { a, b as c }, import d, import * as e
  for (const m of src.matchAll(/import\s+([^;]*?)\s+from\s*['"][^'"]+['"]/g)) {
    const clause = m[1];
    const braces = clause.match(/\{([^}]*)\}/);
    if (braces) {
      for (const part of braces[1].split(',')) add(part.trim().split(/\s+as\s+/).pop()?.trim());
    }
    const ns = clause.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
    if (ns) add(ns[1]);
    const def = clause.replace(/\{[^}]*\}/, '').replace(/\*\s+as\s+[A-Za-z_$][\w$]*/, '');
    for (const d of def.split(',')) {
      const t = d.trim();
      if (/^[A-Za-z_$][\w$]*$/.test(t)) add(t);
    }
  }

  // `export { a as b } from './c'` is an import wearing a hat.
  for (const m of src.matchAll(/export\s*\{([^}]*)\}\s*from/g)) {
    for (const part of m[1].split(',')) add(part.trim().split(/\s+as\s+/)[0].trim());
  }

  // const/let/var/function/class, at any depth
  for (const m of src.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) add(m[1]);
  for (const m of src.matchAll(/\b(?:function\*?|class)\s+([A-Za-z_$][\w$]*)/g)) add(m[1]);

  // Destructured bindings: const { a, b: c } = ..., const [d, e] = ...
  for (const m of src.matchAll(/\b(?:const|let|var)\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const t = part.split(':').pop().split('=')[0].replace(/[.\s]/g, '');
      if (/^[A-Za-z_$][\w$]*$/.test(t)) add(t);
    }
  }
  for (const m of src.matchAll(/\b(?:const|let|var)\s*\[([^\]]*)\]/g)) {
    for (const part of m[1].split(',')) {
      const t = part.split('=')[0].replace(/[.\s]/g, '');
      if (/^[A-Za-z_$][\w$]*$/.test(t)) add(t);
    }
  }

  // Parameters, of every function shape, plus catch and for-of bindings.
  for (const m of src.matchAll(/(?:function\*?\s*[A-Za-z_$\w$]*\s*|\bcatch\s*)\(([^)]*)\)/g)) {
    for (const part of m[1].split(',')) {
      const t = part.split(/[:=]/)[0].replace(/[{}[\].\s]/g, '');
      if (/^[A-Za-z_$][\w$]*$/.test(t)) add(t);
    }
  }
  for (const m of src.matchAll(/\(([^()]*)\)\s*=>/g)) {
    for (const part of m[1].split(',')) {
      const t = part.split(/[:=]/)[0].replace(/[{}[\].\s]/g, '');
      if (/^[A-Za-z_$][\w$]*$/.test(t)) add(t);
    }
  }
  for (const m of src.matchAll(/(?:^|[^\w$.])([A-Za-z_$][\w$]*)\s*=>/g)) add(m[1]);
  for (const m of src.matchAll(/\bfor\s*\(\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) add(m[1]);

  return names;
}

/* Everything that is not code, blanked.

   This started as a handful of regexes and they were not up to it: a template
   literal with a nested object in its `${}` broke the match and leaked its
   contents, and `/^[+-]?\d+$/` looked like a division followed by an
   identifier. Both showed up as a file "using `$` without importing it",
   which is the kind of false alarm that gets a checker muted.

   So it is a scanner. It walks once, tracking which of the six things it is
   inside, and blanks all of them: line comments, block comments, the three
   kinds of quote, and regex literals. Newlines are kept so line numbers still
   mean something. */
function codeOnly(src) {
  const out = [];
  /* One frame per template literal we are inside. 0 means we are in its text;
     anything higher is the brace depth inside a ${} hole. A hole is code, and
     a template inside a hole pushes another frame — which is the case the
     regex version got wrong, leaking `· ${band}` out of a nested literal and
     reporting it as a bare `$`. */
  const tpl = [];
  let i = 0;
  let prev = '';               // last significant character, for regex detection

  const blankTo = j => { while (i < j) { out.push(src[i] === '\n' ? '\n' : ' '); i++; } };

  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    const inText = tpl.length && tpl[tpl.length - 1] === 0;

    if (inText) {
      if (c === '\\') { out.push(' ', ' '); i += 2; continue; }
      if (c === '`') { out.push(' '); i++; tpl.pop(); prev = ')'; continue; }
      if (c === '$' && d === '{') { out.push(' ', '('); i += 2; tpl[tpl.length - 1] = 1; prev = '('; continue; }
      out.push(c === '\n' ? '\n' : ' '); i++; continue;
    }

    // Code: the top level, or inside a ${} hole.
    if (c === '/' && d === '/') {
      let j = src.indexOf('\n', i); if (j < 0) j = src.length;
      blankTo(j); continue;
    }
    if (c === '/' && d === '*') {
      let j = src.indexOf('*/', i + 2); j = j < 0 ? src.length : j + 2;
      blankTo(j); continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < src.length && src[j] !== c) j += src[j] === '\\' ? 2 : 1;
      blankTo(Math.min(j + 1, src.length));
      prev = 'x'; continue;
    }
    if (c === '`') { out.push(' '); i++; tpl.push(0); continue; }
    if (c === '/' && regexHere(prev)) {
      let j = i + 1, klass = false, ok = false;
      while (j < src.length) {
        const e = src[j];
        if (e === '\\') { j += 2; continue; }
        if (e === '[') klass = true;
        else if (e === ']') klass = false;
        else if (e === '/' && !klass) { ok = true; break; }
        else if (e === '\n') break;            // not a regex after all
        j++;
      }
      if (ok) {
        j++;
        while (j < src.length && /[gimsuyvd]/.test(src[j])) j++;
        blankTo(j);
        prev = 'x'; continue;
      }
    }
    if (tpl.length) {
      if (c === '{') tpl[tpl.length - 1]++;
      else if (c === '}') {
        tpl[tpl.length - 1]--;
        if (tpl[tpl.length - 1] === 0) { out.push(')'); i++; prev = ')'; continue; }
      }
    }
    out.push(c);
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return out.join('');
}

/* A slash starts a regex when what came before it cannot end an expression. */
function regexHere(prev) {
  return prev === '' || '(,=:[!&|?{};+-*%~^<>'.includes(prev);
}

/* Import and export clauses name things; they do not use them. Scanning them
   made `import { load as loadData }` look like a bare use of `load`. */
const stripModuleClauses = src => src
  .replace(/^\s*import\s[^;]*;?/gm, ' ')
  .replace(/^\s*export\s*\{[^}]*\}\s*(?:from\s*['"][^'"]*['"])?;?/gm, ' ');

for (const f of files) {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  const have = declaredIn(src);
  /* `...x` is a spread and a real use of `x`; the dot rule below is there to
     skip `obj.x`, which is not. Blanking the ellipsis keeps them apart. */
  const code = stripModuleClauses(codeOnly(src)).replace(/\.\.\./g, ' ');
  const flagged = new Set();

  for (const m of code.matchAll(/(^|[^\w$.'"`])([A-Za-z_$][\w$]*)/g)) {
    const name = m[2];
    if (flagged.has(name) || have.has(name) || AMBIENT.has(name)) continue;
    if (!owner.has(name)) continue;               // not a cross-module name at all
    if (owner.get(name).includes(f)) continue;    // it is this file's own export
    // A property name in an object literal is not a reference.
    if (new RegExp(`[{,]\\s*${name}\\s*:`).test(code)) continue;
    flagged.add(name);
    console.log(`  NOT IMPORTED    ${f} uses \`${name}\`, exported by ./${owner.get(name).join(', ./')}, without importing it`);
    problems++;
  }
}

/* ---- 4. is every import actually used? ---- */

for (const f of files) {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  const body = stripModuleClauses(codeOnly(src)).replace(/\.\.\./g, ' ');
  for (const imp of imports[f]) {
    for (const name of imp.wanted) {
      // `import { a as b }` binds b; `wanted` holds a, so check the local name.
      const local = localNameFor(src, imp.from, name);
      if (new RegExp(`(^|[^\\w$.])${local}($|[^\\w$])`).test(body)) continue;
      console.log(`  UNUSED IMPORT   ${f} imports { ${name} } from './${imp.from}' and never uses it`);
      problems++;
    }
  }
}

/* The name an import is bound to in this file, which is the `as` side when
   there is one. */
function localNameFor(src, from, imported) {
  const re = new RegExp(`import\\s+([^;]*?)\\s+from\\s*['"]\\./${from.replace('.', '\\.')}['"]`);
  const m = src.match(re);
  if (!m) return imported;
  const braces = m[1].match(/\{([^}]*)\}/);
  if (!braces) return imported;
  for (const part of braces[1].split(',')) {
    const bits = part.trim().split(/\s+as\s+/);
    if (bits[0].trim() === imported) return (bits[1] || bits[0]).trim();
  }
  return imported;
}

console.log(problems
  ? `\n  ${problems} problem(s) across ${files.length} modules\n`
  : `\n  ${files.length} modules parse, link, and import exactly what they use\n`);
process.exit(problems ? 1 : 0);
