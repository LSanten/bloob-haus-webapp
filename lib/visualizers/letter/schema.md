# Letter

A letter in a see-through envelope. The top of the note (its frontmatter) is the outside of the
envelope: anyone who holds the letter can read it. The body is the paper inside.

A haus shows it as the envelope with its paper open below it. The post office
(post-office.bloob.haus) is where letters are sealed, sent and torn open; it draws the same letter.

## Activation

```yaml
---
bloob-shape: letter
---
```

## The outside (frontmatter)

On a haus, exactly these six keys are written on the envelope. Everything is optional.

| key | meaning |
|---|---|
| `to` | who it is for, typed at the bottom of the envelope |
| `from` | who wrote it, typed beside `to` |
| `timing` | when to open it. It is drawn as the stamp: `no-rush` (a moon), `please-open-soon` (a sun), or your own short words (a heart, up to 30 characters; longer words are typed on the envelope instead). Left out: a plain stamp with a leaf |
| `intention` | one line about why you are writing, typed at the top |
| `need` | what you hope for in return, typed as `need: ...` |
| `envelope_note` | anything else you want on the envelope, typed as it is. One line, several lines, or a list |

Nothing else in the frontmatter goes on the envelope: not `title`, `tags`, `visibility`, dates, or
any key of your own. They are about the page, and stay there.

**New lines.** In `intention`, `need` and `envelope_note`, a new line stays a new line. Write a
block, or a list:

```yaml
envelope_note: |
  the key is under the pot
  come by any time
```

```yaml
envelope_note:
  - the key is under the pot
  - come by any time
```

Long lines wrap and the envelope grows taller. Nothing is cut off.

**Dates are on the paper.** `date_created` and `date_updated` (a day like `2025-10-05`, or a list
of days, where the latest counts) make one small line at the top of the paper:
"written 5 Oct 2025 · updated 20 Sep 2026". A haus puts no postmark on the envelope: a postmark
says a post office handled the letter.

**In the post office** the writer types every line of the envelope on purpose, so there any key is
typed on it as `key: value`, and the office stamps its own marks on the copy it serves:
`date_postmarked` (the postmark), `fetched`, and `opened` (the envelope is drawn torn open). Keys
that start with `sealed-`, `mark_` or `bloob` are never drawn.

## How it first shows: `state`

| `state` | what a reader meets |
|---|---|
| `unfolded` (or left out) | the envelope, and the open paper below it |
| `sealed` | the whole envelope and a "Tear open" button. Three taps tear it open, then the paper is out |
| `opened` | the envelope already torn, the first lines of the paper sticking out, and an "Open" button. One tap takes the paper out |

Once a reader has torn or opened it, their browser remembers, and they find it unfolded next
time. `state` is never written on the envelope.

Sealed on a haus is a ritual, not privacy: the words are in the page for anyone who looks, for
screen readers and for search engines. A letter only its reader can open is sealed in the post
office.

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
on the same envelope. A value may hold line breaks. `paper.js`: `renderPaperBody(markdown)` and
`renderPaper(envelope, markdown, { dates })`, where `dates` (`{ written, updated }`) is optional:
without it the date line is the envelope's `date_created` as it stands.

`browser.js` (imports only `renderer.js`) is the plain-script tear for a page whose HTML holds the
whole letter: it folds `.bh-letter[data-letter-state]` shut, counts the taps, takes the paper out
and remembers the opening in this browser.

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
envelope_note: the key is under the pot
date_created: 2026-11-16
state: sealed
---
Thank you for the weekend.
I am still thinking about the lake.
```
