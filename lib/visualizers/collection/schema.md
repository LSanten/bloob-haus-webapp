# Collection Shape

The `collection` shape resolves a **source** (folder, tag, field filter, or all) into a set of page-references and renders them through a chosen **display mode**. Query and display are two orthogonal axes of a single shape — the collection.

## What this shape is

A collection holds page-references and renders each as itself (closed-state card, list item, bubble, etc.) inside a uniform visual container. It is a **leaf shape with preserve policy**: identity of each contained page is never overridden — only presentation is uniform.

The visualizer (engine) behind this shape reads `graph.json` at build time (for `display: cards`) or at runtime (for all display modes via `browser.js`).

## Activation

### Code fence (inline, exact placement)

````markdown
```collection
source: folder=projects
display: cards
show_fields: building_type, location
```
````

### File scope (whole-page shape)

```yaml
---
bloob-shape: collection
---
```

Note: file-scope use emits a runtime placeholder. For build-time SEO-crawlable cards, use the code fence form.

## Settings

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `source` | string | `all` | What pages to include. See Source syntax below. |
| `display` | string | `cards` | Visual display mode. See Display modes below. |
| `sort` | string | `alpha` | `alpha` or `reverse-alpha` |
| `limit` | number | — | Max pages to show |
| `show_fields` | string or list | — | Extra frontmatter fields to show on each card. Must be declared in `sites/[site].yaml` `graph.extra_fields`. Comma-separated: `building_type, location` |
| `search` | string | combined | Default: metadata filter runs instantly, then Pagefind expands the result set (union). `basics` = metadata text-match only (no Pagefind). `off` = no search input. `fulltext` = alias for default combined mode. |
| `title` | string | `ARTICLES` | Label shown above `display: slider` |
| `id` | string | — | HTML id on the container element |

## Source syntax

| Source value | What it includes |
|---|---|
| `folder=projects` | All non-archived pages in the `projects` folder |
| `tag=sustainability` | All non-archived pages tagged `sustainability` |
| `field:building_type=School` | All pages where the `building_type` field equals `School` |
| `all` | All non-archived pages site-wide |

Folder-index stubs (`/projects/`, `/projects/index/`) are always excluded.

Phase 1: `folder=X`, `tag=X`, `field:KEY=VAL`, `all`.
Deferred: `links-here`, `links-from`, explicit wikilink lists in the body.

## Display modes

| Mode | Build-time SEO? | Notes |
|------|----------------|-------|
| `cards` | ✅ Yes (default) | 3-column grid with image, title, subtitle, optional fields |
| `list` | ❌ Runtime | Flat list with icon + title |
| `slider` | ❌ Runtime | Swiper carousel (requires Swiper loaded by theme) |
| `bubbles` | ❌ Runtime | Circular bubbles, scatter layout |
| `marbles` | ❌ Runtime | Interactive draggable marbles |

## Content policy

**Preserve.** Each page renders as a card showing its own title, subtitle, and image. The collection never overrides a page's identity — it is a place that holds page references in a uniform visual wrapper.

## Closed-state visual

When referenced via `[[wikilink]]` from another page: renders as a standard wikilink pill (default). A custom closed-state visual is not yet implemented (see `shapes.md` open question 5).

## Placement system

Flow. Cards are ordered by the `sort` setting, not by explicit authoring position. No slots or coordinates.

## Examples

### Projects grid with metadata fields (build-time SEO, searchable)

````markdown
```collection
source: folder=projects
display: cards
sort: alpha
show_fields: building_type, location, sqft
```
````

### Tag-filtered listing

````markdown
```collection
source: tag=sustainability
display: cards
limit: 6
```
````

### Articles slider

````markdown
```collection
source: folder=articles
display: slider
title: LATEST ARTICLES
```
````

### All-site listing

````markdown
```collection
source: all
display: list
sort: reverse-alpha
```
````

## Implementation notes

- Build-time `display: cards` reads `graph.json` from disk (written before Eleventy runs). The `transform()` path (code fence in Eleventy `addTransform`) is when graph.json is available.
- `renderFilescope()` (called during preprocessing, before graph.json exists) emits only a runtime placeholder.
- Images always carry `class="no-pswp"` to prevent the image-optimizer from wrapping them in a PhotoSwipe `<a>` tag (which would create an invalid nested anchor inside the card's own `<a href>`).
- Canonical card image class: `fp-card__image-wrap` (shared with folder-preview SEO render path; not the legacy `fp-card__img-wrap` from folder-preview's runtime renderCards).
- `field:` sources depend on `graph.extra_fields` in `sites/[site].yaml` — fields must be declared there to appear in graph.json.

## Upstreaming

This shape is **shared infrastructure** (`lib/visualizers/collection/`). All commits to these files should be in their own commit (no AE-specific files mixed in) so they can be cherry-picked upstream to `LSanten/bloob-haus-webapp`. See CLAUDE.md commit hygiene section.
