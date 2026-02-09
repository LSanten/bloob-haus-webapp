# Search Architecture

**Status:** Phase 2 baseline planned, Phase 3 multi-index designed  
**Location:** `docs/architecture/`  
**Updated:** 2026-02-08

Search in Bloob Haus is built on Pagefind, a static search engine that indexes HTML at build time and serves results from chunked static files. No server required for basic search. This document describes how search works, how it interacts with tags, and how it evolves across phases.

---

## Core Concepts

| Concept | Definition |
|---------|------------|
| **Pagefind** | Rust-based static search engine. Indexes HTML post-build, serves results via WASM + chunked JSON files |
| **Search index** | A set of static files (`_site/pagefind/`) containing chunked content, metadata, and a WASM runtime |
| **Tag filter** | A Pagefind filter dimension. Users can narrow search results by tag without custom code |
| **Multi-index merging** | Pagefind's ability to load and combine multiple indexes at search time (Phase 3) |
| **Content tier** | A visibility level (public, privately-shared, undisclosed) that determines what gets indexed |

---

## Design Principles

1. **Static-first** -- Search works from static files served by a CDN. No search server, no API calls for public content.
2. **Build-time indexing** -- Pagefind runs after Eleventy, indexing the final rendered HTML. What you see is what gets indexed.
3. **Privacy by architecture** -- Content that doesn't enter the build pipeline can never appear in search. The publish filter is the single privacy gate.
4. **Progressive enhancement** -- Search works with Pagefind's built-in UI. Custom modals, keyboard shortcuts, and multi-index merging layer on top without replacing the foundation.
5. **Platform-agnostic** -- Pagefind is distributed as a Rust binary via npm with prebuilt binaries. Works on Vercel, Scaleway, Cloudflare, local dev.

---

## How Search Works (Phase 2)

### Build Pipeline

Search indexing is the final step in the build pipeline. Pagefind reads the rendered HTML in `_site/` and produces a self-contained search index.

```
preprocess-content.js
  ↓ tag-extractor.js extracts + normalizes tags
  ↓ tags written to frontmatter per page
  ↓ tagIndex.json written to src/_data/
Eleventy
  ↓ renders pages with data-pagefind-* attributes
  ↓ generates tag pages via pagination
_site/ (static HTML)
  ↓ npx pagefind --site _site
_site/pagefind/ (search index: WASM + chunked JSON)
```

The build command chains all steps:

```bash
npm run build
# → bundle-viz → clone → preprocess → eleventy → pagefind
```

### Data Attributes

Pagefind knows what to index through HTML `data-` attributes added to templates. These are invisible to users and have zero runtime cost.

| Attribute | Where | Purpose |
|-----------|-------|---------|
| `data-pagefind-body` | `<article>` wrapper | Scope indexing to content only (excludes nav, footer) |
| `data-pagefind-meta="title"` | `<h1>` | Designate the page title for search result display |
| `data-pagefind-filter="tag"` | Tag badge links | Register tags as a filterable dimension |
| `data-pagefind-ignore` | Tag list container | Prevent tag text from matching as content |

### Search UI

The baseline search experience is a dedicated page at `/search/` using Pagefind's built-in UI component (`PagefindUI`). It provides:

- Text search across all indexed content
- Tag filtering via a sidebar/dropdown
- Result excerpts with highlighted matches
- On-demand chunk loading (only fetches content for results you see)

```
/search/
  └── PagefindUI component
      ├── Text input with "Search notes..." placeholder
      ├── Tag filter panel (openFilters: ['tag'])
      └── Result list with titles, excerpts, highlights
```

Navigation includes a search link. Keyboard shortcuts (`Cmd+F`, `Cmd+O`) can optionally redirect to the search page.

### What Gets Indexed

Only content inside `data-pagefind-body` on pages in `_site/`. This means:

- Pages removed by `publish-filter.js` are never built, never indexed
- Navigation, footer, and chrome are excluded
- Tag badge text is excluded from content matching (but registered as filters)
- Tag pages (`/tags/recipe/`) and the search page itself are excluded from collections but may still be indexed as navigable pages

---

## Tag System Integration

Tags and search are deeply connected. Tags serve as both a browsable taxonomy (tag pages) and a search filter dimension (Pagefind filters).

### Tag Data Flow

```
Obsidian vault
  ↓ frontmatter tags: [recipe, vegan]
  ↓ inline #tags in body text
  ↓
publish-filter.js
  ↓ removes unpublished pages entirely
  ↓
tag-extractor.js
  ↓ extracts from frontmatter (array or string)
  ↓ extracts inline #tags from markdown body
  ↓ normalizes: lowercase, deduplicate, sort
  ↓ strips system tags (not-for-public, all, nav)
  ↓
preprocess-content.js
  ↓ writes normalized tags to each page's frontmatter
  ↓ builds tagIndex.json (tag → count + page list)
  ↓
Eleventy
  ↓ tagList collection → tag index page at /tags/
  ↓ pagination → individual tag pages at /tags/[tag]/
  ↓ tag badges on pages with data-pagefind-filter="tag"
  ↓
Pagefind
  ↓ indexes tag badges as filter values
  ↓ search UI shows tag filter panel
```

### Tag Privacy

Tags are not inherently public or private. Privacy is determined by pages:

1. `publish-filter.js` removes unpublished pages -- their tags never enter the pipeline
2. Tag extraction runs only on surviving pages
3. The system tag `not-for-public` is stripped from any published page's tag list (defense in depth)
4. A tag that exists only on private pages never appears anywhere in the built site
5. A tag shared between public and private pages only shows public pages on its tag page

