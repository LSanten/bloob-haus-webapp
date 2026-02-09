# Multi-Index Search Architecture: Privacy Tiers & Cross-Room Search

**Purpose:** Document the future search architecture for when Bloob Haus supports authentication, privately-shared content, and multi-room sites  
**Created:** February 8, 2026  
**Status:** 📋 FUTURE (not needed until webapp + auth in Phase 3+)  
**Depends on:** Basic Pagefind integration (public-only search), OAuth/auth system, hosting architecture  
**Related:** [Search Architecture](../../../architecture/search.md), [Hosting Architecture](../../../bloobhaus-obsidian/Bloob%20Haus%20Webapp/Research/2026-02-06%20Bloob%20Haus%20Hosting%20Architecture.md), [Phase 2 Plan](../phase-2/phase-2-linking-api.md)

---

## Overview

When Bloob Haus supports multiple users, authentication, and privately-shared content, search must adapt. A visitor's searchable content depends on **who they are** and **what's been shared with them**. This document lays out how Pagefind's multi-index merging capability solves this without requiring a custom search engine.

---

## The Three Content Tiers

| Tier | Name | Visibility | Enters build pipeline? | Indexed for search? |
|------|------|------------|----------------------|-------------------|
| 1 | **Public** | Anyone on the web | ✅ Yes | ✅ Static Pagefind index, always available |
| 2 | **Privately-shared** | Only via share link or account invitation | ✅ Yes (separate build) | ✅ Separate Pagefind index, served behind auth |
| 3 | **Undisclosed** | Never leaves the vault | ❌ Never | ❌ Never indexed, never deployed |

**Key principle:** Tier 3 content never touches any server, any build process, or any index. The existing `publish-filter.js` with `#not-for-public` tagging handles this today and continues to handle it in the future.

The architectural challenge is Tier 2: content that exists on a server but is only visible to specific people.

---

## How Pagefind Multi-Index Merging Works

Pagefind is not limited to a single index. Its JavaScript API supports loading and merging multiple indexes at search time. Each index is a self-contained set of static files (chunks, metadata, WASM) that can live at different paths or even different origins.

```js
// Core API for merging indexes
const pagefind = await import("/pagefind/pagefind.js");

// 1. Load the public index (always available, no auth)
await pagefind.init();

// 2. If the user is authenticated, merge their private index
if (userSession) {
  await pagefind.mergeIndex("/api/private-pagefind/", {
    bundlePath: `/api/users/${userId}/pagefind/`
  });
}

// 3. All searches now span both indexes transparently
const results = await pagefind.search("chocolate cake");
// → Returns results from public pages AND privately-shared pages
```

The `mergeIndex` call is additive — you can call it multiple times to merge indexes from multiple rooms/repos. Results are unified and deduplicated automatically.

---

## Architecture Per User Scenario

### Scenario 1: Anonymous Visitor (no auth)

```
leon.bloob.haus
  └── Search loads: /pagefind/ (public index only)

Searchable content: All public pages across all rooms
```

The static Pagefind index is built at deploy time and served from the CDN (Cloudflare). No server-side logic needed. This is what we build first.

### Scenario 2: Friend with Share Link (limited auth)

```
leon.bloob.haus
  └── Search loads:
      ├── /pagefind/                          (public index)
      └── /api/shared/{token}/pagefind/       (private index for shared set)

Searchable content: All public pages + specific privately-shared pages
```

The share link contains a capability token. The webapp validates the token and serves the appropriate private Pagefind index. The index only contains pages that were shared via that link or invitation.

### Scenario 3: Site Owner (full auth)

```
leon.bloob.haus
  └── Search loads:
      ├── /pagefind/                          (public index)
      └── /api/owner/pagefind/                (all private content index)

Searchable content: Everything except Tier 3 (undisclosed)
```

The owner sees all published content (public + all privately-shared). Tier 3 content still never appears because it never enters the build pipeline.

### Scenario 4: Multi-Room Site (multiple repos)

```
leon.bloob.haus/
  ├── recipes/     → repo: buffbaby        (public index A)
  ├── notes/       → repo: leon-notes      (public index B + private index B')
  └── journal/     → repo: leon-journal    (private index C only, no public)

Anonymous visitor search:
  loads: index A + index B
  
Authenticated friend search:
  loads: index A + index B + B' (shared pages from notes)
  
Owner search:
  loads: index A + index B + B' + index C
```

Each repo builds its own Pagefind index independently. The client-side code merges the appropriate combination based on the user's access level.

---

## Build Pipeline for Multi-Index

### Current Pipeline (Public Only)

```
clone → preprocess (publish-filter) → eleventy → pagefind
                                                    ↓
                                              _site/pagefind/
                                              (single public index)
```

### Future Pipeline (Public + Private)

```
clone → preprocess → split by visibility tier
                         ↓                    ↓
                    public pages          private pages
                         ↓                    ↓
                    eleventy (public)     eleventy (private)
                         ↓                    ↓
                    _site/                _site-private/
                         ↓                    ↓
                    pagefind              pagefind
                         ↓                    ↓
                    _site/pagefind/       _site-private/pagefind/
                    (CDN: Cloudflare)     (Auth: Scaleway)
```

The preprocessing pipeline already knows about visibility because `publish-filter.js` categorizes files. The future change is running **two Eleventy builds** (or one build with two output targets) and **two Pagefind indexing passes**.

### How the Preprocessor Splits Content

