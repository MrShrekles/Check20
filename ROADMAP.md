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
