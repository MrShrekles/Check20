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
- ❌ Monster page — color accents by `_group` (hash-based, done in monsterbook.js but verify)
- ❌ Gear page — armor/items/enchanted sections need accent colors (weapons done)

### Data
- ✅ unions.json (12 unions, factions array ready for subcategories)
- ✅ curses.json (6 curses, 5 diseases, full progression steps)
- ✅ progression.json (24 items — 12 origin-based, 12 class-path-inspired)
- ❌ class-new.json — 222 steps need `checkType: ally|enemy` tagged via Shek-Forge QC
- ❌ Monsterbase attacks still need filling via Shek-Forge (185 entries)
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
- ❌ Tag all 222 class steps with checkType (Forge QC task, use the ⚠ badge + one-click fix)
- ❌ Unions editor (currently no Forge editor for unions.json)
- ❌ Progression Items editor (currently no Forge editor for progression.json)
- ❌ Curses editor (currently no Forge editor for curses.json)

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
- ❌ **Spells panel** in active-sheet (next up — data and codex UI exist on spellcasting.html)
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
- ❌ checkType tags in class-new.json must be filled for full accuracy

### Outstanding (firebase.rules)
- ❌ Paste updated firestore.rules into Firebase Console (project check20-77406) and Publish
  - ban enforcement on rooms/{code}/chat
  - bans/automodStrikes self-write rules
  - See Phase 4D in full roadmap for details

---

## NEXT PRIORITY ORDER (suggested)
1. Tag class steps with checkType in Shek-Forge (QC one-click, use the ⚠ badges)
2. Active sheet — Spells panel
3. Forge editors for Unions / Progression Items / Curses
4. Push firestore.rules to Firebase
5. Phase 4B safety signals (X-card whisper)
