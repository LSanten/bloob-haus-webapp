# Shape width contract — design

**Date:** 2026-07-28
**Status:** design approved, not yet implemented
**Scope:** shared / upstreamable (`lib/visualizers/**`, `themes/_base/**`, `docs/**`, `tests/**`)

---

## Problem

A reading column and a card grid want different widths, and today a shape has no way to say so.

`article` constrains its body to a reading measure (`--article-width: 820px`). That is correct for
prose and wrong for a `collection` of cards nested inside it: on AE, `/projects/` renders 3 cards at
231px each inside the article column, while `/tags/<tag>/` — which bypasses the article layout
entirely — renders the same cards at 357px and looks markedly better.

The current workaround is to bypass the container (what `tags.njk` does), which is how AE ended up
with two card surfaces that drift apart. See `2026-07-28-tag-pages-as-md-templates-design.md`.

## What the architecture already says

`shapes.md` → "Container-contents policy" already resolves who *should* win:

> A `preserve` container must let a nested shape style itself. **`article` is a preserve container: a
> collection nested in an article body renders the way the *collection* wants, not the way the
> article's prose does.**

So a collection rendering wider than its container's prose is the declared policy being honoured,
not an exception to it. What is missing is only the mechanism.

The same section constrains how we may build it:

> The policy the shape already declares is the answer — there is no separate styling policy to invent.

**Width therefore rides the container-contents policy and is NOT a new axis.** There is no
`widthPolicy` field. A `preserve` container honours a child's width preference; an `override`
container imposes its own and ignores it.

## The contract

A shape declares a width *preference*. The container and theme decide whether to grant it.

```jsonc
// lib/visualizers/collection/manifest.json
"width": "wide"          // prose | wide | full
```

```yaml
# instance-level override, in the code fence or a ::: settings block
width: prose
```

**Vocabulary:** `prose | wide | full`. `prose` names the *intent* (reading measure), so it survives a
theme changing 820px to 760px. Undeclared means "whatever the theme defaults to", mirroring
`chrome: theme`.

**Precedence** — deliberately identical to the chrome intuition already recorded at `shapes.md`
open question #2, so this adds a property to an existing model rather than a second model:

1. **Theme is the final arbiter.** It defines which tracks physically exist.
2. **Instance beats shape default.** A `width:` in the fence overrides `manifest.json`.
3. **Unsupported or unknown value falls back to `prose`, silently.** Never an error. Mirrors the
   unknown-shape fallback.

**Default for `collection`: `wide`.** This is safe rather than bold, because of rule 3: a theme that
defines no wide track renders `wide` as `prose`, i.e. exactly today's output. melt, marbles-pouch,
warm-kitchen and buffbaby are unaffected until they opt in by defining tracks. AE opts in.

## Mechanism

> **Revised 2026-07-28 during implementation.** The first draft put named grid tracks on
> `.article-body`. Reading the actual stylesheet killed that: the width constraint lives on
> **`.article-page`** (`max-width: var(--article-width, 820px); margin: 0 auto`), not on
> `.article-body`, which is unconstrained and merely inherits it. Grid tracks on `.article-body`
> would still be clipped by the parent, and moving them to `.article-page` means restructuring the
> element that also wraps the header, share bar and comments — far more risk for the same result.
> It also removes the margin-collapsing hazard, since nothing becomes a grid.

The **child breaks out** of the prose column; the **theme** decides how far it may go.

```css
/* lib/visualizers/article/styles.css — article is itself a shape, so this lives
   in its own stylesheet and every theme inherits it. */
.article-body > [data-width="wide"],
.article-body > [data-width="full"] {
  width: min(
    var(--shape-width-wide, 100%),
    calc(100vw - 2 * var(--spacing-md, 1.5rem))
  );
  margin-left: 50%;
  translate: -50% 0;
}

/* Phones: never break out. Prose measure for everything. */
@media (max-width: 900px) {
  .article-body > [data-width] { width: 100%; margin-left: 0; translate: none; }
}
```

`index.js` emits `data-width="wide"` on the collection container (`buildContainer()` — the single
place both the fence path and the file-scope path construct it).

**Verified prerequisite:** `.collection-visualizer` is a direct child of `.article-body` (measured in
a real browser on `/projects/` and `/resources/`, 2026-07-28), so the child selector applies.

**Degradation is the default state, not a special case.** `--shape-width-wide` defaults to `100%`,
so `min(100%, …)` resolves to the prose column and the page renders exactly as today. A theme opts
in by naming a real width:

```css
/* themes/alter-engineers/assets/css/main.css */
:root { --shape-width-wide: 1200px; }
```

The `calc(100vw - …)` clamp is what stops a wide breakout from causing horizontal overflow on
viewports narrower than the declared width.

## Mobile rule — per display mode

**Width and internal layout are separate concerns**, and this is what makes the mobile story simple:

