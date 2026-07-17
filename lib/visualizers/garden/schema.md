# Garden — Shape Schema

A full-bleed, interactive garden canvas: place elements on a scene, give each a reflective page, and
publish it as a self-contained site. `garden` is the **first bloob-haus shape to ship with its own
builder**, and the first authored by an external creator (Odalys Benitez).

> **Status:** first-pass contract (Task 1 of the garden-shape conversion). This is the *core format* —
> what a saved garden IS. The renderer, builder, `manifest.json`, and `assets/` follow (Tasks 2–4).
> Companion docs: `bloob-haus-webapp/docs/architecture/{ontology,shapes}.md`; derivation in
> `shape-authoring-log.md`; plan in `bloob-haus-cloud/docs/implementation-plans/2026-07-13_garden-shape-and-builder.md`.

`garden` is **conceptually a container** (the ontology names it a *place* that preserves what it
holds) but **ships as a leaf in V1**: its contents are its own elements — trees, a bee, labels, custom
drawings — not other shapes. Container behaviour (holding other shapes, `[[wikilink]]`-as-closed-state,
metabolism) is deliberately deferred, and the format is shaped so it can graduate without a migration.

---

## How this relates to the bloob-haus standard (the deliberate divergences)

Garden follows the standard shape model — **one core + a renderer (read) + a builder (write)** over one
schema (ontology.md §"What a shape is"); the shape-folder layout from shapes.md §"What a complete shape
carries"; `hybrid` file-scope + inline declaration; **coordinates** placement (one of the five systems);
a **chrome** preference (open question #1). Three things intentionally modify the current standard. They
were reconciled back into `shapes.md` / `ontology.md` on 2026-07-17 (the conversion's Task 0; the
derivation is logged in `shape-authoring-log.md`) — they are now the documented rules, kept here as
the reasoning:

1. **Identity metadata lives in the body block, not frontmatter.** ontology.md §"Configuration and
   content are one surface" keeps `title`/`author` in frontmatter and only *configuration* in the body.
   Garden puts `title` and `author` **inside `::: garden`**, and frontmatter carries a single line
   (`bloob-shape: garden`). Why: garden owns its *entire* page (`chrome: none`, a full-page renderer),
   so one in-body source of truth is what makes it hand-editable in Obsidian and byte-for-byte identical
   to what the builder writes. No data is split across two places.

2. **The block is shape-named (`::: garden`) and garden parses it itself** — it does **not** go through
   the generic `:::settings` YAML path (`extract-settings-block.js`). A garden's bullet-and-coordinate
   list is not valid YAML (leading `-` makes a sequence, tab-indented children throw). Each shape parses
   its own block; the only shared step is finding the fence boundaries.

3. **Element ids are derived from the title slug, not stored.** The prototype uses opaque ids
   (`el_<ts>_<rand>`); garden derives `"Deep-Rooted Endeavors"` → `deep-rooted-endeavors`. Zero syntax,
   and it gives the future `note: "[[Title]]"` swap a stable anchor for free.

Everything else is the house way.

---

## Declaration

`garden` is `hybrid` — the same block, two scopes:

- **File-scope** (a whole page IS a garden): `bloob-shape: garden` in frontmatter + a `::: garden`
  block. `chrome: none`, so the garden fills the page.
- **Inline** (a garden embedded in a larger page): a `::: garden` block anywhere in the body.

In both scopes the **`::: garden` block is the single source of truth** — all configuration *and* all
content live in it.

---

## The fence format

Inside `::: garden` is one markdown bullet list. Every top-level item is one of two kinds:

- **A setting** — `- key: value`
- **An element** — `- <type> "<title>" @<x>,<y> [attrs]`, optionally followed by nested content bullets.

Order matters for elements: **document order is stacking (z) order** — later items render on top.

### Settings

| Key | Type | Default | Notes |
|-----|------|---------|-------|
| `title` | string | *(required)* | The garden's title. The renderer emits it as the page `<title>` and OG title. |
| `author` | markdown link | — | The garden's author, e.g. `"[Name](https://…)"`. Distinct from the *shape's* `manifest.authors[]`. Quote it (the `[` would otherwise read as a list). |
| `canvas` | `WxH` | `1000x600` | Logical coordinate space. The renderer scales the whole garden proportionally to fit its container (aspect preserved), capped so it never dominates. |
| `sky` | hex **or** preset token | `#87CEEB` | One key, two forms: a quoted hex color (`"#9CC3DB"`) or a preset — `clouds` (blue gradient + clouds), `sunny` (gold→blue gradient + sun), `rainy` (grey gradient + rain clouds). Picking a preset replaces the color, exactly like her UI. |
| `ground` | texture token | *(none)* | `dirt` \| `grass` \| `gravel` \| `sand` (her four soil textures), or `soil` (plain brown) → sky fills 65%, ground the bottom 35%. Omit → full-height sky. |
| `painting` | media path | — | Background image, `media/garden/…`. A **path, never base64** (see Images). |

> **The builder writes only non-defaults.** Every attribute below is optional with a sensible default,
> so a simple garden's fence stays as small as the example — full fidelity never costs clean files.

### Elements

```
<type> "<title>" @<x>,<y> [size:…] [src:…]
	<nested markdown prose = the element's page>
```

- **`<type>`** — one of the eight shipped icons, `custom`, or `label`.
- **`"<title>"`** — for objects, the page title; for a `label`, the displayed text.
- **`@<x>,<y>`** — top-left position in the canvas logical space. The `@` is what marks the line as an
  element (vs. a `key: value` setting).
- **attrs** (optional, space-separated `key:value`, plus bare flags):
  - `size:N` — a **label**'s font size (no `x`).
  - `size:WxH` — a **dimension** override (has `x`); default is the type's own size (for a drawn
    label: its image size).
  - `src:media/garden/…` — the image for a `custom` element, or a **drawn label**
    (`label "" @x,y src:… size:WxH` — a decorative image, not clickable).
  - `hover:none|scale|glow|bounce` — element hover effect (default `scale`).
  - `glow:#hex` — element glow color (a drop-shadow halo; default off).
  - **label styling:** `font:georgia|arial|courier|verdana|palatino|trebuchet` (default `georgia`),
    `color:#hex` (default `#2c2c2c`), and the bare flags `bold` `italic` `highlight` (yellow
    highlighter behind the text).
