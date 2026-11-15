# Writing notes that shapes can read

One page, written to be pasted into any AI chat (or read by a person) that writes markdown which a
Bloob Haus shape might show some day. It is about **notes**, not about building shapes: how to make a
shape lives in `shapes.md` and, per shape, in `lib/visualizers/<shape>/schema.md`.

The seven recommendations were distilled from Leon's existing visualizers and confirmed by him
(2026-10-25). Each one names where it already lives in the code, so it can be checked, not just
believed.

---

## The one rule

**Write it however reads best. Anything code can read reliably is fine.** "Reliably" mostly means one
thing: the same kind of thing is always written the same way.

## Seven recommendations

1. **It reads well in Obsidian first.** A shape may come much later. Until then the note is just a
   note, so it has to make sense as plain markdown. *(testimonials are readable quotes in the vault;
   photo-grid's settings show as harmless plain lines; scene-nav writes images as links without `!`
   so the editor does not fill up with full-size pictures.)*
2. **Normal markdown first, new syntax last.** Checkboxes, footnotes, quotes, tables, headings and
   lists are already readable by people and by code. *(`- [ ]` → checkbox-tracker, `[^1]` →
   citations, `>` → testimonials, a table → image-grid, a heading plus a list → services.)*
3. **Each kind of line looks different.** If settings, items and notes look alike, code has to guess.
   Give each kind its own look. *(photo-grid tells settings from images by the shape of the line; in
   garden an `@` marks an element and `key: value` a setting; testimonials use `~ name:`.)*
4. **Everything is optional, and order means order.** A note with nothing extra still works. Write
   only what differs from the obvious. The order in the file is the order on screen unless you say
   otherwise. *(every setting has a default; garden's builder writes only non-defaults; flow is the
   default placement.)*
5. **Forgiving when reading, clean when writing.** Shapes accept `on`/`off`/`true`/`false` in any
   case, tabs or spaces, `[[wiki links]]` or `[normal](links)`, spaces or `%20`, and fall back to a
   default on a typo instead of breaking. Whatever writes markdown back writes one clean form.
   *(`shapes.md` → "Authoring & resolution conventions" #1, #4, #5.)*
6. **Who writes it decides how much effort is fair.** Anything a shape needs must be easy to type by
   hand. An AI can add more (a `title:` line, exact coordinates), but nothing may depend on what a
   person would not type. *(the title rule below exists so nobody has to write `title:`; garden
   accepts regions for people and coordinates for AI, `shapes.md` → "Placement systems".)*
   The other half (Leon, 2026-11-14): **a builder writes the same short form a person would.** If a
   tie between two words counts when written on either word, a person writes it once, so the builder
   writes it once too. A builder that wrote it on both words would leave a person deleting it twice,
   and a tie deleted on one side only would quietly survive.
7. **Say where it came from.** Where a recipe was passed down from, where a phrasing was first used,
   who said a quote. A link is best. *(the buffbaby recipe `source:` lineage; the resume vault's
   per-version source links; a letter's postmark.)*

## What the builder already does with every note

- **Title:** `title:` in the top block, else the first `#` heading (removed from the body), else the
  file name. You never need to write `title:`.
- **Subtitle:** a `##` heading directly under the `#` title becomes the subtitle. If it should stay a
  section, put a sentence between them.
- **The top block is the outside.** Facts about the whole thing (dates, place, role, tags) belong in
  the frontmatter. A shape's closed view is drawn from the top block alone, without opening the note.
- **`bloob-shape: <name>`** in the top block says which shape the file is. Leave it out if you do not
  know; the note still renders as a normal page.
- **`visibility: unlisted`** (or `#unlisted`) keeps a page out of every list, feed, sitemap and search,
  but anyone with its link can still open it.
- **Links and embeds** (`[[name]]`, `![[image.png]]`) resolve by file name alone, the way Obsidian
  does; a folder is only needed when two files share a name.

## What Obsidian already understands (so a note stays safe in the vault)

Checked against Obsidian's help on 2026-11-14 (obsidian.md/help/syntax, /advanced-syntax,
/obsidian-flavored-markdown) unless marked *unchecked*.

- **Lists:** `-`, `*` and `+` all start a bullet; `1.` or `1)` a numbered item. Nesting is "indent
  one or more list items", with `Tab` / `Shift+Tab`; no fixed number of spaces is given. So a shape
  treats any deeper indentation, tabs or spaces, as one level deeper and never counts a tab width
  (`shapes.md`, "Shape-named blocks").
- **A line starting with `+ ` is a bullet,** so a marker like `+` or `++` goes at the END of an item
  (`- home ++`), never at the start.
- **Words that turn into something in Obsidian:** `#word` (a tag; *unchecked*: a tag needs at least
  one letter, so `#1` stays text), `[[name]]` and `![[name]]` (a link and an embed), `==text==` (a
  highlight), `%%text%%` (hidden as a comment), `^id` at the end of a line (a block reference), `$...$`
  (math), `[^1]` and `^[...]` (footnotes), `> [!note]` (a callout). Use them only when that meaning is
  wanted. A backslash escapes: `\#`, `1\.`.
- **`key: value` inside a list item is plain text** in Obsidian itself. *Unchecked:* the community
  plugin Dataview reads `key:: value` (two colons) as a field, so shapes use one colon.
- **Whether one Enter shows as a line break** in reading view depends on the setting "Strict line
  breaks" (the help page describes lines running on as one paragraph; *unchecked* which way the
  setting defaults). Line-based shapes read the file's lines, so the shape sees the same note either
  way; only the look in Obsidian changes.
- **A ```` ```mermaid ```` block** is drawn as a diagram by Obsidian with no plugin.

## Writing for one particular shape

Each shape's own rules (tabs, positions, special lines) live in its `schema.md`. Follow them when
writing for that shape and do not carry them over to other notes. A shape's rules are written
together with its code, for notes as people already write them, not the other way around.
