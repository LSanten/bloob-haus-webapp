# Collection SEO Decoupling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make build-time SEO-crawlable HTML available for every `display:` mode of the `collection` shape (`cards`, `list`, `slider`, `bubbles`, `marbles`), not just `cards`, via a new `seo: true|false` setting that is independent of `display:`.

**Architecture:** `display: cards` already renders a full card grid at build time when `graph.json` is available (unchanged by this plan). Every other display mode currently emits an empty runtime-only placeholder. This plan adds a second build-time path — `renderSeoListHtml()` in `render-card.js` — that renders a plain, real, crawlable `<a href>` link list (reusing the already-styled `.folder-preview__list/__item/__link` classes) for any non-cards mode when `seo` is enabled. `browser.js` removes that scaffold the moment it mounts the real display (bubbles/marbles/slider/list), so JS-enabled visitors see exactly one thing and no-JS/crawler visitors always see real navigable links. `seo: false` (any mode, including cards) falls back to exactly today's runtime-only placeholder — the existing regression-safety default.

**Tech Stack:** Node.js (ESM), Vitest, plain DOM APIs in `browser.js` (esbuild-bundled IIFE, no framework).

## Global Constraints

- Scope is `lib/visualizers/collection/` only. `lib/visualizers/folder-preview/` is a separate, explicitly out-of-scope visualizer — do not touch it in this plan.
- Build-time rendering (for any display mode, SEO or not) is only reachable via the **code-fence** activation form (` ```collection\n...\n``` `). `renderFilescope()` (the `bloob-shape: collection` frontmatter/file-scope form) stays a runtime-only placeholder for every display mode, unconditionally — `graph.json` does not exist yet when it runs during preprocessing. Do not attempt to change this in this plan; it's a separate, harder problem (graph.json availability during preprocessing).
- `seo` defaults to `true`. For `display: cards` this is a pure formalization of existing behavior (cards has always attempted build-time rendering whenever `graph.json` was available) — cards output must be byte-identical to today's when `seo` is unset. For `list`/`slider`/`bubbles`/`marbles`, default-`true` is new behavior: these modes will now ship a build-time link list they didn't emit before. `seo: false` is the opt-out, for any display mode including cards (new: today there is no way to force cards into runtime-only mode short of `graph.json` being absent — this plan makes that explicit and author-controlled).
- Reuse `core.js`'s `resolvePages()` for the new build-time SEO path. Do not reimplement filtering/sorting.
- `browser.js` has no unit tests anywhere in this codebase today (no `browser.test.js` file exists for any visualizer, and `vitest.config.js` has no `jsdom`/DOM test environment configured). Don't introduce that pattern here — verify `browser.js` changes manually via a real dev-server + real browser, per this project's existing three-tier test strategy (documented in the root `CLAUDE.md`).
- Every new class/attribute name introduced by this plan: `data-collection-seo-list` (marker attribute on the build-time SEO `<ul>`, read by `browser.js` to know what to remove), `renderSeoListHtml` (the render-card.js export), `removeSeoScaffold` (the browser.js helper). Use these exact names in every task — do not rename mid-plan.

---

### Task 1: `renderSeoListHtml()` — the build-time SEO link list renderer

**Files:**
- Modify: `lib/visualizers/collection/render-card.js`
- Test: `lib/visualizers/collection/collection.test.js` (new `describe("renderSeoListHtml", ...)` block, placed directly after the existing `describe("renderCardGridHtml", ...)` block at the end of the file)

**Interfaces:**
- Consumes: nothing new — uses the module-local `esc()` and `escAttr()` helpers already defined at the top of `render-card.js` (do not export or duplicate them).
- Produces: `renderSeoListHtml(pages, { emptyLabel = "Nothing here yet." } = {})` → HTML string. `pages` is an array of graph.json node objects (same shape `renderCardHtml`/`renderCardGridHtml` already consume: `id`, `title`, `redirect` optional). Task 2 imports and calls this from `index.js`.

- [ ] **Step 1: Write the failing tests**

Add this import to the top of `collection.test.js`, replacing the existing render-card.js import line:

