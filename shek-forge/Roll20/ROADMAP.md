# ARC20 Roll20 Sheet — Build Roadmap

Files: `ARC20 Player Sheet.html`, `ARC20 Player Sheet.css`, `ARC20 API v8.js`
Reference (do not edit): `ARC20 Charsheet v8.html`, `ARC20 Style v8.css`

---

## Phase 0 — Foundation ✅ done

The sheet is rebuilt and statically validated. What exists now:

- Tabs: Core, Combat, Magic, Gear, Reference
- `&{template:arc20}` roll template (was missing entirely — every roll used to dump raw text)
- Always-visible roll bar: roll mode, temp mods, live global totals, vitals, active conditions
- **Roll architecture** — every d20 roll is assembled from four attributes:
  - `@{d20mode}` → `1d20` / `2d20kh1` / `2d20kl1`
  - `@{global_check}` / `@{global_attack}` / `@{global_damage}` ← `repeating_globals` + temp fields
  - `global_wounds` → `wounds_max`
- Repeating sections: globals, weapons, features, spells, armor, items, NPCs, Press On uses
- Workers: roll mode swap, global recalc, derived stats, condition string, point-buy sum, Press On box count, stale-tab migration

**Not done:** never opened in Roll20. Everything below is gated on Phase 1.

---

## Phase 1 — Live verification 🔴 blocking

Nothing else is worth building until the sheet is confirmed working in an actual campaign. Paste into *Settings → Custom Character Sheet Layout* of a throwaway campaign and walk this list.

### Test checklist

| # | Test | Watch for |
|---|---|---|
| 1 | Tabs switch | Radio `~` sibling selectors survive Roll20's DOM |
| 2 | Sheet workers fire at all | Open browser console, look for worker errors |
| 3 | Roll a check | Template renders as a styled card, not raw `{{...}}` text |
| 4 | Flip Adv → roll → flip Dis → roll | `2d20kh1` / `2d20kl1` appear in the roll tooltip |
| 5 | Add a Global Mod, toggle it on | CHK/ATK/DMG chips update; number lands in the next roll |
| 6 | Temp mod + global mod together | They stack, don't overwrite |
| 7 | Clear button | Zeroes all three temp fields |
| 8 | Weapon attack with crit range 18 | **`2d20kh1cs>18` modifier ordering** — highest-risk unknown |
| 9 | Weapon check-stat dropdown | **Nested `@{}` resolution** — `(@{agility}+@{agility_mod})` must resolve, not print literally |
| 10 | Blank weapon name → attack | Card still renders (subtitle empty, no malformed key) |
| 11 | Tick conditions | Roll-bar box updates; conditions appear in the card's red banner |
| 12 | Change Press On uses/day | Checkbox count follows |
| 13 | Damage type `[+Table]` link | Needs `ARC20 API v8.js` installed; otherwise expect a failed `!damage` in chat |
| 14 | Initiative | `&{tracker}` actually adds to the turn order |
| 15 | Open an old v8-era character | Migrates to Core tab instead of opening blank |
| 16 | Dark mode toggle | `body.sheet-darkmode` overrides land |
| 17 | Narrow the sheet window | Roll bar wraps without clipping |

### Likely failure points, ranked

