# ARC20 / Check20 Project Roadmap

---

## RULEBOOK SITE

### Codex UI — Complete
- ✅ Species, Spells, Gear/Weapons/Armor, Unions, Curses & Diseases, Enchanted Items, Crafting, Conditions
- ✅ Progression Items page (tab on enchanted.html)
- ✅ Reference page (How To Play) rebuilt as codex sections
- ✅ Row accent color system across all codex pages (by origin/lineage/type)
- ✅ `makeCodexImage()` shared infrastructure in codex-ui.js

### Codex UI — Pending
- ❌ Gods page — keep current card/tree UI (intentionally unique)
- ✅ Monster page — accents by `_group` (verified, `monsterbook.js:201`)
- ✅ Gear page — armor / items / enchanted accents added (`gear.js`, 2026-08-25)

### Data
- ✅ unions.json (12 unions, factions array ready for subcategories)
- ✅ curses.json (6 curses, 5 diseases, full progression steps)
- ✅ progression.json (24 items — 12 origin-based, 12 class-path-inspired)
- ✅ class-new.json — `checkType` tagging complete: 135 self / 71 enemy / 15 unneeded / 8 contested. The 14 remaining blanks all have an empty `check` field (no roll), so blank is correct and QC does not flag them.
- ✅ Monsterbase attacks — scripted first pass written 2026-08-25: melee on all 185, ranged on 78, spell on 121.
  Damage scales off size + rarity on one ladder; damage type mined from each entry's own feature text, falling
  back to origin. All 384 attack types are canonical per damage.json. Backup at `data/monsterbase.pre-attacks.bak.json`.
- ❌ Monsterbase attacks — refinement pass in Shek-Forge (names are per-body-plan, so e.g. every Predator reads
  "Rending Bite"; a few mined types are off, e.g. Hellknight's Oathbrand came out Acid instead of Vozian)
- ❌ monstermod.json uses 8 damage types that are not in damage.json's canonical 17 (Arcane, Cold, Tech, Crystal,
  Chrono, Chaos, Radiant, Physical). Mods override base attacks, so these break the damage-table lookup on the card.
- ❌ Magic Items — placeholder exists in enchanted.html progression tab
- ❌ 155 species missing images

### Pages
- ❌ Downtime page — currently static HTML; merchant content should eventually move to class page
- ❌ Lore page — unknown state, may need codex overhaul

---

## SHEK-FORGE

### Complete
- ✅ Species, Class, Enchanted, Spell, Monster, Gear editors
- ✅ QC system on Species and Class (structural + AI language + terminology)
- ✅ `checkType: ally|enemy` field on class steps with auto-detect QC

### Pending
- ✅ Curses editor (`editor-curses.js`, registered as `curse`)
- ✅ checkType tagging pass complete (see Data above)
- ✅ Unions editor (`editor-unions.js`, type `union`) — pair-list widget for leaders/goods/infoAccess/factions, structural + prose QC, table mode
- ✅ Progression Items editor (`editor-progression.js`, type `progression`) — item feature + 10-step track, points/step-count QC, table mode

---

## ACTIVE SHEET APP

### Phases Complete
- ✅ Phase 1 — Core character sheet (stats, wounds, armor, class resources)
- ✅ Phase 2 — Campaign space / room identity (named rooms, cinematic entry, unread badges)
- ✅ Phase 2B — Privacy / streamer mode
- ✅ Phase 3 — Initiative as chat sub-tab (narrator tracker + player sync)
- ✅ Phase 4 — Rich chat (markdown, typing indicator, Speaking As, targeting, crit/fumble cards)
- ✅ Phase 4A — Safety & moderation (reports, bans, admins/The Seven, moderation.html)
- ✅ Phase 4D — Auto-moderation (wordlist, strike ladder, temp mutes, expiry-aware)
- ✅ Phase 4E — Chat quality / anti-spam (rate limiting, message clamping, strikethrough markdown)

### Phases Pending
- ✅ Spells panel in active-sheet — favorites, sort by origin/name/cost, Cast modal with check chips + adv/dis + Roll & Spend MN, low-mana warning
- ✅ Resource editing — MN / classRes / custom current values are tap-to-type; pills hide at max 0 (2026-08-25, SW v30)
- ❌ Phase 4B — In-session safety signals (X-card, narrator whisper to player)
- ❌ Phase 4C — LFG / room invites (lower priority)
- ❌ Phase 5 — Push notifications (FCM, service-worker, opt-in, privacy-safe content)
- ❌ Phase 6 — Persistence (multiple rooms, session log export, player sheet sync for narrator)
- ❌ Phase 7 — CSS cleanup (after features stabilize)
- ❌ Phase 8 — Visual polish (themes, animated entry screen, pull-to-refresh)
- ❌ Narrator spell/ability filtering per room — merge into the existing "Campaign Settings Overhaul" project (per-room filters), not a standalone build.

