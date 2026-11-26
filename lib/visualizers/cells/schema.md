# Cells

Any note of nested bullets grows as living cells. Each heading is a centre; its bullets bud around
it, and a bullet's children bud around that bullet when it is opened. Resting on a cell shows its
whole words. A tool belt in the corner changes the note.

A one-page visualizer (rung 0, `docs/architecture/making-visualizers.md` → "Rungs"): `page.html`
is the whole thing, published at `bloob.haus/visualizers/cells/`. It carries an example note.

## The note

```markdown
# A title

A line that says what the note is.

## Part 1 · when · A heading becomes a centre
A plain line under a heading says what or who it holds.

- a big point
  - something inside it
  - "a quote, word for word" (Name)
  - comment: a remark (Name)
  - tied to: another cell's words, a second one
```

- `## A · B · Title`: the centre shows Title, with "A · B" under it. A heading without two `·` is
  shown whole.
- Indent by any width, tabs too.
- `"words" (Name)` is a quote; the name shows under it.
- `comment: words (Name)` is a note, drawn as warm paper with a stitched edge.
- `tied to: a, b` is not a cell: it ties its parent to the cells with those exact words.
- `note: words` writes words that would otherwise read as one of the above.
- A note with only one heading, or none, grows around one centre.

## Giving it a note

1. **The example inside the page** (nothing to do).
2. **A link:** `bloob.haus/visualizers/cells/?note=<link to a .md>`. A GitHub page link
   (`github.com/.../blob/...`) is read as its raw file. The file's host must allow the page to read
   it; Google Drive does not, so a board fetches Drive files itself.
3. **A host page that embeds it** (a board): the page sends `{type: 'bloob-ready'}` to its parent;
   the host answers with `{type: 'bloob-note', md}`. Every change made with the tool belt comes back
   as `{type: 'bloob-note-changed', md}`, sent only to the origin that handed over the note. The host
   saves it; the page keeps no copy.
4. **Pasted**, under "The note" in the panel.

## The tool belt

Every tool writes the note, in the same short form a person types, and the note re-reads to the
same cells.

| Tool | Writes |
|---|---|
| edit words | the cell's bullet |
| add a cell | `- words` under the cell |
| add a note | `- comment: words (your name)` under the cell |
| tie two cells | `- tied to: the other cell's words` under the first |

Changes are kept in the visitor's browser when the note came with the page, copied by hand when it
came from a link, and sent back to the host when a host holds it.

## Dials

Shape, growth and feel are named dials in the side panel, kept in the visitor's browser
(`ui-principles.md` #30). "copy settings" and "paste settings" carry them between pages.
