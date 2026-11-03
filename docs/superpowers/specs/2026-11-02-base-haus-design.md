# The base haus, first build: the engine, the note, the marble, `bloob-haus-26`

**Date:** 2026-11-02 · **Status:** design, waiting for Leon's read · **Repo:** bloob-haus-webapp

Worked out with Leon over two sessions (2026-11-01 and 2026-11-02), mostly through clickable
prototypes. Everything marked *(Leon)* he chose; everything marked *(call)* is the designer's call,
open to correction. Background reading this doc assumes: the shape trinity
(`docs/architecture/ontology.md`, `shapes.md`, `visualizers.md`), `docs/workbench-insights.md`, and
the dig `docs/superpowers/specs/2026-11-01-base-haus-dig.md` (facts and file references below come
from it).

---

## 1. Intent

**leons.bloob.haus stops being a special site and becomes the base every haus starts from** *(Leon)*:
"it is what the base will be, so it should be generic and the notes and marble should work in it as
well as all the standard visualizers - it will be platform and base for figuring out all the various
things."

Three ideas carry the design:

1. **Things are objects on a background.** A note is paper; a marble is glass. They sit on the
   background of whatever haus, room or desk they are in, which the theme provides *(Leon: "it's
   whatever theme background is chosen - whatever house you are in")*. In `bloob-haus-26` that
   background is dawn by day and dusk by night; another haus could be a forest or a desk. Leon: "that's the whole point of making things real objects, they sort of exist
   on top of the background."
2. **Every object has a closed look and an open look, and they are visibly the same thing.**
   (`ontology.md`: "the closed marble IS the open marble".)
3. **Nobody rewrites what most visualizers need.** Leon: "the user shouldn't have to create code
   that exists for most visualizers." Clicking, remembering, the opening animation, the light and
   sharing live once, in an engine, and visualizers switch them on by name.

## 2. Goals of this build

1. **The engine**, at `lib/visualizers/_engine/`: fills a visualizer's files from a note, hands each
   file only the data it may see, carries the shared toolbox, and runs in every host.
2. **The note**, a new visualizer: paper hanging from its top edge that unrolls.
3. **The marble**, a new visualizer: a glass marble that opens into its page.
4. **The `bloob-haus-26` theme**: the base look, day and night, used by leons only.
5. **leons switches to it** at the end, with the visualizers leons already uses still working, day
   and night.
6. **Versioned engine bundles published** at `bloob.haus/visualizers/engine/`, with a `stable`
   address the post office can later pull from (section 6). **Only visualizers marked public are
   listed and published** *(Leon: "start with the big shiny visualizers")*: the always-on writing
   rules, then note and marble. The others keep working on the sites that use them; they are just
   not listed on `bloob.haus/visualizers/`.
7a. **Folder pages are rooms of closed objects in `bloob-haus-26`** *(Leon, 2026-11-02)*: a folder's
   index page shows its notes and marbles as their closed selves (rolled notes, glass marbles) in a
   plain flow, because that is the point of them. Other themes keep `collection` cards as their
   default. The page catalog (`graph.json`) learns each page's shape and its outside details (dig
   finding 20). Hand placement and canvas come later.
