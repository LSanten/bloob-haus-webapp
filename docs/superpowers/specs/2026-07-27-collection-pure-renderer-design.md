# Collection Shape — Pure Renderer & SEO Decoupling

**Date:** 2026-07-27
**Status:** Approved design, ready to implement
**Part 1 of 2.** Part 2 (per-page visualizer loading, TECH-DEBT #4) ships only after this holds.

---

## Problem

`lib/visualizers/collection/index.js:94` emits build-time HTML **only** when
`display === "cards"`. Every other display mode (`list`, `slider`, `bubbles`, `marbles`) and every
file-scope use (`bloob-shape: collection`) falls through to `buildPlaceholder()` — an empty
`<div data-pagefind-ignore>` that `browser.js` fills after fetching `/graph.json`.

Crawlers see nothing for four of five display modes.

**Root cause:** `render-card.js` is the only renderer written as a pure string function shared by
Node and the browser. The other four display modes live as imperative `document.createElement`
functions inside `browser.js`'s IIFE (`renderList`, `renderSliderCards`, `renderBubbles`,
`renderMarbles`) — they physically cannot run at build time.

So "has SEO" currently means, literally, "has an isomorphic renderer." Visualization and
indexability are coupled by accident of implementation, not by design.

## Key finding: the pattern already exists — `collection` is the outlier

The documented `:::` shape standard (`docs/architecture/visualizers.md:84`, `:756-763`) is already:

```
parser.js    pure    block text → data
renderer.js  pure    data       → HTML string
browser.js   impure  DOM wiring / interactivity only
index.js     host    finds block, calls parser → renderer
```

**10 of 24 shapes already follow it:** `card-preview`, `image-grid`, `image-text`, `photo-grid`,
`quotes-stack`, `scene-nav`, `services`, `slideshow`, `testimonials`, `heading-and-paragraph`.

`collection` does not. The fix is **conformance, not invention.**

## Second finding: none of the runtime renderers actually need JS to build markup

Inspection of all four "runtime-only" renderers in `browser.js`:

| Renderer | What it builds | Needs JS for markup? |
|---|---|---|
| `renderMarbles` | `<a class="fp-marble" style="width:150px"><img><span>` | No — physics is applied *after* |
| `renderBubbles` | `<a class="fp-bubble">` + spans | No |
| `renderList` | `<ul><li><a>` | No |
| `renderSliderCards` | `<div class="swiper-slide">` then `new Swiper()` | No — Swiper initialises existing DOM |

The JS-only-ness was **incidental**. Drag physics, collision resolution, float animation and Swiper
init are *behavior* applied to elements that already exist.

This kills the alternative design (a uniform crawlable block that JS replaces), which would have
caused a visible cards→marbles flash and required `display:none` on the replaced markup — content
Google discounts. Rendering each mode's real markup upfront means **no flash, no hidden content, no
duplicate DOM.**

---

## Design

### The standard (→ `docs/architecture/visualizers.md`)

Four files. One rule: **markup comes from a pure renderer, never from `browser.js`.**

| File | Purity | Role |
|---|---|---|
| `parser.js` | pure | block text → data |
| `resolve.js` | pure fn, data injected | how the shape obtains *external* data |
| `renderer.js` | pure | data + settings → **complete final HTML string** |
| `browser.js` | impure | **behavior only** — physics, Swiper, listeners |

**Three hosts**, all just wirings of *resolve → render*. Only the data source differs:

| Host | Data source | Output |
|---|---|---|
| Node / build | `readFileSync(graph.json)` | HTML in the page |
| Playground (future) | pasted / dropped content | same string, injected |
| Browser fallback | `fetch("/graph.json")` | same string, injected |

**The requirement is a pure renderer — not that every shape run in the browser.** Once the renderer
is pure, running it in a browser is a free per-host choice made later, not an architectural
commitment made per shape. The standalone visualizer web app gets every conforming shape for free
the day it is built, with no second implementation to drift.

**Exempt:** shapes that only enhance existing text and generate no content of their own — `latex`
(needs KaTeX at runtime), `citations`, `checkbox-tracker`, `page-preview`. Nothing for a crawler to
miss.

**Why this matters beyond SEO:** scene-nav's magic machine drifted from the shape's own
parser/renderer and had to be consolidated (`DECISIONS.md`, 2026-07-20). A pure renderer makes that
class of drift structurally impossible.

### `resolve.js` — the one part that varies by host

Precedent already in the repo: `lib/visualizers/scene-nav/resolve.js` is a pure function taking an
*injected* index; `index.js` performs the impure read and hands it in. Same seam, generalised.

For collection, the data lives **outside** the block — `graph.json`, the whole-site page index.
That is the entire reason collection has a host split at all: `graph.json` needs `readFileSync` in
Node, `fetch()` in the browser, and does not exist yet at preprocess time.

### Collection refactor

