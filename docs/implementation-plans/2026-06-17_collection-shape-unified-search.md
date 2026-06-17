# Collection Shape & Unified Search — Open Implementation Plan

**Status:** Open / thinking artifact. Not yet scheduled. Decisions marked ✅ are settled; ❓ are open and need Leon.
**Created:** 2026-06-17
**Owner discussion:** Leon + Claude (Opus). Supersedes the ad-hoc "render tag pages through folder-preview" idea.

---

## One-sentence model

> A **search/filter produces a set of page URLs; a renderer displays them as cards/list/etc. by joining each URL to its `graph.json` metadata.** Query and display are two orthogonal axes of a single shape — the **`collection`** shape.

Everything below follows from that sentence.

---

## Why this exists (the problem)

Today three+ overlapping systems each fuse "what to show" with "how to show it," differently:

| System | Query (what) | Display (how) | Index used |
|--------|--------------|---------------|------------|
| `folder-preview` | folder (URL/`folder:`) + text-match over cards | list / cards / slider / bubbles / marbles | graph.json |
| `search` (Pagefind) | full-text query + facets | Pagefind's own UI | Pagefind |
| `tags` | all pages | tag cloud | tagIndex.json |
| tag pages (`tags.njk`) | one tag | hand-rolled `<ul>` | Eleventy collections |

The query axis and the display axis are independently variable (folder × slider, tag × cards, text × list…). That cross-product is the signal that they should be **two parameters of one shape**, not separate tools. Unifying the layer *above* the indexes — not merging the indexes — collapses 4 things into 1.

---

## The two-layer architecture

```
                      ┌─────────────── COLLECTION SHAPE ───────────────┐
 source/query  ─────► │  collection-core (reusable module)             │
 (folder/tag/          │   1. resolve source → candidate URLs           │
  field/text/list)     │   2. (optional) Pagefind filter/full-text      │
                       │   3. join URLs → graph.json nodes (display data)│
                       │   4. hand enriched nodes to a renderer          │
                       └──────────────┬─────────────────────────────────┘
                                      ▼
                         display: cards | list | slider | bubbles | marbles | …
                                      ▼
                         each item = closed-state card
                         open item: peek (modal/iframe) or navigate
```

### Two indexes stay separate — joined on URL

They answer different question-types and cannot merge cleanly:

- **`graph.json`** — small structured table (rows = pages; columns = title, subtitle, section, tags, image, extra_fields, website_status). Already built every run. Answers `WHERE tag = X` / `WHERE section = Y` and supplies *display* fields. No engine to load.
- **Pagefind** — full-text inverted index, WASM, lazy-loaded. Answers `pages CONTAINING "heat pump comfort"`. Larger; only loaded when someone types.

> Pagefind tells you **which** pages match. `graph.json` tells you **how** to display them. The join key is the URL. This is the whole answer to "why are these two separate databases?" — they're a text index and a structured index, and the fix for the redundant *feeling* is a unifying query/render layer, not a merged store.

### High-level vs low-level Pagefind (the key implementation pivot)

- The current `search` visualizer uses **`PagefindUI`** (high-level widget): renders its own results UI. Cannot feed our card renderer or join to graph.json.
- The `collection` shape's full-text mode must use the **low-level API**: `pagefind.search(query, { filters })` → result objects → `.data()` → `{ url, excerpt, meta }` → join to cached `graph.json` nodes → render through the **same** card renderer used for metadata mode.

This is what makes search results and folder/tag listings look identical and share one renderer.

---

## The `collection` shape contract

**Name:** ✅ `collection`. (`pouch` becomes a future *display style*, not the shape name. `page-preview` is already taken by the modal visualizer.)

### Config axes

```yaml
# inline:  ::: collection   |   file-scope:  bloob-shape: collection
source:   folder=projects        # folder | tag=X | field:building_type=School
                                  #  | links-here | links-from | text | all
                                  #  | explicit [[wikilinks]] in the block body
display:  cards                   # cards | list | slider | bubbles | marbles
search:   metadata                # off | metadata (text-match over cards)
                                  #  | fulltext (Pagefind, body+title+tags)
sort:     alpha                   # alpha | reverse-alpha | recent
limit:    12
open:     navigate                # navigate | peek (iframe modal)
show_fields: [building_type, location]
```

### Through the shapes lens (this is the conceptual payoff)