1. **`cs>` after `kh1`** (#8). If it breaks: drop `cs>` from the button and add a separate `d20crit` attr, or accept crit detection only in Normal mode.
2. **Nested attribute resolution** (#9). v8 relies on this so it should hold; if not, flatten to ten separate per-stat attack buttons or a roll query.
3. **CSS class prefixing.** Roll20 prefixes class selectors with `sheet-`; `.repcontainer`/`.repitem`/`.repcontrol` are allowlisted. If repeating-section layout looks wrong, that's the cause.

**Definition of done:** every row above passes, or has a logged workaround.

---

## Phase 2 — Roll fidelity

Make the chat card do the rules work the player currently does in their head.

- **Outcome bands in the card.** ARC20's result table (1–4 fail + provoke @adv, 5–9 fail: provoke, 10–14 fail: provoke @dis, 15–19 success, 20+ success tiers) — surface the band as a line in the card using rolltemplate helpers (`{{#rollBetween() Result 15 19}}`). Biggest single QoL win on the list.
- **Crit / fumble styling.** `.fullcrit` / `.fullfail` CSS already exists; confirm it triggers and consider a card-wide accent.
- **Provoke button** in failed-check cards, mirroring v8's `attr_provoke` (`[provoke!](...)`).
- **Contested checks.** `@{target|character_name}` variants for Grab/Hold, Disarm, Demoralize.
- **Called Shot** (−10 for a condition) as a modifier toggle rather than manual math.
- **Half/Off/Non-action tagging** already stored on weapons and features — show it in the card so the table can see action economy.

---

## Phase 3 — Resource automation

Currently every resource is manually tracked. Convert the buttons that *say* what happens into buttons that *do* it.

- **Mana spend on cast.** Spell intent already carries its cost; deduct on Cast, warn (don't block) at insufficient mana.
- **Class resource spend** on features with a cost.
- **Press On** — actually restore 1 class resource + 1 mana, apply the repair/heal rolls, tick a use box.
- **Long Rest** — restore wounds/resources/mana, set armor to at least half, clear day-or-less conditions.
- **Damage intake helper.** One field: apply damage → armor first, overflow to wounds, auto-set Injured at 0 wounds.
- **Conditions with teeth:**
  - Slowed / Stunned / Exhaustion → halve `movement`
  - Stunned / Exhaustion → suggest (not force) Dis roll mode
  - Bleeding → flag that healing is blocked
  - Keep these advisory; never silently override a player's roll-mode choice.

---

## Phase 4 — Data-driven content

The earlier build deliberately skipped embedding the rulebook data files. Worth revisiting now that the roll layer is stable — but pick **one** delivery mechanism.

| Option | Pros | Cons |
|---|---|---|
| Embed JSON in the worker block | No API dependency, works for everyone | Sheet file balloons; Roll20 has size limits |
| API-side importer (`!addspell` etc. already exist in `ARC20 API v8.js`) | Keeps sheet lean, data updates without re-pasting | Pro subscription required; GM-only |
| Shek-Forge exports a paste-ready block | Full control, no runtime cost | Manual step per character |

Candidates: species/subspecies, class/path/talent/specialization, spell library, weapon and armor tables, damage-type tables.

**Decide the mechanism before building any of it.**

---

## Phase 5 — Character creation

- **Point-buy validator.** `total_checks` already sums; add a tier-based budget and an over/under indicator.
- **Progression tracking.** v8 had `repeating_progression` with XP-per-entry and a spent-XP rollup — port it.
- **Starting kit rollers.** API already has `!motivation` and `!trinket`; wealth roller exists.
- **Species/class autofill** — depends on Phase 4.

---

## Phase 6 — Table integration & polish

- **Token bar linking.** Document the intended mapping (bar1 wounds, bar2 armor, bar3 mana) and ship default token settings.
- **NPC / minion sheet.** v8 had a full NPC mode with threat actions and minion toggle. Decide: extend this sheet with a mode switch, or keep the player sheet clean and maintain a separate GM sheet.
- **Narrow-window layout.** The two-column tabs get cramped in a docked sheet window.
- **Dark mode audit** across every tab.
- **`sheet.json` + preview image** if this ever goes to the Roll20 sheet repo.

---

## Cross-cutting concerns

**Attribute-name parity with the Active Sheet app.** The mobile companion at `active-sheet/` and the Shek-Forge data files use their own field names. If character data should ever move between them, freeze a shared attribute vocabulary *before* Phase 4 adds fifty more fields. Cheap now, expensive later.

**API dependency is currently soft.** Only the `[+Table]` damage links need `ARC20 API v8.js`. Phases 3 and 4 could make it hard. Keep the sheet functional without it, or state the requirement plainly.

**v8 stays untouched** as the reference implementation. When something works there and not here, diff it.

---

## Suggested order

```
Phase 1  ──▶  Phase 2  ──▶  Phase 3  ──▶  Phase 6 (partial: token bars)
                              │
                              └──▶  Phase 4 (decide mechanism)  ──▶  Phase 5
```

Phase 1 is the gate. Phase 2 delivers the most player-felt value per hour. Phase 4 is the largest and most reversible-if-wrong, so it goes after the sheet has proven itself at a real table.
