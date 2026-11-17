# Letter

A letter in a see-through envelope. The top of the note (its frontmatter) is the outside of the
envelope: anyone who holds the letter can read it. The body is the paper inside.

Today the post office (post-office.bloob.haus) is where letters are sealed, sent and torn open.
This page draws the same letter, unsealed, so you can see what you are writing. A haus made by the
site builder shows a note with `bloob-shape: letter` as a normal page for now.

## Activation

```yaml
---
bloob-shape: letter
---
```

## The outside (frontmatter)

Flat `key: value` lines. Everything is optional. Write only what you want on the envelope.

| key | meaning |
|---|---|
| `to` | who it is for, typed at the bottom of the envelope |
| `from` | who wrote it, typed beside `to` |
| `timing` | when to open it. It is drawn as the stamp: `no-rush` (a moon), `please-open-soon` (a sun), or your own short words (a heart, up to 30 characters; longer words are typed on the envelope instead). Left out: a plain stamp with a leaf |
| `intention` | one line about why you are writing, typed at the top |
| `need` | what you hope for in return, typed as `need: ...` |
| `date_created` | the day it was written. It is not on the envelope; it sits at the top of the paper |
| any other key | typed on the envelope as `key: value` (an underscore in the key shows as a space) |

Long lines wrap and the envelope grows taller. Nothing is cut off.

Keys you do not write, because a post office stamps them on the copy it serves:
`date_postmarked` (a day, `2026-11-16`, drawn as the postmark), `fetched`, and `opened` (the
envelope is then drawn torn open, with the top of the paper in it). Here, where nothing is sealed,
you may type them to see those looks. Keys that start with `sealed-`, `mark_` or `bloob` are never
drawn.

## The inside (body)

Markdown, kept plain: the paper holds only what you type. No greeting and no signature are added
from the envelope.

- A line ends where you press Enter.
- A pasted web address becomes a link.
- Raw HTML is shown as text.
- An image is shown as its description only, so opening a letter never tells another site.

## Outside and inside

The envelope is drawn from the frontmatter alone, so a sealed letter can show its outside while its
body stays unread. A link preview shows the sealed envelope and never the paper.

## For a host (how it is drawn)

Pure functions, no framework. `renderer.js`: `renderClosed(envelope, inside?)`,
`renderTearing(envelope, tears, inside?)` for the frames of the three-tap tear,
`renderBack(envelope, tears?, inside?)` for its other side, `renderEnvelopeSvg(envelope)` for a
picture printer, and `renderEnvelopePaper` / `renderStamp` / `FLAP_LINES` for a builder that writes
on the same envelope. `paper.js`: `renderPaper(envelope, markdown)` and `renderPaperBody(markdown)`.

`inside` is optional and only for a host that already holds the opened letter:
`{ html }` (from `renderPaperBody`) puts the letter's beginning on the part of the paper that
sticks out of the torn envelope (inside the envelope the paper stays blank), folded to fit; `{ lines }` only makes the blank paper as long as the letter. A sealed envelope and
`renderEnvelopeSvg` never show it.

The look is `styles.css`, with its own `--bh-*` tokens and a fallback for each.

## Example

```markdown
---
bloob-shape: letter
to: Whitney
from: Leon
timing: no-rush
intention: a thank you for the weekend
---
Thank you for the weekend.
I am still thinking about the lake.
```