- **Place, not pond (preserve policy).** A collection holds page-references and renders each *as itself*. Identity is preserved; only *presentation* is uniform. `display:` is the shape's metabolism dial — `cards` metabolizes presentation into uniform cards without dissolving identity.
- **Open/closed states ARE "access body content."** Each item renders in its **closed state** — *a card is literally an item's closed-state visual*. Two depths of opening:
  - **peek** = iframe/modal preview (the `search` visualizer's `openPreview()` already does this; `page-preview` does a variant)
  - **full open** = navigate to the page
- **Scenegraph recursion** (already committed to in `shapes.md`): a collection is a room/city of closed shapes; **search filters which closed shapes are visible; clicking opens one.** Same pattern as "a city contains house icons; open a house and its rooms are placed inside."
- **Context-dependent closed-state.** A card normally shows metadata (title/subtitle/image from graph.json). In `search: fulltext` mode it *also* carries a body **excerpt** from Pagefind — body content surfacing into the closed-state visual. Easy to implement; lovely to have.

### Capabilities, not sub-shapes

Search and item-open are **affordances of the collection**, not separate shapes wired in. There is no runtime "wire" contract yet and no evidence for one (Rule of Three). The whole-site search page is just `source: all, search: fulltext, display: list`; the folder index is `source: folder=…`; the tag page is `source: tag=…`. One shape, different source configs.

---

## Searching tags + titles + body (Leon's explicit requirement)

A single full-text query hits all three via Pagefind:

- **Titles** — Pagefind weights headings automatically.
- **Body** — indexed via `data-pagefind-body`.
- **Tags** — two channels: (a) *text* — if the rendered tag badges sit inside the indexed body region, the tag words are matched in full-text; (b) *facet* — `data-pagefind-filter="tag"` enables structured filtering and filter chips.

Pre-filtered scope (✅ a folder-scoped search shows only that folder's results) is a **native Pagefind filter** (`filters: { section: "projects" }`) — never an index rebuild.

---

## Prerequisites (what's NOT true today)

Metadata mode works now. **Full-text mode on AE requires setup:**

1. AE `sites/alter-engineers.yaml` / `_bloob-settings.md` has `search: false` → Pagefind isn't built. Enable it (or a dedicated flag) so the index exists.
2. AE `project.njk` extends `base.njk` and has **no `data-pagefind-body`**. Because AE's generic `page.njk` *does* declare it, Pagefind would index only pages with the attribute and **silently exclude project pages**. Project (and any listable) layouts must declare `data-pagefind-body`.
3. No `data-pagefind-filter="section:…"` / `="tag:…"` exists in AE. Add them so folder/tag scoping and facet chips work natively.
4. Ensure tag badges render inside the indexed region if we want tags matched as free text (already in `project.njk` header — just needs the body marking from #2).

---

## Implementation reality — what's self-verifiable, and risk by scope

**Added 2026-06-17 after a build/debug feasibility review.**

### What Claude can verify alone vs. what needs Leon's eyes

| Layer | Self-verifiable? | How |
|-------|------------------|-----|
| Build-time HTML (cards present, correct URLs/titles/subtitles, filter correctness) | ✅ Fully | rebuild → grep `_site/` → inspect `graph.json` → `npm test` |
| Data plumbing (graph.json fields, tag joins) | ✅ Fully | `node -e` inspection |
| Visual layout (grid, spacing, "does it look right") | ❌ No | needs Leon in a browser |
| Runtime JS (search-as-you-type, Swiper, modal, Pagefind WASM) | ❌ No | Claude can read/reason about the JS for bugs, but confirmation needs a browser |

**Implication:** build-time work has a tight edit→verify loop Claude drives alone; visual/runtime work needs Leon as the eyes and loops slower. This is the dominant risk/scheduling factor — more than code difficulty.

### Risk by scope

- **Low risk — do without ceremony:** `collection` in *metadata mode* (graph.json filter + build-time cards), built as **new files that reuse folder-preview logic, leaving `folder-preview` untouched.** Blast radius stays off the AE homepage, melt, and marbles. Modifying shared code (`folder-preview`, `graph-builder`) instead would raise risk — avoid in early phases.
- **Higher risk — own session, Opus, Leon testing in browser:** *full-text mode* (Pagefind low-level API + join). Needs the AE prerequisites above and is runtime WASM behavior Claude cannot see.

### Model strategy (Opus vs Sonnet)

The design thinking is done and captured in this doc; most implementation is mechanical. Use **Sonnet** for the metadata-mode structural work (Claude self-verifies build output). Bring **Opus** back for the Pagefind full-text integration and any hard-to-reverse contract decision. Don't burn Opus on card-porting.

---

## Phased implementation (incremental — no big-bang rewrite)

**Phase 0 — Tag-page cards (ships the visual win now). Two flavors:**
- *Quick win (non-architectural, fully self-verifiable):* enhance the existing `tags.njk` to render card markup directly in Nunjucks from `collections[tag]` (`.data.title`, `.data.subtitle`, `.data.image` all exist today). Build-time, crawlable, no Pagefind, no shape system, no preprocessor changes. ~20 lines. Claude can verify 100% by grepping output.
- *Architectural (routes tag pages through the `collection` shape):* requires generated per-tag `.md` stubs (like the folder-index stub generator) so they flow through the preprocessor's shape dispatch. This is real pipeline work — **not** trivial. Belongs with Phase 1, not before.

**Carry-forward:** the quick win's card **design + CSS carry forward 100%** (reuse the shared card classes). Its `tags.njk` *rendering code* is interim — superseded when tag pages route through the `collection` shape. It's ~20 lines, cheap to discard, and it lets us settle "what does a project card look like" once. See open question 6 (card-render location) for whether even the rendering can be shared via a Nunjucks partial.

**Phase 1 — Extract `collection-core` + introduce `collection` shape (metadata mode only).**
- New reusable module: `source → URLs → join graph.json → enriched nodes`. Generalize `folder-preview`'s filter from folder-only to `{ folder | tag | field | list | all }`.
- New `lib/visualizers/collection/` consuming the core; ports the five display renderers.
- `folder-preview` kept working as a **thin alias/preset** (`collection` with `source: folder`) — existing content unaffected.
- Write `collection/schema.md` (forces the contract to be explicit → this is what makes it a "proper shape").

**Phase 2 — Full-text mode (Pagefind low-level API + join).**
- Do the AE prerequisites above.
- `collection-core` gains a `search: fulltext` path: low-level `pagefind.search(query, { filters })` → join graph.json → same renderer; excerpts surface into cards.
- Unify the **peek** affordance (one iframe-modal implementation shared by collection + search + page-preview).

**Phase 3 — Consolidation / optional deprecation.**
- ✅ Only after `collection`'s search is reliable: re-express `search` and `tags` as thin `collection` presets, then deprecate the standalone visualizers. Not before.

Each phase is independently shippable and backwards-compatible.

---

## Decisions already made ✅

- Shape name is `collection`; `pouch` is a future display style.
- Two indexes stay separate; unify the query/render layer; join on URL.
- Full-text mode uses Pagefind's **low-level API**, not `PagefindUI`.
- Pre-filtered (folder/tag-scoped) search returns only that scope's results, via Pagefind **filters**, not index rebuilds.
- Modal/peek preview is an **author-toggled shape setting** (`open: peek`), default `navigate`.
- Search + item-open are **affordances of the collection**, not separate wired shapes.
- `collection-core` is a reusable internal module (factorable for future shapes) but not a productized cross-shape plugin system yet.
- Do **not** deprecate `search`/`tags` until `collection` full-text is solid.
- Phase 0 (tag-page cards) can ship now without any of the above.

## Open questions for Leon ❓

1. **Search affordance default per collection:** always-on, or opt-in? (Perf: an 8-item folder shouldn't pull the Pagefind WASM; a 400-page site search must. Likely: `search: metadata` default for small/scoped, `fulltext` explicit.)
2. **Dedicated `features.collection_search` flag vs reusing `features.search`?** (Reusing couples the collection's full-text to enabling the legacy search widget too.)
3. **`field:` source syntax** — `source: field:building_type=School` vs a structured `filter:` map? Affects how facet chips are authored.
4. **Should `graph` (force-directed) be a `display:` mode of `collection`,** or stay its own shape? (It's arguably "display the result set as a node graph.")
5. **Closed-state excerpt styling** when in full-text mode — show excerpt always, or only on the matched cards?
6. **Where does card markup live** — JS build-time render (`folder-preview`'s `renderSeoGrid`) or a Nunjucks partial/macro the shape layout includes? Determines whether the Phase 0 quick-win cards are *reused* or *replaced* by the shape, and whether we maintain one card implementation or two (inline `:::` JS render vs. file-scope layout render). A shared `partials/collection-card.njk` would minimize duplication if the shape renders cards in its layout rather than in `index.js`.

---

## Touch points (for when we build)

- `lib/visualizers/folder-preview/{index.js,browser.js}` — source of the renderers to generalize; `renderSeoGrid()` is the build-time card path; `attachSearch()` is the metadata text-match.
- `scripts/utils/graph-builder.js` — already spreads `extra_fields` and emits tag nodes + page→tag links; likely no change for metadata mode.
- `lib/visualizers/search/browser.js` — `openPreview()` iframe modal to lift into a shared peek util; current `PagefindUI` usage is the high-level path we move away from for collections.
- `themes/alter-engineers/layouts/project.njk` + `base.njk` — `data-pagefind-body` + `data-pagefind-filter` prerequisites.
- `themes/alter-engineers/pages/tags.njk` — Phase 0 host for the tag-filtered card render.
- `docs/architecture/shapes.md`, `docs/architecture/visualizers.md`, `settings-registry.md`, `DECISIONS.md` — doc updates when shipping.

---

## Guardrails

- Backwards compatibility is mandatory: `folder-preview` content keeps working; new behavior is opt-in (holistic change rule).
- Don't build the cross-shape search-plugin system until ≥3 real consumers exist.
- Keep parsers/renderers pure (`source→data`, `data→html`); DOM/Pagefind only in `browser.js` and `collection-core`'s runtime path.