```js
const { renderCardHtml, renderCardGridHtml, parseShowFields, renderSeoListHtml } = await import("./render-card.js");
```

Add this new `describe` block at the very end of `collection.test.js`, after the existing `describe("renderCardGridHtml", ...)` block:

```js
describe("renderSeoListHtml", () => {
  it("returns empty message when no pages", () => {
    const html = renderSeoListHtml([]);
    expect(html).toContain("collection__empty");
  });

  it("renders a semantic list with real anchor links and titles", () => {
    const html = renderSeoListHtml([
      { id: "/a/", title: "Alpha" },
      { id: "/b/", title: "Beta" },
    ]);
    expect(html).toContain("data-collection-seo-list");
    expect(html).toContain('href="/a/"');
    expect(html).toContain("Alpha");
    expect(html).toContain('href="/b/"');
    expect(html).toContain("Beta");
  });

  it("falls back to node.id when title is missing", () => {
    const html = renderSeoListHtml([{ id: "/no-title/" }]);
    expect(html).toContain('href="/no-title/"');
    expect(html).toContain("/no-title/");
  });

  it("escapes HTML special characters in title", () => {
    const html = renderSeoListHtml([{ id: "/x/", title: "<script>alert(1)</script>" }]);
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders redirect as href with external attrs when redirect present", () => {
    const html = renderSeoListHtml([{ id: "/x/", title: "X", redirect: "https://example.com" }]);
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('target="_blank"');
  });

  it("uses the folder-preview list classes (already styled in styles.css)", () => {
    const html = renderSeoListHtml([{ id: "/a/", title: "A" }]);
    expect(html).toContain('class="folder-preview__list"');
    expect(html).toContain('class="folder-preview__item"');
    expect(html).toContain('class="folder-preview__link"');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/visualizers/collection/collection.test.js`
Expected: FAIL — `renderSeoListHtml is not a function` (or similar import error), since it doesn't exist in `render-card.js` yet.

- [ ] **Step 3: Implement `renderSeoListHtml` in `render-card.js`**

Add this function at the end of `lib/visualizers/collection/render-card.js`, after the existing `renderCardGridHtml`:

```js
/**
 * Render a semantic, crawlable link list — the build-time SEO scaffold used by every
 * non-cards display mode (list, slider, bubbles, marbles). browser.js removes this
 * scaffold once it mounts the real display; until then (no JS, or a crawler) these are
 * real navigable <a href> links with real titles. Reuses the already-styled
 * folder-preview__* classes from styles.css — for `display: list` this doubles as the
 * final look, no JS enhancement needed beyond removing the marker attribute.
 */
export function renderSeoListHtml(pages, { emptyLabel = "Nothing here yet." } = {}) {
  if (!pages.length) return `<p class="collection__empty">${esc(emptyLabel)}</p>`;
  const items = pages
    .map((node) => {
      const href = escAttr(node.redirect || node.id);
      const external = node.redirect ? ' target="_blank" rel="noopener"' : "";
      return `<li class="folder-preview__item"><a class="folder-preview__link" href="${href}"${external}>${esc(node.title || node.id)}</a></li>`;
    })
    .join("\n");
  return `<ul class="folder-preview__list" data-collection-seo-list>\n${items}\n</ul>`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/visualizers/collection/collection.test.js`
Expected: PASS — all 6 new tests green, all pre-existing tests in the file still green too (this step only added an export, touched nothing else).

- [ ] **Step 5: Commit**

```bash
git add lib/visualizers/collection/render-card.js lib/visualizers/collection/collection.test.js
git commit -m "feat(collection): add renderSeoListHtml — build-time SEO link list for non-cards display modes"
```

---

### Task 2: Wire `seo:` setting + universal SEO path into `index.js`'s `transform()`

**Files:**
- Modify: `lib/visualizers/collection/index.js`
- Test: `lib/visualizers/collection/collection.test.js` (new top-of-file fixture setup + new `describe` block)