### Fixed (2026-08-01)
- ✅ Species display bug: feature page / bio header / char-creation review showed "{variation} {lineage}" (e.g. "Jungle Human") instead of "{variation} {category}" (e.g. "Jungle Orc"). Now stores `speciesOption` and displays `name + option`; old saves auto-backfill on load. (`scripts/active-sheet.js`, `scripts/create-char.js`)
- ✅ Talent/path upgrade grouping: steps named "Base: Variant" (e.g. Steadfast's "Storm Stance: Resolve") weren't nesting under their base feature card — `featFamily()` now strips the ": Variant" suffix, not just roman numerals. This pattern is used across most of class-new.json, so it fixes grouping broadly, not just Steadfast. (`scripts/active-sheet.js`)
- ✅ Mobile swipe: the panel-cycle `ORDER` array was stale (referenced a nonexistent `'spells'` panel, was missing `'journal'` entirely — swiping into "Journal" or past "Actions" toward "Journal" was broken). Fixed the list, and added swipe-to-cycle for the Features panel's Class/Equipment/Spells sub-tabs specifically (main panel swipe still governs everywhere else). (`scripts/active-sheet.js`)
- ✅ XP: confirmed reducing total XP intentionally does NOT retroactively revoke purchased path/talent steps (by design, per your call) — added a red "over budget" style when available XP goes negative, as a visual nudge only. (`scripts/active-sheet.js`, `active-sheet.css`)

### Acknowledged, not changed
- ⚠️ Devtools admin bypass: `admins/{uid}` self-create in `firestore.rules` has no server-side passcode check — the passcode in `moderation.js` is plaintext client-side "obscurity" only. Accepted as low-risk for this campaign's player base per your call; real fix would be a Cloud Function or removing self-serve entirely if it ever matters.
- ⚠️ Equipment/resources panel reorder — dropped, you vetoed it yourself (equipment page doesn't work below resources).
- ⚠️ Dice Mode — built and then rolled back same day. All the info a player needs at the table is already visible on the existing check buttons; a dedicated mode didn't add enough to be worth the extra toggle/UI surface.

### Char Creation
- ✅ Build guide: ally/enemy check split (checkType field + heuristic fallback)
- ✅ checkType tags in class-new.json filled

### Outstanding (firebase.rules)
- ❌ Paste updated firestore.rules into Firebase Console (project check20-77406) and Publish
  - ban enforcement on rooms/{code}/chat
  - bans/automodStrikes self-write rules
  - See Phase 4D in full roadmap for details

---

---

## ORIGIN OVERHAUL (in progress)

Full audit: the Origin Overhaul Pre-Flight artifact. 12 origins -> 14.

### Done 2026-08-25
- ✅ **Single source for the origin standard.** `styles/origin-tokens.css` holds every colour as a
  `--origin-*` token; `scripts/origin-colors.js` reads them back at runtime and owns the canonical
  `ORIGINS` list. Was 7 divergent copies (origin-colors, editor-class, editor-curses,
  editor-progression, editor-spell, codex-ui.css, forge-codex.css). Shek-Forge serves the real files
  at `/shared` and `/shared-styles` rather than keeping its own.
  ⚠ Do NOT declare a global `const ORIGIN_COLORS` in any Forge script — origin-colors.js loads first
  and a duplicate top-level const breaks the entire Forge.
- ✅ Spellcasting origin tabs generated by `buildOriginTabs()` instead of 13 hand-written buttons.
- ✅ **celestial -> Divine, basic -> Pure.** 113 origin/source fields (55 + 58) across 9 data files,
  plus 19 curated prose/feature-name edits. Old names kept as aliases in `ORIGIN_ALIAS` so legacy
  data still resolves. Backups in `data/.backups/_manual/pre-rename/`.
  - Celestial is ALSO a realm/plane name — "the Celestial realm", the plane of Celestia, gods'
    `location` field, `REALM_MAP` in gods.js. Those deliberately kept the old name.
  - Warswarm III's "basic spellcasting" means rudimentary, not the origin. Deliberately unchanged.
  - `monstertype.json` (legacy) still holds the old values; the aliases cover it.

### Pending — blocked on the Notion rework
- ❌ Split `life` into Malform + Death (86 fields; ~17 need a human call; Malform lands thin)
- ❌ Add Void (additive; needs 10 class steps + ~7 spells authored)
- ❌ Normalize origin casing — species/monsterbase/class-new are lowercase, spells/progression are
  Title Case, gods is mixed. Deliberately deferred so it doesn't collide with the Notion re-import.
- ❌ Decide whether monster `baseType: celestial` (a body plan, 7 monsters) renames too
- ❌ New class: Crafter

---

## NEXT PRIORITY ORDER (reviewed 2026-08-25)

**Blocked on you — I can't do these**
1. Publish `firestore.rules` to the Firebase console (project check20-77406). Auto-moderation is live against rules that were never pushed.
2. Paste the Roll20 sheet into Roll20 and test. Statically validated, never run.
3. Copy working dir → `Rulebook Project Clone` → Netlify (bump the service worker cache).

**Next up for me**
4. Normalize monstermod.json's 8 non-canonical damage types against damage.json (small, and it silently breaks card lookups today)
5. Monster attack refinement pass in the Forge — the scripted first pass is in; names and a handful of mined types need a human eye

**After that**
6. Phase 4B safety signals (X-card / narrator whisper)
7. Campaign Settings Overhaul (per-room filters)
8. Downtime / Lore codex overhaul
9. 155 species images
10. Phase 5 push notifications, Phase 6 persistence
