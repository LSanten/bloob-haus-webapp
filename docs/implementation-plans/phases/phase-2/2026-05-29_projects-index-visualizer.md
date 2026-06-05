# Projects Index Visualizer — Implementation Plan

**Status:** Needs design thinking before implementation — do not start building yet  
**Created:** 2026-05-29  
**Location:** `docs/implementation-plans/phases/phase-2/`

> ⚠️ **Design pause**: The architecture below is directionally agreed on, but the exact UX — card layout, which fields to surface, filter chip groupings, search behavior — needs a focused design session before implementation begins. See "Open design questions" below.

---

## Goal

Replace the empty `/projects/` index page with a scrollable grid of project cards that:
- Shows key stats from each project's YAML frontmatter (sqft, building\_type, location, services, target)
- Is filterable by those stats via filter chips + a text search input
- Generates full static HTML at build time (SEO — all cards present in page source at load)
- Optionally exposes project stats in the graph visualizer (hover tooltip) down the road

---

## Context

`projects/index.md` is currently almost empty. ~80 project `.md` files exist with rich YAML frontmatter:

```yaml
building_type: Library
services: Mech+Plumb
location: "Campbell, CA"
sqft: 26240
target: "All-Electric, Net-Zero-Energy"
construction_type: Renovation
owner: City of Campbell
architect: Jayson Architecture
date_started: "2020-06-02"
```

See `docs/architecture/visualizers.md` for the full visualizer system.

---

## Proposed approach: extend `folder-preview` + `graph.json`

### Two-part change

**Part 1 — extend `graph.json` nodes with project frontmatter**

`scripts/utils/graph-builder.js` currently writes nodes with only `id, title, section, type, image, bloobIcon`. Extend it to include selected frontmatter fields when `bloob-object: project-profile`. Configurable via `sites/alter-engineers.yaml`:

```yaml
graph:
  extra_fields:
    project-profile: [building_type, services, location, sqft, target, construction_type]
```

This benefits the graph visualizer too (hover tooltip can show project stats).

Size impact: ~80 projects × 6 short fields ≈ 15KB uncompressed, ~3KB gzipped. Fine.

**Part 2 — add `style: project-cards` to `folder-preview`**

New mode that makes `folder-preview` a true hybrid with a build-time phase:

- **Build-time** (`index.js`): reads `graph.json` (which now has project stats) → emits all project cards as static HTML. Emits `data-pagefind-filter` attributes on each card so Pagefind can index them.
- **Runtime** (`browser.js`): adds text filter input + filter chips. Show/hide cards via JS on the already-rendered HTML. No fetch needed — data is in the DOM.

Code fence in `projects/index.md`:

````markdown
```folder-preview
style: project-cards
folder: projects
show_fields: building_type, location, sqft, services, target
```
````

---

## Why not Pagefind for the filter?

Pagefind is for site-wide full-text search. The projects page filter is client-side only — it shows/hides cards that are already in the DOM. No server, no fetch, instant. Simple JS `includes()` match against card content.

Pagefind is still useful: with `data-pagefind-filter` on the cards, the site-wide search page can filter results to "only Libraries" etc. The two systems don't conflict — bake Pagefind attributes into the card HTML at build time, and both use cases work.

---

## Page layout (sketch)

```
/projects/

[ search input                    ]
[All] [Library] [K-12] [Net-Zero] [Renovation]  ← filter chips

┌──────────┐ ┌──────────┐ ┌──────────┐
│  image   │ │  image   │ │  image   │
│ Campbell │ │ Willard  │ │ Laney    │
│ Library  │ │  Park    │ │ College  │
│ 26k sqft │ │          │ │ Library  │
│ Campbell │ │ Berkeley │ │ Oakland  │
└──────────┘ └──────────┘ └──────────┘
...all 80 projects in HTML...
```

---

## Implementation steps (when ready)

1. **Extend `graph-builder.js`** — add `extra_fields` support from site config. Only adds fields when `bloob-object` matches a configured type. Backwards compatible (no change to other sites).

2. **Add `preprocess-hook.js` to `folder-preview`** (if graph.json extension isn't sufficient) — reads project `.md` files directly, writes `folder-data/projects.json` with full frontmatter. Alternative to the graph.json approach if we want richer data (descriptions, etc.) without bloating graph.json.

3. **Add build-time transform to `folder-preview/index.js`** — detect `style: project-cards`, read graph.json (or folder-data JSON), emit static card HTML with `data-pagefind-filter` and `data-pagefind-meta` attributes.

4. **Add filter UI to `folder-preview/browser.js`** — text input + filter chips. Operate on DOM cards, no fetch. Chips auto-generated from unique values present in the rendered cards.

5. **Add `folder-preview/styles.css`** entries for `.fp-project-card` layout.

6. **Update `projects/index.md`** in the content vault with the code fence.

7. **Update `docs/architecture/settings-registry.md`** with new settings.

---

## Open design questions (needs a design session)

- **Card layout**: image-first vs. stats-first? How much info on the card vs. on the project page?
- **Which fields to surface**: sqft feels useful; `target` strings are long and varied — may need normalization first. `services` has slash-separated combos (Mech+Plumb+Energy) — treat as tags or single value?
- **Filter chip groupings**: auto-generated from unique values, or curated? Some values like `location` are too many to chip. Separate text search for location vs. chips for building\_type?
- **Sort order**: alpha, date\_started, sqft? Should user be able to change it?
- **Projects without images**: placeholder style? AE's card-preview already has an image placeholder — reuse that approach.
- **SEO-friendly flag**: the plan always generates static HTML for `style: project-cards`. No per-instance toggle needed — if you want runtime-only, use the existing `style: slider-cards` or default list mode.
- **Graph.json vs. separate JSON**: graph.json extension is cleaner holistically; a separate `folder-data/projects.json` is more flexible but adds a second file. Decide based on whether we want project stats in the graph visualizer hover tooltip (if yes, extend graph.json; if no, separate file is fine).

---

## Related

- `lib/visualizers/folder-preview/` — visualizer to extend
- `lib/visualizers/card-preview/` — existing build-time card renderer (reference for card HTML patterns)
- `scripts/utils/graph-builder.js` — where `extra_fields` would be added
- `docs/architecture/visualizers.md` — visualizer architecture
- `sites/alter-engineers.yaml` — where `graph.extra_fields` config would live