**Interfaces:**
- Consumes: `renderSeoListHtml(pages, options?)` from Task 1 (`render-card.js`); `resolvePages(nodes, settings)` from `core.js` (already imported in `index.js`, unchanged signature).
- Produces: `transform(html)`'s output now includes a `<ul ... data-collection-seo-list>...</ul>` fragment inside `.collection-visualizer` for any non-cards display mode when `seo` is not explicitly `false` and `graph.json` has nodes. Task 3 (`browser.js`) depends on the `data-collection-seo-list` attribute existing on that `<ul>` to find and remove it at mount time.

- [ ] **Step 1: Add the shared `graph.json` test fixture to `collection.test.js`**

The existing test suite has never actually exercised the build-time "graph.json is available" path — `loadGraphNodes()` in `index.js` reads `process.env.SRC_DIR + "/graph.json"`, which doesn't exist in the test environment today, so `nodes.length > 0` has always been false in every existing test. This step adds a real fixture file so both the existing `display: cards` behavior and the new SEO-list behavior can be tested for real.

Add these imports and this fixture setup at the very top of `collection.test.js`, before the existing `const manifest = ...` line (so it runs before `beforeAll`, which itself must run before any test calls `mod.transform()` with `graph.json`-dependent settings — this is why it must be a **top-level** `beforeAll`/`afterAll`, not nested inside a `describe`):

```js
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Shared graph.json fixture for every test in this file that needs build-time rendering
// (display: cards, and the new universal SEO list). One fixture, module-scoped, because
// index.js's loadGraphNodes() caches on first successful read (`_graphCache`) — once
// populated it stays populated for the life of this test file's module instance, so all
// graph.json-dependent tests in this file must share the same fixture content.
const graphFixtureNodes = [
  { id: "/projects/", section: "projects", type: "page", website_status: "public", title: "Index" },
  { id: "/projects/alpha/", section: "projects", type: "page", website_status: "public", title: "Alpha Project", subtitle: "A great project", image: "/og/alpha-og.jpeg" },
  { id: "/projects/beta/", section: "projects", type: "page", website_status: "public", title: "Beta Project" },
  { id: "/projects/gamma/", section: "projects", type: "page", website_status: "archived", title: "Gamma (archived)" },
];

let tmpSrcDir;
let originalSrcDir;

beforeAll(() => {
  originalSrcDir = process.env.SRC_DIR;
  tmpSrcDir = fs.mkdtempSync(path.join(os.tmpdir(), "collection-test-"));
  fs.writeFileSync(
    path.join(tmpSrcDir, "graph.json"),
    JSON.stringify({ nodes: graphFixtureNodes }),
    "utf-8"
  );
  process.env.SRC_DIR = tmpSrcDir;
});

afterAll(() => {
  fs.rmSync(tmpSrcDir, { recursive: true, force: true });
  if (originalSrcDir === undefined) delete process.env.SRC_DIR;
  else process.env.SRC_DIR = originalSrcDir;
});
```

The file already has its own `const __dirname = path.dirname(fileURLToPath(import.meta.url));` a few lines below (for reading `manifest.json`) — remove that now-duplicate declaration and keep the one added above (same value, same purpose, just moved earlier so the fixture setup can use it too). The file already imports `fs` and `path` further down too (for the manifest read) — remove those now-duplicate import lines, keeping only the versions added above.

- [ ] **Step 2: Write the failing tests**

Add this new `describe` block to `collection.test.js`, after the existing `describe("collection index.js exports", ...)` block:

