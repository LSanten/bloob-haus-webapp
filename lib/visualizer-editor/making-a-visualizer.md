# Making a Bloob Haus visualizer

*First version, 2026-11-02. For an AI or a person starting a new visualizer. A fuller guide comes
with the visualizer engine; everything on this page stays true when it arrives.*

A visualizer turns a markdown note into an object you can see: a note becomes paper, a marble
becomes glass, a record becomes a sleeve. Every object has a **closed look** (how it looks from
outside, in a room or a link preview) and an **open look** (what you see when you open it), and
the two are visibly the same thing. Objects sit on the background of whatever haus or room they are
in; the theme provides that background, so a visualizer never paints a page background of its own.

## The note

- Name the visualizer in the frontmatter with `bloob-shape: <name>`. Not `visualizer:` or `type:`.
- Keep the frontmatter flat and everything optional. Write only what differs from the defaults.
- **The frontmatter is the outside, the body is the inside.** For a public note, the closed look may
  use both (its first lines, its first image). For a note that is encrypted or sealed, the body is
  not available until someone opens it, so its closed look can only use frontmatter values. Design
  the closed look so it still works with only the frontmatter (a title, a cover image, a color).
- The note should read fine in Obsidian first. Prefer plain markdown (lists, headings, images,
  checkboxes, quotes, tables) over new syntax, and make each kind of line look different.
- Images and links: accept both `![[photo.png]]` / `[[Other note]]` and `![alt](photo.png)` /
  `[text](other-note.md)`. Refer to files by name; the site finds them.

## The code

- **A pure renderer:** a function from the note's data to a complete HTML string. No DOM, no file
  reads, no network inside it. The same function runs when the site is built, in the browser, and
  in a standalone page.
- **Nothing important may depend on JavaScript.** If script never runs, the page must still show
  the content as real HTML (images as images, text as text). Sites are static and search engines
  read that HTML.
- **`browser.js` adds behavior only:** clicks, animation, physics, 3D. It never builds the markup.
  Load heavy libraries only on pages where the visualizer appears.
- **Opening is one number.** Draw every moment between closed (0) and open (1) from a single
  progress value. The page around the visualizer counts the click; the visualizer draws.
- **Styles use the theme's variables only:** `--bg-color`, `--text-color`, `--accent-color`,
  `--border-color`, `--card-bg`, `--font-body`, `--font-heading`. No hard-coded colors or fonts.
  Scope every class under the visualizer's own root element. Look right in day and night
  (`prefers-color-scheme`).
- Respect `prefers-reduced-motion`. Make the open control a real button: Enter and Space work, and
  it has a label a screen reader can say.
- Never fetch anything from another site while drawing a note (a remote image tells that site who
  is reading).

## What to hand over

A folder named after the visualizer with:

- `schema.md`: what it is, a table of its frontmatter keys (key, required, default, meaning), what
  the body holds, how it opens, and a complete example note;
- an example note and small sample assets;
- the renderer, `browser.js` if it needs one, and `styles.css`.

It does not need to know how the site builder wires it in. Leave that to the Bloob Haus side.
