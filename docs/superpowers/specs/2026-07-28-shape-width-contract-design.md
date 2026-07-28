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

The **container** offers named grid tracks; the **child** tags itself into one.

```css
/* lib/visualizers/article/styles.css — article is itself a shape, so its tracks
   live in its own stylesheet and every theme inherits them. */
.article-body {
  display: grid;
  grid-template-columns:
    [full-start] minmax(0, 1fr)
      [wide-start] minmax(0, var(--shape-width-gutter, 0px))
        [prose-start] min(var(--article-width, 820px), 100%) [prose-end]
      minmax(0, var(--shape-width-gutter, 0px)) [wide-end]
    minmax(0, 1fr) [full-end];
}
.article-body > *                   { grid-column: prose; }
.article-body > [data-width="wide"] { grid-column: wide;  }
.article-body > [data-width="full"] { grid-column: full;  }
```

`renderer.js` emits `data-width="wide"` on the collection's container root.

**Verified prerequisite:** `.collection-visualizer` is already a direct child of `.article-body`
(measured in a real browser on `/projects/` and `/resources/`, 2026-07-28), so `grid-column`
applies without a wrapper or `display: contents` workaround.

**Degradation is the default state, not a special case.** `--shape-width-gutter` defaults to `0px`,
which collapses every track to the prose measure. A theme opts in by setting it:

```css
/* themes/alter-engineers/assets/css/main.css */
:root { --shape-width-gutter: 190px; }   /* wide ≈ 1200px */
```

## Mobile rule

**Requirement: never more than two cards per row on a phone.**

Measured 2026-07-28 across `/projects/`, `/resources/` and `/tags/<tag>/`, this **already holds** —
the grid is 3 columns at ≥1024px and exactly 2 columns from 900px down to 360px. The `560px → 1fr`
rule in `folder-preview/styles.css:403` is dead code, overridden by a later `900px → 2` rule.

So this requirement is a **regression guard, not new work**. The risk is that widening the desktop
track tempts a `repeat(auto-fill, minmax(...))` rule that yields 3 narrow columns on a phone.

Design rules:
- The gutter token goes to `0` below the wide breakpoint, so `wide` == `prose` on phones
  automatically. No media query is needed in the child.
- Card column count stays an explicit `repeat(N, 1fr)` ladder. **Do not** convert `.fp-cards` to
  `auto-fill`/`auto-fit`, which makes column count a function of available width and would break the
  two-per-row guarantee exactly when the container gets wider.
- A test locks 2 columns at 390px and 360px.

Open question deliberately left to implementation review: at 360px, two cards are 132px wide, which
is cramped. One-per-row below ~400px would satisfy "no more than two" and read better. Decide with
the phone in hand; the contract permits either.

## Testing

`tests/shape-width.test.js`, following the both-directions pattern of `tests/shape-nesting.test.js`
so the fix cannot regress into "everything got wide":

| Assertion | Guards |
|---|---|
| a `width: wide` collection spans wider than its prose siblings | the feature works |
| prose siblings still sit at the reading measure | prose was not collateral damage |
| unknown value (`width: enormous`) renders as prose | graceful degradation |
| a theme defining no gutter token renders byte-identical to today | other sites unaffected |
| `.fp-cards` is 2 columns at 390px and 360px | the phone rule |

Plus an existing-suite consideration: **the collection golden master will change**, because
`renderer.js` now emits `data-width`. Diff it by hand, then regenerate deliberately with
`UPDATE_GOLDEN=1`. That golden already caught one real regression this session, so it must not be
regenerated reflexively.

**Grid layout risk to test explicitly:** making `.article-body` a grid changes its layout model —
margin collapsing between prose blocks behaves differently in grid than in normal flow. Assert that
paragraph/heading spacing in an article body is unchanged, on a real project profile.

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
