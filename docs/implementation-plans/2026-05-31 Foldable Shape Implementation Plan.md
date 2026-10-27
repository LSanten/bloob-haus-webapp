2026-05-31 Foldable Shape Implementation Plan

# Foldable shape: implementation plan

> **Status 2026-10-26: built, differently.** `lib/visualizers/foldable/` implements the `## > Heading`
> shortcut (plus `## ^ Heading` for open-by-default) as a markdown-it token rule that emits
> `<details>`/`<summary>`, not as a rewrite into `:::foldable` blocks: the rewrite would have been cut
> short by the first `:::` inside a fold. No verbose `:::foldable` primitive and no `title=` option
> yet. State is build-time only (option A below). See the shape's `schema.md` and `shapes.md`.

A small, focused plan for adding the `foldable` shape and the `## > Heading` shortcut to Bloob Haus. Two forms, one underlying primitive.

## Goal

Authors can collapse sections of content with a clear visible label. Closed and open states are part of the shape, consistent with the broader closed/open state model in the shape architecture. Two authoring forms cover both the explicit case (substantial folds with clear boundaries) and the common case (fold a heading section to the next same-level heading).

## The two forms

### Verbose primitive

```
::: foldable
## My heading
Content here that gets folded.
More content.
:::
```

### Sugar shortcut

```
## > My heading
Content here that gets folded.
More content.
```

The shortcut folds from the marked heading to the next heading at the same level or higher (or end of file or end of parent shape). The build pipeline rewrites it to the verbose primitive before markdown-it runs.

## Behavior

### Label resolution

The first element inside the `:::` block becomes the visible label (the always-visible "summary" of the fold). The renderer handles three cases:

- First element is a heading (h1 through h6): use it as the label, preserve its heading styling
- First element is an image: use the image as the label, with optional caption
- First element is a paragraph: use the first paragraph as the label

Everything after the first element is the content that folds.

If the author wants an explicit label independent of the first element, they can use a `title=` setting on the opener:

```
::: foldable title="Custom label"
## A heading that is now part of the folded body
Content.
:::
```

### State (open or closed by default)

Three ways to declare, in order of conciseness:

```
::: foldable+      open by default
::: foldable-      closed by default
::: foldable       uses shape default
```

Or as an explicit setting:

```
::: foldable state=open
::: foldable state=closed
```

The shape default is `closed`. Authors override per-instance.

### Where the fold ends (for the sugar shortcut)

`## > Heading` folds everything from the marked heading until any of:

- The next heading at the same level or higher
- The end of the parent shape (if the heading is inside a `:::` block)
- The end of the file

## Implementation steps

### 1. Add foldable to the baseline shape set

Folder: `lib/visualizers/foldable/`

Files following the shape contract from BLOOB-HAUS-SHAPES-ARCHITECTURE:

- `manifest.json` (name, version, declares state=closed default)
- `schema.md` (AI-readable spec following the consistent template)
- `parser.js` (extracts first element as label, rest as folded body)
- `renderer-open.js` and `renderer-closed.js` (or one renderer that handles both states)
- `styles.css` (label styling, fold affordance, transition)

The shape's closed state shows only the label with a click-to-expand affordance. The open state shows the label plus the folded content below it.

### 2. Add the sugar-to-primitive preprocessor

New file: `scripts/utils/foldable-heading-sugar.js`

Called from `preprocess-content.js` before markdown-it runs and before `inject-container-raw.js` (so the rewritten `:::` blocks pick up the data-vis-raw injection like any other shape).

Logic:

- Scan processed markdown for lines matching `^(#{1,6}) > (.*)$`
- For each match, determine the fold boundary (next same-or-higher heading, or end of parent `:::`, or end of file)
- Rewrite the section as a `::: foldable` block with the original heading as its first element
- Process from innermost to outermost so nested sugar shortcuts are handled correctly

Result: by the time markdown-it sees the content, only `:::` exists. No special heading-folding logic in the renderer.

### 3. State persistence (decide later)

Three options, ranked simplest to most complex:

- A: Build-time state only. The initial state is what's declared; user toggles do not persist across page loads.
- B: localStorage stores per-page fold preferences keyed by foldable identity.
- C: URL fragment encodes current fold state for sharing.

For v1: ship Option A. Revisit if users want persistence.

### 4. Schema.md for the foldable shape

Document the syntax, label resolution, state options, examples, translation behavior, and AI-usage examples. Follow the consistent schema template from the architecture doc.

## Edge cases

- **Empty fold.** A heading with no following content. Render the label without a fold affordance.
- **Nested foldables.** A foldable inside another foldable. Each maintains its own state independently.
- **Sugar at end of file.** `## > Heading` with no content after. Fold becomes empty; render the heading alone.
- **Mixed heading levels in sugar.** `### > Subsection` inside an `## > Section`. Rewriter processes inner first (bottom-up) so the outer fold contains the rewritten inner fold.
- **Custom title overriding first element.** When `title=` is set, render that as the label; the first element is then part of the folded body like any other content.

## Open questions

These are not blockers. Decide while implementing.

1. **Default state.** Currently `closed`. Some content types might want open default (a sidebar of references, for example). Per-shape default vs. per-author default vs. universal default.
2. **Click affordance.** Arrow icon, chevron, plus/minus, or text indicator. Theme-level decision.
3. **Heading label styling.** When the first element is an h2, does the label render as h2 styled, or as a foldable-specific label style that happens to wrap the h2 text. Probably the former for consistency.
4. **Visual nesting cues for nested foldables.** Indentation, sidebar lines, or nothing. Defer to design pass.

## Related

- [BLOOB-HAUS-SHAPES-ARCHITECTURE.md](BLOOB-HAUS-SHAPES-ARCHITECTURE.md) — the broader shape system this fits into
- [MOCKUPS-EXAMPLE-BLOOB-SHAPE-FILES.md](MOCKUPS-EXAMPLE-BLOOB-SHAPE-FILES.md) — example markdown showing how shapes are authored
- `visualizers.md` (existing architecture in the live repo) — the build-time visualizer pattern this builds on
- The Jekyll `collapsible_converter.rb` from the previous marbles site — historical reference for the `## > Heading` convention
