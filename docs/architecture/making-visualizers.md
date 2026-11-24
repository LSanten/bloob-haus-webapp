# Making a visualizer (v0, 2026-11-14; rungs added 2026-11-24)

The public guide for anyone, person or AI, who makes a Bloob Haus visualizer. It is short on
purpose: the few things that must hold, then pointers to the practices that usually hold. It is
distilled from the internal docs (`ontology.md`, `shapes.md`, `visualizers.md`) and grows by the
loop at the bottom, not by guessing.

Bundle for an agent: this file, `writing-notes-for-shapes.md` and `ui-principles.md`.

## What a visualizer is

A visualizer turns a markdown note into an object you can look at, open and place somewhere. The
note has an **outside** (its top block of YAML) and an **inside** (its body). The object has a
**closed view** (seen from elsewhere: a book's spine, a sealed envelope) and an **open view**. The
note is the object: the file alone is enough to draw it.

A visualizer that reads many notes at once (a whole folder, a whole haus) is a **lens**. It is
not a new kind of thing: in `ontology.md` terms it is a container that draws everything it holds
its own way. Everything below applies to lenses too.

## Rungs: start in an afternoon, climb when it buys something (2026-11-23)

A visualizer does not have to meet every rule on its first day. It starts on a low rung and climbs
only when climbing buys something. **No visualizer is forced to climb**; a rung-0 page that does its
job can stay one. (Leon, 2026-11-23: "easy idea super fast, then build out the real thing".)

| Rung | What it is | What climbing to it buys | What it must hold |
|---|---|---|---|
| **0** | One HTML page that reads notes in the browser. Made with AI in an afternoon. | Trying an idea on real notes today. | The rung-0 list below |
| **1** | The builder bakes its markup: a pure `parse` and `render`. | Search engines and no-script readers see it; the same drawing in every host (`visualizers.md` → "three hosts, one renderer"). | Musts 1 to 4 and 6 to 8 |
| **2** | An object with an outside: a closed view, so it can be previewed, placed in a room, sealed. | It lives in the world, not only on its own page. | All eight musts |

### Rung 0: one page

- **It is one `.html` file.** Put it anywhere in a vault; the builder publishes vault `.html` files
  as they are. `lenses/cells/index.html` in the vault becomes `<haus>/lenses/cells/` (the first one,
  for leons.bloob.haus/lenses/cells/, was placed in the vault on 2026-11-24).
- **It reads in the browser**, from one of three places, in this order:
  1. a note named in its address: `?note=<path to a .md>`, so one page can draw any note
     ("the address says what to draw");
  2. the **field**: what a haus lays out for lenses, `/graph.json` (notes, links, folders, tags) and
     each public note's markdown beside its page. Today every build publishes `graph.json`; the
     markdown copies exist only for notes that offer sharing (`scripts/utils/share-markdown.js`), and
     laying them out for every public note is the next step. Top-level YAML keys starting with
     `private_` are never published;
  3. an example note carried inside the page (`<script type="text/markdown">`), so the same file also
     works on its own, as a shared prototype, with nothing to fetch.

**The rung-0 list.** It holds these, and only these:

1. **Note first.** It reads markdown a person could have typed, and that note still reads well in
   Obsidian (must 1).
2. **It changes nothing itself.** No file is written by the page. When the edit loop exists, a page
   saves only through the platform's own save, never to an endpoint of its own (the rule for
   builders in `shapes.md` → "The safety model").
3. **Looks from theme tokens, with fallbacks,** so it fits a haus and still stands alone (must 7).
4. **Its dials are named.** Sizes, speeds and timings sit together at the top of its script as named
   values, so the workbench can show them and keep a person's tuning.
5. **It runs in the browser only** (must 8, which a single page meets by itself).

What it may skip, until it climbs: a pure `parse` and `render` (must 3), working without script
(must 4), and a closed view (must 5). At rung 0 the page is its own host, so it fetches its data
itself; from rung 1 the drawing never does (must 2).

