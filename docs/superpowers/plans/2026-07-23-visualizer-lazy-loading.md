# Site-Wide Visualizer Detection (Only Load What's Used) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop bundling every visualizer's CSS/JS into every site's build. Scan a site's actual content once per build, and write `visualizers.json` with only the visualizers that content actually uses — so `head.njk`/`scripts.njk` (unchanged — they already just loop over whatever `visualizers.json` contains) stop emitting `<link>`/`<script>` tags for things a site never references.

**Architecture:** A new pure function (`scripts/utils/detect-visualizers.js`) takes each visualizer's `manifest.json` `activation` metadata plus the site's raw markdown source files and a site's effective visualizer config, and returns the set of visualizer names actually in use. `scripts/bundle-visualizers.js` calls it after building the full manifest (as it does today) and filters the written `visualizers.json` down to that set — visualizers whose activation can't be statically determined (no `activation` metadata, or `method: "auto-detect"`) are always kept, so nothing already working today can silently break.

**Tech Stack:** Node.js (ESM), vitest, `gray-matter` (already a dependency) for frontmatter parsing, `glob` (already a dependency, used elsewhere in `tests/build/generate-background.test.js`) for fixture file discovery.

## Global Constraints

- Backwards compatible per CLAUDE.md's Multi-Site / Holistic Change Rule: a visualizer this can't confidently classify must stay **included**, never silently dropped. Every task that narrows the manifest must be provably safe under this rule (see Task 2's "no metadata → always included" test).
- Cross-platform: any new "run this script directly" entry point must use `isMainModule(import.meta.url)` from `scripts/utils/is-main.js` (CLAUDE.md rule; the naive `import.meta.url === file://${process.argv[1]}` form breaks on Windows — see TECH-DEBT #25).
- Site-wide granularity only (one filtered manifest per site build, same list on every page of that site). Per-page granularity, the `.bloob/visualizers.json` folder-config method, and true `auto-detect` (CSS-selector, needs a render pass) are explicitly **out of scope** — see "Deferred" section.
- Never hardcode a site name, visualizer name, or content path in `scripts/bundle-visualizers.js` or `scripts/utils/detect-visualizers.js` — both must work unchanged for every site (CLAUDE.md).
- Co-located visualizer tests live with the visualizer (`lib/visualizers/[name]/[name].test.js`); pipeline-utility tests go in `tests/` (CLAUDE.md "Code Quality Rules"). `detect-visualizers.js` is a pipeline utility → its test lives at `tests/utils/detect-visualizers.test.js`.

---

## Why this matters (motivating incident from this session)

`lib/visualizers/collection/styles.css` and `lib/visualizers/folder-preview/styles.css` both define identical, un-namespaced class names (`.fp-marble`, `.fp-bubble`, `.fp-marble__title`, `.fp-bubble__title`, `.fp-bubble__type`) — someone copy-pasted the marbles/bubbles rendering code from one visualizer into the other, with no shared source. Both files are **always loaded together on every page of every site today** (confirmed by curling a built melt page — both `<link>` tags were present, in alphabetical order: `collection.css` before `folder-preview.css`). Because they have equal CSS specificity, whichever loads *later* silently wins any disagreement — an accident of filename sort order, not a deliberate contract. We found and fixed a real bug this session where both files hardcoded `color: white` for bubble/marble title text (illegible on a light theme); we had to notice and fix two independent copies by hand, and the live page was — until we got lucky on load order — one alphabetical rename away from silently reverting to the broken color. If a page only loaded the *one* visualizer it actually uses, this class of bug becomes structurally impossible. That's what this plan buys.

## Relationship to the existing design doc

`docs/architecture/visualizers.md` → "Build Process Integration (Approach A - Chosen)" already specifies a *fuller* version of this (5 activation methods, per-page `active-visualizers.json`, folder-level `.bloob/visualizers.json` config) — dated 2026-03-19, marked "Chosen," **never implemented** (tracked as `docs/TECH-DEBT.md` item #4, "Per-page visualizer activation not implemented," still `⬜ Open`). This plan implements a pragmatic first slice of that design: **site-wide**, not per-page, and only the activation methods staticly detectable from markdown source + site config without a render pass (code fence, `:::` container, page frontmatter `visualizers:` list, file-scope `bloob-shape:` frontmatter, and global config). Task 7 updates TECH-DEBT #4's status to reflect partial completion — it does not close the item, since per-page granularity remains unbuilt.

---

## File Structure

- **Create** `scripts/utils/detect-visualizers.js` — pure detection logic, no filesystem access (caller reads files, passes strings in).
- **Create** `tests/utils/detect-visualizers.test.js` — unit tests for the pure logic.
- **Create** `tests/scripts/bundle-visualizers.test.js` — integration test against a real temp `SRC_DIR`, mirroring the fixture-temp-dir pattern already used in `tests/build/generate-background.test.js`.
- **Modify** `scripts/bundle-visualizers.js` — export a callable `bundleVisualizers({ srcDir, visualizersDir })` function (currently a bare top-level script with no exports, so it isn't independently testable); keep the CLI behavior via an `isMainModule` guard at the bottom.
- **Modify** `lib/visualizers/*/manifest.json` — standardize the `activation` field to one consistent shape (`{"method": "...", "trigger": "...", ...}` as an object — several manifests currently store `"activation": "container"` as a bare string with a separate top-level `"trigger"` key, which the detector can't parse uniformly), and add missing/inaccurate `activation` metadata (`folder-preview` has none today despite having a real code-fence trigger; `garden` has none despite having a real `:::` container trigger; `circular-nav`, `search`, `tags` are labelled `"auto-detect"` but their `index.js` `transform()` proves they actually have a real, staticly-detectable code-fence/container trigger).
- **Modify** `docs/architecture/visualizers.md` — new subsection under "Build Process Integration" documenting what's implemented vs. deferred.
- **Modify** `docs/TECH-DEBT.md` — update item #4's status.

---

### Task 1: Standardize and complete visualizer `activation` manifests

**Files:**
- Modify: `lib/visualizers/folder-preview/manifest.json`
- Modify: `lib/visualizers/garden/manifest.json`
- Modify: `lib/visualizers/circular-nav/manifest.json`
- Modify: `lib/visualizers/search/manifest.json`
- Modify: `lib/visualizers/tags/manifest.json`
- Modify: `lib/visualizers/quotes-stack/manifest.json`
- Modify: `lib/visualizers/fridge-magnets/manifest.json`
- Modify: `lib/visualizers/heading-and-paragraph/manifest.json`
- Modify: `lib/visualizers/image-grid/manifest.json`
- Modify: `lib/visualizers/image-text/manifest.json`
- Modify: `lib/visualizers/photo-grid/manifest.json`
- Modify: `lib/visualizers/services/manifest.json`
- Modify: `lib/visualizers/slideshow/manifest.json`
- Modify: `lib/visualizers/testimonials/manifest.json`
- Modify: `lib/visualizers/card-preview/manifest.json` (already object-shaped — verify only, no change expected)
- Modify: `lib/visualizers/scene-nav/manifest.json` (already object-shaped — verify only, no change expected)
- Test: `tests/utils/visualizer-manifests.test.js` (new — schema validation across every manifest, not tied to detect-visualizers.js itself)

**Interfaces:**
- Produces: the canonical `activation` shape every other task in this plan relies on:
  ```json
  { "activation": { "method": "code-fence" | "container" | "auto-detect" | "config" | "frontmatter", "trigger": "name-if-code-fence-or-container", "language": "alias-for-trigger-on-code-fence-only", "pattern": "css-selector-if-auto-detect", "key": "frontmatter-key-if-frontmatter" } }
  ```
  `trigger` and `language` are treated as synonyms by Task 2 (some existing manifests, e.g. `collection`, use `language` instead of `trigger` for code-fence — both are kept, not renamed, to avoid an unrelated diff).

- [ ] **Step 1: Write the failing schema test**

Create `tests/utils/visualizer-manifests.test.js`:

```js
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { glob } from "glob";

const ROOT = path.join(process.cwd());

describe("visualizer manifest activation schema", () => {
  it("every manifest.json with an activation field uses the object shape", async () => {
    const manifestPaths = await glob("lib/visualizers/*/manifest.json", { cwd: ROOT });
    const offenders = [];
    for (const rel of manifestPaths) {
      const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf-8"));
      if (manifest.activation === undefined) continue; // no activation metadata is valid (safe-fallback bucket)
      if (typeof manifest.activation !== "object" || manifest.activation === null || Array.isArray(manifest.activation)) {
        offenders.push(`${rel}: activation must be an object, got ${JSON.stringify(manifest.activation)}`);
        continue;
      }
      const validMethods = ["code-fence", "container", "auto-detect", "config", "frontmatter"];
      if (!validMethods.includes(manifest.activation.method)) {
        offenders.push(`${rel}: activation.method "${manifest.activation.method}" not in ${validMethods.join(", ")}`);
      }
      if (["code-fence", "container"].includes(manifest.activation.method)) {
        const hasTrigger = manifest.activation.trigger || manifest.activation.language;
        if (!hasTrigger) offenders.push(`${rel}: method "${manifest.activation.method}" requires trigger or language`);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("folder-preview declares a code-fence activation (has a real transform() fence trigger)", () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(ROOT, "lib/visualizers/folder-preview/manifest.json"), "utf-8")
    );
    expect(manifest.activation).toEqual({ method: "code-fence", trigger: "folder-preview" });
  });

  it("garden declares a container activation (renderFilescope reads a ::: garden fence)", () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(ROOT, "lib/visualizers/garden/manifest.json"), "utf-8")
    );
    expect(manifest.activation).toEqual({ method: "container", trigger: "garden" });
  });

  it("circular-nav, search, tags are reclassified as their real source-level trigger, not auto-detect", () => {
    const circularNav = JSON.parse(
      fs.readFileSync(path.join(ROOT, "lib/visualizers/circular-nav/manifest.json"), "utf-8")
    );
    expect(circularNav.activation.method).toBe("container");
    expect(circularNav.activation.trigger).toBe("circular-nav");

    const search = JSON.parse(
      fs.readFileSync(path.join(ROOT, "lib/visualizers/search/manifest.json"), "utf-8")
    );
    expect(search.activation.method).toBe("code-fence");
    expect(search.activation.trigger).toBe("search");

    const tags = JSON.parse(
      fs.readFileSync(path.join(ROOT, "lib/visualizers/tags/manifest.json"), "utf-8")
    );
    expect(tags.activation.method).toBe("code-fence");
    expect(tags.activation.trigger).toBe("tags");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/utils/visualizer-manifests.test.js`
Expected: FAIL — `folder-preview`/`garden` have no `activation` field; `circular-nav`/`search`/`tags` still say `"auto-detect"`; several manifests still use the bare-string `"activation": "container"` shape.

- [ ] **Step 3: Fix each manifest**

`lib/visualizers/folder-preview/manifest.json` — add activation (it currently has no `activation` key at all, only `filescope`):
```json
{
  "name": "folder-preview",
  "type": "hybrid",
  "filescope": true,
  "activation": { "method": "code-fence", "trigger": "folder-preview" },
  "defaultLayout": "layouts/folder-index.njk",
  "description": "Lists all pages in the current folder. Used in auto-generated and user-created folder index pages."
}
```

`lib/visualizers/garden/manifest.json` — add activation:
```json
{
  "name": "garden",
  "type": "hybrid",
  "filescope": true,
  "activation": { "method": "container", "trigger": "garden" },
  "chrome": "none",
  "defaultLayout": "layouts/garden.njk",
  "description": "A full-bleed, interactive garden canvas: place elements on a scene, give each a reflective page, and publish it as a self-contained site.",
  "authors": [
    {
      "name": "Odalys Benitez",
      "url": "https://odalysbenitez.com"
    }
  ],
  "builder": {
    "entry": "builder/dist/index.html",
    "source": "builder/",
    "description": "GUI author for the garden core format — reads and writes the ::: garden fence. Ships as a single self-contained file://-openable HTML file (vite-plugin-singlefile, Task 4)."
  }
}
```

`lib/visualizers/circular-nav/manifest.json` — change `activation.method` from `"auto-detect"` to `"container"`, `trigger` to `"circular-nav"` (its `index.js` `sectionPattern` regex proves the real trigger is a `::: circular-nav` container, not a post-render CSS pattern — the CSS pattern in the old manifest just described circular-nav's *output* marker, not its input). Read the file first, then replace only the `activation` block, keeping every other key unchanged.

`lib/visualizers/search/manifest.json` — change `activation.method` from `"auto-detect"` to `"code-fence"`, `trigger` to `"search"` (its `index.js` `codeBlockPattern` is `/<pre><code class="language-search">/`, i.e. a real ` ```search ` fence). Keep every other key (including `settings`) unchanged.

`lib/visualizers/tags/manifest.json` — change `activation.method` from `"auto-detect"` to `"code-fence"`, `trigger` to `"tags"` (same reasoning — `codeBlockPattern` is `/<pre><code class="language-tags">/`).

For each of `quotes-stack`, `fridge-magnets`, `heading-and-paragraph`, `image-grid`, `image-text`, `photo-grid`, `services`, `slideshow`, `testimonials`: these currently store `"activation": "container"` or `"activation": "code-fence"` as a **bare string**, with a separate top-level `"trigger"` key (e.g. `{"activation": "container", "trigger": "services", "description": "..."}`). Convert each to the object shape, folding the existing `trigger` value in and leaving `description` where it is:
```json
{ "activation": { "method": "container", "trigger": "services" }, "trigger": "services", "description": "..." }
```
Actually — don't leave the old top-level `"trigger"` key duplicated; delete it once folded into `activation.trigger`, so each manifest ends up:
```json
{ "activation": { "method": "container", "trigger": "services" }, "description": "Transforms a ::: services block into the theme's two-column services section. First ## heading = section title; first paragraph = description text; bullet list items = service entries with arrow icons." }
```
Apply the same fold (delete the old top-level `trigger`, nest it inside `activation`) for `quotes-stack` and `fridge-magnets` (method `"code-fence"` for both — verify against each `index.js`'s `codeBlockPattern` before editing, don't assume).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/utils/visualizer-manifests.test.js`
Expected: PASS (all assertions green).

- [ ] **Step 5: Run the full suite to confirm nothing else broke**

Run: `npx vitest run`
Expected: PASS — manifest.json content changes don't affect any existing visualizer's own `manifest.test.js`-style assertions (e.g. `collection.test.js`'s "has required fields" check only asserts `name`/`type`/`version`/`description` exist, not `activation`'s exact shape) — but confirm this by reading the output, don't assume.

- [ ] **Step 6: Commit**

```bash
git add lib/visualizers/*/manifest.json tests/utils/visualizer-manifests.test.js
git commit -m "chore(visualizers): standardize activation manifest schema, fix 3 mislabeled triggers"
```

---

### Task 2: `scripts/utils/detect-visualizers.js` — pure detection logic

**Files:**
- Create: `scripts/utils/detect-visualizers.js`
- Test: `tests/utils/detect-visualizers.test.js`

**Interfaces:**
- Consumes: nothing from earlier tasks except the standardized manifest shape from Task 1 (`{ name, activation?: { method, trigger?, language?, pattern?, key? }, filescope?: boolean }`).
- Produces (used by Task 3):
  ```js
  export function detectUsedVisualizers({ manifests, markdownSources, effectiveVisualizerConfig }) 
  // manifests: Array<{ name: string, activation?: object, filescope?: boolean }>
  // markdownSources: string[] — raw file contents (frontmatter + body), one per content file
  // effectiveVisualizerConfig: Record<string, unknown> — merged site config's `visualizers` map
  //   (e.g. { graph: true, latex: false } — truthy and not === false means "on for this site")
  // returns: Set<string> — visualizer names to KEEP in the manifest
  ```

- [ ] **Step 1: Write the failing tests**

Create `tests/utils/detect-visualizers.test.js`:

```js
import { describe, it, expect } from "vitest";
import { detectUsedVisualizers } from "../../scripts/utils/detect-visualizers.js";

const CODE_FENCE_MANIFEST = { name: "folder-preview", activation: { method: "code-fence", trigger: "folder-preview" }, filescope: true };
const CONTAINER_MANIFEST = { name: "scene-nav", activation: { method: "container", trigger: "scene-nav" } };
const CONFIG_MANIFEST = { name: "graph", activation: { method: "config" } };
const NO_ACTIVATION_MANIFEST = { name: "ken-burns-zoom" }; // no activation field at all
const AUTO_DETECT_MANIFEST = { name: "checkbox-tracker", activation: { method: "auto-detect", pattern: "input[type=checkbox]" } };

describe("detectUsedVisualizers", () => {
  it("keeps a code-fence visualizer when its fence appears in markdown source", () => {
    const md = "# Resources\n\n```folder-preview\nlayout: marbles\n```\n";
    const result = detectUsedVisualizers({
      manifests: [CODE_FENCE_MANIFEST],
      markdownSources: [md],
      effectiveVisualizerConfig: {},
    });
    expect(result.has("folder-preview")).toBe(true);
  });

  it("drops a code-fence visualizer when its fence never appears anywhere in the site", () => {
    const md = "# Home\n\nJust some text, no fences.\n";
    const result = detectUsedVisualizers({
      manifests: [CODE_FENCE_MANIFEST],
      markdownSources: [md],
      effectiveVisualizerConfig: {},
    });
    expect(result.has("folder-preview")).toBe(false);
  });

  it("keeps a code-fence visualizer when only the auto-stub's pre-rendered placeholder div is present (no literal fence)", () => {
    // scripts/preprocess-content.js Step 9.5 writes this raw HTML directly into stub index.md
    // files, bypassing the ```folder-preview fence entirely — the detector must catch this too.
    const md = '---\nbloob-shape: folder-preview\n---\n\n<div class="folder-preview-visualizer" data-pagefind-ignore data-fp-settings=\'{}\'></div>\n';
    const result = detectUsedVisualizers({
      manifests: [CODE_FENCE_MANIFEST],
      markdownSources: [md],
      effectiveVisualizerConfig: {},
    });
    expect(result.has("folder-preview")).toBe(true);
  });

  it("keeps a container visualizer when its ::: fence appears in markdown source", () => {
    const md = "::: scene-nav\naspectRatio: 16/9\n\n- [A bubble](image.png)\n:::\n";
    const result = detectUsedVisualizers({
      manifests: [CONTAINER_MANIFEST],
      markdownSources: [md],
      effectiveVisualizerConfig: {},
    });
    expect(result.has("scene-nav")).toBe(true);
  });

  it("drops a container visualizer when its ::: fence never appears anywhere in the site", () => {
    const md = "# Home\n\nJust some text.\n";
    const result = detectUsedVisualizers({
      manifests: [CONTAINER_MANIFEST],
      markdownSources: [md],
      effectiveVisualizerConfig: {},
    });
    expect(result.has("scene-nav")).toBe(false);
  });

  it("does not false-positive on a container trigger that is a prefix of another word", () => {
    // ::: scene-navigation should NOT match a "scene-nav" trigger
    const md = "::: scene-navigation-something-else\ncontent\n:::\n";
    const result = detectUsedVisualizers({
      manifests: [CONTAINER_MANIFEST],
      markdownSources: [md],
      effectiveVisualizerConfig: {},
    });
    expect(result.has("scene-nav")).toBe(false);
  });

  it("keeps a config-method visualizer when the site's effective visualizer config enables it", () => {
    const result = detectUsedVisualizers({
      manifests: [CONFIG_MANIFEST],
      markdownSources: ["# nothing relevant here"],
      effectiveVisualizerConfig: { graph: true },
    });
    expect(result.has("graph")).toBe(true);
  });

  it("drops a config-method visualizer when the site's effective visualizer config disables or omits it", () => {
    const resultOmitted = detectUsedVisualizers({
      manifests: [CONFIG_MANIFEST],
      markdownSources: ["# nothing relevant here"],
      effectiveVisualizerConfig: {},
    });
    expect(resultOmitted.has("graph")).toBe(false);

    const resultFalse = detectUsedVisualizers({
      manifests: [CONFIG_MANIFEST],
      markdownSources: ["# nothing relevant here"],
      effectiveVisualizerConfig: { graph: false },
    });
    expect(resultFalse.has("graph")).toBe(false);
  });

  it("always keeps a visualizer with no activation metadata (safe fallback)", () => {
    const result = detectUsedVisualizers({
      manifests: [NO_ACTIVATION_MANIFEST],
      markdownSources: ["# nothing relevant, no mention of ken-burns-zoom anywhere"],
      effectiveVisualizerConfig: {},
    });
    expect(result.has("ken-burns-zoom")).toBe(true);
  });

  it("always keeps an auto-detect-method visualizer (needs a render pass this function doesn't do)", () => {
    const result = detectUsedVisualizers({
      manifests: [AUTO_DETECT_MANIFEST],
      markdownSources: ["# nothing relevant, no checkboxes here"],
      effectiveVisualizerConfig: {},
    });
    expect(result.has("checkbox-tracker")).toBe(true);
  });

  it("keeps a filescope visualizer when a page declares it via bloob-shape frontmatter, even with no fence anywhere", () => {
    const md = "---\nbloob-shape: collection\ntitle: My Collection Page\n---\n\nSome body text with no fence at all.\n";
    const collectionManifest = { name: "collection", activation: { method: "code-fence", trigger: "collection" }, filescope: true };
    const result = detectUsedVisualizers({
      manifests: [collectionManifest],
      markdownSources: [md],
      effectiveVisualizerConfig: {},
    });
    expect(result.has("collection")).toBe(true);
  });

  it("scans across multiple source files, keeping a visualizer found in only one of them", () => {
    const result = detectUsedVisualizers({
      manifests: [CODE_FENCE_MANIFEST, CONTAINER_MANIFEST],
      markdownSources: [
        "# Home\n\n::: scene-nav\nstuff\n:::\n",
        "# Resources\n\n```folder-preview\n```\n",
        "# About\n\nplain page, no visualizers\n",
      ],
      effectiveVisualizerConfig: {},
    });
    expect(result.has("scene-nav")).toBe(true);
    expect(result.has("folder-preview")).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/utils/detect-visualizers.test.js`
Expected: FAIL with "Cannot find module '../../scripts/utils/detect-visualizers.js'" (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `scripts/utils/detect-visualizers.js`:

```js
/**
 * Pure detection logic for "which visualizers does this site's content actually use."
 * No filesystem access — callers read files and pass raw strings in.
 *
 * Supports 3 of the 5 activation methods documented in docs/architecture/visualizers.md's
 * "Activation Methods (with Precedence)" table — the ones staticly detectable from markdown
 * source + site config without a render pass:
 *   - code-fence  (```trigger ... ```)
 *   - container   (::: trigger ... :::)
 *   - config      (site-wide opt-in via theme.yaml visualizer_defaults / _bloob-settings.md)
 * Every filescope-capable manifest is also checked against each file's `bloob-shape:`
 * frontmatter, regardless of its activation method — a page can activate a filescope
 * visualizer with no fence at all (see docs/architecture/themes.md Object Identity System).
 *
 * "auto-detect" (CSS-selector, needs rendered HTML) and any manifest with no `activation`
 * field are NOT scanned — they are always kept. This is the safe fallback: a visualizer
 * this function can't confidently classify must never be silently dropped.
 */

import matter from "gray-matter";

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---/;

function extractFrontmatterShape(markdownSource) {
  // gray-matter throws on malformed YAML (e.g. a page with no frontmatter block at all,
  // or one using ``` inside the body before any real frontmatter) — never let a single
  // malformed file abort detection for the whole site.
  try {
    return matter(markdownSource).data || {};
  } catch {
    return {};
  }
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @param {string} trigger
 * @returns {RegExp} matches a ```trigger fence opener, word-bounded so "scene-nav" doesn't
 *   match "scene-navigation". Multiline, case-sensitive (fence triggers are lowercase-kebab
 *   by convention across every existing visualizer).
 */
function codeFenceRegex(trigger) {
  return new RegExp("^```\\s*" + escapeRegExp(trigger) + "\\b", "m");
}

/**
 * @param {string} trigger
 * @returns {RegExp} matches a ::: trigger container opener (space after ::: optional, per
 *   scripts/utils/inject-container-raw.js's own comment: "Accepts both :::name and ::: name").
 *   Word-bounded for the same prefix-collision reason as codeFenceRegex.
 */
function containerRegex(trigger) {
  return new RegExp("^:::\\s*" + escapeRegExp(trigger) + "\\b", "m");
}

/**
 * Checks whether a single visualizer manifest is used by a single markdown source file.
 * @param {object} manifest
 * @param {string} markdownSource
 * @param {object} frontmatter - pre-parsed frontmatter for this same source (avoid re-parsing)
 * @returns {boolean}
 */
function isUsedInSource(manifest, markdownSource, frontmatter) {
  // Filescope check applies regardless of activation method — a page can declare
  // `bloob-shape: <name>` with no fence in the body at all.
  if (manifest.filescope && frontmatter["bloob-shape"] === manifest.name) {
    return true;
  }

  const method = manifest.activation?.method;
  const trigger = manifest.activation?.trigger || manifest.activation?.language;

  if (method === "code-fence" && trigger) {
    if (codeFenceRegex(trigger).test(markdownSource)) return true;
    // Auto-stubbed folder indexes (preprocess-content.js Step 9.5) write the visualizer's
    // rendered placeholder div directly into the stub .md file, bypassing the fence entirely.
    if (markdownSource.includes(`class="${manifest.name}-visualizer"`)) return true;
    return false;
  }

  if (method === "container" && trigger) {
    return containerRegex(trigger).test(markdownSource);
  }

  return false;
}

/**
 * @param {{ manifests: object[], markdownSources: string[], effectiveVisualizerConfig: Record<string, unknown> }} args
 * @returns {Set<string>} visualizer names to keep loading for this site
 */
export function detectUsedVisualizers({ manifests, markdownSources, effectiveVisualizerConfig }) {
  const keep = new Set();

  // Pre-parse frontmatter once per source file, reused across every manifest's filescope check.
  const parsedSources = markdownSources.map((src) => ({
    raw: src,
    frontmatter: extractFrontmatterShape(src),
  }));

  for (const manifest of manifests) {
    const method = manifest.activation?.method;

    // Safe fallback: no activation metadata, or a method this function doesn't statically
    // resolve (auto-detect needs rendered HTML) — always keep.
    if (!method || method === "auto-detect") {
      keep.add(manifest.name);
      continue;
    }

    if (method === "config") {
      const configured = effectiveVisualizerConfig?.[manifest.name];
      if (configured !== undefined && configured !== false) keep.add(manifest.name);
      continue;
    }

    if (method === "code-fence" || method === "container") {
      const used = parsedSources.some(({ raw, frontmatter }) =>
        isUsedInSource(manifest, raw, frontmatter)
      );
      if (used) keep.add(manifest.name);
      continue;
    }

    // Any other declared method (e.g. "frontmatter", used today only by rss-feed's
    // bloob-shape check, which the filescope branch above already covers generically) —
    // safe fallback: keep.
    keep.add(manifest.name);
  }

  return keep;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/utils/detect-visualizers.test.js`
Expected: PASS — all 13 tests green.

- [ ] **Step 5: Commit**

```bash
git add scripts/utils/detect-visualizers.js tests/utils/detect-visualizers.test.js
git commit -m "feat(visualizers): add pure site-wide visualizer-detection logic"
```

---

### Task 3: Wire detection into `bundle-visualizers.js`

**Files:**
- Modify: `scripts/bundle-visualizers.js`
- Test: `tests/scripts/bundle-visualizers.test.js`

**Interfaces:**
- Consumes: `detectUsedVisualizers` from Task 2 (exact signature above); `loadSiteConfig` from `scripts/utils/config-loader.js` (existing — same function `preprocess-content.js` already uses to load a site's merged `theme.yaml` + `_bloob-settings.md` config); `isMainModule` from `scripts/utils/is-main.js` (existing).
- Produces: `bundleVisualizers({ srcDir, visualizersDir, siteConfig })` — an exported async function performing exactly what the current top-level script body does, PLUS the new filter step. Returns nothing (writes files as a side effect, same as today) but the test drives it directly instead of shelling out, so it can assert on the written `visualizers.json` content.

- [ ] **Step 1: Write the failing integration test**

Create `tests/scripts/bundle-visualizers.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs-extra";
import path from "path";
import os from "os";

let tmpRoot;
let visualizersDir;
let srcDir;

beforeAll(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "bundle-viz-"));
  visualizersDir = path.join(tmpRoot, "lib", "visualizers");
  srcDir = path.join(tmpRoot, "src");
  await fs.ensureDir(srcDir);

  // Fixture visualizer A: code-fence, actually used by the fixture content below.
  await fs.ensureDir(path.join(visualizersDir, "fixture-used"));
  await fs.writeJson(path.join(visualizersDir, "fixture-used", "manifest.json"), {
    name: "fixture-used",
    type: "hybrid",
    activation: { method: "code-fence", trigger: "fixture-used" },
  });
  await fs.writeFile(
    path.join(visualizersDir, "fixture-used", "styles.css"),
    ".fixture-used { color: red; }"
  );

  // Fixture visualizer B: code-fence, NOT referenced anywhere in the fixture content.
  await fs.ensureDir(path.join(visualizersDir, "fixture-unused"));
  await fs.writeJson(path.join(visualizersDir, "fixture-unused", "manifest.json"), {
    name: "fixture-unused",
    type: "hybrid",
    activation: { method: "code-fence", trigger: "fixture-unused" },
  });
  await fs.writeFile(
    path.join(visualizersDir, "fixture-unused", "styles.css"),
    ".fixture-unused { color: blue; }"
  );

  // Fixture visualizer C: no activation metadata — must always be kept (safe fallback).
  await fs.ensureDir(path.join(visualizersDir, "fixture-no-activation"));
  await fs.writeJson(path.join(visualizersDir, "fixture-no-activation", "manifest.json"), {
    name: "fixture-no-activation",
    type: "runtime",
  });
  await fs.writeFile(
    path.join(visualizersDir, "fixture-no-activation", "styles.css"),
    ".fixture-no-activation { color: green; }"
  );

  // Fixture content: only mentions fixture-used.
  await fs.writeFile(
    path.join(srcDir, "index.md"),
    "# Home\n\n```fixture-used\nsetting: 1\n```\n"
  );
});

afterAll(async () => {
  await fs.remove(tmpRoot);
});

describe("bundleVisualizers", () => {
  it("writes visualizers.json containing only detected + safe-fallback visualizers, excluding the genuinely unused one", async () => {
    const { bundleVisualizers } = await import("../../scripts/bundle-visualizers.js");
    await bundleVisualizers({ srcDir, visualizersDir, siteConfig: { visualizers: {} } });

    const manifestPath = path.join(srcDir, "_data", "visualizers.json");
    expect(fs.existsSync(manifestPath)).toBe(true);
    const written = await fs.readJson(manifestPath);
    const names = written.map((v) => v.name);

    expect(names).toContain("fixture-used");
    expect(names).toContain("fixture-no-activation");
    expect(names).not.toContain("fixture-unused");
  });

  it("still bundles CSS/JS assets to disk for every discovered visualizer, not just the kept ones", async () => {
    // Bundling (esbuild/copy) happens before filtering — filtering only trims the
    // written JSON manifest that templates loop over. This keeps the step idempotent
    // and cheap to re-run, and means a later detection fix doesn't require re-bundling.
    const cssOut = path.join(srcDir, "assets", "css", "visualizers", "fixture-unused.css");
    expect(fs.existsSync(cssOut)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/scripts/bundle-visualizers.test.js`
Expected: FAIL — `scripts/bundle-visualizers.js` has no exports today (`bundleVisualizers` is undefined), and even once imported, nothing filters `fixture-unused` out yet.

- [ ] **Step 3: Refactor `bundle-visualizers.js` into an exported function + filter step**

Read the full current file first (`scripts/bundle-visualizers.js`) — it's ~120 lines, entirely top-level script code with no function wrapper. Rewrite it to:

```js
/**
 * Bundle Visualizers
 *
 * Auto-discovers visualizer packages in lib/visualizers/ and:
 * 1. Bundles browser.js → src/assets/js/visualizers/<name>.js (via esbuild)
 * 2. Copies styles.css → src/assets/css/visualizers/<name>.css
 * 3. Copies engine.js → src/assets/js/visualizers/<name>.engine.js (plain copy, no bundle)
 *    engine.js is a self-contained IIFE shared by the visualizer and its paired magic machine.
 * 4. Bundles builder/index.js → src/assets/js/visualizers/<name>-builder.js (via esbuild),
 *    if present. This is a debug-only overlay bundle (e.g. scene-nav's admin builder) that
 *    browser.js lazy-loads via dynamic import() — it is intentionally NOT added to the
 *    manifest/visualizers.json, so normal visitors never fetch it.
 * 5. Scans the site's markdown source for which visualizers are actually used
 *    (scripts/utils/detect-visualizers.js) and writes ONLY those (plus any visualizer whose
 *    activation can't be statically determined — see detect-visualizers.js's safe fallback)
 *    to visualizers.json, so head.njk/scripts.njk stop emitting <link>/<script> tags for
 *    visualizers a site never references. Assets are still bundled to disk for every
 *    visualizer regardless (cheap, keeps this step idempotent) — only the written JSON
 *    manifest that templates loop over is filtered.
 *
 * Adding a new visualizer = adding a new folder in lib/visualizers/.
 * No changes to this script needed.
 */

import {
  readdirSync,
  existsSync,
  copyFileSync,
  cpSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
} from "fs";
import { join, dirname } from "path";
import { glob } from "glob";
import { build } from "esbuild";
import { isMainModule } from "./utils/is-main.js";
import { detectUsedVisualizers } from "./utils/detect-visualizers.js";
import { loadSiteConfig, resolveSiteName } from "./utils/config-loader.js";

const DEFAULT_VISUALIZERS_DIR = "lib/visualizers";

/**
 * @param {{ srcDir?: string, visualizersDir?: string, siteConfig?: object }} [options]
 *   srcDir: defaults to process.env.SRC_DIR || "src"
 *   visualizersDir: defaults to "lib/visualizers" — overridable so tests can point at a
 *     fixture directory instead of the repo's real lib/visualizers/
 *   siteConfig: defaults to loading the real site config via loadSiteConfig(process.env.SITE_NAME).
 *     Pass an explicit stub (e.g. { visualizers: {} }) in tests to avoid touching real content repos.
 */
export async function bundleVisualizers(options = {}) {
  const SRC = options.srcDir || process.env.SRC_DIR || "src";
  const VISUALIZERS_DIR = options.visualizersDir || DEFAULT_VISUALIZERS_DIR;
  const JS_OUT_DIR = `${SRC}/assets/js/visualizers`;
  const CSS_OUT_DIR = `${SRC}/assets/css/visualizers`;
  const DATA_OUT = `${SRC}/_data/visualizers.json`;

  mkdirSync(JS_OUT_DIR, { recursive: true });
  mkdirSync(CSS_OUT_DIR, { recursive: true });
  mkdirSync(dirname(DATA_OUT), { recursive: true });

  const visualizerDirs = readdirSync(VISUALIZERS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  console.log(
    `\n[bundle] Found ${visualizerDirs.length} visualizer(s): ${visualizerDirs.join(", ")}`,
  );

  const manifest = [];
  const rawManifests = [];

  for (const name of visualizerDirs) {
    const dir = join(VISUALIZERS_DIR, name);
    const browserEntry = join(dir, "browser.js");
    const stylesFile   = join(dir, "styles.css");
    const engineFile   = join(dir, "engine.js");
    const manifestFile = join(dir, "manifest.json");
    const entry = { name, hasJs: false, hasCss: false, hasEngine: false };

    if (existsSync(browserEntry)) {
      await build({
        entryPoints: [browserEntry],
        bundle: true,
        outfile: join(JS_OUT_DIR, `${name}.js`),
        format: "iife",
        minify: process.env.NODE_ENV === "production",
        sourcemap: process.env.NODE_ENV !== "production",
      });
      entry.hasJs = true;
      console.log(`[bundle] ${name}: browser.js → ${JS_OUT_DIR}/${name}.js`);
    }

    const builderEntry = join(dir, "builder", "index.js");
    if (existsSync(builderEntry)) {
      await build({
        entryPoints: [builderEntry],
        bundle: true,
        outfile: join(JS_OUT_DIR, `${name}-builder.js`),
        format: "esm",
        minify: process.env.NODE_ENV === "production",
        sourcemap: process.env.NODE_ENV !== "production",
      });
      console.log(`[bundle] ${name}: builder/index.js → ${JS_OUT_DIR}/${name}-builder.js`);
    }

    if (existsSync(stylesFile)) {
      copyFileSync(stylesFile, join(CSS_OUT_DIR, `${name}.css`));
      entry.hasCss = true;
      console.log(`[bundle] ${name}: styles.css → ${CSS_OUT_DIR}/${name}.css`);
    }

    if (existsSync(engineFile)) {
      copyFileSync(engineFile, join(JS_OUT_DIR, `${name}.engine.js`));
      entry.hasEngine = true;
      console.log(`[bundle] ${name}: engine.js → ${JS_OUT_DIR}/${name}.engine.js`);
    }

    const assetsDir = join(dir, "assets");
    if (existsSync(assetsDir)) {
      const assetsOut = join(SRC, "assets", "visualizers", name);
      cpSync(assetsDir, assetsOut, { recursive: true, dereference: true });
      entry.hasAssets = true;
      console.log(`[bundle] ${name}: assets/ → ${assetsOut}`);
    }

    manifest.push(entry);
    rawManifests.push(
      existsSync(manifestFile)
        ? JSON.parse(readFileSync(manifestFile, "utf-8"))
        : { name } // no manifest.json → detectUsedVisualizers' safe fallback keeps it
    );
  }

  // Site-wide detection: scan every processed markdown file for which visualizers are
  // actually referenced, and load the site's effective visualizer config (theme.yaml
  // visualizer_defaults merged with _bloob-settings.md `visualizers:`, same merge
  // scripts/utils/bloob-settings-reader.js already produces for other pipeline steps).
  const siteConfig = options.siteConfig || (await loadSiteConfig(resolveSiteName()));
  const markdownPaths = await glob(`${SRC}/**/*.md`, { ignore: [`${SRC}/node_modules/**`] });
  const markdownSources = markdownPaths.map((p) => readFileSync(p, "utf-8"));

  const keep = detectUsedVisualizers({
    manifests: rawManifests,
    markdownSources,
    effectiveVisualizerConfig: siteConfig?.visualizers || {},
  });

  const filteredManifest = manifest.filter((entry) => keep.has(entry.name));
  console.log(
    `[bundle] Detection kept ${filteredManifest.length}/${manifest.length} visualizer(s) for this site's visualizers.json`,
  );

  writeFileSync(DATA_OUT, JSON.stringify(filteredManifest, null, 2));
  console.log(`[bundle] Wrote ${DATA_OUT} (${filteredManifest.length} visualizer(s))`);

  console.log("[bundle] Done.\n");
}

if (isMainModule(import.meta.url)) {
  bundleVisualizers().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
```

Note the call sites in `scripts/dev-local.js` and `scripts/build-site.js` (`execSync("node scripts/bundle-visualizers.js", ...)`) need **no changes** — running the file directly still works via the `isMainModule` guard, and `SITE_NAME`/`SRC_DIR` are already inherited from `process.env` exactly as before (confirmed: both callers set them earlier in `process.env` and let `execSync` inherit by default).

Check `scripts/utils/config-loader.js` for the exact exported name and signature of the site-name resolver before writing the import — the file structure above assumes `resolveSiteName()` reads `process.env.SITE_NAME` internally (matching the pattern `eleventy.config.js` already uses via `loadSiteConfig`/`resolveSiteName` imports), but confirm the real signature (it may require an argument) and adjust the `loadSiteConfig(resolveSiteName())` call accordingly.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/scripts/bundle-visualizers.test.js`
Expected: PASS — both assertions green (`fixture-unused` excluded from `visualizers.json`, but its CSS still landed on disk).

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS. Pay particular attention to any test that shells out to `bundle-visualizers.js` or asserts on `_data/visualizers.json` content for a real site — none are known to exist today (confirmed via `grep -rn "bundle-visualizers" tests/` before writing this plan turned up nothing), but re-verify before assuming.

- [ ] **Step 6: Manual verification against a real site build**

Run: `node scripts/dev-local.js --site=melt --content=../melt-website` (or your platform's equivalent — see CLAUDE.md's dev-server rule: stop any already-running dev server first).

Check: `curl -s http://localhost:8080/Resources/ | grep -c "visualizers/collection.css\|visualizers/folder-preview.css"` should now print `1`, not `2` — melt's Resources page uses `folder-preview` (code-fence, detected), not `collection` (unused site-wide) — confirming the exact incident from this session's motivating bug is now structurally prevented for melt. Also spot-check the homepage still renders (scene-nav, search, folder-preview all still present) and no console errors appear for a missing CSS/JS asset.

- [ ] **Step 7: Commit**

```bash
git add scripts/bundle-visualizers.js tests/scripts/bundle-visualizers.test.js
git commit -m "feat(visualizers): filter visualizers.json to only site-detected visualizers"
```

---

### Task 4: Regression coverage for every activation style found in real content

**Files:**
- Modify: `tests/utils/detect-visualizers.test.js`

**Interfaces:**
- Consumes: `detectUsedVisualizers` (Task 2, unchanged signature).
- Produces: nothing new — this task only adds fixture-driven cases mirroring real manifests, so a future edit to a real visualizer's `activation` field gets caught by CI even though Task 2's tests used synthetic fixtures.

- [ ] **Step 1: Write the failing tests**

Append to `tests/utils/detect-visualizers.test.js`:

```js
import fs from "fs";
import path from "path";

function loadRealManifest(name) {
  return JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "lib", "visualizers", name, "manifest.json"), "utf-8")
  );
}

describe("detectUsedVisualizers against real manifests (post Task 1 standardization)", () => {
  it("detects folder-preview via its real code-fence trigger", () => {
    const manifest = loadRealManifest("folder-preview");
    const result = detectUsedVisualizers({
      manifests: [manifest],
      markdownSources: ["```folder-preview\nlayout: marbles\n```\n"],
      effectiveVisualizerConfig: {},
    });
    expect(result.has("folder-preview")).toBe(true);
  });

  it("detects scene-nav via its real ::: container trigger", () => {
    const manifest = loadRealManifest("scene-nav");
    const result = detectUsedVisualizers({
      manifests: [manifest],
      markdownSources: ["::: scene-nav\naspectRatio: 16/9\n:::\n"],
      effectiveVisualizerConfig: {},
    });
    expect(result.has("scene-nav")).toBe(true);
  });

  it("detects garden via its real ::: container trigger", () => {
    const manifest = loadRealManifest("garden");
    const result = detectUsedVisualizers({
      manifests: [manifest],
      markdownSources: ["::: garden\nsomething\n:::\n"],
      effectiveVisualizerConfig: {},
    });
    expect(result.has("garden")).toBe(true);
  });

  it("keeps citations always on (auto-detect method, deferred — see docs/TECH-DEBT.md)", () => {
    const manifest = loadRealManifest("citations");
    const result = detectUsedVisualizers({
      manifests: [manifest],
      markdownSources: ["# A page with no footnotes at all"],
      effectiveVisualizerConfig: {},
    });
    expect(result.has("citations")).toBe(true);
  });

  it("keeps checkbox-tracker always on (auto-detect method, deferred)", () => {
    const manifest = loadRealManifest("checkbox-tracker");
    const result = detectUsedVisualizers({
      manifests: [manifest],
      markdownSources: ["# A page with no checkboxes at all"],
      effectiveVisualizerConfig: {},
    });
    expect(result.has("checkbox-tracker")).toBe(true);
  });

  it("drops graph site-wide when a site's config doesn't enable it, keeps it when a site's config does", () => {
    const manifest = loadRealManifest("graph");
    const off = detectUsedVisualizers({
      manifests: [manifest],
      markdownSources: ["# irrelevant"],
      effectiveVisualizerConfig: {},
    });
    expect(off.has("graph")).toBe(false);

    const on = detectUsedVisualizers({
      manifests: [manifest],
      markdownSources: ["# irrelevant"],
      effectiveVisualizerConfig: { graph: true },
    });
    expect(on.has("graph")).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify current state**

Run: `npx vitest run tests/utils/detect-visualizers.test.js`
Expected: PASS if Task 1 and Task 2 are already complete and committed (this task is pure regression coverage, no new production code) — if anything fails, it means Task 1's manifest edits don't match what this task assumes; fix the manifest, not the test, unless the test's assumption about the manifest's intended shape was wrong.

- [ ] **Step 3: Commit**

```bash
git add tests/utils/detect-visualizers.test.js
git commit -m "test(visualizers): regression coverage against real manifests for every activation style"
```

---

### Task 5: Docs — `docs/architecture/visualizers.md`

**Files:**
- Modify: `docs/architecture/visualizers.md`

- [ ] **Step 1: Add an implementation-status subsection**

Insert a new subsection immediately after "## Build Process Integration (Approach A - Chosen)" (currently ending around line 673, before "## Site-Wide Visualizers (Webapp Feature)"):

```markdown
### Implemented slice (2026-07-23): site-wide detection

Steps 1–4 and 8 of the "Approach A" list above are implemented for **3 of the 5** activation
methods — `code-fence`, `container`, and `config` — plus a filescope `bloob-shape:` frontmatter
check that applies regardless of a manifest's declared method. See
`scripts/utils/detect-visualizers.js` (pure detection logic) and `scripts/bundle-visualizers.js`
(wires it in — writes a filtered `visualizers.json` per site build).

**What's NOT implemented yet** (tracked in `docs/TECH-DEBT.md` #4):
- **Per-page granularity.** Detection is site-wide — one filtered `visualizers.json` per
  site build, same list on every page of that site. A site using `folder-preview` on ONE
  page still loads `folder-preview.css`/`.js` on every other page of that site.
- **Page frontmatter `visualizers:` list** (precedence 2 in the table above) — spec'd, not
  implemented; no known content currently uses this form.
- **Folder config** (`.bloob/visualizers.json`, precedence 3) — spec'd, not implemented; no
  `.bloob/` directory convention exists anywhere in the codebase yet.
- **True auto-detection** (precedence 4, CSS-selector `pattern` in the manifest) — needs a
  rendered-HTML pass; `bundle-visualizers.js` runs before Eleventy renders anything (see Build
  Pipeline Architecture in CLAUDE.md: preprocess → assemble → **bundle visualizers** → Eleventy),
  so pattern-based detection isn't reachable from where filtering currently happens. Visualizers
  using this method (`checkbox-tracker`, `citations`, `page-preview`) are always kept — see the
  "safe fallback" behavior in `detect-visualizers.js`.
```

- [ ] **Step 2: Commit**

```bash
git add docs/architecture/visualizers.md
git commit -m "docs(visualizers): document the implemented site-wide detection slice"
```

---

### Task 6: Docs — `docs/TECH-DEBT.md`

**Files:**
- Modify: `docs/TECH-DEBT.md`

- [ ] **Step 1: Update item #4's status**

Read the current row first (it's `| 4 | Per-page visualizer activation not implemented | Medium | All viz load everywhere | Before adding more viz | ⬜ Open |`) and replace the Status cell:

```
| 4 | Per-page visualizer activation not implemented | Medium | All viz load everywhere | Before adding more viz | 🟡 Partial — site-wide detection done 2026-07-23 (code-fence/container/config methods + filescope frontmatter); per-page granularity, folder config, and true auto-detection still open — see docs/architecture/visualizers.md "Implemented slice" |
```

- [ ] **Step 2: Commit**

```bash
git add docs/TECH-DEBT.md
git commit -m "docs(tech-debt): mark #4 partially resolved, note what's still open"
```

---

## Deferred (explicitly out of scope for this plan)

- **Per-page granularity.** Would require hooking Eleventy's per-page data cascade (e.g. an `eleventyComputed` value per page listing its detected visualizers, consumed by `head.njk`/`scripts.njk` instead of the flat site-wide `visualizers` array) — meaningfully more invasive than this plan's single filtered-manifest-per-build approach. Revisit once site-wide detection has shipped and proven itself; the incremental win (a page using neither `collection` nor `folder-preview` currently still gets neither, thanks to this plan — per-page would only additionally help a *mixed* site where different pages use different visualizers).
- **Folder config (`.bloob/visualizers.json`).** No current consumer, no existing convention for the `.bloob/` directory anywhere in the codebase. Build if/when a real use case appears (Rule of Three, per CLAUDE.md's Development Principles).
- **True auto-detection (rendered-HTML pattern matching).** Would require either a two-pass Eleventy build (render once to detect, filter, render again — real complexity and build-time cost) or moving detection to run as a late Eleventy transform instead of a pre-Eleventy bundling step (but `<link>`/`<script>` tags are emitted in `<head>`/before `</body>`, rendered on the FIRST pass through `head.njk`/`scripts.njk` — by the time a transform could inspect a page's final body HTML, the head's already been emitted, so this needs either a second full pass or restructuring how asset tags are emitted, e.g. deferring them to a post-render injection step). Affects `checkbox-tracker`, `citations`, `page-preview`, `circular-nav`'s CSS-marker fallback (though circular-nav is now reclassified to `container` in Task 1, so it no longer needs this).
- **Reclassifying `checkbox-tracker` and `citations` to a statically-detectable method.** Both technically *could* be — checkbox-tracker's real source trigger is `- [ ]`/`- [x]` task-list markdown, citations' is `[^...]` footnote markdown — but that requires inventing a 6th activation method-shape (something like `"method": "markdown-pattern", "sourcePattern": "..."`) not in the existing 5-method spec in `docs/architecture/visualizers.md`. Worth a follow-up if these two turn out to matter for bundle size in practice; skipped here to keep this plan's scope to methods the existing spec already names.

## Self-Review

**Spec coverage:** Every constraint in "Global Constraints" has a corresponding task — backwards compatibility is enforced by Task 2's safe-fallback tests and Task 3's "still bundles CSS/JS for every visualizer" test; `isMainModule` is used in Task 3's rewrite; site-wide (not per-page) scope is enforced by design (Task 3 writes one manifest per `bundleVisualizers()` call, no per-page hook added) and stated explicitly in the Deferred section; no hardcoded site/visualizer names appear in either new file; test locations follow the `tests/utils/` (pipeline utility) convention from CLAUDE.md.

**Placeholder scan:** No TBD/TODO/"add appropriate handling" phrases anywhere in the task steps above — every step has complete, runnable code or an exact command with expected output.

**Type/name consistency:** `detectUsedVisualizers({ manifests, markdownSources, effectiveVisualizerConfig })` is defined once in Task 2 and used with the identical parameter names in Task 3's `bundleVisualizers()`, Task 3's test, and Task 4's regression tests. `bundleVisualizers({ srcDir, visualizersDir, siteConfig })` is defined once in Task 3 and referenced with the same names in Task 3's test. Manifest shape (`{ name, activation?: { method, trigger?, language?, pattern?, key? }, filescope? }`) is introduced in Task 1 and consumed identically in Tasks 2–4.