```js
describe("collection transform — build-time SEO (universal, per display mode)", () => {
  ["list", "slider", "bubbles", "marbles"].forEach((display) => {
    it(`display: ${display} gets a build-time SEO link list by default (seo unset)`, () => {
      const html = `<pre><code class="language-collection">source: folder=projects\ndisplay: ${display}\n</code></pre>`;
      const result = mod.transform(html);
      expect(result).toContain("data-collection-seo-list");
      expect(result).toContain('href="/projects/alpha/"');
      expect(result).toContain("Alpha Project");
      expect(result).toContain('href="/projects/beta/"');
      expect(result).toContain("Beta Project");
      expect(result).not.toContain("Gamma"); // archived — excluded by filterNodes
    });
  });

  ["list", "slider", "bubbles", "marbles", "cards"].forEach((display) => {
    it(`display: ${display} with seo: false always falls back to the runtime placeholder`, () => {
      const html = `<pre><code class="language-collection">source: folder=projects\ndisplay: ${display}\nseo: false\n</code></pre>`;
      const result = mod.transform(html);
      expect(result).not.toContain("data-collection-seo-list");
      expect(result).not.toContain("fp-seo-wrapper");
      expect(result).not.toContain('href="/projects/alpha/"');
      expect(result).toContain("data-collection-settings");
    });
  });

  it("display: cards still renders the build-time card grid unchanged when seo defaults true", () => {
    const html = `<pre><code class="language-collection">source: folder=projects\ndisplay: cards\n</code></pre>`;
    const result = mod.transform(html);
    expect(result).toContain("fp-seo-wrapper");
    expect(result).toContain("fp-cards");
    expect(result).toContain("fp-card__title");
    expect(result).toContain("Alpha Project");
    expect(result).not.toContain("data-collection-seo-list"); // cards path is unchanged — no generic list
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run lib/visualizers/collection/collection.test.js`
Expected: FAIL on the new `describe` block's tests — today, every non-cards mode always returns the plain placeholder (no `data-collection-seo-list`, no page links), and `seo: false` isn't read at all yet so it has no effect either way. The `display: cards` test should already PASS at this point (Step 1's fixture alone makes the pre-existing cards code path reachable for the first time — confirms the fixture itself is wired correctly before you touch `transform()`'s logic in Step 4).

- [ ] **Step 4: Implement the `seo` setting + universal SEO branch in `index.js`**

Replace the JSDoc header comment at the top of `lib/visualizers/collection/index.js`:

```js
/**
 * Collection Visualizer — Build-time Transform
 *
 * Handles ```collection ... ``` code fences and bloob-shape: collection pages.
 *
 * Code fence YAML settings:
 *   source:      folder=X | tag=X | field:KEY=VAL | all
 *   display:     cards (default) | list | slider | bubbles | marbles
 *   sort:        alpha (default) | reverse-alpha
 *   limit:       max pages to show
 *   show_fields: comma-separated or YAML list of frontmatter fields on each card
 *   search:      off | basics | fulltext (default: combined metadata+fulltext)
 *   seo:         true (default) | false — build-time HTML vs. runtime-only placeholder.
 *                Applies to every display mode, not just cards: SEO-crawlability is
 *                orthogonal to visual presentation. display: cards renders a real card
 *                grid at build time (unchanged). Every other display mode renders a
 *                plain, real <a href> link list at build time instead — browser.js
 *                replaces it with the actual bubbles/marbles/slider/list once it mounts
 *                (see removeSeoScaffold() in browser.js). seo: false always falls back
 *                to the runtime-only placeholder, for any display mode.
 *
 * renderFilescope() emits a runtime placeholder — graph.json is not yet
 * written at preprocess time. Use a code fence for build-time SEO rendering.
 */
```

Replace the import line:

```js
import { parseShowFields, renderCardGridHtml } from "./render-card.js";
```

with:

```js
import { parseShowFields, renderCardGridHtml, renderSeoListHtml } from "./render-card.js";
```

Replace the body of `transform()` from `const settingsJson = JSON.stringify(settings);` through the end of the function:

```js
    const settingsJson = JSON.stringify(settings);
    const display = settings.display || "cards";
    const seoEnabled = settings.seo !== false;

    // seo: false (explicit opt-out) always falls straight to the runtime placeholder,
    // for every display mode including cards — symmetric, explicit author control.
    if (seoEnabled) {
      const nodes = loadGraphNodes();
      if (nodes.length > 0) {
        const pages = resolvePages(nodes, settings);

        if (display === "cards") {
          const showFields = parseShowFields(settings.show_fields);
          const gridHtml = renderCardGridHtml(pages, { showFields });

          const searchDisabled = settings.search === "off" || settings.search === false;
          const searchHtml = searchDisabled
            ? ""
            : `<input type="text" class="fp-search-input" placeholder="Search..." aria-label="Search">
