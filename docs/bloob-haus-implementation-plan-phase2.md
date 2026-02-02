# Bloob Haus Implementation Plan: Phase 2

**Version:** 1.0  
**Date:** February 2, 2026  
**Status:** PLANNING  
**Goal:** Enhanced linking, search foundation, and API groundwork

---

## Overview

### What We're Building in Phase 2

Building on the live recipe site (buffbaby.bloob.haus), Phase 2 adds:
1. **JSON generation** for search and link data
2. **Backlinks display** on pages
3. **Pre-build validation** for broken links
4. **RSS feed** for content updates
5. **Foundation for Phase 3** (Quick Mode, multi-user)

### Success Criteria

- [ ] `links.json` generated during build with bidirectional link data
- [ ] `search-index.json` generated with titles, excerpts, tags, images
- [ ] Backlinks section displays on each page
- [ ] Build warns about broken links before Hugo runs
- [ ] RSS feed available at `/index.xml`

### Out of Scope for Phase 2

- User accounts / authentication
- Quick Mode (paste markdown in browser)
- Multiple sites / subdomains
- Full visualizer registry system
- Webapp UI

### Relationship to Original Vision

From the Vicki engineering report, this maps to:
- **Phase 2 (Repo Mode)** - We're enhancing the existing repo mode
- Prepares data structures needed for Phase 3 (Quick Mode) and Phase 4 (Sharing)

---

## Technical Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| JSON output location | `hugo/static/` | Served as static files, accessible to JS |
| Link tracking | During preprocessing | Already parsing all files, add tracking there |
| Backlinks rendering | Hugo partial + JS | Partial reads JSON, JS for interactivity |
| RSS generation | Hugo built-in | Native support, no custom code needed |
| Validation timing | After preprocessing, before Hugo | Fail fast with clear error messages |

---

## Detailed Tasks

### 1. Link Tracking Infrastructure

**Estimated time:** 2-3 hours

- [ ] **1.1** Modify `wiki-link-resolver.js` to track outgoing links per file
- [ ] **1.2** Modify `markdown-link-resolver.js` to track outgoing links per file
- [ ] **1.3** Create `scripts/utils/link-tracker.js` to aggregate link data
- [ ] **1.4** Compute incoming links (backlinks) by inverting outgoing links
- [ ] **1.5** Write `links.json` to `hugo/static/links.json`

**Output format (`links.json`):**
```json
{
  "recipes/vegan-masala-chai": {
    "outgoing": ["/recipes/spice-guide/", "/notes/chai-tips/"],
    "incoming": ["/recipes/breakfast-ideas/", "/lists-of-favorites/drinks/"]
  }
}
```

**Success criteria:** Build generates `links.json` with accurate bidirectional links.

---

### 2. Search Index Generation

**Estimated time:** 2-3 hours

- [ ] **2.1** Create `scripts/utils/search-index-builder.js`
- [ ] **2.2** Extract title (first `#` or `##` heading)
- [ ] **2.3** Extract subtitle (heading immediately after title, if exists)
- [ ] **2.4** Extract excerpt (first paragraph, truncated to ~200 chars)
- [ ] **2.5** Extract tags from frontmatter
- [ ] **2.6** Extract section from folder path
- [ ] **2.7** Extract first image (frontmatter `image:` or first `![]()` in content)
- [ ] **2.8** Write `search-index.json` to `hugo/static/search-index.json`

**Output format (`search-index.json`):**
```json
{
  "recipes/vegan-masala-chai": {
    "title": "Vegan Masala Chai",
    "subtitle": "A warming spiced tea",
    "excerpt": "This traditional Indian tea combines black tea with aromatic spices...",
    "url": "/recipes/vegan-masala-chai/",
    "tags": ["drinks", "vegan", "indian"],
    "section": "recipes",
    "image": "/media/chai-photo.jpg"
  }
}
```

**Success criteria:** Build generates `search-index.json` with all fields populated.

---

### 3. Backlinks Display

**Estimated time:** 2 hours

