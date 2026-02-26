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

## How to Use
- Add new items when you notice debt
- Mark resolved items as ✅ Done with date
- Review at start of each session (see CLAUDE.md session checklist)
