# Making a visualizer (v0, 2026-11-14)

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

## The musts (the hard boundary)

Anything inside these lines is fine, however differently it is built.

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

## Two ways to build one

- **A template visualizer** (no code): a folder with `manifest.json`, `schema.md`, `open.html`, an
  optional `closed.html` and `style.css`. Templates fill blanks from the note (`{{ title }}`,
  `{{ yaml.<key> }}`, `{{ body }}`); no ifs, no loops.
- **A code visualizer:** a folder with `manifest.json`, `schema.md`, `parser.js`, `renderer.js`
  (both pure), optional `browser.js` (behaviour only) and `styles.css`.

Either way, `schema.md` starts with the **writing card**: the note, an example, and its rules.

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