- **nested bullets** under an element = its **page**, as markdown prose (one bullet per paragraph).
  An optional **first child** `- page: key:value …` sets page-level presentation:
  `font:` (same six tokens), `bg:"#hex"` (page background), `layout:stacked|columns` (default
  `stacked`). Per-paragraph sizing/color is deliberately NOT spellable — that's what markdown itself
  (headings, emphasis) is for. A `label` takes no page.

The eight shipped icon types (default sizes are the renderer's fallback when `size:` is omitted):

| Type | Default size | Reflective page theme |
|------|--------------|-----------------------|
| `seed` | 130×130 | Planting intentions |
| `sapling` | 135×165 | Early growth |
| `mature-tree` | 175×186 | Deep-rooted endeavors |
| `flower` | 105×185 | Botanical features |
| `compost` | 150×123 | Digesting & metabolizing |
| `water-bucket` | 120×150 | Resources |
| `waffle-planter` | 155×125 | Budding dreams |
| `bee` | 100×85 | Relations & connections |
| `custom` | 100×100 | *(none — needs `src:`)* |
| `label` | — | *(text only; `size:N` = font size)* |

### IDs

Every element's id is the **slugified title** — `"Deep-Rooted Endeavors"` → `deep-rooted-endeavors`.
Builder-minted, unique (`-2`, `-3` on collision), stable thereafter, and **not written in the fence**.
It is the anchor the future container graduation hangs on: a later
`note: "[[Deep-Rooted Endeavors]]"` on the same element reuses this slot with no schema change.

### Content & linking

- **V1:** an element's page is the nested markdown prose.
- **Future (container graduation):** the nested prose is replaced by a link to another note. **Both
  link forms are accepted** — `[[Wikilink]]` (resolves by note title → the same slug that is the id)
  and `[text](path)` (resolves by explicit path). With title-as-id, the linked note's title *is* the
  element's visible label, so they stay in sync by construction.
- **Fidelity: prose-only (LOCKED, Leon 2026-07-17).** The prototype's pages are multiple *positioned*
  text boxes (each with `x/y/fontSize`) — but the template positions are just a vertical stack
  (paragraph order expressed in coordinates), and the future `note:` direction has no coordinates at
  all. The core stores **markdown prose only**, order preserved (one bullet per box/paragraph); the
  builder auto-stacks on reopen. Exact box positions are **not round-tripped** — an artistic
  drag-layout flattens, an accepted cost. This is decision 2 ("page text is markdown — the simplest
  thing that works") taken to its conclusion.

### Images

- The fence references **paths, never base64.** Both `painting:` (background) and an element's `src:`
  point at `media/garden/<name>.png`.
- **Filenames are content hashes** (`media/garden/sketch-a3f9.png`): reusable drawings dedupe naturally;
  instance-specific assets never collide.
- **Self-drawn and uploaded images converge on one path:** blob → downsize/re-encode → hash → write to
  `media/garden/`. The fence can't tell a drawing from an upload — that's the point.
- **Downsizing happens in the builder, at import** (it knows the canvas and element sizes). The site
  build's image step is only a >20 MiB safety net, so garden supplies already-right-sized files and
  needs no per-shape pipeline hook.

---

## Parsing (garden's own; only fence-discovery is shared)

1. **Find the block.** First line matching `:::` + optional space + `garden`; closed by a line that is
   `:::` — tolerate trailing whitespace, and be depth-aware so nested `:::` blocks don't close it early.
   (This fence-boundary step is the *only* piece shared with other shapes.)
2. **Parse the inner content as a markdown list tree.** Indentation determines nesting; **tabs and
   spaces both count**; a child is any item indented deeper than its parent. **Do not hardcode a tab
   width** — this is what makes the format robust to Obsidian's tab/space setting (the whitespace
   sensitivity that motivated this format).
3. **Classify each top-level item:** `key: value` with no `@` → a setting; `<word> "…" @x,y …` → an
   element, whose child items are its page. Among an element's children, a first `page: …` item is
   page settings; every other child is a prose paragraph. On element lines, `key:value` tokens are
   attrs and bare words (`bold`, `italic`, `highlight`) are flags.
4. **Unknown top-level lines are ignored** (freeform-tolerant, per shapes.md open question #4).
5. **There is no shared parsing script.** This parser lives in garden's `index.js`. Other shapes parse
   their own blocks; this is a documented *convention*, not enforced shared code — because a garden's
   coordinate elements and a pond's marbles legitimately parse differently.

---

## Placement · Chrome · Content policy

- **Placement: coordinates.** `@x,y` in the canvas logical space, top-left origin — the AI-friendly
  system of the five. z-order = document order. The renderer scales the whole garden proportionally
  (aspect preserved), capped. The builder's on-screen `--ui-zoom` is authoring chrome and does not ship.
- **Chrome: `none`.** A garden is full-bleed and self-contained — the first real exercise of shapes.md
  open question #1. (Per ontology, chrome is just the outermost context layer.)
- **Content policy: leaf (V1).** Contents are the garden's own elements, not other shapes. The
  ontology's *preserve*/place behaviour and metabolism ("the last layer to build") are deferred.
- **Translation behaviour (V1):** an unrecognized element type falls back to `custom`/`label`; unknown
  settings are ignored. Metabolizing foreign content ("a server rack gets flowered") is future
  container behaviour.

---

## Closed-state visual

The **flattened canvas PNG**. The builder's canvas-flatten (`toBlob`) yields the garden's closed-state
image, OG image, and link preview from a single render. Until `[[wikilink]]`-as-closed-state exists,
referencing a garden falls back to the default link pill.

---

## Builder

Yes — a **shape builder** in `builder/` (a face of this shape, not a separate app). It is a single,
self-contained, `file://`-openable HTML file (the Vite source bundled via `vite-plugin-singlefile`). It
**reads and writes** this same core, so a hand-edited or AI-generated garden reopens in the GUI — an
engineering requirement, not a user-facing "Import" button. It persists work-in-progress client-side,
downsizes images at import, and emits the promotion pair **{ `::: garden` fence, media blobs }** that
the shared draft-to-vault flow consumes.

## Authors

`manifest.authors[]` (an array from day one): **Odalys Benitez — https://odalysbenitez.com**. This is
the **shape's** creator, distinct from any single garden's `author:` setting. Renders in the shape
catalog (which doesn't exist in V1 — captured now so it isn't lost).

## Assets

Ships eight element icons in `assets/icons/` — `seed`, `sapling`, `mature-tree`, `flower`, `compost`,
`water-bucket`, `waffle-planter`, `bee` — copied into build output like visualizer JS/CSS, **not**
served from a central CDN (keeps every published site self-contained/zippable).

---

## Example — `examples/my-garden.md`

```markdown
---
bloob-shape: garden
---

::: garden
- title: Odalys's Garden
- author: "[Odalys Benitez](https://odalysbenitez.com)"
- canvas: 1000x750
- sky: "#9CC3DB"
- ground: soil

- mature-tree "Deep-Rooted Endeavors" @240,225
	- What are the deep-rooted endeavors of love in your life?

- sapling "Early Growth" @440,360
	- What is beginning to sprout in your life?

- bee "Creating Relations & Connections" @620,300
	- How do you cultivate relationships and connections?

- flower "Botanical Features" @780,285
	- What is blooming in your life right now?

- water-bucket "Resources" @100,495
	- What resources nourish your growth?

- waffle-planter "Budding Dreams & Possibilities" @280,545
	- What dreams are budding in your life?

- compost "Digesting & Metabolizing" @540,520
	- What are you processing and transforming?

- label "Odalys Benitez" @670,105 size:34
- label "rearranging internal configuration so love may flow more easily" @710,170 size:22
:::
```

Image syntax and the full attribute surface (not in the example above):

```markdown
::: garden
- title: My Garden
- canvas: 1000x600
- sky: sunny
- ground: grass
- painting: media/garden/dawn-field-a3f9.png

- custom "A sketch I drew" @300,200 src:media/garden/sketch-b2c8.png size:180x140 hover:bounce glow:#ffd700
	- page: font:palatino bg:"#fffaf0" layout:columns
	- Why did I draw this here?
	- A second paragraph, in the second column.

- label "hand-lettered title" @620,80 size:34 font:trebuchet color:#b03030 bold highlight
- label "" @150,90 src:media/garden/doodle-c4d1.png size:120x80
:::
```

---

## What this adds to the canonical `schema.md` template

The candidate template in shapes.md (open question #3) has no section for **the fence format /
grammar** or **parsing rules** — the two things this shape spent the most design effort on. Garden
surfaces both as required sections for any shape with non-trivial body syntax. Fold them back into the
canonical template (Task 0).
