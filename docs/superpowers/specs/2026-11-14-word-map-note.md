# The word map: its note (card draft, 2026-11-14)

Agreed with Leon in the cloud session of 2026-11-14, after the "Our Word Map" mockup
(https://claude.ai/artifact/6b6aaYpiuwYzgtDSMweaie) was built without a markdown equivalent. This is
the writing card that goes at the top of `lib/visualizers/word-map/schema.md` once the visualizer is
built. Until then it is also the **answer key for round one** of the docs loop
(`docs/architecture/making-visualizers.md` → "How this guide gets better"): a fresh agent builds a
word map from the public guide alone, and what it invents for the note is compared with this.

## The note

```markdown
---
bloob-shape: word-map
---
# Our word map

The words that matter to us.

## soft things we keep
- tenderness
  - why it matters to us
  - another note, as many as you like
  - tied to: home, joy
- caring
- letters @240,310

## loose
- home ++
- joy
```

## Rules

1. **Groups are `##` headings, words are bullets under them.** A word before any `##` belongs to no
   group. A sentence between the `#` title and the first `##` keeps that `##` a group (otherwise the
   builder reads it as the subtitle, see `writing-notes-for-shapes.md`).
2. **Size: `+` and `-` at the end of the word,** as many as wanted (`home ++++`). Each `+` is one
   step bigger, each `-` one step smaller; they cancel. The note keeps what was typed; only the
   drawing has a largest and smallest size. Reading also accepts `**home**` as one step bigger.
   The builder writes the `+`/`-` form.
3. **Every word is a bullet, and everything about a word is a bullet under it** (Leon, 2026-11-14:
   "we might have more than one note, extendability").
   - A child bullet is a **note**; a word can have any number of them.
   - A child bullet `name: words` is a **relationship** (`tied to: home, joy`), split at the first
     colon, comma separated. `tied to` is the first kind; others (`grows from:`, `opposite of:`) draw
     as a thread labelled with their name. *Open: how a note that happens to contain a colon is told
     apart from a relationship (see the round-one page).*
   - Reading also accepts a plain indented line under a word, and `note:`, as a note.
4. **A relationship is written once, on either word.** Written on both, it is still one thread. The
   builder never moves a relationship a person wrote; a new one goes on the word you started from.
   (Round one: a builder that rewrote ties onto "the first word in the file" moved people's lines.)
5. **Names match words in the map,** ignoring case and extra spaces; a trailing comma is harmless. A
   name that is not listed yet adds that word under no group. Nothing in the note is an error.
6. **Position is optional: `@x,y` at the end of the word** (garden's grammar). Without it, a seeded
   layout places the word, so the same note always draws the same map.
7. **A group's outline is drawn around its words,** never stored. Drawing a loop in the builder is
   only a way to put words into a group. So a word always fits inside its group.
8. **Bullet-agnostic:** `-`, `*`, `+` and numbered items (`1.`, `1)`) are all bullets, and any deeper
   indent, tabs or spaces, is one level deeper. No tab width is counted. The builder writes `-`.
9. **`[[name]]` stays a link to a note elsewhere** (a word that opens a note, later), never a word in
   this map.
10. **A second way in: a ```` ```mermaid ```` block** is read too (nodes are words, edges are `tied to`,
    subgraphs are groups). Never written out.

## Outside and inside

The closed view (the map seen from elsewhere) is drawn from the top block alone: the title, and
anything else written up there. The words are the inside, so the closed view never counts them.