### Climbing

- **To rung 1:** move the page's reading into `parser.js` and its drawing into `renderer.js`, both
  pure and returning an HTML string; what remains is behaviour, in `browser.js`. From here the
  pure-renderer standard in `visualizers.md` applies in full.
- **To rung 2:** draw the closed view from the outside alone (`closed.html`, or `renderClosed`).
- **Template visualizers start at rung 1:** the engine bakes them, and one with a `closed.html` is
  already at rung 2. Earlier docs (`shapes.md` question 10, the 2026-10-23 workbench session) called
  a template folder a "rung-0 shape"; the name moved down on 2026-11-23, when the one-page lens became
  the lowest rung.

## The musts (the hard boundary)

These hold from rung 1 up (rung 2 adds must 5). Rung 0 has its own shorter list, above. Anything
inside these lines is fine, however differently it is built.

1. **Note first.** Design the note before the drawing: what a person types, and how it reads as
   plain markdown in Obsidian before any visualizer exists. A visualizer without a note behind it is
   a widget, not a Bloob Haus object.
2. **The note is the only source of truth.** Everything shown comes from the note (or from data
   handed in from outside, never fetched by the drawing itself). The same note always draws the same
   object: any randomness is seeded from the note.
3. **Pure reading and drawing.** `parse(markdown) → data` and `render(data) → HTML string`, with no
   DOM, no network, no files inside either. Script in the browser only adds behaviour (dragging,
   motion, listeners) to markup that already exists; it never builds the markup.
4. **It works without script.** If JavaScript never runs, the content is still there as real HTML.
   No empty placeholder that script fills later.
5. **The closed view is drawn from the outside alone.** Title and top-block fields only, never the
   body, so a private or sealed note can still show its closed view.
6. **A builder writes what a person could have typed.** If the visualizer has a GUI for writing its
   note, the GUI writes markdown that re-reads and re-draws identically, in the same short form a
   person would type (no extra copies a person would then have to keep in step).
7. **Looks come from theme tokens.** Colours and fonts from CSS custom properties
   (`--accent-color`, `--text-color`, `--font-body`, ...), never hard-coded, so it fits any haus.
8. **Code from strangers runs only in the browser.** A third-party visualizer ships browser script,
   never build-time code.

## Three ways to build one

- **A one-page visualizer** (rung 0): a single `.html` file, as above. The fastest way to try an
  idea; climb from it when it earns a place.
- **A template visualizer** (no code): a folder with `manifest.json`, `schema.md`, `open.html`, an
  optional `closed.html` and `style.css`. Templates fill blanks from the note (`{{ title }}`,
  `{{ yaml.<key> }}`, `{{ body }}`); no ifs, no loops.
- **A code visualizer:** a folder with `manifest.json`, `schema.md`, `parser.js`, `renderer.js`
  (both pure), optional `browser.js` (behaviour only) and `styles.css`.

Any way, the note comes first. From rung 1, `schema.md` starts with the **writing card**: the
note, an example, and its rules. A rung-0 page carries its example note inside itself instead.

## The shoulds

- How to write notes a visualizer can read: `writing-notes-for-shapes.md` (one rule, seven
  recommendations, and what Obsidian already understands).
- How Bloob Haus interfaces feel: `ui-principles.md`.

A visualizer may depart from a should for a reason. It may never break a must.

## How this guide gets better (the loop)

1. A fresh agent gets a brief ("make a word map") and only this bundle.
2. Leon says how the result should be different.
3. Each difference is sorted: the guide said nothing (add it), the guide was wrong (fix it), the
   guide said it and the agent missed it (make it louder), or it is taste and both are fine (write it
   down as allowed variation, not a rule).
4. The raw notes go to `shape-authoring-log.md`; the distilled change comes here.
5. The same brief runs again: if a fresh agent now gets it right, the change worked.

Round one: the word map (answer key: `docs/superpowers/specs/2026-11-14-word-map-note.md`).