<div class="fp-filter-placeholder"></div>`;

          const inner = `<div class="fp-seo-wrapper">${searchHtml}${gridHtml}</div>`;
          return `<div class="collection-visualizer" data-pagefind-ignore data-collection-settings='${settingsJson}'>${inner}</div>`;
        }

        // Every other display mode (list, slider, bubbles, marbles) gets the same
        // build-time SEO win as cards: a real, crawlable link list. browser.js removes
        // it once it mounts the actual display — see removeSeoScaffold() there.
        const seoListHtml = renderSeoListHtml(pages);
        return `<div class="collection-visualizer" data-pagefind-ignore data-collection-settings='${settingsJson}'>${seoListHtml}</div>`;
      }
      // graph.json unavailable — fall through to runtime placeholder
      console.warn(
        `[collection] graph.json not available — falling back to runtime render (source: ${settings.source || "all"})`
      );
    }

    return buildPlaceholder(settingsJson);
  });
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run lib/visualizers/collection/collection.test.js`
Expected: PASS — every test in the file, old and new.

- [ ] **Step 6: Run the full suite to check for regressions elsewhere**

Run: `npx vitest run`
Expected: PASS — all test files, including `tests/build/*` and every other visualizer's tests. This step exists because Task 1's `collection.test.js` fixture Step 1 removed duplicate `fs`/`path`/`__dirname` declarations from later in the file — verify nothing else in that file (or elsewhere) depended on those specific later declarations existing separately.

- [ ] **Step 7: Commit**

```bash
git add lib/visualizers/collection/index.js lib/visualizers/collection/collection.test.js
git commit -m "feat(collection): universal build-time SEO via seo: setting, independent of display mode"
```

---

### Task 3: `browser.js` — remove the SEO scaffold before mounting the real display

**Files:**
- Modify: `lib/visualizers/collection/browser.js`

**Interfaces:**
- Consumes: the `data-collection-seo-list` attribute Task 1/2 put on the build-time `<ul>` fragment.
- Produces: nothing new consumed by later tasks — this is the last code task.

No automated test for this task — see Global Constraints (no `browser.js` file in this codebase has a unit test, and there's no jsdom environment configured; verify manually per this project's three-tier test strategy, tier 3).

- [ ] **Step 1: Add the `removeSeoScaffold` helper and call it from every render function**

In `lib/visualizers/collection/browser.js`, immediately after the `// ── Display renderers ────...` comment and before `function renderCards(container, pages, settings) {`, add:

```js
  // Removes the build-time SEO link list (rendered by renderSeoListHtml in
  // render-card.js, marked with data-collection-seo-list) before mounting the real
  // display. No-op if seo:false or graph.json was unavailable at build time — there's
  // nothing to remove in that case. Every render* function below calls this first so a
  // JS-enabled visitor never sees both the plain SEO list and the enhanced display at
  // the same time.
  function removeSeoScaffold(container) {
    var scaffold = container.querySelector("[data-collection-seo-list]");
    if (scaffold) scaffold.remove();
  }
```

Then add `removeSeoScaffold(container);` as the first line inside the body of each of these five functions (the very first statement, before any existing code in that function):

- `function renderCards(container, pages, settings) {`
- `function renderList(container, pages) {`
- `function renderSliderCards(container, pages, settings) {`
- `function renderBubbles(container, pages) {`
- `function renderMarbles(container, pages) {`

Example for `renderList` (apply the same one-line insertion pattern to the other four):

```js
  function renderList(container, pages) {
    removeSeoScaffold(container);
    if (!pages.length) {
      container.innerHTML = '<p class="collection__empty">Nothing here yet.</p>';
      return;
    }
    // ...rest of the function is unchanged
```

- [ ] **Step 2: Rebuild the visualizer bundle**

Run: `node scripts/bundle-visualizers.js`
Expected: `[bundle] collection: browser.js → .../collection.js` logs with no esbuild errors.

- [ ] **Step 3: Manual verification in a real browser**