7. **One article for everyone** (section 10): the `article` shape becomes a real visualizer in the
   new format, used by melt's article pages and inside every marble. As the last step, melt takes
   on the new article look and day/night *(Leon: "for the melt website, we would just have to have
   some changes carried over, which is fine")*.

## 3. Non-goals (this build)

- **The workbench UI.** It comes right after the engine, as a thin face on it
  (`docs/workbench-insights.md` is its brief). Order chosen by Leon: engine, note, marble, theme;
  workbench and the "how to create a visualizer" guide for AI after.
- **The seal** ("has anyone ever opened this", stamped for everyone). It needs a server; leons is a
  plain static site. Reserve the room in the YAML (section 7), build nothing.
- **Other closed looks for the note** (ribbon, folded). Leon dropped the ribbon for now.
- **`[[links]]` drawn as the target's closed object** inside text, and hand-placed rooms (canvas).
  Simple rooms of closed objects on folder pages are in this build (goal 7a).
- **Converting existing visualizers to the new format.** They move when someone touches them
  (`shapes.md` → "do not convert wholesale"). Only the night pass below is in scope.
- **The post office using the engine.** This build produces the compiled copy (section 6); switching
  the cloud app to it is a later job in `bloob-haus-cloud`.
- **buffbaby on the standard theme with a recipe visualizer** *(Leon, soon, its own build)*.
- **The repo tidy-up for newcomers** (`docs/TECH-DEBT.md` #49), the 3D world, the visitor's tool
  belt, canvas, the Obsidian plugin.

## 4. Anti-goals (would make this a failure even if it works)

- **A live site going down.** Light changes to melt and buffbaby while we build are fine *(Leon:
  "changes to buffbaby are fine", "light changes to melt are also fine as we are building - just
  don't want the site to go down")*; every deploy of a live site gets the e2e checks before and
  after. Alter Engineers and Odalys are not touched. The base is still a new theme rather than a
  bigger `_base` (dig finding 2, 3), and leons switches back with one line. melt's article pages:
  first the article is converted with melt's pages proven byte-identical, then melt opts into the
  new look as the last step (goal 7).
- **Content that only exists when JavaScript runs.** Sites stay static *(Leon asked: important for
  search engines)*: the engine runs during the build and writes finished HTML pages; in the browser,
  script only adds behavior. `visualizers.md`: "if JS never runs, is content missing?" A rolled note
  and a closed marble keep their words in the HTML; with no script, both show open.
- **Lag.** The first prototypes lagged because of live full-screen blur, blend modes on moving
  full-screen layers, and writing the cursor position to the whole page. None of those in the real
  build (section 8). Check on a phone.
- **Inside data on the outside** of a locked or sealed note (section 7).
- **Copies of shared behavior inside our own visualizers.** People making visualizers in the
  workbench may recreate things if they want *(Leon)*; the engine makes the easy path the shared one
  by giving them simple placeholder functions: a starter visualizer with the hooks already in place
  (when it opens, when it closes, each frame of the opening, where the light is) that they fill in.
- **Em dashes in user-facing copy** (Leon's standing rule).

## 5. Constraints

- **The `default_shape: marble` trap** (dig finding 8). leons' vault sets `default_shape: marble`, and
  465 notes say `bloob-object: marble`. The moment `lib/visualizers/marble/` exists, about 490 leons
  pages switch to the marble layout, **including the homepage** (`index.md` names no layout). So the
  marble's layout must only take effect where the theme is ready, and the homepage must be pinned to
  the theme's own home layout. Sequence the build so leons flips once, deliberately, with e2e checks
  before and after (cloud `CLAUDE.md`: hosts serving real content keep a fall-through).
- **"note" already means things.** 9 leons notes say `bloob-shape: note`; the vault scaffold sets
  `default_shape: note` for every new vault (`_base/_bloob-settings.template.md`); the cloud uses
  `note` for its plain markdown renderer. The new note visualizer will apply to those 9 pages and to
  new vaults. That is intended; check those 9 pages render well.
- **Lock and seal words** *(Leon, 2026-10-25)*: **lock** = encrypted (reversible), **seal** = the
  one-time first opening. Code keeps its `sealed-*` keys; docs and copy change words only.
- **leons' content may change** *(Leon: "you are welcome to make changes to the md files in the
  content repo")*: whatever `bloob-haus-marbles` needs so everything looks good at the end (pinning
  the homepage layout, fixing notes that render badly). Its 9 `bloob-shape: note` notes should render
  as notes.
- Builder rules: pure renderers (`visualizers.md` → "The Pure-Renderer Standard"), token-only CSS,
  `detect` blocks and the detection audit before enabling per-page loading, `_utils` discipline.

## 6. The engine and the five layers

### Where it lives *(Leon, 2026-11-02)*

- **One home for every visualizer: `lib/visualizers/`.** The engine is `lib/visualizers/_engine/`
  (underscore = "not a visualizer", like `_utils/`; `bundle-visualizers.js` already skips such
  folders). Note and marble are ordinary folders next to the others.
- **An automatic check** fails the build if `_engine/`, `note/` or `marble/` import anything outside
  themselves (they may import each other and `_engine/`). That keeps them liftable into their own
  repo later, the day others need to work on visualizers.
- **Published, versioned, with a "stable" address** *(Leon's idea, refined)*: the builder already
  deploys `bloob.haus/visualizers/`; it also publishes the engine plus the visualizers as versioned
  bundles there (`.../engine/<version>/` and a `stable` alias). Leon: "ideally the post office would
  just pull its content from a place where the newest stable versions of the visualizers are hosted
  ... so once we update the letter visualizer the visual should change too."
  **Refinement** *(call)*: the post office pulls `stable` **when it deploys**, not on every request,
  and an automatic job redeploys it (with the live e2e checks) whenever `stable` moves. Two reasons:
  the post office's server draws closed letters and link previews, and running code fetched from a
  URL on a server is the risky kind; and the server and the reader's browser must draw with the same
  version, or a letter has two looks at once. Publishing is in this build; the cloud adopting it is
  the later job.
- **Everything follows the newest stable version for now** *(Leon)*, letters already sent included.
  So hosting `stable`, the current version and one back (for rollback) is enough. Back-compatible
  versions, and maybe a visualizer version written into a note's YAML, are decided later *(Leon:
  "maybe not needed right now")*. Leon, on letters: right now they are "super basic" and should
  update; once their look matters more, they may need to keep it.
- **The same bundle opens a fourth host: any website** *(Leon's idea)*: one script tag pointing at
  `stable`, then plain markup ("interpret this HTML below"), and the visualizer draws the marble or
  note right there. The pure-renderer standard makes it possible; this build only publishes the
  bundle, the embed markup itself is later.
- A separate repo was considered and set aside for now (it doubles every change while Leon is the
  only one changing visualizers).

### A visualizer is five layers, plus an optional sixth *(Leon: "good right now")*

| Layer | What it is | Files |
|---|---|---|
| **reads** | what it takes from the note | blanks from the note, or `parser.js` |
| **draws** | closed, open, and every frame between | `open.html` + optional `closed.html`, or `renderer.js` |
| **does** | behavior | toolbox switches in `manifest.json`; own `browser.js` only for what is truly its own |
| **looks** | style | `style.css`, tokens only |
| **promises** | settings, defaults, which notes it fits, the AI card | `manifest.json` + `schema.md` |
| **writes** *(optional)* | the GUI people use to write a note for it (the builder face) | `builder/` |

**The sixth part, `writes`, is optional and sometimes core** *(Leon)*: "one part is also the GUI
where you can build the visualizer - that part is very important! we didn't develop that for the
marble which is ok - but for the letter that is core." It is the builder face from `ontology.md`
("one core, up to two faces"): it reads and writes the same note the renderer draws, so the two
cannot drift. Precedents: the letter's envelope fields and writing box
(`app/src/shapes/letter/EnvelopeFields.tsx`, React, in the cloud) and garden's `builder/`. Portability
belongs to the renderer, not the GUI (`shapes.md` → "Where portability actually matters"), so a
builder may use the host's framework. *(call)* Simple visualizers get a builder for free, generated
from the settings their manifest declares (fields, sliders, a color picker: the same thing the
workbench shows); only visualizers with real authoring needs (letter, garden) write their own. Note
and marble need none in this build.

**Template rung** (no code): `open.html` (required), `closed.html` (only when the outside looks
different from the inside), `style.css`, `manifest.json`, `schema.md`. No `closed.html` means the
closed look is the open look at 0. **Code rung**: `parser.js` + `renderer.js` instead of the HTML
files, for real grammars. Both end in the same thing, a pure function from data to an HTML string,
so the engine treats them alike. *(Leon chose the file names and "no transition file".)*

**Transitions are one number, not a file** *(Leon)*. The host counts the gesture and hands the
visualizer a progress value from 0 (closed) to 1 (open); the visualizer's CSS draws every frame from
it. Same idea as the letter's `renderTearing` (`app/src/shapes/letter/closed.ts` in the cloud).

**Plumbing the engine supplies:** today every visualizer has an `index.js` that finds its block in
the page, decodes it and calls its parser and renderer (about 25 near-copies). New-format
visualizers have no `index.js`; the engine provides that glue from the manifest (block or whole
page). For whole-page visualizers in Eleventy, `layout.njk` shrinks to a call into the engine
(dig finding 21: no such filter exists yet).

### The shared toolbox

Behaviors live once in `_engine/`, readable as code, switched on by name in `manifest.json`
*(call: exact names)*:

- **open on click**, with keyboard support and a spoken label.
- **remember per visitor**: this browser remembers the object was opened and shows it open next
  time. Keyed by the page's canonical ID (`<meta name="bloob-page-id">`, `urls-and-ids.md`). Applied
  by a few lines in `<head>` before first paint, so a remembered note never flashes shut (dig 23).
  Known limit: one browser, one device; Safari may clear it after about a week away (dig 28).
- **progress 0 to 1** for the opening, with `prefers-reduced-motion` honored.
- **one light for the room**: where the light comes from, as a theme setting every object reads.
  By day a sun in the top-right corner; at dusk a warm lamp in about the same spot *(Leon)*. Objects
  turn their highlight toward it and cast shadows away from it. Prior art: `updateRotations` in
  `collection/browser.js` and `folder-preview/browser.js` (natural highlight at -30 degrees).
- **share, on the outermost object only** *(Leon)*: when one object holds another (an article in a
  marble), only the outermost shows share controls, because that is what you hand someone. An article
  on its own keeps its share bar.
- **moves with the visitor's input**: the cursor where there is one, scrolling on phones
  (`(hover: hover) and (pointer: fine)`), subtle *(Leon)*.

## 7. Inside and outside

- **The engine prepares the blanks and decides which it may fill** *(call)*. Outside blanks
  (`{{title}}`, `{{image}}`, first lines) come from the YAML (always) or from the body (only when the
  note is neither locked nor sealed). `closed.html` only ever receives outside blanks, so it cannot
  leak the inside by accident. A tip-style visualizer without `closed.html` falls back to an
  outside-only look when locked or sealed. Leon's insight behind it: locked = can't read the inside,
  sealed = shouldn't (reading breaks the seal); same fallback for both.
- **Lock follows `visibility`**, never a per-note choice (dig 25). leons is public today, so the
  locked path is built and tested with a flag, and used for real later by the post office.
- **The three writing zones** (`ontology.md` → "What a file can prove"): what the author writes, what
  the haus stamps, and an open surface. The builder reserves nothing today, so an author could type
  `opened: 2026-01-01` and a page would believe it (dig 27). *(call)* Reserve the haus-stamped names
  the cloud already reserves (`opened`, `fetched`, `date_postmarked`, `mark_*`) and ignore them in the
  builder.
- **Closure settings live in the top block** (the outside), not in a `::: settings` block in the
  body (dig 26).
- **Visualizers stay outside the security machinery** *(Leon asked; confirmed)*: they never hold
  keys, never encrypt or decrypt, never create links, doors or rings. They receive data and return
  HTML. One honest limit: in the post office they draw a letter *after* the reader's browser has
  unlocked it, so their code sees the plain text. That is why only reviewed visualizers may draw
  locked content, why the letter refuses raw HTML and remote images (`shapes.md` open question 8),
  and why visualizers from other people run sealed off (the Oct 25 dig's R6).

## 8. The look: `bloob-haus-26`

A new theme at `themes/bloob-haus-26/` *(Leon: name and split)*. `_base` stays the shared plumbing
with no look. The year is in the name so a redesign can be `bloob-haus-27` while older sites stay.

**The recipe** *(Leon chose "B, dawn and dusk" from mockups)*:
- A background of three soft blurred colors, as settings so each haus can swap them. Dawn when the
  system is light, dusk with one warm glow (top right, where the lamp is) when it is dark. Follows
  `prefers-color-scheme`. A twilight blend in between is designed; a full dawn-to-night spectrum by
  time is later.
- A dot grid; **dots warm in hue near the cursor or a finger** *(Leon)*.
- **Light live grain** *(Leon)*: a faint film flicker.
- **Objects keep their natural colors at night; only the light changes** *(Leon)*. App-style
  inversion was rejected (images cannot invert).
- **Fonts** *(Leon likes them)*: Newsreader for reading text and headings, Instrument Sans for labels.
- Little chrome: leons has "basically none besides website and overview pages" *(Leon)*.
- **The recipe is settings** *(Leon: "if we can change those settings in a theme settings file,
  that would be great")*: the world colors, dots, grain and glow live in the theme's settings, with
  named presets that give very different energies from the same recipe: `dawn-dusk` (the default),
  `flat-warm`, `forest-light`. A haus picks one in its `_bloob-settings.md` and may override single
  values.

**How to build it light:** draw the background with soft gradients (no live `filter: blur`); grain
as a small pre-made noise tile without blend modes, moved with `transform` only; the cursor position
written to the warm-dots layer only, once per frame; no `backdrop-filter`.

**Colors as named settings, chosen once for everyone** *(Leon: "make sure we are creating good
tokens that are the same across all themes and visualizers, or are chosen wisely")*. Token names
are a shared language across every theme and visualizer, so the plan starts with a short token
step Leon reviews before anything is built on it. The token contract stays the shared language; *(call)* its names live
with the engine so a visualizer looks right in any host, and the theme supplies the values. The dig
found the contract assumes day in three places (dig 12) and that its object/background split is
already latent (`--bg-color` behind, `--card-bg` and `--surface-text-color` for an object's surface
and ink, dig 13). Give every token a day and a night value. *(call: exact names, including light
position and how much night dims objects.)*

**What the theme brings** (dig 1): `layouts/base.njk`, `layouts/page.njk`, a home layout for the
pinned homepage, `partials/footer.njk`, `partials/scripts.njk`, `assets/css/main.css`, `theme.yaml`,
and the two visualizer markers. **Keep from marbles-pouch** (dig 6): search markers and hidden ID
line, share bar, date pills, tags, backlinks, graph container, comments; canonical, page ID, robots,
preview tags, RSS, favicon. **Drop:** the banner with object image and decorations, the waves, the
"What is a marble?" modal (it becomes the marble's pill), the soft-blue page.

**Ship a fallback object image** at the path `themes.md` promises (`themes/_base/assets/objects/`
does not exist, and `collection`'s marbles mode hard-codes `/assets/objects/marble.png`, dig 16).
*(call: ship it inside `bloob-haus-26` so `_base` stays untouched.)*

**Night pass for what leons uses** (dig 9, 11): `collection` (13 blocks, cards; its marbles mode
paints light glass by hand), foldable headings (20 notes), `search`, `tags`, `graph` (reads colors
once at load: make it follow a change or accept a reload), `fridge-magnets` (2 notes), `scene-nav`
(1), checkboxes, footnotes, maths. Everything else on the "ready" list follows the tokens.

## 9. The note *(prototyped: `note-unroll-v4.html`)*

- **Closed:** paper hanging from its top edge. The top always stays; the **tip shows the beginning
  of the note**; the rest is rolled up underneath, the roll at the bottom as a handle *(Leon)*.
- **Opening:** click the paper or the roll and it unrolls downward to its full length, short or very
  long. The roll stays at the bottom; click it to roll back up. Remembered per visitor *(Leon)*.
- **Locked or sealed:** the tip shows outside data only (the title).
- **Material:** natural paper; at night the paper stays paper and dims a little with the light.
  **No live grain on the paper** *(Leon)*: the grain belongs to the background, under the objects.
- **Font:** Newsreader by default (Leon loves it); a handwriting font is a setting to try, and
  later people can upload their own font files *(Leon)*.
- The words are always in the HTML; without script the note shows open.

## 10. The marble *(prototyped: `marble-glass-v6.html`, `marble-open-v3.html`)*

### What it is
**A marble is a wrapping with something inside** *(Leon)*: "a marble is a metaphorical container for
a note that I want to share and shape with you" (his own definition, `_bloob-objects.md`). Inside is
an article by default; a note, an embedded website or another visualizer can be chosen later
*(call: an `inside:` field in the top block, reserved now)*. The inside shows already open; no
second opening inside the marble.

**The article is nested, not recreated** *(Leon)*. There is one article, used by melt's article
pages and inside every marble on leons, so the two can never drift. Today `article` is only a
Nunjucks layout (`lib/visualizers/article/layout.njk` extends the theme's `base.njk`), which the
engine cannot nest, so this build converts it into a real visualizer in the new format: its
reading part (header, dates, body, tags, "pages that link here", graph slot, comments slot) drawn by
the engine, its page frame left to the theme. Order: convert with melt's 16 article pages proven
byte-identical first; then the marble wraps it; melt adopting the new look and day/night is the
last step (goal 7). Leon has wanted melt's article background to look like this new one for a
while.

### The closed marble
- **A glass sphere** in the shape of the pearly `marble.png` (melt and marbles-pouch both ship it),
  which lies on top as the shine, turned toward the sun (section 6), with a shadow falling away from
  it.
- **If the note has an image, the image sits inside the glass**, bent the way a glass ball bends what
  is behind it *(Leon)*. A pure per-pixel function: each pixel is a ray that refracts into the ball
  (Snell's law, glass strength 1.5), once per color channel for a faint rainbow edge, landing on the
  image at the ball's center. Light paths are computed once per size and settings (about 14 ms);
  drawing reads the image along them (about 10 to 20 ms for two retina marbles in headless Chrome,
  faster on a real Mac). While moving it draws at half sharpness and sharpens when still.
- **Image source:** an image named in the YAML is a cover everyone may see; the first image in the
  body is used only when the note is neither locked nor sealed *(call)*.
- **Without an image:** a colored inside *(Leon)*. The author may name a marble color; otherwise a
  steady color derived from the note (its title) *(Leon)*. The whole picked color counts, not just
  its hue *(Leon noticed the prototype ignored brightness)*. For image marbles the default tint is the
  image's average color.
- **See-through** *(Leon)*: the room's light glows through the glass (about 0.25 for image marbles,
  0.3 for color marbles, less at the edge), and the rim gets lighter, the way real glass does.
- **The image moves with scrolling, not the cursor** *(Leon, after seeing several marbles on one
  screen: cursor-following looked wrong; the angle changing as you scroll looked right)*. Leon's
  tuned values (2026-11-02): movement 0.40, see-through middle 0.20 for image marbles and 0.77 for
  marbles without an image, edge 0.00, glass strength 1.05, how much of the photo 0.91, rainbow
  0.04, light at the rim 0.57, pearl shine 0.43. The pearl shine is a setting with a slider
  wherever settings are tuned (Leon wants image marbles shinier, more like a marble).
- **Baked at build time**: a picture of each closed marble, used when script does not run, as the
  link preview, and as icons (section 11). The browser takes over for live movement.

### Opening *(Leon)*
- **Arriving from outside the site starts closed** *(Leon)*: a shared link, another site, a typed
  address. The marble sits on the dawn/dusk background with its title, the "What is a marble?" pill
  and the share buttons under it, and the visitor clicks to open.
- **Arriving from inside the site plays the opening** *(Leon: "it should go through the closed to
  open motion for me")*: the object starts closed and opens by itself in front of the visitor.
- **Arriving from inside the site opens** *(Leon)*: any link from a leons page (links in the text,
  "pages that link here", search results, `#heading` links) lands on the marble already opening, so
  nobody clicks twice. No separate per-visitor memory for marbles; the arrival decides.
- **Click: the light swells from the marble's center, then the page pours down out of it** through
  a curved funnel: upright and tapered right under the marble, flaring in a smooth curve to the page
  width (not a hard triangle). The marble stays at the top center; the pill and share buttons move
  beside it. Clicking the marble again pulls the page back up.
- **The page is an object on the haus's background** *(Leon corrected an "own page" idea)*: a sheet,
  white by day and dark by night, lightly tinted by the marble's color. The marble's color affects
  everything: the glass when closed and the page when open.
- **Images keep white behind them**, even at night, for now *(Leon)*, so transparent PNGs look right.
- **On the page:** the article (title, dates, body), then tags, "pages that link here", the
  connections graph and comments *(Leon)*. The `article` shape lacks tags, backlinks and graph today
  (dig 7); the marble's page needs them.
- **No big marble image at the top** (marbles-pouch's banner) *(Leon)*; the "What is a marble?" text
  stays, as a small pill that unfolds the vault's own description (`_bloob-objects.md`).
- **Share, under the marble** *(Leon)*; the article's own share bar steps aside inside a marble
  (outermost shares). The buttons are small and collapsed together like today's share bar; hovering
  or focusing the row opens it with every button's full name, and it **stays open while the
  pointer is anywhere on the row** (closing too fast when moving between buttons was a problem
  before, Leon). The same fix goes into the existing share bar. In this build:
  - **copy link** *(Leon)*, plus the phone's own share sheet where there is one *(call)*;
  - **copy markdown** *(Leon)*: the note's text, cleaned by the same rules that clean the HTML pages
    (`%% %%` comments removed, links to unpublished or blocked notes turned into plain text,
    frontmatter trimmed). The HTML build already does this; the markdown copy is a second output
    and must go through the same cleaning, with a test (35 leons notes carry `%%` comments);
  - **picture** *(call)*: the baked picture of the closed marble;
  - **PDF through the browser's own "save as PDF"** *(call)*, with a clean print style: the
    visitor's computer does the work, so no server, no limits. A server-made PDF (a function on
    Scaleway, limited to about once a minute or to signed-in people, as Leon suggested) is later.
  Whether the existing embed button stays in the row is the builder's call.
- **Clicked in a room, the light carries over** *(Leon)*: the same rule, with the opening starting in
  the room (browsers that can carry a transition across pages show it; others simply load the page
  opening). Wired in this build, since folder pages become rooms (goal 7a).

### Peek first, the visitor's first tool *(Leon, 2026-11-02)*
The visitor gets a tool belt of their own settings, kept in their browser. The first tool: **peek
first**. When it is on, clicking a linked object opens it over the current page, whole and
readable, before the visitor decides to go to its own page. Off by default *(call)*; the name is a
working name *(call)*.

## 11. Icons

**A visualizer's icon is its closed look drawn small** *(Leon asked how this generalizes)*, so no
visualizer needs separate icon work. Fallback when a visualizer has no closed look: the object
type's `image` in the vault's `_bloob-objects.md` (the column exists), else a calm plain dot. Icons
are baked when the site builds, as image files written into the HTML as ordinary images. Each marble
page gets its own little marble as its tab icon *(call)*. No script is needed to see any of them.

## 12. What is left to the builder

Exact token names; exact YAML field names (marble color, `inside`, closure fields); the engine's
function names and how blanks are written; the Eleventy glue for whole-page visualizers; the
compiled bundle's format and versioning; how the import check is implemented; the cross-page
transition technique; test strategy within the repo's conventions (vitest, golden files, the shape
nesting and width tests, Playwright for the browser checks); exact animation timings (the prototypes
used 1.7 s to open a marble, 0.9 s to close, 0.65 to 2.2 s to unroll a note by length).

## 13. Docs to update in the same build

- `shapes.md`: a "Step one: template shapes" section (files, blanks, the outside-only rule, the
  0-to-1 number); the Sealing section in lock/seal words; the toolbox; containers holding another
  visualizer; outermost shares.
- `visualizers.md`: `_engine/`, the five layers, plumbing supplied by the engine.
- `ontology.md`: "leaf shapes have no meaningful closed state" becomes "a leaf's outside can be its
  inside" (the note).
- `themes.md`: stale in places (dig 37); add `bloob-haus-26`, day and night tokens.
- `DECISIONS.md`: `bloob-haus-26`; the engine's home; five layers; the toolbox; outermost shares;
  icons from closed looks; lock and seal words.
- `docs/workbench-insights.md`: whatever the build teaches the workbench.

## 14. Checked against a real outside visualizer: the vinyl sleeve (2026-11-02)

Alter Engineers' 3D record sleeve (three.js r128, started on another computer; read only, not run,
not converted; local copy in `bloob-haus-cloud/.superpowers/inbox/vinyl-sleeve/`). Its note:
`visualizer: vinyl-sleeve` plus flat keys (`front`, `back`, `label`, `start_side`, `vinyl_color`,
`background`, `youtube`), body text and behind-the-scenes images. A click turns the sleeve to its
front and slides the record out; then the page shows the video and the body below it.

**What it confirms:**
- **The container pattern.** The sleeve is a wrapping and what appears below it (video, text, photos)
  is its inside, exactly like the marble. A shelf of sleeves (its README's open item) is a room of
  closed objects (goal 7a).
- **The 0-to-1 number holds even in 3D.** Its engine already draws any moment of its opening from a
  time value (`renderAt(t)`), and its click is a timeline (turn, then slide).
- **Outside and inside fall out naturally.** The covers are in the YAML (outside), so its closed
  look needs nothing from the body; the photos are in the body (inside).
- **Its README is a `schema.md` in all but name** (a key table, the interaction, the API).

**What it adds** *(call; for the plan)*:
- **"Reveal the inside below" is a shared behavior**, not marble-specific: the object stays on top
  and its inside appears under it, then the page scrolls to it. The marble's funnel is one look for
  it; the sleeve's fade-in is another.
- **The room's light must be readable as numbers, not only CSS**, so a WebGL visualizer can light
  its scene from the same sun or lamp.
- **Heavy visualizers need an HTML fallback and lazy loading:** the pure renderer writes the covers
  as images and the body as text; `browser.js` upgrades that to 3D and loads three.js only on pages
  that use it (`detect`).
- **Exports later:** an animated visualizer that can draw any moment can be filmed by the platform
  (its `tools/capture.py` makes the GIF/MP4 for LinkedIn). A future toolbox switch.
- **For its conversion** (after the engine): `visualizer:` becomes `bloob-shape:`; images resolve
  by name like every shape (`shapes.md` → authoring conventions); `vinyl_color` is an object color
  like the marble's. Its `background:` becomes **the sleeve's own glow**, a soft light right behind
  it like a spotlight on a shelf, while the room keeps the haus's background *(Leon)*.

## Prototypes (throwaway, local only)

Not in git. On Leon's machine under
`bloob-haus-cloud/.superpowers/brainstorm/17280-1793591681/content/` (`base-look-v3.html`,
`note-unroll-v4.html`, `marble-glass-v6.html`) and `.../22657-1793639172/content/`
(`marble-open-v3.html`). They are the reference for look and feel, not code to keep.
