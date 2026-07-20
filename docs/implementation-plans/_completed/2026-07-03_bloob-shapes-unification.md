# Bloob-Shapes Unification — `_bloob-types.md` → `_bloob-shapes.md`

**Status:** ✅ Complete (2026-07-20) — reader `_bloob-shapes.md` support, the `_bloob-*` publish-filter fix, the melt clean-reference migration, the `_base` scaffold, and the doc reconciliation all shipped. Steps 3–4 (per-shape `fastcomments` / `showvisitorcount` **gating**) remain deliberately deferred — see "Deferred follow-up" below. Original context seed from the 2026-07-03 comments/URL session.
**Created:** 2026-07-03
**Completed:** 2026-07-20
**Location:** `docs/implementation-plans/phases/phase-2/` → moving to `_completed/`

> Prereq reading: `docs/architecture/ontology.md`, `docs/architecture/shapes.md`
> (esp. "Comments — a shape behavior"), `docs/architecture/urls-and-ids.md`.

---

## Progress (2026-07-18)

**Shipped (webapp `origin/main`):**
- `resolveIdentityKey()` in `bloob-objects-reader.js`, wired into `preprocess-content.js` — `bloob-shape:` now resolves a page's **identity** (banner image/text, icon), not just rendering. Precedence `bloob-type > bloob-object > bloob-shape`, so marbles/buffbaby are unaffected. Regression test added; full suite green (523). Realizes design decision #1 (single `bloob-shape` key drives both layout AND registry metadata).
- `scripts/migrate-bloob-type-to-shape.js` — reusable, dry-run, idempotent frontmatter migrator.
- **melt content migrated**: 13 files `bloob-type:` → `bloob-shape:`, verified end-to-end (identity + banners render identically). Lives in the `melt-website` repo (Leon to commit/push).

**Shipped this session (2026-07-20, branch `bloob-shapes-unification`):**
- **Reader `_bloob-shapes.md` support** (step 1) ✅ — `_bloob-shapes.md` prepended to the filename precedence (`_bloob-shapes.md` > `_bloob-types.md` > `_bloob-objects.md`, first found wins); `bloob-shape` accepted as the key column alongside `object_type`; `layout` column stays optional; per-shape `fastcomments` / `showvisitorcount` parsed into the registry (booleans, default true). 7 new reader tests, TDD. `scripts/utils/bloob-objects-reader.js`.
- **Layout resolution** (step 2) ✅ — **no code change needed.** Verified: with the `layout` column absent, resolution falls through `bloobObjectLayout ?? bloobShapeLayout ?? shapeManifestLayout ?? layouts/page.njk` — for melt's unbuilt shapes that lands on `page.njk`, identical to before. Confirmed on a real melt build.
- **Publish-filter `_bloob-*` fix** (step 5 quirk) ✅ — generalized `publish-filter.js` to skip **any** `_bloob-*` file (the reserved system-file convention), not just `_bloob-settings`/`_bloob-objects`. This also fixed `_bloob-auto-tagging.md` leaking as a page (affects marbles too). `_index.md` guard test added. 2 new tests, TDD.
- **melt as clean reference** (step 5) ✅ — deleted `melt-website/_bloob-types.md` (kept `_bloob-shapes.md`); build verified byte-identical (6 shapes from `_bloob-shapes.md`, no system-file pages, 9 content pages). *The deletion is left uncommitted in the `melt-website` repo for Leon.*
- **`_base` scaffold** (step 7) ✅ — new `themes/_base/_bloob-shapes.template.md` reference registry; `_bloob-settings.template.md` cross-links it.
- **Doc reconciliation** (step 6) ✅ — see the per-doc checklist below (all items done except where noted).