```
core.js        → resolve.js    rename; already pure
                               (parseSource, filterNodes, sortAndLimit, resolvePages)

render-card.js → renderer.js   absorbs all five display modes as pure string fns:
                                 renderCards / renderList / renderSlider
                                 renderBubbles / renderMarbles
                               + renderCollection(pages, settings) dispatching on settings.display

index.js       Node host: graph.json → resolve → renderer.
                          Emits markup for EVERY display mode. Always.

browser.js     Behavior only. All markup construction deleted.
                          Retains a runtime path that calls the SAME renderer (fallback + playground).
```

**File-scope fix.** `renderFilescope()` runs during preprocessing, before `graph.json` is written,
so it can only emit the settings container. But `transform()` runs inside Eleventy's `addTransform`,
where `graph.json` *does* exist. Making `transform()` also fill any **empty** `.collection-visualizer`
it encounters closes the file-scope gap for free, with no new pipeline step.

**No new settings. No `seo:` toggle.**

An SEO on/off switch was explicitly rejected. Hiding content from crawlers via JavaScript is not a
privacy mechanism; `visibility: unlisted` is the real tool and already exists
(`docs/architecture/security-by-obscurity.md`). Adding the toggle would be a setting whose only
function is to make output worse.

**`data-pagefind-ignore` stays on the container.** Google and Pagefind are different consumers: the
listing should be crawlable by Google but must not pad the site's own search results with duplicate
titles.

### Search bar — `--sv-*` token contract

Two different DOM trees, which is why they diverge today:

- **Site-wide search** styles *Pagefind's own* `.pagefind-ui__search-input` via `--sv-*` tokens
  (`--sv-input-radius: 999px`, `background: var(--card-bg)`, `border: var(--border-color)`).
- **Collection** hand-rolls `<input class="fp-search-input">` with `var(--border-radius, 6px)`.

They cannot share markup. They will share **variables**: `.fp-search-input` adopts the same `--sv-*`
contract, so one set of tokens drives both search surfaces and roundness follows the active theme.

**Known consequence — flagged, accepted.** No theme currently overrides any `--sv-*` variable, so
every theme inherits the `999px` pill, including `alter-engineers` — whose *site-wide* search bar is
therefore already a pill despite `--border-radius: 0px`. After this change AE's *collection* search
input changes **square → pill**, making AE internally consistent (both its search surfaces match)
but altering a live client site. One-line revert if unwanted: override `--sv-input-radius` in
`themes/alter-engineers/assets/css/main.css`. See the AE handoff doc.

### Melt

`melt-website/Resources/_index.md`: drop the ` ```search ` fence (collection's built-in filter
replaces it — otherwise the page renders two search bars) and swap the shape:

````markdown
```collection
source: folder=Resources
display: marbles
```
````

Melt's current fence is `folder-preview` / `layout: marbles`, and `themes/melt/assets/css/main.css`
defines no `.fp-marble` rules — so the page renders the shared generic marble look
(`/assets/objects/marble.png`), which is what must be preserved unchanged.

`collection`'s `renderMarbles` is already a near-byte-identical copy of `folder-preview`'s (diffed:
only comments and one variable name differ), so the swap should be pixel-identical by construction.

---

## Testing

Two invariant tests carry the upstream safety, because **the alter-engineers vault does not exist on
this machine** and AE is the production consumer of `display: cards`:

1. **`display: cards` build output is byte-identical to current output.** Locked before any source
   is touched.
2. **`display: marbles` markup matches `folder-preview`'s `layout: marbles` markup.** Locked before
   the melt swap.

Plus:

3. **SEO invariant, per display mode** — build-time output for `cards`, `list`, `slider`, `bubbles`
   and `marbles` each contains real `<a href>` links and page titles.
4. **Headless browser pass** on a real melt build (`@playwright/test`): marbles present in
   server-rendered HTML with JS disabled; physics still work with JS on; search filters; before/after
   screenshots of the Resources page.

Tooling note: `@playwright/test` is added as a devDependency here. Browser binaries are already
present in the machine-global cache `~/Library/Caches/ms-playwright/` (`chromium-1228`,
`chromium_headless_shell-1228`), shared across repos, so no download is needed. The sibling repo
`bloob-haus-cloud/e2e/` already depends on `@playwright/test@^1.50.0`.

## Non-goals

- Retrofitting the other non-conforming content-generating shapes (`folder-preview`, `circular-nav`,
  `fridge-magnets`, `tags`, `graph`). Recorded in `TECH-DEBT.md` as high-importance; each converts
  when next touched, once collection proves the pattern.
- Per-page visualizer loading (TECH-DEBT #4). Part 2.
- Building the standalone visualizer playground. This spec only ensures the shapes are *ready* for it.
- Melt's B1/B2/F1 builder bugs from `2026-07-22_melt-builder-next-round.md`.

## Definition of done

- Every collection display mode emits crawlable `<a href>` markup at build time.
- `display: cards` output byte-identical to before (AE safety).
- Melt Resources page renders marbles server-side, visually unchanged, single search bar.
- Standard documented in `visualizers.md`; retrofit debt recorded; decision recorded.
- Suite green.

## Commit hygiene

Shared (`lib/`, `docs/`, `tests/`) split from any theme-specific commits, per CLAUDE.md, so the
shared work stays cherry-pickable upstream. `bloob-haus-webapp` pushed to `origin main`;
`melt-website` left for Leon to push.
