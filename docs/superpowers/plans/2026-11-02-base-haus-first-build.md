# The base haus, first build: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** leons.bloob.haus on a new base theme, `bloob-haus-26`, where notes unroll and glass marbles open into their pages, folder pages are rooms of those objects, and everything is drawn by one engine that also runs in the visualizer editor.

**Architecture:** A pure engine at `lib/visualizers/_engine/` turns a note (frontmatter + rendered body) into an object's HTML (closed part, open part, data attributes for shared behaviors) and never touches files or the DOM. Thin host glue in the builder (template-shape loader, a generated layout per template shape, an Eleventy shortcode) calls it at build time, so pages stay static. A small browser toolbox adds the shared behaviors (open on click, remember, the 0-to-1 opening, arrival rule, light, share). Visualizers in the new format (`note`, `marble`, and `article` converted) are folders of `open.html` / `closed.html` / `style.css` / `manifest.json` / `schema.md`, plus `browser.js` only for their own behavior.

**Tech Stack:** Node 20, Eleventy 3, markdown-it, esbuild, vitest, Playwright (as a library inside vitest), sharp (already used for images), Cloudflare Pages.

**Spec:** `docs/superpowers/specs/2026-11-02-base-haus-design.md` (read it first; this plan argues from it). Also `docs/workbench-insights.md` and the shape trinity (`docs/architecture/ontology.md`, `shapes.md`, `visualizers.md`), which repo rules require before any shape work.

## How this build runs (Leon's working rhythm)

- **All work on the branch `base-haus-26`, with an open pull request.** Every push to `main` redeploys leons (`deploy-marbles.yml`), so nothing reaches `main` until the switch in Task 16.
- **Every task that changes what leons looks like ends with a preview link** (Task 0 creates the preview deploy) **or screenshots**, sent to Leon with three lines. Leon judges looks by looking; interior choices are not asked.
- **Questions go to `docs/decision-inbox.md`** (created in Task 0): the default taken, why, how hard to undo, when it matters. The build stops for Leon only at the token step (Task 0, step 4) and at the switch (Task 16).
- Follow the `keeping-focus-alive` skill for messages.

## Global Constraints