- [ ] **3.1** Create `hugo/layouts/partials/backlinks.html`
- [ ] **3.2** Load `links.json` via Hugo's `getJSON`
- [ ] **3.3** Display "Pages that link here" section at bottom of single pages
- [ ] **3.4** Style backlinks section in `main.css`
- [ ] **3.5** Include partial in `single.html`

**Design:**
- Only show if there are incoming links
- List as simple links with page titles
- Subtle styling (not prominent, but discoverable)

**Success criteria:** Recipe pages show backlinks when other pages link to them.

---

### 4. Pre-build Validation

**Estimated time:** 1-2 hours

- [ ] **4.1** Create `scripts/utils/validator.js`
- [ ] **4.2** Check for broken wiki-links (target not in index)
- [ ] **4.3** Check for broken markdown links
- [ ] **4.4** Check for missing images
- [ ] **4.5** Output validation report (warnings, not failures by default)
- [ ] **4.6** Add `--strict` flag option to fail build on warnings

**Output:**
```
⚠️  Validation Report:
   Broken links: 2
   - recipes/chai.md:15 → [[Missing Page]]
   - notes/tips.md:8 → [text](nonexistent.md)
   Missing images: 0
   
Build continuing (use --strict to fail on warnings)
```

**Success criteria:** Build reports broken links clearly before Hugo runs.

---

### 5. RSS Feed

**Estimated time:** 30 minutes

- [ ] **5.1** Enable RSS in `hugo/config.yaml`
- [ ] **5.2** Configure feed settings (title, description, limit)
- [ ] **5.3** Test feed at `/index.xml`
- [ ] **5.4** Add RSS link to `head.html`

**Config addition:**
```yaml
outputs:
  home:
    - HTML
    - RSS

rssLimit: 20
```

**Success criteria:** Valid RSS feed available, auto-discoverable.

---

### 6. Integration & Testing

**Estimated time:** 1-2 hours

- [ ] **6.1** Update `preprocess-content.js` to call new utilities
- [ ] **6.2** Update build order: preprocess → validate → hugo
- [ ] **6.3** Test with buffbaby content
- [ ] **6.4** Verify JSON files are served correctly
- [ ] **6.5** Verify backlinks display correctly
- [ ] **6.6** Test RSS feed in feed reader

**Success criteria:** Full build works, all features functional.

---

### 7. Documentation

**Estimated time:** 1 hour

- [ ] **7.1** Update `CLAUDE_CONTEXT.md` with new features
- [ ] **7.2** Update `TODO.md` with session log
- [ ] **7.3** Document JSON formats in roadmap
- [ ] **7.4** Add Phase 2 to completion summary

---

## Estimated Total Time

| Section | Estimated Hours |
|---------|-----------------|
| 1. Link Tracking | 2-3 |
| 2. Search Index | 2-3 |
| 3. Backlinks Display | 2 |
| 4. Pre-build Validation | 1-2 |
| 5. RSS Feed | 0.5 |
| 6. Integration & Testing | 1-2 |
| 7. Documentation | 1 |
| **Total** | **10-14 hours** |

---

## Dependencies on Phase 1

Phase 2 builds on:
- Preprocessing pipeline (adding link tracking to existing resolvers)
- File index builder (already indexes all pages)
- Hugo templates (adding backlinks partial)

No breaking changes to Phase 1 functionality.

---

## Prepares for Phase 3

Phase 2 outputs enable:
- **Search UI** - `search-index.json` ready for client-side search
- **Graph visualization** - `links.json` has the data for D3/vis.js
- **Quick Mode** - JSON generation pattern can be reused for DB-stored content

---

## Open Questions

1. **Backlinks for list pages?** Should section pages (like `/recipes/`) show backlinks?
2. **Search UI in Phase 2?** Or defer to Phase 3 with Quick Mode?
3. **Link preview data?** Should `search-index.json` include enough for hover previews?

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| JSON files too large | Implement pagination or lazy loading in Phase 3 |
| Backlinks slow down build | Only compute on full builds, cache for dev mode |
| RSS breaks with special characters | Use Hugo's built-in escaping |

---

*Phase 2 builds the data foundation for search, discovery, and the future webapp.*
