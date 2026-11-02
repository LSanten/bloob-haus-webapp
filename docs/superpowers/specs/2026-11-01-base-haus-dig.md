# The base haus dig: notes, marbles, night and day

**Date:** 2026-11-01 · **Status:** findings, nothing decided · **Builds on:**
`bloob-haus-cloud/docs/superpowers/specs/2026-10-25-workbench-dig.md` (its R1 to R10 are still
open and are referred to by number here, not redone).

**What this serves.** Leon, 2026-11-01: leons.bloob.haus is rebuilt as *the base every haus starts
from*, not a special haus for Leon. The workbench look, heaviness stripped. Objects (notes, marbles)
sit on a separate background. Almost no chrome. Night and day follow the visitor's system setting.
The first object is the **note** (a rolled scroll with a ribbon you untie; the visitor's browser
remembers it was opened), the second is the **marble** (click, it opens into an article). A **seal**
records whether something was *ever* opened, for everyone. The visual direction waits on Whitney.

**What was read.** Both `CLAUDE.md` files; the shape trinity (`ontology.md`, `shapes.md`,
`visualizers.md`); the 2026-10-25 workbench dig; `2026-11-01-live-shape-editor.md`;
`letters-and-envelopes.md`; `themes.md`; `writing-notes-for-shapes.md`; `urls-and-ids.md`;
`settings-backlog.md`; both DECISIONS files (grepped). Code: `themes/**` (all five folders),
`scripts/assemble-src.js`, the layout part of `scripts/preprocess-content.js`, `eleventy.config.js`
(filters), every `lib/visualizers/*/styles.css` (colour audit), `lib/visualizer-editor/**` (commit
b650210), `sites/*.yaml`; the vault `bloob-haus-marbles` (settings, registry, counts); the cloud's
`app/src/shapes/**`, `LetterSlot.tsx`, `lib/seal/{envelope,stamp}.ts`, `CounterNotes.tsx`; the
studio collage source (`bloobhaus-notes/studio-bloob-shop-dev/templates/index.json`).

---

## The big points