- The **width contract** governs how wide the collection *block* is. On a phone the gutter token
  collapses to `0`, so `wide` == `prose` automatically and the block is container-width. No media
  query is needed in the child.
- **Display-mode rules** govern the layout *inside* the block. Each mode owns its own classes
  (`.fp-cards`, `.fp-bubbles`, `.fp-marbles`), so their responsive rules are independent and cannot
  interact. Precedent already exists: `.fp-bubble` has its own `@media (max-width: 480px)` rule.

### `display: cards` — ONE card per row on phone (decided 2026-07-28)

Measured 2026-07-28: the grid is currently 3 columns at ≥1024px and **2 columns all the way down to
360px**, where cards are 132px wide — too cramped. The `560px → 1fr` rule at
`folder-preview/styles.css:403` is dead code, overridden by a later `900px → 2` rule.

Target ladder:

| Viewport | Columns |
|---|---|
| ≥1024px | 3 |
| 900–1023px | 2 |
| < ~560px | **1** |

Fix the dead rule so it actually applies. **Do not** convert `.fp-cards` to `auto-fill`/`auto-fit`:
that makes column count a function of available width, which would silently produce 3 narrow columns
on a phone exactly when the desktop container gets wider. Keep the explicit `repeat(N, 1fr)` ladder.

Test locks 1 column at 390px and 360px, and 3 at 1440px.

### `display: bubbles` — tighter packing on phone

Bubbles are a deliberately different look and do **not** follow the card ladder. Intent: more
crammed on a phone, not fewer per row. Concrete values to be set with the phone in hand during
implementation; the existing `@media (max-width: 480px)` bubble rule is the place they go. Treated as
a small follow-on to the card work, not a blocker for it.

## Card field lists (`show_fields`)

Extra fields (`show_fields: building_type, location, sqft, services`) currently render as a
horizontally wrapping flex row (`.fp-card__fields { display: flex; flex-wrap: wrap; gap: .3rem .6rem }`),
so values run together on one line.

**Decision:** stack them one per line, kept tight — `flex-direction: column` with a small row gap.

Safe to make in the **shared** stylesheet: `graph.extra_fields` is declared only by
`sites/alter-engineers.yaml` (verified 2026-07-28), so `show_fields` cannot render on melt, marbles,
buffbaby, or the template site. The change is a no-op everywhere but AE.

## Testing

`tests/shape-width.test.js`, following the both-directions pattern of `tests/shape-nesting.test.js`
so the fix cannot regress into "everything got wide":

| Assertion | Guards |
|---|---|
| a `width: wide` collection spans wider than its prose siblings | the feature works |
| prose siblings still sit at the reading measure | prose was not collateral damage |
| unknown value (`width: enormous`) renders as prose | graceful degradation |
| a theme defining no gutter token renders byte-identical to today | other sites unaffected |
| `.fp-cards` is 1 column at 390px and 360px, 3 at 1440px | the phone rule |
| `.fp-card__fields` stacks one field per line | the field-list rule |

Plus an existing-suite consideration: **the collection golden master will change**, because
`renderer.js` now emits `data-width`. Diff it by hand, then regenerate deliberately with
`UPDATE_GOLDEN=1`. That golden already caught one real regression this session, so it must not be
regenerated reflexively.

**Layout risk, reduced but not gone.** The revised mechanism introduces no grid, so the
margin-collapsing hazard is gone. What remains is horizontal overflow: a breakout child is sized
from the viewport, so a mis-clamped value produces a horizontal scrollbar. Assert
`document.documentElement.scrollWidth <= clientWidth` on a page carrying a wide collection, at
desktop *and* phone widths.

## Delivery

| Commit | Files |
|---|---|
| shared: width contract | `lib/visualizers/collection/{manifest.json,renderer.js,schema.md}`, `lib/visualizers/article/styles.css`, `tests/shape-width.test.js` |
| shared: docs | `docs/architecture/shapes.md` (+ `## Width preference` in the schema template list), `docs/architecture/themes.md` (token), `docs/architecture/settings-registry.md` |
| AE-specific | `themes/alter-engineers/assets/css/main.css` (gutter token) |

Shared commits are cherry-pickable to `LSanten/bloob-haus-webapp` per CLAUDE.md commit hygiene.

## Out of scope (YAGNI)

- **Chrome** (`shapes.md` open question #1) stays open. Width is a sibling property, not a merge.
- **Cascade layers / `@scope`.** Explicitly deferred 2026-07-28. Grid tracks are a layout concern and
  behave identically under any cascade regime, so the two decisions are independent. Doing both at
  once would mean debugging a new layout model and a new cascade model simultaneously.
- **Retrofitting other shapes.** `collection` and `article` only. Others adopt `width` when next
  touched, per the pure-renderer retrofit precedent (TECH-DEBT #40).
- **Per-breakpoint width declarations** (`width: {desktop: wide, tablet: prose}`). The gutter token
  already handles the only case anyone has.
