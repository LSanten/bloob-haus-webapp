# Technical Debt Inventory

Tracked items with severity, impact, and target resolution phase.

| # | Item | Severity | Impact | Target | Status |
|---|------|----------|--------|--------|--------|
| 1 | vercel.json still present | Low | Confusion | Next session | ✅ Done 2026-02-19 |
| 2 | 5 unused npm dependencies | Low | Confusion | Next session | ✅ Done 2026-02-19 |
| 3 | Hardcoded section collections in eleventy.config.js | Medium | Blocks multi-site | Before marbles | ✅ Done 2026-02-19 |
| 4 | Per-page visualizer activation not implemented | Medium | All viz load everywhere | Before adding more viz | ⬜ Open |
| 5 | Validation report not built | Medium | Silent broken links | Phase 2 completion | ✅ Done 2026-02-19 |
| 6 | Test coverage gaps (publish-filter, file-index-builder) | Medium | Regressions | Ongoing | ✅ Done 2026-02-19 |
| 7 | No error tracking (Sentry) | Low | Blind to prod issues | Before multi-user | ⬜ Open |
| 8 | No analytics | Low | No usage insight | When ready | ⬜ Open |
| 9 | Hugo output dirs still referenced in preprocess-content.js | Low | Dead code | Cleanup session | ⬜ Open |
| 10 | Local builds share single src/ and _site/ dir | Low | Must build sequentially | Future: per-site workspaces | ⬜ Open |
| 11 | eleventyComputed.js duplicates slug strategies inline | Low | Can't import ESM in Eleventy data files | Accept or migrate to CJS | ⬜ Open |
| 12 | Marbles: 25 broken links (MILIT-A/B, MESH-CAP-J/K/L/M, etc.) | Low | Dead links on site | Content cleanup | ⬜ Open |
| 13 | Marbles: Truncated attachment filenames with parentheses | Low | Missing images | Rename files in vault | ⬜ Open |
| 14 | Marbles: HEIC image not web-compatible (IMG_7966.heic) | Low | Missing image | Convert to JPEG/PNG | ⬜ Open |
| 15 | CI: No image optimization cache (rebuilds all images every deploy) | Medium | Slow builds | Add GH Actions cache step | ⬜ Open |
| 16 | mount_path causes doubled URLs (pathPrefix bug) | High | Blocks multi-repo "haus with rooms" architecture | Fix before Phase 3 multi-repo | ⬜ Open |
| 17 | buffbaby: image links broken site-wide | High | All images missing on live site | Investigate and fix image path/passthrough config | ⬜ Open |
| 18 | marbles: compressed/resized images not found (404) | Medium | Missing images on leons.bloob.haus for any optimized image | Debug image optimizer output path vs Eleventy passthrough | ⬜ Open |
| 19 | warm-kitchen: inline search widget + redundant mobile CSS | Low | Diverges from code-fence standard; mobile fix duplicated in main.css | Migrate warm-kitchen to index.md code-fence approach (see notes) | ⬜ Open |

## Notes

### #19 — warm-kitchen: migrate to index.md code-fence search

**Context:** marbles-pouch was migrated (2026-03-01) to use `\`\`\`search\`\`\`` code fences in the content repo's `index.md`. The search visualizer's `styles.css` now handles mobile reordering (results above filters) as a standard. warm-kitchen still uses the old approach.

**What needs to change:**

1. **`themes/warm-kitchen/pages/index.njk`** — remove the inline `<div class="home-search">` block (hardcoded `new PagefindUI(...)`, inline `<script src="pagefind-ui.js">`). The homepage content should come from the content repo's `index.md` instead.

2. **`themes/warm-kitchen/assets/css/main.css`** — remove the mobile reorder block (lines ~645–659). This is now handled globally by `lib/visualizers/search/styles.css` → `src/assets/css/visualizers/search.css`.

3. **warm-kitchen content repo** — add an `index.md` with a `\`\`\`search\`\`\`` fence (and `\`\`\`tags\`\`\`` if wanted). Match the pattern from `bloob-haus-marbles/index.md`.

4. **Verify** warm-kitchen `head.njk` loads `pagefind-ui.css` in `<head>` (anti-FOUC) — check if it already does via `_base/partials/head.njk` or theme-specific head.

**No FOUC risk** — pagefind-ui.css is already in `<head>` and the visualizer CSS is auto-included. The `order` CSS is layout-only, not a flash concern.

---

## How to Use
- Add new items when you notice debt
- Mark resolved items as ✅ Done with date
- Review at start of each session (see CLAUDE.md session checklist)
