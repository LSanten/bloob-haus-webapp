# Workbench insights (living)

The **workbench** is where someone *makes* a new visualizer: write a note, shape its files, watch it
in every state, and save it. It is not built yet. What is live at `bloob.haus/visualizers/` is the
catalog and a live editor per *existing* visualizer, which is for trying visualizers, not making them.
The only workbench so far is a throwaway spike:
https://claude.ai/artifact/KU5P9Fs6Dp3FCaSzjmWwwR (private, Leon's).

**How to use this file:** whenever a session learns something the workbench should do, add one line
under the right heading with the date and where it came from. Don't design here; collect. When the
workbench gets built, this is its brief.

**Order (Leon, 2026-11-01):** the engine first (fills a shape's files from a note, plus the shared
toolbox below), then the note and the marble, with the `bloob-haus-26` theme alongside. The
workbench UI comes right after the engine exists, as a thin face on it, and the "how to create a
visualizer" guide for AI is written from making the note.

Related: `docs/superpowers/specs/2026-11-01-base-haus-dig.md`,
`docs/superpowers/specs/2026-11-01-live-shape-editor.md`, and in `bloob-haus-cloud`
`docs/superpowers/specs/2026-10-25-workbench-dig.md`. Shape contract: `docs/architecture/shapes.md`.

---

## What a shape is made of (decided)

- **Five layers, one file and one workbench pane each** (Leon: "good right now", 2026-11-01):
  *reads* (blanks from the note, or `parser.js`), *draws* (`open.html`/`closed.html`, or
  `renderer.js`), *does* (toolbox switches; own `browser.js` only for what is truly its own),
  *looks* (`style.css`, tokens), *promises* (`manifest.json` + `schema.md`, the AI card). Today's
  `index.js` in each visualizer is near-identical plumbing (~25 copies) the engine should supply.

- `open.html` (required): the inside. `closed.html` (optional): the outside, only when it looks
  different from the inside, and it may only use outside data (title, YAML values). `style.css`.
  No `closed.html` means the closed look is the open one at 0, like a sticky note or a rolled-up
  note showing its tip. *(2026-11-01, Leon chose)*
- **Transitions are one number, not a file.** The haus counts the gesture and hands the shape a value
  from 0 (closed) to 1 (open); the shape's CSS draws every frame from it. Same idea as the letter's
  `renderTearing` and the Oct 25 dig's R10. *(2026-11-01, Leon chose)*

## The shared toolbox: visible, never copied

- Behaviors most shapes need live **once** in the platform: open on click, remember per visitor,
  the 0-to-1 number, day/night light, the outside-only fallback. A shape turns them on with a word in
  its settings; it never copies their code. *(2026-11-01)*
- Leon: "it should be accessible to the user as code in the sense that it exists, but they shouldn't
  have to create it every time." And: "in general the user shouldn't have to create code that exists
  for most visualizers." The workbench should **show** which shared behaviors a shape uses and let
  you read their code, without putting it in the shape's folder. *(2026-11-01)*
- A shape only brings code for what is truly its own (the marble's glass bending). If a second shape
  wants the same thing, it moves into the toolbox. *(2026-11-01)*
- **One sun for the room** belongs in the toolbox: the theme says where the light comes from, and
  every object reads it (the marble's pearl shine turns toward it, shadows fall away from it). Prior
  art: `updateRotations` in `lib/visualizers/collection/browser.js` and `folder-preview/browser.js`
  (sun at the top-right corner, the pearl's natural highlight at -30 degrees). *(2026-11-01)*
- **The light changes with the time of day, not its place** (Leon, 2026-11-01): by day the sun sits
  top-right; at dusk it becomes a warm lamp in about the same spot. So the dusk background's warm
  glow should sit where the lamp is, and light and background agree. Later: a whole spectrum from
  dawn through day and dusk to night, the light's color and warmth moving along it.
- **Movement follows the input the visitor has:** the cursor where there is one, scrolling on phones
  (`hover: hover` and `pointer: fine`). Keep it subtle. *(2026-11-01, Leon)*

## Previews the workbench needs

- **An opening scrubber:** a 0-to-1 slider that plays the transition by hand. *(2026-11-01)*
- **A "locked" switch** (and later "sealed"): blanks everything the outside may not use, so the
  maker sees the outside-only fallback while making. Locked = can't read the inside; sealed =
  shouldn't, because reading breaks the seal. Same fallback for both. *(Oct 25 dig R4; Leon
  2026-11-01)*
- **A dawn-to-dusk slider:** every shape checked in day and night light, including the twilight in
  between. *(2026-11-01 prototypes)*
- **Room view:** the shape closed among other objects on the background, not only alone. *(spike)*
- Phone width, and a rough speed check (the prototypes showed full-screen blur and blend modes are
  what make a page lag). *(2026-11-01)*

## Shape settings as sliders

- A shape's tunable settings (the marble prototype had glass strength, how much of the photo,
  rainbow at the edge, pearl shine) show up as sliders, and what you settle on is written back as
  plain values: the shape's defaults, or one note's YAML. *(2026-11-01 marble prototype)*
- **A setting the author may choose, with a steady default** (Leon, 2026-11-01): a marble without an
  image takes the color its note names, and otherwise a color derived from something in the note
  (its title or file name), the same every time. The workbench should show both: the picker and the
  default it falls back to.

## Where it lives (leaning, reopened)

- **A private third repo, `bloob-shapes`** (Leon, 2026-11-01; Oct 25 dig R2): the engine plus the new
  visualizers. The builder and the post office install a pinned version; the workbench is built from
  it. Existing visualizers move in only when touched. Private until the license question is settled.
- **Reopened the same night:** Leon is unsure whether splitting into a third repo makes sense, and
  worries the builder "can't run on its own anymore". Talk it through before building anything.

## Saving

- Start with "download the folder". Review folder vs GitHub pull request is still open (Leon leans
  to whichever is easier; GitHub welcome if in reach). *(2026-11-01)*

## For the AI guide ("how to create a visualizer")

- Write it from making the note, not in advance. It must say, from day one: the outside-only rule,
  the file names, the 0-to-1 number, and "use the toolbox, don't rewrite it". *(2026-11-01)*

## Open

- How the workbench shows which behaviors from the toolbox a shape uses.
