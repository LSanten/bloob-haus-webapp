# Tag pages as `.md` shape templates — design

**Date:** 2026-07-28
**Status:** design approved, not yet implemented
**Depends on:** `2026-07-28-shape-width-contract-design.md` (for the wide look)
**Scope:** shared (`themes/_base/**`, `scripts/assemble-src.js`, `docs/**`) + AE cleanup

---

## Problem

`themes/alter-engineers/pages/tags.njk` is a Nunjucks page that **hand-rolls `.fp-card` markup** —
deliberately, per its own comment, "so the styling carries forward to the future `collection`
shape". The `collection` shape now exists, so that markup is a duplicate renderer.

It has already cost real money this session:

1. **It diverges.** `/tags/<tag>/` and `/projects/` render visually similar cards from two different
   code paths. Any change to one silently skips the other.
2. **It broke under per-page loading.** Because the markup carries no `.collection-visualizer` or
   folder-preview container, detection dropped the stylesheet that styles it and every tag page
   collapsed to a full-width unstyled stack. Fixed by widening `folder-preview`'s `detect.selectors`
   — but the root cause is the duplicate markup, not the selector list. See DECISIONS 2026-07-28 and
   TECH-DEBT #42.
3. **It bypasses the container.** It renders into `base.njk`, which is *why* its cards are wider and
   look better — a layout accident, not a decision.

Routing tag pages through the shape makes the duplication impossible rather than merely fixed.

## The idea

Ship generic, content-shaped `.md` templates in `_base`, interpolated per tag by Eleventy pagination
and rendered through the shape system:

````markdown
---
bloob-shape: article
pagination:
  data: collections
  size: 1
  alias: tag
  filter: [all, nav, posts, tagList, sections, ...]
permalink: /tags/{{ tag | slugify }}/
eleventyExcludeFromCollections: true
eleventyComputed:
  title: "{{ tag | replace('-', ' ') }}"
---

```collection
source: tag={{ tag }}
display: cards
width: wide
```
````

**This works mechanically.** Eleventy runs Nunjucks preprocessing *before* markdown, so `{{ tag }}`
inside a code fence is interpolated before markdown-it sees it: `source: tag={{ tag }}` becomes
`source: tag=zero-net-energy`. Pagination is valid in `.md` frontmatter.

**Why it is better than tidiness:** one renderer, one stylesheet, one detection signature. The
`/projects/` and `/tags/<tag>/` surfaces stop being "similar-looking" and become *the same shape*, so
the identical look the client asked for is structural rather than maintained by hand. It also gives
tag pages the `article` header treatment (title + subtitle) that AE likes on `/projects/`.

## Design decisions

### 1. Override shadowing must be extension-agnostic

`assemble-src.js` overlays theme pages onto `_base` pages **by filename**. If `_base` ships `tags.md`
and a theme overrides with `tags.njk`, both are copied and both claim `/tags/:tag/` — a permalink
collision, not a clean override.

**Decision:** shadowing matches on **basename**, ignoring extension; the theme's file wins and the
`_base` file is not copied. Covered by a test in `tests/build/assemble-src.test.js`.

### 2. Tag membership moves from `collections[tag]` to `graph.json`

`tags.njk` uses Eleventy's `collections[tag]`. The collection shape resolves `tag=` against
`graph.json` nodes, which **additionally excludes archived pages and folder-index stubs**.

**Decision:** accept the `graph.json` semantics — they are more correct. But this is a set change, so
implementation must **diff the two page sets per tag** on the real AE vault and report any tag whose
membership changes before the switch is committed. Do not assume equivalence.

### 3. Pagination still needs a `collections`-driven page list

The `tag` values themselves still come from Eleventy's `collections` (that is what pagination
iterates). Only the *contents* of each page move to `graph.json`. Keep
`eleventyExcludeFromCollections: true`, or tag pages enter collections and begin tagging themselves.

### 4. `{{` in vault content becomes a build hazard

Making content-shaped `.md` templates a supported pattern means a stray `{{` in an author's markdown
is interpolated or throws.

**Decision:** the pattern applies to **builder-owned templates in `_base`/theme `pages/` only**, not
to vault content. Document it as such. Vault markdown keeps today's behaviour.

### 5. Scope: tags only

Folder indexes already have a working path (`folder-preview` + `_index.md` + the auto-generated stub
in `next-steps.md` item 2). Converting them is a **second, separate move** once tags proves the
pattern. Rule of Three: do not generalise a mechanism used once.

## Delivery

| Commit | Files |
|---|---|
| shared: extension-agnostic page shadowing | `scripts/assemble-src.js`, `tests/build/assemble-src.test.js` |
| shared: generic tag template | `themes/_base/pages/tags.md` |
| shared: docs | `docs/architecture/themes.md` (page-override rule), `shapes.md` |
| AE: adopt | delete `themes/alter-engineers/pages/tags.njk`, keep an override only if AE genuinely diverges |

## Verification

- Tag membership diff (decision 2) reported and reviewed **before** the switch commit.
- `/tags/<tag>/` and `/projects/` render from the same renderer — assert identical card markup
  structure in a test, not by eye.
- Per-page detection: the tag page's signature should now include `collection`. Re-run
  `scripts/audit-visualizer-detection.js`, **and** manually check the tag page in a browser —
  TECH-DEBT #42 means a green audit is necessary but not sufficient.
- Card grid still 2 columns at 390px/360px.
- After AE's `tags.njk` is deleted, `folder-preview`'s `.fp-cards`/`.fp-card` detect selectors may no
  longer be needed for AE — but **leave them**: they describe what that stylesheet owns, which is
  true regardless of who renders it (DECISIONS 2026-07-28).

## Out of scope

- Folder indexes (see decision 5).
- Vault-authored templates — a content vault shipping its own `tags.md` is a plausible future step
  and explicitly not built now.
- Any change to how tags themselves are parsed, normalised, or slugified.
