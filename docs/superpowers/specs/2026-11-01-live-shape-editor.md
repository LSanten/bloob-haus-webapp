# Live shape editor — first slice (2026-11-01)

Leon's direction: a marketplace of live shapes, each with a live editor (markdown beside the shape,
stacked on a phone), a schema that an AI can read, and the workbench as the same page with edit
rights. Start with the pure shapes; build the rest of the architecture as we go. This is the
"standalone playground", the third host in `visualizers.md` → "three hosts, one renderer".

## The idea that makes it cheap

The editor runs **the build's own code** in the browser, not a copy of it:

```
markdown note
  → injectContainerRaw        (scripts/utils, the same block finder the build uses)
  → markdown-it, configured by configureMarkdown()   (one shared setup, see below)
  → each shape's own transform(html)                 (lib/visualizers/<shape>/index.js)
  → HTML in a sandboxed preview frame, with the shape's styles.css and browser.js
```

So the preview is the site, by construction: no second implementation to drift (the scene-nav
lesson in `visualizers.md`).

**One shared markdown setup.** The markdown-it options and plugins move out of
`eleventy.config.js` into `scripts/utils/markdown-setup.js` (`configureMarkdown(md, ...)`), which
both Eleventy and the editor call. This is the baseline `shapes.md` open question 8 asks for
("one shared markdown-it configuration is the baseline every shape gets"). Pure refactor: built
pages must be byte-identical before and after.

**Node-only bits.** Shape transforms decode `data-vis-raw` with `Buffer`. The editor bundle gets a
tiny base64/UTF-8 `Buffer` shim (esbuild `inject`) instead of editing every shape now. Shapes that
import `fs` (card-preview, collection: they read the site's `graph.json`) are not in this slice;
they need sample data, which is the next question, not this one.

## In this slice

- Shapes: the pure ones whose data lives in their own block (services, heading-and-paragraph,
  image-grid, image-text, slideshow, testimonials, quotes-stack, photo-grid, foldable), as many as
  bundle cleanly.
- Page: one editor, a shape picker, markdown left and preview right (stacked under ~800px). The
  starter text comes from each shape's `schema.md` examples where there is one.
- AI card: each shape's `schema.md` served next to the editor, plus a "copy for AI" button
  (schema + the current note).
- Output: `scripts/build-shape-home.js` → `_shape-home/` (gitignored), with a `--serve` flag for
  local use. **Nothing deploys yet.**

**Address (decided 2026-11-01): `bloob.haus/visualizers/`.** The public word is *visualizer*
(Leon: "shape" is generic and not sticky; people understand what a visualizer does). Objects,
beings and books are what visualizers *make*, so the word survives characters.
`/visualizers/<name>/` = try it live + its AI card; `/visualizers/<name>/edit` = the workbench.
Code and the architecture docs keep "shape" as the internal word.

## Decided while building (2026-11-01, with Leon)

- **Shelves by who switches a visualizer on**, not by block vs page (the manifests show collection,
  folder-preview and garden work at both scopes, so scope is a label, not a shelf):
  *Always on* (writing rules: folds, checkboxes, footnotes; one shared live page),
  *You place it* (a `:::` block, a fence or `bloob-shape:`; each card labelled Block / Whole page),
  and *the site places it* (search, tags, graph, circular-nav: site settings, not in this catalog).
  The grouping lives in `lib/visualizer-editor/catalog.json` for now; it may move into each
  shape's `manifest.json` once third-party visualizers are listed.
- **Every note is drawn inside the article page** (`createPageRenderer`, with the builder's own
  title rule), because blocks always live inside a normal page, the way a marble's inside does.
- **One look, no theme picker.** The preview uses `base-tokens.css`: the token contract
  (`themes.md`) in the workbench palette, a first draft of the base theme's tokens. Moving it into
  `themes/_base` would change live sites, so that is a separate step.
- **The editor page takes the workbench spike's look** (bench, numbered panes, pegboard surface).
- **heading-and-paragraph and image-text stay listed** (Leon: a heading-and-text block may be
  fine for some things).

## Not in this slice

Saving, accounts and edit rights (the workbench), shapes that need site data, the one-file shape
format for AI authoring, a connector so an AI can save directly, and the URL.
