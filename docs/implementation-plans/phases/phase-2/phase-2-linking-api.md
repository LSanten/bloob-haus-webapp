# Bloob Haus Implementation Plan: Phase 2

**Version:** 2.0 (rewritten for Eleventy)  
**Date:** February 2, 2026 (original) · February 5, 2026 (updated)  
**Status:** PARTIALLY COMPLETE  
**Goal:** Search, link graph data, and validation

---

## Overview

### Status After Migration

The Eleventy migration (M0-M7) completed several Phase 2 deliverables:

| Deliverable | Status | How |
|-------------|--------|-----|
| Backlinks display | ✅ Done | `withBacklinks` collection in `eleventy.config.js` (two-pass algorithm) |
| RSS feed | ✅ Done | `@11ty/eleventy-plugin-rss`, served at `/feed.xml` |
| Sitemap | ✅ Done | `src/sitemap.njk` → `/sitemap.xml` |
| Image optimization | ✅ Done | `@11ty/eleventy-img` via `addTransform` |
| Link resolution | ✅ Done | Preprocessor resolves wiki-links + markdown links, tracks broken links |
| `links.json` export | ❌ Remaining | Preprocessor tracks links but doesn't write JSON |
| `search-index.json` | ❌ Remaining | Not yet implemented |
| Client-side search | ❌ Remaining | No search UI |
| Formal validation report | ❌ Remaining | Preprocessor warns in console but no structured report |

### What Remains

1. **`links.json`** — Export bidirectional link data for graph visualization
2. **`search-index.json`** + client-side search UI
3. **Structured validation report** for broken links

---

## Technical Decisions (updated for Eleventy)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| JSON output location | `_site/` via Eleventy data + templates | Standard Eleventy pattern — generate as pages with `json` permalink |
| Link tracking | During preprocessing | Already parsing all files and tracking resolved/broken links |
| Backlinks rendering | Eleventy collection + Nunjucks partial | ✅ Already implemented in M5 |
| Search implementation | Pagefind (post-build indexer) | Zero-config, works on static HTML, no JSON generation needed |
| Validation timing | After preprocessing, before Eleventy build | Preprocessor already reports; formalize the output |

### Pagefind vs. Custom Search Index

The original plan called for building a custom `search-index.json` + Lunr.js. **Pagefind** is a better fit:

- Indexes the final rendered HTML (no custom extraction needed)
- Generates its own optimized index chunks (small download size)
- Provides a drop-in search UI component
- Handles excerpts, section filtering, and metadata automatically
- Zero maintenance — just runs as a post-build step

This eliminates Tasks 2.1-2.8 from the original plan entirely.

---

## Remaining Tasks

### 1. Link Graph JSON

**Goal:** Export link data for future graph visualization (D3.js, etc.)

The preprocessor already tracks outgoing links per file via `wiki-link-resolver.js` and `markdown-link-resolver.js` (both return `{ content, resolved[], broken[] }`). The `withBacklinks` collection in `eleventy.config.js` also computes backlinks.

**Approach:** Write a small script or Eleventy data file that aggregates preprocessor link data into a JSON file.

- [ ] **1.1** Modify preprocessor to write `_site/links.json` after processing all files (aggregate resolved links per page)
- [ ] **1.2** Include bidirectional data (outgoing + incoming)
- [ ] **1.3** Verify JSON is served at `/links.json`

**Output format:**
```json
{
  "nodes": [
    { "id": "/recipes/vegan-masala-chai/", "title": "Vegan Masala Chai", "section": "recipes" }
  ],
  "links": [
    { "source": "/recipes/vegan-masala-chai/", "target": "/notes/chai-tips/" }
  ]
}
```

> Note: Using nodes + links format (vs. nested per-page) because it maps directly to D3 force graph input.

---

### 2. Client-Side Search (Pagefind)

**Goal:** Add search to the site.

- [ ] **2.1** Install Pagefind (`npm install --save-dev pagefind`)
- [ ] **2.2** Add Pagefind indexing as post-build step (`npx pagefind --site _site`)
- [ ] **2.3** Add search UI to site (Pagefind provides a drop-in `<link>` + `<div id="search">`)
- [ ] **2.4** Style search to match site theme
- [ ] **2.5** Configure section filtering (recipes, notes, resources, etc.)

---

### 3. Validation Report

**Goal:** Formalize the broken link reporting that already happens.

The preprocessor already tracks `linksBroken` count and renders broken links with `class="broken-link"`. This task just adds structure.

- [ ] **3.1** Collect broken link details (source file, line, target) during preprocessing
- [ ] **3.2** Print structured report at end of build
- [ ] **3.3** Add `--strict` flag to fail build on broken links
- [ ] **3.4** Optionally write `_site/validation-report.json` for CI use

---

### 4. Integration & Documentation

- [ ] **4.1** Update `package.json` build script to include Pagefind step
- [ ] **4.2** Test full build pipeline
- [ ] **4.3** Update `CLAUDE_CONTEXT.md`
- [ ] **4.4** Update `CHANGELOG.md`

---

## Estimated Effort

| Task | Estimate |
|------|----------|
| 1. Link Graph JSON | 1-2 hours |
| 2. Client-Side Search (Pagefind) | 1-2 hours |
| 3. Validation Report | 1 hour |
| 4. Integration & Docs | 30 min |
| **Total** | **~4-6 hours** |

Down from the original 10-14 hour estimate — the migration knocked out most of the work.

---

## Prepares for Future Phases

- **Graph visualization** (Phase 4) — `links.json` provides D3-ready data
- **Link previews** (Phase 4) — Pagefind index includes excerpts for hover previews
- **Quick Mode** (Phase 3) — Search patterns can extend to user-submitted content

---

## Open Questions

1. ~~Backlinks for list pages?~~ → Resolved: backlinks show on all pages with incoming links
2. **Search UI placement?** — Dedicated `/search/` page, or inline in nav?
3. **Graph visualization scope?** — Just data export now, or build a simple graph page in Phase 2?

---

*Phase 2 is mostly done. The remaining work adds search and exports link data for future visualization.*