```js
// Future enhancement to preprocess-content.js
const { published, excluded } = await filterPublishableFiles(contentDir);

// Further split published files by visibility
const publicPages = published.filter(p => p.visibility === 'public');
const privatePages = published.filter(p => p.visibility === 'private-shared');
// excluded = Tier 3 (undisclosed), never processed further

// Build public site
await buildSite(publicPages, { outputDir: '_site' });
await runPagefind('_site');

// Build private content (pages only, no full site chrome needed)
await buildSite(privatePages, { outputDir: '_site-private' });
await runPagefind('_site-private');
```

### Visibility Frontmatter

Users would control visibility in their Obsidian frontmatter:

```yaml
---
title: Secret Family Recipe
visibility: private-shared
shared-with:
  - friend@email.com
  - share-link-token-abc123
---
```

Or using tags in the blocklist model:

```yaml
---
tags:
  - recipe
  - family
  - "#private-shared"
---
```

The exact frontmatter schema is a future design decision. The point is that the preprocessor can read it and route content accordingly.

---

## Serving Private Indexes

### Option A: Scaleway Object Storage + Signed URLs

Private Pagefind indexes are stored in Scaleway Object Storage (EU-compliant). The webapp generates short-lived signed URLs for authenticated users.

```
Client → Webapp API (validate auth) → Generate signed URL → Client fetches index from Scaleway
```

**Pros:** Simple, stateless, CDN-cacheable per-user  
**Cons:** Signed URLs have expiration management

### Option B: Webapp API Proxy

The webapp API proxies requests to private indexes, validating auth on each request.

```
Client → /api/private-pagefind/* → Webapp validates auth → Serves index files from storage
```

**Pros:** Full control, no URL management  
**Cons:** Every search chunk request goes through the API

### Recommendation

**Option A (signed URLs)** for production. Pagefind loads multiple small chunk files per search — proxying each one through an API adds unnecessary latency. Signed URLs let the browser fetch chunks directly from storage after a single auth check.

---

## Per-User Index Generation Strategies

### Strategy 1: Pre-built Indexes per Visibility Set

At build time, generate a separate Pagefind index for each unique visibility configuration. If there are 3 share links with different page sets, build 3 indexes.

**Pros:** Fast search (pre-computed)  
**Cons:** Combinatorial explosion if many different share configurations exist

### Strategy 2: Per-Page Granular Indexes

Build one Pagefind index containing ALL private pages, with metadata marking which share tokens/users can access each page. At search time, filter results client-side.

```js
// Each private page has access metadata
<div data-pagefind-filter="access-token" data-pagefind-filter-value="token-abc123">
```

```js
// Client filters by their token
const results = await pagefind.search("query", {
  filters: { "access-token": { any: [userToken] } }
});
```

**Pros:** One index for all private content, simple build  
**Cons:** All private page titles/excerpts are in the index (though content chunks are loaded on-demand). Requires trust that client-side filtering is sufficient, or server-side validation of results.

### Strategy 3: Hybrid

Pre-build a small number of common visibility sets (e.g., "all private content for owner," "shared-with-friends tier"). For custom share links, use Strategy 2's filtering approach.

### Recommendation

**Strategy 2 (per-page granular)** is the most practical starting point. It scales linearly with content, not combinatorially with share configurations. The security concern (metadata visible in the index) is manageable because Pagefind only exposes titles and short excerpts in the index metadata — full content is loaded via separate chunk files that can be individually access-controlled.

---

## Impact on Tag System

Tags span visibility tiers. A tag like `#recipe` might appear on both public and private pages. The tag system must handle this:

- **Public tag index:** Only shows public pages. Built from the public Pagefind index.
- **Authenticated tag index:** Shows public + privately-shared pages the user can access. Built by merging indexes.
- **Tag pages (`/tags/recipe/`):** Static HTML pages only list public pages. Privately-shared pages appear dynamically via JavaScript when the user is authenticated.

This means tag pages need a **progressive enhancement** approach:
1. Server-rendered HTML lists public pages (works without JS, good for SEO)
2. Client-side JS checks auth, loads private index, appends additional results

---

## What We Don't Build Yet

This entire document is future architecture. The current implementation should:

1. ✅ Build a single public Pagefind index
2. ✅ Use `publish-filter.js` to keep Tier 3 content out of the pipeline
3. ✅ Structure the tag extractor and Pagefind integration modularly so they can be extended
4. ❌ NOT implement auth, private indexes, or multi-index merging

The transition from public-only to multi-tier search requires:
- OAuth / auth system (Phase 3)
- Webapp API for serving private indexes
- Modified build pipeline for dual-output
- Client-side index merging logic

None of these require rewriting the public search implementation. The public Pagefind index continues to work exactly as built — private indexes layer on top via `mergeIndex`.

---

## Open Questions for Future

1. **Index freshness:** When a privately-shared page is updated, how quickly does the private index rebuild? Real-time via webhooks, or batch?
2. **Revocation:** When a share link is revoked, the private index must be rebuilt to exclude those pages. How fast does this need to happen?
3. **Cross-haus search:** Could a user search across multiple Bloob Haus sites they have access to? (e.g., searching both `leon.bloob.haus` and `whitney.bloob.haus` if they have access to both)
4. **Search analytics:** Should site owners see what people search for? Privacy implications?
5. **Offline / PWA:** If Bloob Haus supports offline mode, how do private indexes get cached securely on-device?

---

*This document should be revisited when Phase 3 (auth + webapp) planning begins.*