1. **Nothing does night yet, but the colour contract is most of the way there.** No theme and only
   one page in the whole codebase (the visualizer editor's own frame) reacts to the system setting.
   Most visualizers already take their colours from the theme's named colours, so a base theme that
   gives every named colour a day value and a night value carries most of them along for free. A
   handful paint light glass and white glows by hand and need work.
2. **The base is safest as a new theme, not by growing `_base`.** Every file added to `_base`
   reaches buffbaby, melt, Alter Engineers and Odalys, and two kinds of addition would change them
   silently. A new theme touches nobody, and leons can switch back with one line.
3. **The four closure questions mostly hold, with two corrections.** Memory is two separate
   switches (this visitor, and everyone), not one choice of three: the letter already has both.
   And lock is not a field: it follows `visibility`. Whatever the field names are, they must live in
   the top block (the outside), because a closed thing is drawn from its outside alone.
4. **Only the seal needs the cloud.** The note, the marble, the visitor's memory and night/day are
   all plain static-site work. "Ever opened, for everyone" needs a small place to write that down,
   and leons is not behind any server today.
5. **Building a `marble` shape flips every leons page at once, the homepage included.** The vault's
   `default_shape: marble` was set up so that would happen. It is a feature and a trap.
6. **The lock/seal word split is recorded nowhere but a memory file.** The live post office copy
   already follows it; the architecture docs and two "Unsealing…" labels do not.

---

## What the dig found

### A. What a base haus is, and what must keep working (question 1)

1. **`_base` is not a theme; it is a box of shared parts.** It has 13 partials, an embed layout,
   five builder pages (feed, robots, sitemap, embed pages, `tags.md`), `base.css`,
   `internal-links.js`, a folder-index template and two vault scaffolds (`themes/_base/**`). What
   every theme must still bring itself (`themes.md` → Tier 1): `layouts/base.njk` (the page
   skeleton), `layouts/page.njk`, `partials/footer.njk`, `partials/scripts.njk`, `assets/css/main.css`
   (all named colours and every element style) and `theme.yaml`. Shape layouts depend on this: both
   `lib/visualizers/article/layout.njk` and `folder-preview/layout.njk` extend `layouts/base.njk`,
   which only a theme provides. A theme must also print the two markers
   `<!--bloob:visualizer-css-->` and `<!--bloob:visualizer-js-->`, or no visualizer loads on a site
   with `per_page_visualizers` on (leons has it on).
2. **How a theme is assembled** (`scripts/assemble-src.js`, steps 2 to 6): `_base` partials and
   assets, then shape layouts, then `_base` layouts and pages, then the theme's layouts, partials,
   pages and assets on top. Same name wins for the theme. That gives two silent traps for anything
   added to `_base`: (a) a `_base/layouts/folder-index.njk` or `article.njk` would replace the
   shape's own layout on every theme that does not ship one (warm-kitchen and alter-engineers rely
   on folder-preview's); (b) a `_base/pages/index.njk` would appear on themes that have none (melt).
3. **Two shared files already shape live sites.** `_base/partials/head.njk` is used as-is by
   warm-kitchen (buffbaby) and hard-codes warm-kitchen's fonts (Crimson Pro, Inter).
   `_base/assets/css/base.css` loads on every site before the theme. So a night switch placed in
   either would change buffbaby, melt and AE (AE on its next upstream merge).
4. **Two "start here" themes disagree.** `sites/_template.yaml:31` says `theme: "melt"`;
   `_base/_bloob-settings.template.md:14` says `theme: marbles-pouch` with `default_shape: note`.
   `sites/odalys.yaml` warns that starting on melt means a client's theme reshapes a stranger's site.
   A real base theme ends this.
5. **A first draft of the base look exists, and it is light only.**
   `lib/visualizer-editor/base-tokens.css` is "a first draft of the base theme's tokens" in the
   workbench palette; its comment and the live-editor spec both say moving it into `_base` "would
   change live sites, so that is its own decision". The editor's own frame
   (`lib/visualizer-editor/editor.css:18-24`) has a full night palette already; the preview inside it
   does not, so at night the preview is a white sheet on a dark bench.
6. **marbles-pouch: what is heaviness and what is machinery.** Heaviness (look only): the banner
   with object image, three floating decorative shapes and an SVG wave; the "What is a marble?"
   modal; the footer wave and footer search toggle; two web fonts; the soft-blue page; navy/teal
   heading colours; the purple fold gradient; dead `_templates/` copies (nothing reads them); a
   "recent marbles" homepage the vault's own `index.md` replaces. Machinery worth keeping (all
   generic): `page.njk`'s search markers, hidden ID line for search, share bar, date pills, tags,
   backlinks, graph container and comments; `head.njk`'s canonical, page ID, robots, preview tags,
   RSS, favicon. `ontology.md:321` also holds a rule: *no new CSS in marbles-pouch until the visual
   primitives are drawn*.
7. **The `article` shape is the generic reading page, but it is thinner than leons' page.**
   `article/layout.njk` has header, dates, share bar, visitor count, body, comments. It has **no tags,
   no backlinks, no graph**, which `marbles-pouch/layouts/page.njk` shows on every leons page today.
8. **The `default_shape: marble` trap.** `preprocess-content.js:331` uses `default_shape` for layout
   whenever a page names no shape, and line 597 applies the same to index files. Today there is no
   `lib/visualizers/marble/`, so it silently falls back. The moment that folder exists, about 490 leons
   pages switch layout, **and so does the homepage** (`index.md` names no layout; melt's homepage is
   safe because it pins `layout: layouts/home.njk`). Buffbaby (`recipe`) and melt (`article`) are not
   affected.
9. **What leons' content actually uses** (vault counts): 465 notes say `bloob-object: marble`
   (the old identity key), 9 say `bloob-shape: note`, 2 `marble`, 1 `note-AI`, 1 `folder-preview`,
   1 `rss-feed`. Visualizers in use: `collection` (13 blocks, all `display: cards`), foldable headings
   (20 notes), `search` and `tags` fences, `fridge-magnets` (2), `scene-nav` (1), checkboxes, footnotes
   and maths (2 each), plus `graph` site-wide. The base has to carry all of these.

### B. Night and day (question 2)