- Sites stay static: the engine runs at build time and writes finished HTML; browser script only adds behavior. If JavaScript never runs, every note and marble shows open with all its words.
- No live site goes down. Light changes to melt and buffbaby are fine; Alter Engineers and Odalys are not touched. Every live deploy gets checks before and after (Task 16).
- `themes/_base/` gains no look. The new look lives in `themes/bloob-haus-26/`. leons switches back with one line (`theme:` in the vault's `_bloob-settings.md`).
- The engine and new-format visualizers import nothing outside `lib/visualizers/_engine/`, `note/`, `marble/`, `article/` (enforced by Task 2).
- Outside-only rule: a closed look receives only outside blanks; body-derived blanks fill only when the note is neither locked nor sealed.
- Styles use theme tokens only; scope every class under the object's root; work in day and night (`prefers-color-scheme`); honor `prefers-reduced-motion`.
- No full-screen `filter: blur`, no blend modes on moving full-screen layers, cursor position written only to the layer that uses it, once per frame.
- Images keep white behind them, even at night.
- Visualizers never hold keys, encrypt, or create links, doors or rings.
- No em dashes in user-facing copy. Commit messages carry no AI attribution (Leon's rule).
- Haus-stamped names (`opened`, `fetched`, `date_postmarked`, any `mark_*`) are never read from author frontmatter.

## Review Focus

1. **A remembered or arrived note flashes shut and open on load.** Expect: the right state from the first paint. Pinned by `decideInitialState` tests (Task 4) and the head snippet ordering test (Task 6).
2. **A visitor's browser sends no referrer, so a link inside the site looks like an outside arrival.** Expect: a click on an internal link still arrives opening. Pinned by the arrive-flag test (Task 4).
3. **A locked note leaks its first lines or first image into the closed look.** Expect: title only. Pinned by the locked-render tests (Tasks 1 and 5).
4. **A marble with no image and no title.** Expect: a steady color from the file name, never a crash or a blank. Pinned by `defaultMarbleColor` tests (Task 7).
5. **An old `#heading` link into a marble.** Expect: the marble arrives open and the page scrolls to the heading (and opens a fold around it). Pinned by the hash test (Task 4) and a check in Task 16.

---

## Phase 0: the bench

### Task 0: Branch, preview link for leons, decision inbox, token names

**Files:**
- Create: `.github/workflows/preview-leons.yml`
- Modify: `scripts/utils/config-loader.js` (theme override), `.github/workflows/rebuild-all.yml` (wrong project name)
- Create: `docs/decision-inbox.md`, `docs/architecture/tokens.md`
- Test: `tests/build/config-loader.test.js`

**Interfaces:**
- Produces: env `THEME_OVERRIDE` (when set, it wins over the vault's `theme:`); the token names every later task uses (step 4).

- [ ] **Step 1: Create the branch `base-haus-26` and open a draft pull request** titled "The base haus, first build".
- [ ] **Step 2: Write the failing test** in `tests/build/config-loader.test.js`:

```js
it("THEME_OVERRIDE wins over the vault's theme", async () => {
  process.env.THEME_OVERRIDE = "bloob-haus-26";
  const merged = mergeBloobSettings({ theme: "marbles-pouch" }, { theme: "marbles-pouch" });
  expect(merged.theme).toBe("bloob-haus-26");
  delete process.env.THEME_OVERRIDE;
});
```
- [ ] **Step 3: Implement the override** in `mergeBloobSettings` (`scripts/utils/bloob-settings-reader.js:137`, next to L161-163). Run `npx vitest run tests/build/config-loader.test.js`, expect PASS.
- [ ] **Step 4: Token names, a depth moment with Leon.** Write `docs/architecture/tokens.md`: one table of names shared by every theme and visualizer (day value, night value, who reads it). Start from the existing contract (`--bg-color`, `--text-color`, `--accent-color`, `--border-color`, `--card-bg`, `--surface-text-color`, `--font-body`, `--font-heading`, `--spacing-*`) and add only what the spec needs: three world colors for the background, the object's paper and ink, how much night dims objects, the object shadow, the light's position and warmth (also readable as numbers by script), and the dot and warm-dot colors. Ask Leon one picker: approve the names, or change them. Nothing later in the plan uses a token name that is not in this file.
- [ ] **Step 5: Preview deploy.** `preview-leons.yml`: copy `preview-buffbaby.yml`; on `pull_request` to `main`, run `SITE_NAME=marbles node scripts/build-site.js` with `THEME_OVERRIDE: bloob-haus-26` and deploy `_site` with `--project-name=leons --branch=${{ github.head_ref }}`. Fix `rebuild-all.yml` so marbles deploys to `leons` and `_template` is skipped.
- [ ] **Step 6: Create `docs/decision-inbox.md`** with its one-line format and today's first entry: preprocess writes `image` from the first body image into frontmatter, so it is inside data; Task 3 marks it `image_source: body`.
- [ ] **Step 7: Commit** `ci: preview deploys for leons; THEME_OVERRIDE; decision inbox and token names`.

## Phase A: the engine and the note

### Task 1: The pure engine core

**Files:**
- Create: `lib/visualizers/_engine/blanks.js`, `fill.js`, `render.js`, `index.js`, `version.js`
- Test: `tests/engine/blanks.test.js`, `tests/engine/fill.test.js`, `tests/engine/render.test.js`

**Interfaces:**
- Produces:
  - `NoteInput = { data: object, html: string, url: string, pageId: string }` (`data` is the page's frontmatter; `html` is the rendered body).
  - `ShapeDef = { name: string, manifest: object, templates: { open: string, closed?: string } }`.
  - `deriveBlanks(note: NoteInput, { locked = false, sealed = false } = {}) → { outside: { title, subtitle, image, color, yaml }, inside: { body, firstLines } | null }`. `inside` is `null` when locked or sealed. `outside.image` comes from YAML `image`/`cover` unless `data.image_source === "body"`, in which case it counts as inside and moves to `inside` (and is dropped when locked or sealed). `firstLines`: plain text of the body's first paragraphs, at most 280 characters, cut at a word.
  - `fillTemplate(template: string, blanks: object) → string`: replaces `{{ name }}` and `{{ yaml.key }}` with HTML-escaped values; `{{ body }}` and `{{ inside }}` insert raw HTML; unknown blanks become `""`; no logic of any kind.
  - `renderObject(shape: ShapeDef, note: NoteInput, { locked = false, sealed = false, inside = null, outermost = true } = {}) → string`: one `<div class="bloob-object" data-shape data-state="open" data-page-id data-opens data-remembers data-arrives data-shares>` with `style="--open:1"`, containing `<div class="bloob-object__closed">` (the filled `closed.html`, omitted when there is none) and `<div class="bloob-object__open">` (the filled `open.html`). When the note is locked or sealed and the shape has no `closed.html`, the closed part is a generic outside look (the title). `inside` (HTML of a nested object's open part) fills `{{ inside }}`.
  - `VERSION = "0.1.0"`.

- [ ] **Step 1: Write the failing tests.**

```js
// blanks.test.js
it("locked notes get no inside", () => {
  const b = deriveBlanks({ data: { title: "T" }, html: "<p>secret</p>", url: "/t/", pageId: "t" }, { locked: true });
  expect(b.inside).toBeNull();
  expect(JSON.stringify(b.outside)).not.toContain("secret");
});
it("a body-derived image is inside", () => {
  const b = deriveBlanks({ data: { image: "/og/a.png", image_source: "body" }, html: "", url: "/a/", pageId: "a" }, { sealed: true });
  expect(b.outside.image).toBeUndefined();
});
it("firstLines stops at 280 characters on a word", () => { /* long body → length <= 280, ends without a cut word */ });

// fill.test.js
it("escapes values and leaves no blanks behind", () => {
  expect(fillTemplate("<h1>{{ title }}</h1>{{ nope }}", { title: "<b>" })).toBe("<h1>&lt;b&gt;</h1>");
});
it("inserts body raw", () => expect(fillTemplate("{{ body }}", { body: "<p>x</p>" })).toBe("<p>x</p>"));

// render.test.js
it("shows open without script", () => {
  const html = renderObject(noteShape, note);
  expect(html).toContain('data-state="open"');
  expect(html).toContain("full body words");
});
it("a locked tip-style object shows only its title outside", () => { /* no closed.html, locked → closed part has title, not body */ });
```
- [ ] **Step 2: Run** `npx vitest run tests/engine`, expect FAIL (modules missing).
- [ ] **Step 3: Implement** the four modules with the signatures above. Pure: no `fs`, no `document`, no network.
- [ ] **Step 4: Run** `npx vitest run tests/engine`, expect PASS.
- [ ] **Step 5: Docs in the same commit:** `shapes.md` gains "Step one: template shapes" (files, blanks, the outside-only rule, the 0-to-1 number); `visualizers.md` gains `_engine/` and the five layers plus `writes`.
- [ ] **Step 6: Commit** `feat(engine): pure core: blanks, fill, renderObject`.

### Task 2: The boundary check

**Files:**
- Test: `tests/build/engine-boundary.test.js`

- [ ] **Step 1: Write the test:** for every `.js` file under `lib/visualizers/_engine/`, `note/`, `marble/` (and `article/` once Task 8 adds JS), every import specifier is relative and resolves inside those four folders; no `node:` or bare built-in (`fs`, `path`), no path into `scripts/` or `themes/`.

```js
it.each(files)("%s imports only inside the engine family", (file) => {
  for (const spec of importsOf(file)) expect(resolvesInsideFamily(file, spec)).toBe(true);
});
```
- [ ] **Step 2: Run** `npx vitest run tests/build/engine-boundary.test.js`, expect PASS (Task 1 is clean). Break it on purpose once (add `import fs from "fs"`), see FAIL, revert.
- [ ] **Step 3: Commit** `test: engine family imports stay inside the family`.

### Task 3: Builder glue for template shapes

**Files:**
- Create: `scripts/utils/template-shapes.js`
- Modify: `scripts/assemble-src.js` (step 2b.5, L136-159), `scripts/preprocess-content.js` (L330-395 shape resolution; L523-538 image; frontmatter output L455-468), `eleventy.config.js` (shortcode)
- Test: `tests/utils/template-shapes.test.js`, `tests/build/assemble-src.test.js`, `tests/utils/preprocess-shapes.test.js`

**Interfaces:**
- Consumes: `renderObject`, `ShapeDef` (Task 1).
- Produces:
  - `loadTemplateShapes(visualizersDir: string) → Map<string, ShapeDef>`: folders whose `manifest.json` has `"format": "template"`.
  - `themeSupportsObjects(config) → boolean`: true when the theme's `theme.yaml` has `objects: true`.
  - Eleventy shortcode `{% bloobObject "<name>", content %}` that builds a `NoteInput` from the page data and returns `renderObject(...)` (filter or shortcode, whichever gives access to the page data in Eleventy 3; the name is fixed).
  - Generated layouts `_includes/layouts/<name>.njk` (extends `layouts/base.njk`, body is the shortcode) for each template shape, only when `themeSupportsObjects`.
  - Frontmatter `image_source: "body"` whenever preprocess sets `image` from the body.

- [ ] **Step 1: Write the failing tests.**

```js
// preprocess-shapes.test.js
it("a template shape is ignored on a theme without objects", () => {
  // default_shape: marble, theme marbles-pouch → layout stays layouts/page.njk, exactly as today
});
it("a template shape gets its generated layout on bloob-haus-26", () => {
  // → layout layouts/marble.njk
});
it("haus-stamped keys are dropped from author frontmatter", () => {
  // frontmatter { opened: "2026-01-01", mark_seen: 1, title: "x" } → output has title only
});
it("image from the body is marked as inside", () => { /* image_source === "body" */ });
// assemble-src.test.js
it("writes a layout per template shape only for themes with objects", () => {});
```
- [ ] **Step 2: Run** them, expect FAIL.
- [ ] **Step 3: Implement.** The gate keeps today's behavior byte for byte on every theme without `objects: true`.
- [ ] **Step 4: Run** `npm test`, expect all PASS. Then build leons on marbles-pouch before and after this task and diff: `node scripts/dev-local.js --site=marbles --content=../bloob-haus-marbles` is the dev path; for the diff use `SITE_NAME=marbles node scripts/build-site.js` into two copies of `_site` and `diff -r`. Expect no difference.
- [ ] **Step 5: Commit** `feat(builder): template shapes get a generated layout on themes with objects`.

### Task 4: The browser toolbox

**Files:**
- Create: `lib/visualizers/_engine/state.js` (pure), `toolbox.js`, `light.js`, `head-init.js`
- Modify: `scripts/bundle-visualizers.js` (bundle `_engine/toolbox.js` to `assets/js/bloob-engine.js` as `iife`, even though `_` folders are otherwise skipped)
- Test: `tests/engine/state.test.js`; a Playwright check in `tests/engine/toolbox.test.js` (skips without Chromium, like `shape-width.test.js`)

**Interfaces:**
- Produces:
  - `decideInitialState({ remembered: boolean, arrivedFromSite: boolean, opensOnArrival: boolean, hash: string }) → "open" | "closed"`.
  - `rememberKey(pageId: string) → string` (`"bh-open:" + pageId`).
  - `arrivedFromSite({ flagPath: string | null, currentPath: string, referrerOrigin: string, siteOrigin: string }) → boolean`: true if the click flag names this path, or the referrer is this site.
  - `headInitScript() → string`: an inline script for `<head>` that adds `bh-js` to `<html>` and sets each object's starting state before first paint.
  - Browser API `window.BloobObjects = { register(shape, { onOpen, onClose, onFrame, light }) }`: the placeholder functions makers fill in. Events on the object: `bloob:frame` (`detail.progress`), `bloob:open`, `bloob:close`.
  - `readLight() → { x: number, y: number, warmth: number }` from the light tokens (Task 0).
  - Toolbox behaviors, switched on by data attributes from `renderObject`: open on click and Enter/Space (a real button with a label); the opening drives `--open` from 0 to 1 (reduced motion: jump); remember per visitor under `rememberKey(pageId)`; a click on any same-site link sets the arrive flag for its path; arriving with a `#hash` opens and scrolls to it.

- [ ] **Step 1: Write the failing tests.**

```js
it("no referrer but a click flag still counts as arriving from the site", () =>
  expect(arrivedFromSite({ flagPath: "/marbles/x/", currentPath: "/marbles/x/", referrerOrigin: "", siteOrigin: "https://leons.bloob.haus" })).toBe(true));
it("an outside arrival starts closed", () =>
  expect(decideInitialState({ remembered: false, arrivedFromSite: false, opensOnArrival: true, hash: "" })).toBe("closed"));
it("a hash link opens", () =>
  expect(decideInitialState({ remembered: false, arrivedFromSite: false, opensOnArrival: true, hash: "#why" })).toBe("open"));
it("a remembered note opens", () => { /* remembered: true → "open" */ });
```
- [ ] **Step 2: Run** `npx vitest run tests/engine/state.test.js`, expect FAIL; implement `state.js`; expect PASS.
- [ ] **Step 3: Implement** `toolbox.js`, `light.js`, `head-init.js` and the bundling. Behavior only; no markup built in script.
- [ ] **Step 4: Playwright check** (local): a fixture page with one object; click opens and `--open` reaches 1; reload keeps it open when `data-remembers="visitor"`.
- [ ] **Step 5: Commit** `feat(engine): browser toolbox: open, remember, arrival rule, light`.

### Task 5: The note

**Files:**
- Create: `lib/visualizers/note/manifest.json`, `schema.md`, `open.html`, `style.css`
- Test: `lib/visualizers/note/note.test.js`

**Interfaces:**
- Consumes: Tasks 1, 3, 4.
- Manifest: `{ "name": "note", "format": "template", "scope": "page", "opens": "click", "remembers": "visitor", "detect": { "selectors": [".bloob-object[data-shape=note]"] } }`.
- Look (from the spec and prototype `note-unroll-v4.html`): paper hanging from its top edge; at `--open: 0` the tip shows the beginning (172 px tall in the prototype), the rest rolled below with the roll as the handle; unrolling to full length takes about 0.65 to 2.2 s by length; the roll stays at the bottom when open and rolls it back up; natural paper that dims slightly with the light.

- [ ] **Step 1: Write the failing tests.**

```js
it("draws the whole note in the HTML", () => { /* renderObject(note, sample) contains every paragraph */ });
it("a locked note shows only its title on the tip", () => {});
it("the roll is a real button with a label", () => { /* button[aria-label] inside the object */ });
```
- [ ] **Step 2: Run, expect FAIL. Step 3: implement. Step 4: run, expect PASS.**
- [ ] **Step 5: Check the 9 leons notes** that say `bloob-shape: note` on a local bloob-haus-26 build (Task 6 makes that possible; if Task 6 is not done yet, check them in Task 6).
- [ ] **Step 6: Commit** `feat(note): the note visualizer`.

### Task 6: `bloob-haus-26`, first light

**Files:**
- Create: `themes/bloob-haus-26/theme.yaml` (`objects: true`), `layouts/base.njk`, `layouts/page.njk`, `layouts/folder-index.njk`, `partials/head.njk`, `partials/footer.njk`, `partials/scripts.njk`, `assets/css/main.css`, `assets/objects/marble.png` (the fallback object image `collection` expects)
- Test: `tests/build/assemble-src.test.js` (theme assembles), `tests/engine/head-order.test.js`

**Interfaces:**
- Consumes: tokens (Task 0), `headInitScript()` (Task 4), the shortcode (Task 3).
- What the theme brings (spec section 8): the background recipe (three blurred world colors as soft gradients, dawn by day, dusk with a warm glow top right at night, a twilight blend between), dot grid, warm dots near the cursor or finger, light live grain, Newsreader for reading and headings, Instrument Sans for labels, little chrome. Machinery kept from marbles-pouch: search markers and hidden ID line, share bar, date pills, tags, backlinks, graph container, comments, canonical, page ID, robots, preview tags, RSS, favicon, the two visualizer markers.

- [ ] **Step 1: Write the failing tests:** the theme assembles (Tier 1 files present, markers printed); `head.njk` puts `headInitScript()` before any stylesheet that styles objects.
- [ ] **Step 2: Run, expect FAIL. Step 3: implement. Step 4: run, expect PASS.**
- [ ] **Step 5: Pin the leons homepage** in the vault (allowed by Leon): `index.md` gets `layout: layouts/base.njk`, which is what it resolves to today, so production does not change. Verify with the before/after diff from Task 3.
- [ ] **Step 6: Push, open the preview link, screenshot home, a note and a folder page by day and night** (Playwright, `colorScheme: "dark"`), send Leon the link plus three lines. Interior feedback goes straight into the theme.
- [ ] **Step 7: Commit** `feat(theme): bloob-haus-26, first light`.

## Phase B: the marble

### Task 7: The glass, pure

**Files:**
- Create: `lib/visualizers/marble/glass.js`, `color.js`
- Test: `lib/visualizers/marble/glass.test.js`

**Interfaces:**
- Produces (values from prototype `marble-open-v3.html`):
  - `glassMap(size: number, eta = 1.5, rainbow = 0.03) → { size, map: Float32Array, rim: Float32Array, cover: Float32Array }`: Snell's-law refraction into a ball, once per color channel, landing on the photo plane at the ball's center.
  - `glassDraw(src: Uint8ClampedArray, sw: number, sh: number, g, see: number, shiftX = 0, shiftY = 0) → Uint8ClampedArray`: RGBA; see-through `see` in the middle and `see * 0.3` at the edge; the rim lightens by `0.3 * rr²`.
  - `insideColor(rgb: [r,g,b], size: number) → Uint8ClampedArray`: the colored inside for marbles without an image; the whole color counts (hue, strength, brightness: inner `l + .06`, outer hue `+40` and `l - .2`, a ribbon at hue `+180`).
  - `defaultMarbleColor({ color?: string, title?: string, fileName: string, imageAverage?: [r,g,b] }) → string` (hex): the named color, else the image's average color, else a steady color hashed from the title, else from the file name.
  - Constants: image see-through `0.2`, color see-through `0.28`, pearl shine `0.32` (`0.38` with an image), movement `0.12`, highlight natural angle `-30` degrees, sun top right.

- [ ] **Step 1: Write the failing tests.**

```js
it("the ball's center looks at the photo's center", () => { /* draw a 2-color test image; center pixel = center color */ });
it("outside the ball is clear", () => { /* corner alpha 0 */ });
it("no image and no title still gives a steady color", () =>
  expect(defaultMarbleColor({ fileName: "AUTOPOIESIS-A" })).toBe(defaultMarbleColor({ fileName: "AUTOPOIESIS-A" })));
it("a darker pick makes a darker marble", () => { /* mean luminance of insideColor(dark) < insideColor(light) */ });
```
- [ ] **Step 2: Run, FAIL. Step 3: implement. Step 4: run, PASS. Step 5: commit** `feat(marble): the glass, as pure functions`.

### Task 8: One article for everyone

**Files:**
- Create: `lib/visualizers/article/open.html`; modify `lib/visualizers/article/manifest.json` (`"format": "template"`), `layout.njk` (frame and partials stay; the reading part comes from the engine)
- Test: `lib/visualizers/article/article.test.js`; a melt before/after diff

**Interfaces:**
- Consumes: `renderObject`. The host computes date strings with the existing filters (`dateValue`, `dateFormat`, `dateLabel`) and passes them in `data`, so the engine has no date logic.
- Produces: the article's reading part (header with type, title, subtitle, banner text, author, byline, date pills; then the body) as the open part of an `article` object, usable alone (melt) and as a marble's inside. Share bar, visitor count and comments stay as partials in the layout; the share bar steps aside when the article is inside a marble (outermost shares).
- Not gated by `objects: true`: the article must render byte-identically on every theme.

- [ ] **Step 1: Build melt now** into a reference copy: `node scripts/dev-local.js --site=melt --content=../melt-website` equivalent build into `_site-melt-before`.
- [ ] **Step 2: Write the failing test:** the engine's article output for a fixture equals today's `layout.njk` output for the same page.
- [ ] **Step 3: Implement. Step 4: run the test, PASS.**
- [ ] **Step 5: Build melt again and `diff -r _site-melt-before _site`.** Expect no difference on melt's 16 article pages or anywhere else.
- [ ] **Step 6: Commit** `refactor(article): the reading part is drawn by the engine; melt unchanged`.

### Task 9: The catalog learns each page's kind

**Files:**
- Modify: `scripts/preprocess-content.js` (`perPageLinks` around L426-503 and L643), `scripts/utils/graph-builder.js`
- Test: `tests/utils/graph-builder.test.js`

**Interfaces:**
- Produces on page nodes: `shape` (the effective shape name), `color` (named or default, Task 7), `closedPicture` (the Task 10 path, marbles only), `firstLines` (public notes only), and frontmatter `subtitle` when set.

- [ ] **Steps:** failing test for the new fields on a fixture (and their absence for a locked or unlisted page); implement; run `npm test`; commit `feat(catalog): page nodes carry their kind and outside details`.

### Task 10: Baked marbles and icons

**Files:**
- Create: `lib/visualizers/marble/preprocess-hook.js`
- Modify: `themes/bloob-haus-26/partials/head.njk` (page tab icon)
- Test: `lib/visualizers/marble/bake.test.js`

**Interfaces:**
- Consumes: `glassMap`, `glassDraw`, `insideColor`, `defaultMarbleColor` (Task 7); `graph.json` nodes (`shape`, `image`, from Task 9).
- Produces: `og/marble/<slug>.png` (256 px) plus `-64.png` and `-32.png` for every marble page; the marble page's tab icon is its own `-32.png`; the link preview image is the 256 px picture unless the page already has an OG image. Icons for other visualizers: their closed look, else the `_bloob-objects.md` image for their object type, else a plain dot.

- [ ] **Step 1: Failing test:** for a fixture graph with one image marble and one color marble, the hook writes the three sizes for each and nothing else.
- [ ] **Step 2: Run, FAIL. Step 3: implement (sharp gives raw pixels in and out). Step 4: run, PASS.**
- [ ] **Step 5: Time a full leons build before and after.** Expect the build to stay within a few seconds of before; if it does not, bake only changed pages.
- [ ] **Step 6: Commit** `feat(marble): bake each marble and its icons at build time`.

### Task 11: The marble

**Files:**
- Create: `lib/visualizers/marble/manifest.json`, `schema.md`, `closed.html`, `open.html`, `style.css`, `browser.js`
- Create: `lib/visualizers/_engine/share.js` (browser), `scripts/utils/share-markdown.js`
- Test: `lib/visualizers/marble/marble.test.js`, `tests/utils/share-markdown.test.js`

**Interfaces:**
- Consumes: Tasks 1, 3, 4, 7, 8, 10.
- Manifest: `{ "name": "marble", "format": "template", "scope": "page", "opens": "click", "remembers": false, "arrives": "open-from-site", "shares": true, "inside": "article", "detect": { "selectors": [".bloob-object[data-shape=marble]"] } }`. `inside:` in a note's YAML picks another inner visualizer later; this build supports `article` only.
- `closed.html`: the baked marble picture (Task 10) as an `<img>`, the title, the "What is a marble?" pill (text: the vault's `_bloob-objects.md` description for `marble`), and the share row.
- `open.html`: the funnel (SVG, upright and tapered under the marble, an S-curve flaring to page width, its top fading from the marble's tint) and the sheet holding `{{ inside }}`, then tags, "pages that link here", the graph slot and comments (partials around the object in the generated layout).
- `browser.js` (its own behavior only): the live glass on a canvas over the baked picture (cursor where there is one, scrolling otherwise; half sharpness while moving), the light swelling from the center as `--open` rises, the pearl shine turned toward the light (`readLight()`), the shadow away from it.
- Share (toolbox, outermost only): copy link; the phone's share sheet where there is one; copy markdown; picture (the baked marble); PDF through the browser's print with a print style.
- `cleanMarkdownForSharing(md: string, { publishedSlugs: Set<string> }) → string`: removes `%% %%` comments, turns links to unpublished or blocked notes into plain text, trims frontmatter to `title`. Preprocess writes the result as a `source.md` next to each marble page.

- [ ] **Step 1: Write the failing tests.**

```js
it("an outside arrival is closed, the words are still in the HTML", () => {});
it("the article inside has no share bar of its own", () => {});
it("strips %% comments", () => expect(cleanMarkdownForSharing("a %%secret%% b", { publishedSlugs: new Set() })).toBe("a  b"));
it("links to unpublished notes become plain text", () => {});
```
- [ ] **Step 2: Run, FAIL. Step 3: implement. Step 4: run, PASS.**
- [ ] **Step 5: Push, preview link, screenshots of a color marble and an image marble, closed and open, day and night. Send to Leon.**
- [ ] **Step 6: Commit** `feat(marble): the marble opens into its page`.

## Phase C: rooms, night, the switch

### Task 12: Folder pages are rooms

**Files:**
- Create: `lib/visualizers/_engine/room.js`, `themes/bloob-haus-26/templates/folder-index.md`
- Modify: `themes/bloob-haus-26/layouts/folder-index.njk`, `eleventy.config.js` (shortcode `{% bloobRoom folder %}`)
- Test: `tests/engine/room.test.js`

**Interfaces:**
- Consumes: catalog nodes (Task 9), shapes' closed looks (Tasks 5, 11).
- Produces: `renderRoom(nodes: object[], shapes: Map<string, ShapeDef>) → string`: each page as its closed object in a plain flow (notes as their tip, marbles as glass, anything else as a calm card with its icon), each a real link. A click in the room sets the arrive flag (Task 4), and where the browser can, the light carries over across pages. Other themes keep `collection` cards.

- [ ] **Steps:** failing test (3 nodes: note, marble, plain → three closed objects, three `<a href>`); implement; run; push; preview link with screenshots of `/marbles/` by day and night to Leon; commit `feat(room): folder pages are rooms of closed objects`.

### Task 13: Night for what leons uses

**Files:**
- Modify: `lib/visualizers/collection/styles.css` (cards; the marbles mode's hand-painted glass, L281-300, 392), `lib/visualizers/foldable/styles.css`, `lib/visualizers/graph/browser.js` (follow a scheme change, L114-122), `lib/visualizers/search/styles.css`, `lib/visualizers/tags/` (via the theme), `lib/visualizers/fridge-magnets/styles.css` (2 notes), `lib/visualizers/scene-nav/styles.css` (1 note)
- Test: `tests/css-independence.test.js` (extend); Playwright screenshots locally

- [ ] **Steps:** for each, replace hand colors with tokens from Task 0 so day and night both read well; for `graph`, re-read colors on `matchMedia("(prefers-color-scheme: dark)")` change; check melt and buffbaby builds still look the same by day (screenshots before and after); commit per visualizer, `fix(<name>): follows night`.

### Task 14: An invitation on leons

**Files:**
- Modify (vault): `index.md` (a short line near the top), and the bloob-haus-26 home styling

- [ ] **Steps:** add Leon's line in his voice, for example "Very soon you can make your own marble." (final wording from Leon by looking at the preview); reserve a quiet slot next to the marble's share row for a later "make this yourself" link, hidden until a target exists; preview link to Leon; commit in the vault repo and the builder.

### Task 15: Publish the engine and list the shiny ones

**Files:**
- Modify: `scripts/build-visualizer-editor.js` (bundle `_engine` browser parts to `_visualizers/engine/<VERSION>/bloob-engine.js`, plus `stable/` and the previous version), `lib/visualizer-editor/catalog.json` (`listed: ["note", "marble"]`), `lib/visualizer-editor/examples/note.md`, `marble.md`, `.github/workflows/deploy-visualizers.yml` (path filter includes `lib/visualizers/_engine/**`)
- Test: `tests/visualizer-editor/examples.test.js` (listed pages), `tests/visualizer-editor/engine-publish.test.js`

- [ ] **Steps:** failing tests (the build writes `engine/<VERSION>/bloob-engine.js` and `engine/stable/bloob-engine.js` with identical content; only always-on plus note and marble get pages); implement; run; commit `feat(visualizers): publish the engine; list note and marble`. Goes live with Task 16.

### Task 16: Switch leons, carefully

- [ ] **Step 1: Checks before:** status 200 for `leons.bloob.haus/`, `/marbles/`, three marbles, one note, `/tags/`, `/sitemap.xml`, `/feed.xml`; screenshots of each by day; record the count of pages in `_site`.
- [ ] **Step 2: Leon approves the preview** (one picker: switch now, or one more round).
- [ ] **Step 3: Merge the pull request into `main`** (deploys leons on marbles-pouch with the engine present but gated) **and the visualizers**; repeat the checks, expect identical results.
- [ ] **Step 4: Change the vault's `_bloob-settings.md` to `theme: bloob-haus-26`** and push (deploys leons on the new theme).
- [ ] **Step 5: Checks after:** the same addresses return 200; the page count matches; a marble arrives closed from outside and opening from a site link; a `#heading` link opens and scrolls; night screenshots. Rollback is the one line in Step 4.
- [ ] **Step 6: CHANGELOG entry, DECISIONS entries** (bloob-haus-26, the engine's home, five layers, the toolbox, outermost shares, icons from closed looks, lock and seal words), `docs/workbench-insights.md` lines for what the build taught, and the `ontology.md` and `themes.md` fixes from spec section 13.

## Phase D: melt

### Task 17: melt takes the new article look

- [ ] **Steps:** melt's theme gains night values for its tokens and the article's sheet-on-background look; build before/after and screenshot melt's home, a resource page and an article, day and night; Leon looks at a preview first (a `preview-melt.yml` like Task 0, or local screenshots); checks before and after deploy; commit `feat(melt): the new article look, day and night`.