### Hierarchical Tags

Obsidian-style nested tags (`#recipe/dessert/chocolate`) are supported. The tag extractor preserves the full path as a single tag string. Hierarchical browsing (showing all sub-tags under a parent) is a future enhancement.

---

## Search Results Anatomy

When a user searches, Pagefind returns results in two phases:

1. **Metadata** (instant) -- title, URL, filters, and a short excerpt are loaded from the index metadata. This is enough to render the result list.
2. **Content chunks** (on demand) -- full highlighted excerpts are loaded only when a result is expanded or visible. Chunks are small (~5KB each) and fetched individually.

This two-phase loading means search feels instant even for large sites. The initial index metadata is typically under 100KB.

```
User types query
  → WASM processes query against metadata (~10ms)
  → Result list rendered from metadata (titles, URLs, excerpts)
  → User scrolls/clicks
  → Content chunks fetched on demand for visible results
  → Highlighted excerpts rendered
```

---

## Phase 3: Multi-Index Search

When Bloob Haus supports authentication and privately-shared content, search expands from a single index to multiple merged indexes. The public search implementation does not change -- private indexes layer on top.

### Content Tiers

| Tier | Name | Indexed? | Served from |
|------|------|----------|-------------|
| 1 | **Public** | Single static Pagefind index | CDN (Cloudflare) |
| 2 | **Privately-shared** | Separate Pagefind index per visibility set | Auth-gated storage (Scaleway) |
| 3 | **Undisclosed** | Never indexed, never deployed | Never leaves the vault |

### Index Merging

Pagefind's JavaScript API supports loading multiple indexes at search time via `mergeIndex`. The client loads the public index by default, then conditionally merges private indexes based on authentication.

```
Anonymous visitor:
  loads: /pagefind/ (public index only)

Authenticated friend:
  loads: /pagefind/ (public) + /api/shared/{token}/pagefind/ (private subset)

Site owner:
  loads: /pagefind/ (public) + /api/owner/pagefind/ (all private content)
```

Results from merged indexes are unified and deduplicated automatically.

### Build Pipeline (Future)

```
preprocess → split by visibility tier
                 ↓                    ↓
            public pages          private pages
                 ↓                    ↓
            eleventy              eleventy
                 ↓                    ↓
            pagefind              pagefind
                 ↓                    ↓
            _site/pagefind/       _site-private/pagefind/
            (CDN)                 (auth-gated storage)
```

### Tag Pages with Auth

Tag pages use progressive enhancement when private content exists:

1. Server-rendered HTML lists public pages (works without JS, good for SEO)
2. Client-side JS checks auth, loads private index, appends additional results

A tag like `#recipe` that spans public and private pages shows only public pages to anonymous visitors, and the full set to authenticated users.

### What We Don't Build Yet

Phase 2 builds the public-only search foundation. The transition to multi-index requires:

- OAuth / auth system
- Webapp API for serving private indexes
- Modified build pipeline for dual output
- Client-side index merging logic

None of these require rewriting the Phase 2 implementation. The public Pagefind index continues to work exactly as built.

**Full details:** [Multi-Index Search Architecture](../implementation-plans/phases/phase-3/2026-02-08%20multi%20index%20search%20architecture.md)

---

## Folder Structure

```
_site/pagefind/                     ← Generated by Pagefind CLI (gitignored)
├── pagefind.js                     ← Client-side search runtime
├── pagefind-ui.js                  ← Pre-built search UI component
├── pagefind-ui.css                 ← UI styles (themeable via CSS variables)
├── pagefind.wasm                   ← Search engine (runs in browser)
├── pagefind-entry.json             ← Index metadata
└── fragment/ + index/              ← Chunked content and index data

src/
├── search.njk                      ← Search page (/search/)
├── tags.njk                        ← Tag page template (pagination)
├── tags-index.njk                  ← Tag index page (/tags/)
└── _includes/
    ├── partials/tags.njk           ← Tag badge partial
    └── layouts/page.njk            ← data-pagefind-* attributes

scripts/utils/
└── tag-extractor.js                ← Tag extraction + normalization

src/_data/
└── tagIndex.json                   ← Generated tag index (preprocessor output)
```

---

## Implementation Phases

| Phase | What's Built |
|-------|-------------|
| Phase 2 | Tag extractor, Eleventy tag pages, Pagefind public index, search page, tag filtering |
| Phase 2 (optional) | Keyboard shortcuts, custom search modal, Pagefind UI theming |
| Phase 3 | Multi-index merging, private indexes behind auth, progressive tag pages |
| Future | Cross-haus search, search analytics, offline/PWA index caching |

**Implementation plan (Phase 2):** [Tag System & Search Implementation](../implementation-plans/phases/phase-2/2026-02-08%20tag%20system%20and%20search%20implementation.md)  
**Implementation plan (Phase 3):** [Multi-Index Search Architecture](../implementation-plans/phases/phase-3/2026-02-08%20multi%20index%20search%20architecture.md)

---

## Related Documents

- [Visualizer Architecture](visualizers.md) -- Could tag browsing become a visualizer?
- [Magic Machines Architecture](magic-machines.md) -- Tag suggestion as a magic machine
- [DECISIONS.md](../implementation-plans/DECISIONS.md) -- Decision log (Pagefind over Lunr.js/FlexSearch)
- [ROADMAP.md](../implementation-plans/ROADMAP.md) -- Phase overview