10. **No theme does night.** No `prefers-color-scheme`, `color-scheme` or `light-dark()` in any
    theme. `themes.md:786` lists dark mode under "Future"; `IDEAS.md:59` parks it as lower priority
    (Leon's own call then). It is now a must, so that row is out of date.
11. **Visualizers, by how ready they are** (colour audit of every `styles.css`):
    - *Ready or nearly* (colours come from the theme, or only neutral overlays and shadows):
      article, checkbox-tracker, citations, heading-and-paragraph, image-grid, ken-burns-zoom, latex,
      page-preview, photo-grid, quotes-stack, scene-nav, search, services, slideshow, testimonials.
    - *Need night work:* `collection` and `folder-preview` (the marble bubble is a hand-painted light
      blue glass with a white glow behind the title, `collection/styles.css:281-300, 392`),
      `foldable` (shadows; marbles' gradient), `garden` (18 hand colours, white panels),
      `circular-nav` (29), `fridge-magnets` (120, its own fridge look, possibly on purpose),
      `image-text` (AE's mint and purple).
    - *Reads colours once:* `graph/browser.js:114-122` takes the theme colours when the page loads,
      so if the system flips at sunset while the page is open, the graph keeps its day colours until
      reload.
12. **The contract itself assumes day in three places.** `--surface-text-color` is defined as
    "text on LIGHT surfaces" (`themes.md:102`). The colour-pair names `bg-light`, `bg-dark` and
    `bg-default: white` are absolute, so at night a "light" section is a bright block on a dark page.
    And `themes.md` has two different sections both titled "Color Pair Contract (Tier 1)" (lines 314
    and 607) plus a third semantic one (565) with different class lists; marbles-pouch uses yet
    another scheme (`--section-bg`), the editor's draft uses `--pair-*`.
13. **The object/background split is already latent in the contract.** `--bg-color` is the page
    behind everything; `--card-bg` and `--surface-text-color` are an object's surface and its ink.
    Leon's "the note's paper is not the background" is these two pairs, renamed in meaning, with a
    night value each. Not a new layer.
14. **Fades are mostly safe.** Shapes fade edges with masks, which do not care about colour. Only
    melt fades to white by hand (`melt/main.css:594`). The moment of switching can cross-fade with a
    short transition on the background colour; two shapes already honour reduced motion (foldable,
    scene-nav).
15. **Cutout images carry a day halo.** `themes/marbles-pouch/assets/objects/marble.png` (a glass
    marble on a pink cloud): 54% of it is fully clear, and of the soft half-clear edge pixels 94% are
    near-white. On a dark ground those edges read as a pale halo or glow. Whether that is lovely or
    wrong is a design call. The studio collage Leon points to (`studio-bloob-shop-dev/templates/
    index.json`, a custom section) floats cutout character PNGs with a per-character glow, which
    tends to read well at night.
16. **A missing fallback image.** `themes.md` says identity images fall back to
    `themes/_base/assets/objects/`, but that folder does not exist, and `collection`'s marbles mode
    hard-codes `/assets/objects/marble.png` (`collection/renderer.js:358`). On a theme without that
    file (warm-kitchen, AE) a marble is a broken image. The base theme should ship one.
17. **The post office has no night either.** `app/src/**` has no scheme handling and 35 hand colours
    in components. The letter's character art inherits text colour, so it would follow easily. Only
    relevant once shapes render there too ("three hosts").

### C. The note and the marble as shapes (question 3)

18. **Neither exists as a shape; the word "note" already means three things.** In the cloud,
    `note` is the plain markdown renderer and the fallback for any unknown shape
    (`app/src/shapes/registry.ts`). In Leon's `_bloob-objects.md`, a note is "a sketch, draft… less
    polished than a marble". In the new design it is the rolled scroll. And the vault scaffold makes
    `default_shape: note` the default for every new vault, so whatever `note` becomes, every new haus
    gets it.
19. **Prior art for closed states is all there, in pieces.** The letter: `renderClosed(envelope)` and
    `renderTearing(envelope, tears)`, pure (`app/src/shapes/letter/closed.ts`), with the host counting
    taps (`LetterSlot.tsx`). The locker: its picture as plain lines any host can draw
    (`locker/closed.ts`). The builder's `collection` marbles mode: a closed marble with a title,
    floating physics and a real link (`renderMarblesHtml`). `foldable`: closed and open with no script
    at all (`<details>`). And marbles-pouch's banner is already "the closed object drawn above the open
    page".
20. **Rooms cannot draw each thing's own closed state yet.** `graph.json` (the builder's catalog of
    every page) carries only id, title, section, type, image, icon, subtitle. No shape name, no
    outside fields. A homepage that shows notes as scrolls and marbles as marbles needs the catalog to
    carry both. This is the prior dig's "card catalog" and `ontology.md`'s unbuilt keystone (a link
    drawn as the target's closed state).
21. **A shape whose look lives in a `.njk` layout runs in one host only.** Nunjucks runs in the
    builder; the editor cannot run it, so `lib/visualizer-editor/render-note.js` already copies the
    article frame by hand ("Mirrors lib/visualizers/article/layout.njk's markup"), which is the drift
    the scene-nav lesson warns about. For note and marble to show in the builder, the editor and later
    the post office, their closed and open faces need to be pure JS functions (or rung-0 HTML
    templates), with `layout.njk` reduced to one line that calls them through an Eleventy filter. No
    such filter exists yet (`eleventy.config.js` filters are all text helpers).
22. **How they relate to the workbench step.** A `closed.html` filled from top-block blanks *is*
    `renderClosed` written as a template, so the scroll's look and the marble's look fit rung 0. The
    untie, the memory and the seal need script, which rung 0 strips: they are rung 1 (`browser.js`,
    the prior dig's R6), with the host counting and the shape drawing (R10).
23. **Opening on a static site.** Every note already has its own address, so opening is a state, not
    a new URL. `visualizers.md:145` sets the test: "if JS never runs, is content missing?" So the words
    must be in the page and shown open when no script runs; the script rolls the scroll up and
    unrolls it. Two details follow: a remembered "opened" must be applied by a few lines in the
    `<head>` before the first paint, or the visitor sees the scroll flash shut and open; and search
    engines read the words either way, as they do for collapsed sections. For the marble, "opens into
    an article" can simply be a link to its article page; browsers that support page-to-page
    transitions (Chrome and Safari today) can make the marble appear to grow into the page, others
    just load it.

### D. Closures and their YAML (question 4)

24. **The letter already proves memory is two switches.** A letter in a locker shows `opened` for
    everyone (stamped by the post office) *and* the locker remembers, in this browser only, which
    letters you left open (`app/src/shapes/locker/open-memory.ts`, "a per-viewer convenience"). A
    sealed note wants both too: "someone broke this seal" and "you untied this before" are different
    facts and can both be true.
25. **Lock is not authored per item.** `letters-and-envelopes.md` principle 1: private is locked,
    public is not, "never a per-item user choice". So lock follows `visibility`, and the `sealed-*`
    keys are written by the library, never by a person.
26. **Closure fields must sit in the top block.** The closed state is drawn from the outside alone
    (`shapes.md` → Sealing; `writing-notes-for-shapes.md`: "the top block is the outside"). That makes
    closure an exception to the habit of putting shape options in a `::: settings` block in the body
    (`shapes.md` → shape_settings): the body is the inside, and for a private note it is locked.
27. **The three writing zones exist in the cloud and not in the builder.** The cloud reserves
    `opened`, `fetched`, `date_postmarked`, the lockboxes and the whole `mark_*` prefix for the haus
    (`app/src/lib/seal/envelope.ts:25-39`) and refuses uploads that carry them. The builder reserves
    nothing: an author could type `opened: 2026-01-01` into a vault note and a static page would
    believe it.
28. **What keys "this visitor opened it".** Every page on every theme already carries its canonical
    ID in `<meta name="bloob-page-id">` (`urls-and-ids.md`), and `bloob-page-id:` keeps it across a
    rename. Today two keys are in use for the same idea: `checkbox-tracker` keys by the address path
    (`browser.js:16`), the locker by its ring. Caveat for the promise "next visit it stays open":
    the memory lives in one browser on one device, and Safari clears what a site's script stored if
    the visitor has not been back for about a week of Safari use.
29. **What a seal on a static site needs from the cloud.** Three small things: a place the page can
    tell "this was opened" (first time only, ignore repeats, rate-limited, no sign-in); a way for the
    page to ask "has it been?" when it loads, failing invisibly like the visitor count
    (`_base/partials/visitor-count.njk`); and the page ID as the item's name. leons is a plain Cloudflare
    Pages site, not behind the Worker, so any edge stamping would need a new Worker route with a
    fall-through (cloud `CLAUDE.md`). The cloud already decided interaction facts exist "for every
    shape" (`letters-and-envelopes.md`, settled #2); public pages just have no door to hang them on.
    Precedent for a static page writing shared state: `fridge-magnets` posts to a Google Form.
30. **No name collisions.** None of `seal`, `closed`, `closure`, `wrap`, `remember`, `memory`, `lock`,
    `label`, `outside` appear as a top-block key in leons, buffbaby or melt. In code, `state=open|closed`
    is already the `:::` opener vocabulary (`shapes.md:31`), and `label:` is a nested key in scene-nav
    and garden.

### E. Gestures (question 5)

31. **The ribbon is the second gesture, and it has a different job.** The letter's three-tap tear is
    a *confirmation*: opening stamps "opened" for everyone, and Leon once broke one by accident
    (`shapes.md` question 9). Untying a ribbon on a note that only this browser remembers is a
    *ritual*: nothing shared happens. That suggests a rule: **the more people an opening touches, the
    more deliberate the gesture.** A sealed note would want the deliberate kind; an unsealed one can
    open in one click with the ribbon as animation.
32. **The pattern is already proven:** the host counts, the pure renderer draws each frame from a
    progress value (`renderTearing`; the prior dig's R10). The letter also shows the other must-haves:
    a real button with a spoken label ("Tear open, 1 of 3"), and a tear that mends after four seconds
    so stray taps never add up to an open.

### F. Contradictions (question 6)

33. **Lock and seal.** Leon split the words on 2026-10-25 (lock = encryption, seal = the one-time
    first opening; keep `sealed-*` keys). Recorded only in the cloud memory file
    `workbench-direction-and-canvas.md`, in no DECISIONS file. `shapes.md:211` ("Sealing"),
    `letters-and-envelopes.md` (83 uses) and `ontology.md` still mean encryption. The live product
    already follows the split: `CounterNotes.tsx:56,70` says "locked", the envelope says "sealed, not
    opened yet". Two labels still say "Unsealing…" for decrypting (`Gate.tsx:115`,
    `LetterSlot.tsx:60`). `shapes.md:1044` already says "Locked notes".
34. **`renderClosed` has two signatures.** `shapes.md` corrected it to one input on 2026-09-20;
    `letters-and-envelopes.md:80` and `:280` still say `renderClosed(envelope, state)`.
35. **Sealing stocks**, from the prior dig (finding 5), still unfixed: `shapes.md:294-311` suggests
    stocks are not sealed; `letters-and-envelopes.md` settled that private is always locked.
36. **Leaf shapes and closed states.** `ontology.md:54` says leaf shapes have "no meaningful closed
    state". The note is a leaf, and its closed state (the scroll) is the whole point.
37. **`themes.md` is stale** (dated 2026-02-28): `_base` listed as four partials; melt "sets
    `--text-color: #fff`" (it is dark plum now); the duplicate colour-pair sections (finding 12); the
    missing `_base/assets/objects/` (finding 16); "every theme must include `theme.yaml`"
    (warm-kitchen has none).
38. **`next-steps.md` is stale** (2026-08-22): it still says Scaleway is blocked.

---

## Open ends

**O1 · Where the base lives**
- *What:* a new theme folder (name open, e.g. `haus`), built from the editor's draft colours, that
  leons switches to with `theme:` in its `_bloob-settings.md`; versus growing `_base` into a full
  theme that existing themes inherit from.
- *Why:* `_base` reaches every live site (findings 2, 3); a new theme reaches none. The underscore
  already means "not selectable" (as with `_utils`).
- *Default:* a new theme. marbles-pouch stays untouched as leons' one-line way back. Parts that prove
  generic (the skeleton, the scripts partial) move into `_base` later, one at a time, each with
  byte-identical builds of melt, buffbaby and leons (the b650210 method), the visualizer detection
  audit, and the live e2e before and after.

**O2 · The night/day colour contract**
- *What:* every named colour gets a day and a night value; a page that supports night says so with
  `<meta name="color-scheme" content="light dark">`. Two ways to write it: a
  `@media (prefers-color-scheme: dark)` block that redeclares the colours (works in every browser in
  use, falls back to day), or `light-dark(day, night)` on each line (tidier, and a visitor switch later
  is one line, but older iPhones before iOS 17.5 lose the colour entirely).
- *Why:* most visualizers come along for free once the colours flip (finding 11).
- *Default:* the media-query block, written first in `base-tokens.css` (affects no live site), with
  the meaning fixed: `--bg-color` = the ground, `--card-bg` / `--surface-text-color` = an object's
  surface and ink (finding 13). Night is opt-in per theme; day-only themes change nothing.
  `graph` re-reads its colours when the system flips.

**O3 · Should a visitor be able to override the system setting** (noted only, as asked)
- *What:* a day/night switch on the page.
- *Why:* it needs a control (chrome Leon does not want), a stored choice and a few lines before first
  paint.
- *Default:* no. Follow the system only. The contract leaves a hook (an attribute on the root) so it is
  small to add.

**O4 · How objects look at night** (needs Whitney)
- *What:* does the note's paper stay light, a lit page on a dark ground, or dim to a dark paper? Do
  cutouts get night versions (a `name.night.png` beside `name.png`, picked by the browser), or stay
  as they are with their pale halo (finding 15)? Do objects lose their shadow at night and gain a rim
  of light instead?
- *Why:* this is the visual direction, and the code can be built either way if every one of these is a
  named colour or a named image.
- *Default:* build token-first; paper and ground as separate named colours; no night image variants
  until Whitney has looked.

**O5 · Where note and marble live**
- *What:* `lib/visualizers/note|marble/` in the builder now, or the shapes repo the prior dig proposed
  (R2, still undecided), or the vault's own `_bloob-shapes/` later.
- *Why:* the cloud cannot import builder code, so a note drawn in the post office too means two copies
  or a shared home.
- *Default:* `lib/visualizers/`, with closed and open faces as pure JS files that import nothing from
  `_utils` or Node, so moving them later is a copy (finding 21).

**O6 · How opening works on a static site**
- *What:* the note opens in place on its own page; with no script it shows open; a remembered
  opening is applied before first paint. The marble opens by going to its article page, with a
  page-to-page transition where the browser has one. Open or closed is never part of the address.
- *Why:* passes the "if JS never runs" test, keeps one address per thing, needs no server.
- *Default:* as written. In rooms (the homepage), each thing shows its closed state and links to
  its address.

**O7 · What a marble's open state contains**
- *What:* `article` has no tags, backlinks or graph; leons' pages have all three (finding 7).
- *Default:* the marble wraps `article` and adds tags and backlinks below the body; the graph becomes a
  per-page choice. A marble declaring "I open into article" is a small first case of the
  composite-shape gap in `next-steps.md` item 8.

**O8 · Turning on the marble without surprising the homepage**
- *What:* building `lib/visualizers/marble/` moves about 490 pages and leons' homepage at once
  (finding 8).
- *Default:* pin the homepage (`layout:` in leons' `index.md`, as melt does), build the marble behind
  the new theme, and compare page by page before switching.

**O9 · The catalog rooms read from**
- *What:* `graph.json` gains each page's shape name and its outside fields (title, subtitle, image,
  closure fields), so a room can draw each thing as itself.
- *Why:* without it, every room draws every thing the same way (finding 20).
- *Default:* add the fields; existing readers ignore keys they do not know.

**O10 · The closure YAML**
- *What:* names and tiers for: how it looks shut (wrapping), what the outside shows (label), memory
  for this visitor, memory for everyone (the seal). Lock is not a field (finding 25). One sketch, to
  react to, not a proposal:
  ```yaml
  bloob-shape: note       # the shape's defaults apply: scroll, title on the outside, remembered here
  closed: scroll          # how it looks shut: scroll | folded | none (none = always open)
  remember: true          # this visitor's browser keeps it open after the first time
  seal: true              # the haus records the first opening, for everyone
  visibility: public      # the lock follows this
  ```
  The haus writes `opened: <date>` itself; it is never typed. Tiers: the shape's default, then a room's
  `_index.md` (a journal room could seal everything), then the note.
- *Why:* notes carry these for years; renaming later means editing files.
- *Default:* the shape's defaults only, no fields typed until Leon confirms names.

**O11 · Reserve the haus's own keys in the builder**
- *What:* the builder warns about, and drops, `opened`, `fetched`, `date_postmarked` and `mark_*`
  when an author typed them (finding 27).
- *Default:* do it together with the first seal; nothing reads them on static pages before then.

**O12 · The visitor's memory**
- *What:* key it by the page ID from the page's own meta tag; keep a list per site in the browser's
  storage, like the locker does.
- *Default:* as written; move `checkbox-tracker` to the same key when it is next touched. Say plainly
  that memory is per browser and may fade in Safari after a week away (finding 28).

**O13 · The seal on a static site**
- *What:* the cloud piece from finding 29.
- *Why:* it is the only part of this design that needs a server, so it can come last.
- *Default:* the field `seal:` is reserved and documented; the behaviour waits.

**O14 · The gesture contract** (`shapes.md` question 9)
- *What:* with two gestures, write the contract: the shape names its opening gesture and draws frames
  from progress 0 to 1; the host counts; every gesture has a button with a spoken label and respects
  reduced motion; the gesture's strength follows the memory (finding 31).
- *Default:* write that down when the ribbon is built; no manifest field until a third gesture.

**O15 · One look for the editor and the base**
- *What:* `bloob.haus/visualizers/` previews with `base-tokens.css`; the base theme would have its own
  `main.css`.
- *Default:* one file, the theme's, which the editor build copies, so a visualizer looks the same in
  the preview and on a haus.

**O16 · The word "note"**
- *What:* three meanings (finding 18).
- *Default:* "note" is the scroll object; the cloud's plain renderer is renamed in code only when it
  is next touched; the vault registry's description gets updated with the shape.

---

## Decisions only Leon can make, most important first

1. **The closure YAML** (O10): do the four questions hold with the two corrections (memory is two
   switches; lock follows visibility), and what are the field names? This is the part that gets
   written into files.
2. **The base is a new theme** (O1), what it is called, and leons as its first site with
   marbles-pouch kept as the way back.
3. **The night look of objects, with Whitney** (O4): paper light or dim at night; night versions of
   cutouts or not. The code can wait for this without blocking anything else.
4. **Where note and marble live** (O5): the builder now, or wait for the shapes repo (prior dig R2).
5. **The seal now or later** (O13): it needs the only cloud work in this design.

Everything else has a default above.

---

## Doc fixes to make once agreed

- **Both DECISIONS files:** record the 2026-10-25 vocabulary: lock = encryption, seal = the one-time
  first opening for everyone; `sealed-*` file keys stay. Record "night and day follow the system" as a
  requirement for the base theme.
- **`shapes.md`:** "Sealing" becomes "Locking" (words only; keys unchanged); add a "Closures" section
  (the four questions, memory as two switches, fields in the top block, the three zones); update
  question 9 with the ribbon and the gesture rule; fix the stocks paragraph (lines 294-311, prior dig);
  update the `note` and `marble` rows of the status table.
- **`ontology.md`:** "leaf shapes have no meaningful closed state" (line 54) becomes "a leaf's closed
  state can be rich (the scroll) or simply its inside (the sticky note)"; seal/lock words; revisit the
  marbles-pouch CSS rule (line 321) in light of a new base theme.
- **`letters-and-envelopes.md`:** `renderClosed(envelope)` with one input (lines 80, 280); "private is
  sealed" becomes "private is locked"; a note that `sealed-*` keys keep their old name on purpose.
- **`themes.md`:** current `_base` contents; a night/day section (meta tag, the colour block, ground
  vs object, the new meaning of `--surface-text-color`); one colour-pair section instead of three;
  dark mode out of "Future"; the base theme as the starter; correct the melt note and the missing
  `_base/assets/objects/`.
- **`visualizers.md`** → "CSS Token Standard": no light-only literals for glass, glows or panels; a
  `browser.js` that reads colours re-reads them when the system flips.
- **`urls-and-ids.md`** → "Consuming the ID": the page ID is also the key for a visitor's memory.
- **`settings-registry.md`** and **`settings-backlog.md`:** the closure fields once named; whether a
  site can pin day-only.
- **`IDEAS.md:59`:** the light/dark row is promoted; delete it.
- **`sites/_template.yaml`** and **`_base/_bloob-settings.template.md`:** one starter theme, the base.
- **Cloud copy** (words only): "Unsealing…" becomes "Unlocking…" in `Gate.tsx` and `LetterSlot.tsx`.
- **`next-steps.md`:** refresh; it predates the post office.
