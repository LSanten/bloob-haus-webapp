# Foldable

Collapsible sections, made from a heading. Put `>` at the start of a heading and its section renders folded: only the heading shows, and a click opens the rest. Put `^` there instead and the section starts open but can be folded.

## Activation

A marker at the start of any heading (`#` to `######`). The space after the marker is optional.

```markdown
## > Transcript
Everything down to the next heading of the same or a higher level is folded.

## ^ Sensor Specifications
Starts open. Click the heading to fold it.

## >Some recent marbles close to my heart
No space after the marker works too.
```

No code fence and no `:::` block: the marker is the whole syntax. The marker never shows in the rendered title.

## Where a section ends

At the first of:

- the next heading of the **same or a higher level** (`## > A` ends at the next `##` or `#`; a `###` inside it stays inside),
- the end of the block the heading sits in (a `:::` block, a blockquote, a list item),
- the footnotes at the bottom of the page,
- the end of the page.

Folds nest: a `### >` inside a `## >` is its own fold inside the outer one.

## What is not a fold

- A blockquote line (`> text`) is a blockquote. Only a heading can fold.
- A heading with `>` anywhere but the start (`## Input > output`).
- An escaped marker: `## \> literal` shows a `>`.
- `## > ...` inside a code block.
- A marked heading with nothing under it: it renders as a plain heading.

## Output

Built at markdown time as plain HTML, so it works without JavaScript, is keyboard accessible, and folded text stays in the page for search engines, Pagefind and the browser's find-in-page:

```html
<details class="bloob-fold" data-fold-level="2">
  <summary class="bloob-fold__summary"><h2>Transcript</h2><span class="bloob-fold__peek" aria-hidden="true">…</span></summary>
  <div class="bloob-fold__body">…</div>
</details>
```

`^` adds the `open` attribute. Heading ids, inline formatting and `{#id}` attributes are kept. A link to an anchor inside a closed fold opens the fold (`browser.js`; Chrome does this natively).

## Peek row

A closed fold that holds cards (a `collection` with `display: cards`) shows a row of small round previews of those cards' images under its heading, as on Leon's Jekyll site. It disappears when the fold opens. At most six per fold. Decorative only (`aria-hidden`).

## Settings

| Setting | Where | Default | Description |
|---|---|---|---|
| `features.foldable_headings` | site (`_bloob-settings.md` or `sites/*.yaml`) | `true` | `false` turns the markers off: headings render with the `>` / `^` as text. |

Theme tokens (in the theme's `main.css`, all optional):

| Token | Default | Used for |
|---|---|---|
| `--fold-closed-bg` | accent tinted into `--card-bg` | card behind a closed fold's heading |
| `--fold-closed-text` | `--accent-dark` | heading and triangle on that card |
| `--fold-closed-shadow` | soft shadow | that card's shadow |
| `--fold-open-text` | `--accent-color` | triangle of an open fold |
| `--fold-peek-ring` | `--card-bg` | border around the peek circles |

## Content policy

**Preserve.** A fold holds any content, shapes included, and changes none of it. It only hides and shows.

## Closed-state visual

The heading on a card, with a right-pointing triangle and, when the section holds cards, the peek row.

## Placement system

Flow.

## Implementation notes

| File | Role |
|---|---|
| `fold-headings.js` | pure markdown-it core rule: finds marked headings, wraps their sections in `<details>` |
| `peek.js` | pure HTML transform: fills each fold's peek row from the card images inside it |
| `index.js` | host: exports `markdownItPlugin` (registered by `eleventy.config.js`) and `transform` with `transformOrder = 100`, so it runs after `collection` has drawn its cards |
| `browser.js` | behavior only: opens folds around a `#hash` target |
| `styles.css` | look, from theme tokens |

Why a markdown-it token rule rather than rewriting `## > Heading` into `::: foldable` blocks (the 2026-05-31 plan): markdown-it-container closes a block at the first bare `:::`, so a fold holding a `:::collection` or another fold would be cut short. On the token stream, code blocks, blockquotes and `:::` blocks are already separate tokens, so a fold can never cross their edges.

Ported from `_plugins/collapsible_converter.rb` + `collapsible_processor.rb` in Leon's Jekyll site (`LSanten.github.io`), which used the same marker grammar and section rule. That version built the toggle in JavaScript and remembered open/closed state in `localStorage`; this one is native `<details>` and does not remember state across visits.
