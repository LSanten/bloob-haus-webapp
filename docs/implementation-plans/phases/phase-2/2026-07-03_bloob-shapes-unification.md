# Bloob-Shapes Unification — `_bloob-types.md` → `_bloob-shapes.md`

**Status:** Planned — not started. Context seed from the 2026-07-03 comments/URL session.
**Created:** 2026-07-03
**Location:** `docs/implementation-plans/phases/phase-2/`

> Prereq reading: `docs/architecture/ontology.md`, `docs/architecture/shapes.md`
> (esp. "Comments — a shape behavior"), `docs/architecture/urls-and-ids.md`.

---

## Context (why this exists)

The 2026-07-03 session built site-wide snippet injection (GoatCounter, FastComments), a
canonical page-ID system, and made **comments a shape behavior** (a shape includes
`partials/comments.njk` in its `layout.njk` to be commentable). That work surfaced a clumsiness:

- `bloob-type` and `bloob-shape` are, per the ontology, **the same concept** — *"a `bloob-type`
  (old terminology for `bloob-shape`)."* Yet the vault still declares content with `bloob-type:`
  and carries a separate `_bloob-types.md` registry.
- `_bloob-types.md` has a **`layout` column** that every row sets to `page.njk` (see melt). That
  duplicates what the shape now owns (`lib/visualizers/[shape]/layout.njk`, falling back to
  `page.njk`), and it's overkill for a normal user to hand-author.
- "Which shapes are commentable / show a visitor count" has no declared home — today it's implicit
  in which layouts include the comments partial.

Leon prototyped the target at `melt-website/_bloob-shapes.md` (kept alongside the old
`_bloob-types.md`). Goal: **drastically simplify this stream.**

## The target shape (Leon's prototype)

`_bloob-types.md` → `_bloob-shapes.md`, three moves:

1. **Column `object_type` → `bloob-shape`** — one vocabulary, matching the ontology.
2. **Drop the `layout` column** — layout is the shape's job now (built shape's `layout.njk`,
   else `page.njk`). **Keep it *optional* / backwards-compatible** — marbles' `_bloob-types.md`
   uses `layout` meaningfully, so the reader must still honor it where present.
3. **Keep `fastcomments` + `showvisitorcount` columns** — per-shape **behaviors**. `fastcomments`
   is exactly the "commentable?" behavior from the ontology (ontology.md Q1) — the declared home
   for comments-per-shape that `shapes.md` → "Comments — a shape behavior" calls "future
   formalization." `showvisitorcount` gates the GoatCounter snippet per shape.

Prototype columns: `bloob-shape | display_name | image | banner_text | description | fastcomments | showvisitorcount`

## Design decisions

- **`bloob-shape` becomes the single key** driving *both* layout resolution *and* registry metadata
  (display_name, image, banner_text, description). Today those are split: `bloob-shape` → layout /
  `renderFilescope`; `bloob-type` → registry metadata (`bloob-objects-reader.js`). Unification
  merges them.
- **Backwards compatible.** Read both `_bloob-shapes.md` (+ `bloob-shape` column) and legacy
  `_bloob-types.md` (+ `object_type` column). `layout` column optional in both. Legacy vaults
  (marbles) keep working untouched. Precedence when both exist: `_bloob-shapes.md` wins.
- **Comments/analytics become declared behaviors**, not layout side-effects:
  `fastcomments: false` on a shape row suppresses comments for that shape even if its layout
  includes the partial; `showvisitorcount: false` suppresses the analytics snippet. Per-page
  `comments: false` still overrides (already implemented).

## Implementation steps

1. **Reader** (`scripts/utils/bloob-objects-reader.js`): accept `_bloob-shapes.md` + `bloob-shape`
   column; make `layout` optional; expose per-shape `fastcomments` / `showvisitorcount`. Keep
   legacy `_bloob-types.md` / `object_type` path.
2. **Layout resolution** (`scripts/preprocess-content.js`): when a page's `bloob-shape` (or
   `bloob-type`) has no `layout` in the registry, fall through to shape resolution (built shape
   layout → `page.njk`) — i.e. removing `layout` from the table must be equivalent to today's
   `page.njk` for melt's unbuilt shapes.
3. **Expose behaviors to templates**: surface the effective shape's `fastcomments` /
   `showvisitorcount` as page data (via `eleventyComputed.js` or preprocessor frontmatter).
4. **Gate the partials**: `partials/comments.njk` also checks the shape's `fastcomments`;
   the GoatCounter head snippet respects `showvisitorcount` (or document that GoatCounter stays
   site-wide and only comments are per-shape — decide during impl).
5. **Migrate melt**: delete `_bloob-types.md`, keep `_bloob-shapes.md`, then run the content
   rename script (below). **Order matters — see sequencing trap.**
6. **Docs**: update `shapes.md` (promote "future formalization" note to the real mechanism),
   `settings-registry.md`, `ontology.md` reconciliation, and the `_base` scaffold.

### The content rename script (write last, in step 5)

Mechanical frontmatter rewrite across a vault's `.md` files: `bloob-type:` → `bloob-shape:`
(and legacy `bloob_object:` → `bloob-shape:` if present). Node script under `scripts/` taking a
`--content=` dir; dry-run first. **Cross-platform** (path.join, no inline env).

## Sequencing trap (do not skip)

**Do NOT run the content rename before the pipeline reads `_bloob-shapes.md`.** If content is
renamed `bloob-type: guide` → `bloob-shape: guide` while the pipeline still looks up metadata
under `bloob-type`, those pages lose banner_text / display_name and `guide` (unbuilt) falls to
`page.njk`. Pipeline unification (steps 1–4) lands first; content migration (step 5) second.

## Verification

- Reader unit tests: `_bloob-shapes.md` parsed; legacy `_bloob-types.md` still parsed; `layout`
  optional; `fastcomments` / `showvisitorcount` exposed.
- Local builds: **melt** (unbuilt shapes → page.njk, metadata preserved, comments gated by
  `fastcomments`), **marbles** (legacy `_bloob-types.md` + `layout` column still works unchanged).
- End-to-end: a shape row with `fastcomments: false` suppresses comments; `true` shows them.

## Related / prior work (this session)

- Comments as a shape behavior: `shapes.md` → "Comments — a shape behavior" + `article` layout.
- Page ID / `bloob-page-id` override / FastComments setup: `urls-and-ids.md`.
- Snippet injection (`fast-comments-embed`, `goat-counter-tracking` fences): `settings-registry.md`.
