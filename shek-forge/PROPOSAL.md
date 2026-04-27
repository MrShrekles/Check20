JSON Viewer / Shek Forge - Upgrade Proposal

Goals
- Improve usability for non-technical users
- Preserve existing file-structure-aware save behavior
- Add safety (backups, undo) and convenience (auto-reload, live previews)

Proposed Features

1) Auto-update (implemented client-side)
- Poll `GET /api/files` and auto-reload open file when changed on disk (unless user has unsaved edits).
- Provide toggle to enable/disable auto-update and a visible indicator.

2) File change history & soft backups
- On save, write a `.bak` or store timestamped copies (e.g., `file.json.bak-2026-04-06T12-00-00`) to allow easy rollback.
- Optional: store small undo stacks in-memory on the server for recent edits.

3) Improved JSON viewer/editor UX
- Allow switching between "Form view" (current field grid) and "Raw JSON" (full editor with syntax highlighting and validation).
- Add a read-only preview pane that shows how an entry would render (useful for content like markdown or stat blocks).
- Add inline validation: required fields, type mismatches, duplicate IDs/names.

4) Bulk operations
- Support bulk import/export, reordering entries, and batch-find/replace.

5) Better metadata & filtering
- Let server compute and return lightweight schema hints (common keys, sample values) to generate better field labels and editors.
- Add columnar list view with configurable visible fields (helpful for large datasets).

6) Performance
- For very large files, implement server-side paging or virtualization in the entry list; load entries in chunks.

7) Security & safety
- Add optional whitelist for allowed data folders; restrict access when deployed on shared machines.
- Add confirmation and optional dry-run for destructive actions.

8) Polishing
- Mobile/responsive tweaks, keyboard shortcuts (save, new entry, next/prev entry), accessible colors.

Implementation Notes
- Many upgrades are client-only and backward compatible with current `analyzeStructure`/`reconstructStructure` behavior.
- Backups require server-side changes to `server.js` to write additional files on save.

Next steps
- If you want, I can implement server-side backups and wire up a raw JSON editor toggle in the client.
