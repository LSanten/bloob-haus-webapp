# Collection Shape

The `collection` shape resolves a **source** (folder, tag, field filter, or all) into a set of page-references and renders them through a chosen **display mode**. Query and display are two orthogonal axes of a single shape — the collection.

## What this shape is

A collection holds page-references and renders each as itself (closed-state card, list item, bubble, etc.) inside a uniform visual container. It is a **leaf shape with preserve policy**: identity of each contained page is never overridden — only presentation is uniform.

The visualizer (engine) behind this shape reads `graph.json` at build time and renders **every** display mode to HTML then. `browser.js` only adds behavior on top. (Before 2026-07-27 only `display: cards` rendered at build time; see the pure-renderer standard in `docs/architecture/visualizers.md`.)

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

File-scope use is also rendered at build time: `renderFilescope()` runs during preprocessing (before `graph.json` exists) and emits the settings container, then `transform()` — which runs inside Eleventy, where `graph.json` does exist — fills it in during the same build.

## Settings

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `source` | string | `all` | What pages to include. See Source syntax below. |
| `display` | string | `cards` | Visual display mode. See Display modes below. |
| `sort` | string | `alpha` | `alpha` or `reverse-alpha` |
| `limit` | number | — | Max pages to show |
| `show_fields` | string or list | — | Extra frontmatter fields to show on each card. Must be declared in `sites/[site].yaml` `graph.extra_fields`. Comma-separated: `building_type, location` |
| `search` | string | combined | Default: metadata filter runs instantly, then Pagefind expands the result set (union). `basics` = metadata text-match only (no Pagefind). `off` = no search input. `fulltext` = alias for default combined mode. |
| `width` | string | `wide` | `prose` \| `wide` \| `full`. How wide the collection asks to be. See Width preference below. |
| `title` | string | `ARTICLES` | Label shown above `display: slider` |
| `placeholder` | string | `Search...` | Placeholder text for the filter input |
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

**All display modes are rendered at build time and are fully crawlable.** Since 2026-07-27 the
display mode is a purely visual choice — it has no effect on indexability. `browser.js` only adds
behavior (drag physics, Swiper) on top of markup that already exists.

| Mode | Notes | Runtime behavior added |
|------|-------|------------------------|
| `cards` (default) | 3-column grid with image, title, subtitle, optional fields | search filtering |
| `list` | Flat list with icon + title | search filtering |
| `slider` | Swiper carousel (requires Swiper loaded by theme) | Swiper init |
| `bubbles` | Circular bubbles, scatter layout | search filtering (CSS-only hover) |
| `marbles` | Draggable marbles with collision + float | drag physics, search filtering |

## Width preference

**Declared default: `wide`** (`manifest.json` → `"width": "wide"`).

A collection is a card grid, not prose, so it asks to be wider than a reading column. The request is
a *preference*, not an instruction — three things decide what actually happens:

1. **The theme is the final arbiter.** It defines how wide "wide" is, via `--shape-width-wide`. A
   theme that never sets it renders `wide` at prose measure — identical to having no width contract
   at all. This is why `wide` is safe as a shared default.
2. **The instance beats the shape default.** `width: prose` in the fence pins one collection to the
   reading column.
3. **An unknown value falls back to `prose`, silently.** A typo never breaks a page.

Container behaviour follows the **container-contents policy**, not a separate rule: `article` is a
`preserve` container, so it lets a nested collection take the width it asks for. An `override`
container imposes its own and ignores the request.

On phones the breakout is disabled entirely — every width renders at container measure, so the card
column ladder (3 → 2 → 1) is the only thing deciding phone layout.

````markdown
```collection
source: tag=zero-net-energy
display: cards
width: wide
```
````

Full contract: `docs/architecture/shapes.md` → "Width preference".

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

This shape is the reference implementation of the **pure-renderer standard**
(`docs/architecture/visualizers.md`). File roles:

| File | Purity | Role |
|---|---|---|
| `resolve.js` | pure | source string → filtered/sorted nodes. Nodes are **injected**, never read here. |
| `renderer.js` | pure | nodes + settings → complete HTML string, for all five display modes |
| `index.js` | host | reads `graph.json` from disk, calls resolve → render |
| `browser.js` | behavior | drag physics, Swiper, search filtering. **Never builds markup.** |

- All five display modes render at build time; `browser.js` only attaches behavior.
- `browser.js` retains a fallback path for when `graph.json` was unavailable at build time — it calls the *same* `renderer.js`, so there is no second implementation to drift.
- The container keeps `data-pagefind-ignore`: the listing should be crawlable by Google but must not pad the site's own Pagefind results with duplicate titles. Different consumers.
- A collection never lists the page it sits on (`pageUrl` is passed in by `eleventy.config.js`).
- Images always carry `class="no-pswp"` to prevent the image-optimizer from wrapping them in a PhotoSwipe `<a>` tag (which would create an invalid nested anchor inside the card's own `<a href>`).
- `.fp-search-input` is styled from the shared `--sv-*` token contract so the filter input matches the site-wide search bar in whatever theme is active. Its rule is scoped to `.collection-visualizer` because `folder-preview.css` declares an identical unscoped rule and loads later (TECH-DEBT #41).
- Canonical card image class: `fp-card__image-wrap` (shared with folder-preview SEO render path; not the legacy `fp-card__img-wrap` from folder-preview's runtime renderCards).
- `field:` sources depend on `graph.extra_fields` in `sites/[site].yaml` — fields must be declared there to appear in graph.json.

## Upstreaming

This shape is **shared infrastructure** (`lib/visualizers/collection/`). All commits to these files should be in their own commit (no AE-specific files mixed in) so they can be cherry-picked upstream to `LSanten/bloob-haus-webapp`. See CLAUDE.md commit hygiene section.