`browser.js` changes aren't unit-testable in this codebase's current setup — verify by hand. Create a **temporary, local-only** scratch markdown file to exercise all four non-cards display modes (do not add this to any real content repo's committed content — delete it in Step 4 below):

In your local content repo used for dev (e.g., `../melt-website` or whichever `--content=` path your `npm run dev` uses), create `_scratch-collection-test.md` at the repo root:

```markdown
---
bloob-shape: page
---

```collection
source: all
display: bubbles
```

```collection
source: all
display: marbles
```

```collection
source: all
display: list
```
```

Stop any running dev server first (per this repo's dev-server rule), then start it:

```bash
node scripts/dev-local.js --site=melt --content=../melt-website
```

Open `http://localhost:8080/_scratch-collection-test/` (or wherever the scratch file's slug lands) in a real browser and check, for each of the three blocks:

1. **View source / disable JS** (or use `curl http://localhost:8080/_scratch-collection-test/ | grep "data-collection-seo-list"`) — confirm the initial server-rendered HTML contains real `<a href>` links with real page titles for all three blocks, before any JS runs.
2. **With JS enabled** (normal browser view) — confirm each block ends up showing its real display (floating bubbles / draggable marbles / a plain icon list) and that `data-collection-seo-list` is **not** present in the live DOM afterward (check via browser DevTools Elements panel, or `document.querySelectorAll('[data-collection-seo-list]').length` in the console — expect `0`).
3. No visible flash of duplicated content (the plain link list briefly showing underneath/alongside the enhanced display before removal) — a very brief swap is expected and acceptable (this is documented as an accepted tradeoff, not a bug — see the plan's Global Constraints); a *persistent* duplicate is a bug.

- [ ] **Step 4: Delete the scratch file**

```bash
rm ../melt-website/_scratch-collection-test.md
```

(adjust the path to wherever you created it in Step 3 — it must not be committed to the content repo).

- [ ] **Step 5: Commit**

```bash
git add lib/visualizers/collection/browser.js
git commit -m "feat(collection): remove build-time SEO scaffold when mounting the real display at runtime"
```

---

### Task 4: Documentation

**Files:**
- Modify: `lib/visualizers/collection/schema.md`
- Modify: `docs/architecture/visualizers.md`

**Interfaces:**
- Consumes: nothing (docs only).
- Produces: nothing (last task).

- [ ] **Step 1: Update `lib/visualizers/collection/schema.md`'s Settings table**

Replace this row's table (in the `## Settings` section) — add a new `seo` row directly after the `search` row:

```markdown
| `search` | string | combined | Default: metadata filter runs instantly, then Pagefind expands the result set (union). `basics` = metadata text-match only (no Pagefind). `off` = no search input. `fulltext` = alias for default combined mode. |
| `seo` | boolean | `true` | Build-time HTML vs. runtime-only placeholder, independent of `display:`. `display: cards` renders a real card grid at build time (unchanged whether `seo` is set or not — this is the pre-existing default behavior, now explicit). Every other `display:` mode renders a plain, real `<a href>` link list at build time instead, which `browser.js` replaces once it mounts the actual bubbles/marbles/slider/list. `seo: false` (any `display:` mode, including `cards`) always falls back to the runtime-only placeholder. |
```

- [ ] **Step 2: Update `lib/visualizers/collection/schema.md`'s Display modes table**

Replace the whole `## Display modes` section:

```markdown
## Display modes

| Mode | Build-time SEO output | Notes |
|------|----------------------|-------|
| `cards` | Full card grid (default `seo: true`) | 3-column grid with image, title, subtitle, optional fields — this is the final visual, not a placeholder that gets replaced |
| `list` | Plain link list (default `seo: true`) | Build-time list doubles as the final look — `browser.js` only needs to remove the SEO marker attribute, no visual change |
| `slider` | Plain link list (default `seo: true`) | `browser.js` replaces the link list with the Swiper carousel (requires Swiper loaded by theme) once mounted |
| `bubbles` | Plain link list (default `seo: true`) | `browser.js` replaces the link list with the scattered glassmorphism bubbles once mounted |
| `marbles` | Plain link list (default `seo: true`) | `browser.js` replaces the link list with the draggable marbles once mounted |

All five modes are build-time-crawlable by default now — see the `seo` setting above to opt out per fence. For `cards`, the build-time output *is* the final visual. For every other mode, the build-time output is a plain semantic link list (real `<a href>` links, real titles) that JS replaces with the actual interactive/visual layout once it mounts — no-JS visitors and crawlers still get real, navigable content either way.
```

- [ ] **Step 3: Add a short cross-reference note to `docs/architecture/visualizers.md`**

Find the existing line (in the hybrid-visualizer section):

```markdown
A hybrid visualizer may have a **build-time transform** (`index.js`) *and* a **`preprocess-hook.js`** (reads vault settings at build time) *and* a **`browser.js`** (renders the visualization or adds interactivity at runtime). All three are auto-discovered — no changes needed to any other file.
```

Add this paragraph directly after it:

```markdown
**`collection`'s SEO/display decoupling (2026-07-23):** most hybrid visualizers couple "does it render at build time" to "which visual style it uses." `lib/visualizers/collection/` deliberately does not — its `seo:` setting controls build-time-vs-runtime independently of its `display:` setting (cards/list/slider/bubbles/marbles). Every display mode can render real, crawlable build-time HTML; for non-cards modes that HTML is a plain link list that `browser.js` swaps for the actual visual once it mounts. See `lib/visualizers/collection/schema.md` for the full settings reference. This pattern is scoped to `collection` for now, not a general convention — `folder-preview` (a similar but separate visualizer) still ties SEO-crawlability to its `cards` style only.
```

- [ ] **Step 4: Commit**

```bash
git add lib/visualizers/collection/schema.md docs/architecture/visualizers.md
git commit -m "docs(collection): document seo: setting and universal build-time SEO across display modes"
```

---

## Self-Review

**Spec coverage:**
- ✅ Build-time SEO available for every display mode → Task 1 (`renderSeoListHtml`) + Task 2 (wiring in `transform()`).
- ✅ `seo:` setting, independent of `display:` → Task 2, default `true`, `false` opt-out for every mode including cards.
- ✅ No behavior change for existing `cards` fences → Task 2's tests assert cards output is unchanged when `seo` is unset; explicitly stated in Global Constraints.
- ✅ Regression safety net for `seo: false` → Task 2's parameterized test covering all five display modes.
- ✅ Reuse `core.js`, no duplicated filter/sort logic → Task 2 calls `resolvePages()` once, shared by both the cards and non-cards branches; called out explicitly in Global Constraints as a review point (no automated test needed for "did not duplicate logic" per the original request — it's structurally impossible to duplicate here since there's only one call site).
- ✅ No visible double-render / duplicate links for JS visitors → Task 3's `removeSeoScaffold()`, called at the top of every render function.
- ✅ No-JS/crawler visitors get real content → Task 1's `renderSeoListHtml` always emits real `<a href>` links; verified in Task 3 Step 3 via view-source/curl check.
- ✅ Docs updated → Task 4.
- Scope boundary (file-scope/`renderFilescope` staying runtime-only, `folder-preview` untouched) → stated in Global Constraints, not silently expanded anywhere in the tasks.

**Placeholder scan:** No "TBD"/"handle appropriately"/"similar to Task N" phrasing anywhere in the task steps — every step has literal, complete code or an exact shell command with expected output.

**Type/name consistency check:**
- `renderSeoListHtml(pages, { emptyLabel } = {})` — defined in Task 1, imported and called identically (`renderSeoListHtml(pages)`) in Task 2. Consistent.
- `data-collection-seo-list` — the exact attribute string appears identically in Task 1 (`render-card.js` implementation and its tests), Task 2 (transform tests), and Task 3 (`removeSeoScaffold`'s selector). Consistent.
- `removeSeoScaffold(container)` — defined once in Task 3, called with the same single-argument signature from all five render functions in that same task. Not referenced by name in any other task (Tasks 1/2 don't need to know about it). Consistent.
- `seoEnabled` (local variable in `index.js`) vs. the YAML setting key `seo` — kept intentionally distinct (JS variable vs. author-facing YAML key), documented in both the JSDoc comment and schema.md. No accidental renaming across the two.