**Deferred follow-up (out of this plan's active scope):**
- **Steps 3–4 — per-shape behavior *gating*.** The `fastcomments` / `showvisitorcount` columns are now *parsed* into the registry, but templates do not yet *consume* them: `partials/comments.njk` is not yet gated on the shape's `fastcomments`, and GoatCounter is still site-wide. Deferred by the original plan ("not needed yet") and left deferred here — the gating touches all four themes' `page.njk` + the comments partial (a Multi-Site-rule change) and isn't needed by any current vault. When wanted, it becomes a template-only change (the registry data is already exposed). Tracked in `docs/implementation-plans/IDEAS.md`.

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

**Status (2026-07-20):** ✅ 1 (reader) · ✅ 2 (layout — verified, no code change) · ⏸ 3 (expose behaviors to templates — deferred) · ⏸ 4 (gate partials — deferred) · ✅ 5 (melt migrated; melt-repo deletion left for Leon) + `_bloob-*` publish-filter fix · ✅ 6 (docs) · ✅ 7 (`_base` scaffold). Steps 3–4 deferred per "Deferred follow-up" above.

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
6. **Docs — fold in "visualizer ≡ shape" + the `bloob-shape` identity key.** The concept is **already
   correctly stated** in `ontology.md` ("What a shape is", ~line 35: *"a `bloob-type`… a `visualizer`,
   and an inline `:::` block are the same thing at different scopes… a **renderer** that turns core →
   visual… the *visualizer* — that is code"*) and `shapes.md` (line 3). The gap is that `visualizers.md`
   predates the unification and legacy `bloob-object` framing is scattered. The job is **propagation +
   de-duplication**, not inventing a concept. Per-doc edits:

   - **`visualizers.md`** (main surgery):
     - Add **Shape** to the Core Concepts table, and a top-of-doc line: *"A visualizer is the **renderer
       face of a shape**. Visualizer / shape / `:::` block / `bloob-shape:` are the same thing at
       different **scopes** — see `shapes.md` line 3 and `ontology.md` → 'What a shape is', which own
       this definition."*
     - Reframe "Four Types of Visualizers" + "File-scope Shapes" as **scopes/triggers** (YAML whole-page
       vs. inline `:::`/fence), **not kinds**. Keep the technical detail; add the framing sentence.
     - Fix the **stale identity line (~259)**: currently *"bloob-shape is independent of bloob-type…
       bloob-type controls identity; bloob-shape controls rendering."* → `bloob-shape:` is the single
       forward-facing key; it drives rendering **and** identity (via `resolveIdentityKey`, shipped);
       `bloob-type` / `bloob-object` are legacy identity aliases that still win when explicitly set.

   - **`ontology.md`** (light — Leon flagged): Q1 + Q2 ("What is a bloob object?") reconcile the
     `bloob_object` / `_bloob-objects.md` wording so identity reads as a **facet of a shape**, keyed by
     `bloob-shape:`, registry `_bloob-shapes.md` (legacy `_bloob-types.md`/`_bloob-objects.md` still
     read). Keep the "open taxonomy" idea and line 35 as-is (it's already right).

   - **`settings-registry.md`**: per-page frontmatter table — make `bloob-shape` the **primary**
     identity+rendering key; mark `bloob-type` / `bloob-object` as legacy aliases; note the
     `resolveIdentityKey` precedence. The `#### Shapes` (`default_shape`) section can add one line that
     identity now also resolves from `bloob-shape`.

   - **`shapes.md`** (light): the layout-selection step *"Layout from the `bloob-type` registry
     (`_bloob-objects.md`)"* → `bloob-shape` / `_bloob-shapes.md`, plus a note that identity now
     resolves from `bloob-shape` via `resolveIdentityKey`. Line 3 already correct.

   - **`themes.md`**: the `_bloob-objects.md` "Object Identity System" section — add a reconciliation
     note: `_bloob-shapes.md` is the successor; `bloob-shape:` is the key; the **registry is OPTIONAL**
     for a normal user — banner/icon degrade to the theme's `assets/objects/<shape>.png` when no
     registry row exists (banner prose/modal are the only things the registry adds).

   - **Scan / touch-up**: `magic-machines.md` (the "write" counterpart to visualizers — ensure it
     matches the unified framing), `melt-handoff.md` (bloob-type references; historical — note or
     update). `theme-standards.md`, `search.md` — minor.

   - **Cross-cutting principle (the real fix for "fine-tune in 10 places"):** one canonical statement of
     the concept lives in `shapes.md` / `ontology.md`; **every other doc links to it instead of
     re-explaining.** Same rule applies to the schema SSOTs (`settings-registry.md` for settings,
     `themes.md` for the theme contract) — the goal is that a future tweak edits one file, not ten.

7. **`_base` scaffold + reference vault**: update `themes/_base/_bloob-settings.template.md` (and, once
   the reader lands, ship melt's `_bloob-shapes.md` as the reference example) so a new vault starts on
   `bloob-shape:` + `_bloob-shapes.md` from day one.

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
