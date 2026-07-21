# Scene-Nav v2 + MELT Background — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the site background-image pipeline, the scene-nav v2 nested-bullet grammar (replacing the YAML code fence), and the scene-nav builder (debug overlay consolidating the magic machine), per the approved spec `docs/implementation-plans/2026-07-20_scene-nav-shape-v2-and-melt-background.md`.

**Architecture:** Background step mirrors `generate-favicons.js` (sharp + hash cache → `site.backgroundImage`). Scene-nav v2 keeps the **existing normalized scene-data model** as parser output (aspectRatio/edgeFade/backgrounds/elements/mobile with action+value) — only the *input grammar* changes, so `renderer.js`/`browser.js` need small diffs. Activation moves from code fence to `:::` container via the standard `data-vis-raw` pattern (copy circular-nav's transform shape). Builder is a separate esbuild bundle lazy-imported by `browser.js` when `debug: on`.

**Tech Stack:** Node ESM, sharp, esbuild (via existing `bundle-visualizers.js`), vitest, Eleventy 3, headless Chrome for verification.

## Global Constraints

- Cross-platform: no inline `VAR=x node` in package.json; `path.join` everywhere; `isMainModule(import.meta.url)` from `scripts/utils/is-main.js` for direct-run guards.
- Shared-infrastructure rule: every pipeline change must be backwards compatible — new behavior activates only when a site opts in (`background_image` key present; `:::scene-nav` block present).
- No hardcoded site names/paths in shared scripts.
- Visualizer purity: `parser.js`/`renderer.js` are pure functions (no DOM, no fs).
- CSS: token variables only in shape/visualizer stylesheets; builder styles use a `snb-` class prefix.
- Dev server must be stopped before edits, restarted after.
- Build-time metric: watch build output; investigate if > 30s.
- Grammar refinement vs spec (flag to Leon in readout): per-element mobile overrides use **nested bullets** (`- mobile:` with deeper bullets), not the `·`-separated compact line — consistency, and `·` is hard to type.

---

### Task 1: Background image build step (shared)

**Files:**
- Create: `scripts/generate-background.js`
- Create: `tests/build/generate-background.test.js`
- Modify: `scripts/assemble-src.js` (call step + `site.backgroundImage` in generated site.js)

**Interfaces:**
- Produces: `generateBackground({ config, srcDir })` → writes `srcDir/media/optimized/site-background.webp`, returns URL string `"/media/optimized/site-background.webp"` or `null` when no `background_image` configured. `assemble-src.js` exposes it as `site.backgroundImage` (string|null) in `_data/site.js`. Cache file: `srcDir/.background-hash` (md5 of source bytes).

- [ ] **Step 1: Write the failing test**

```js
// tests/build/generate-background.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import sharp from 'sharp';

let tmpSrc;

beforeAll(async () => {
  tmpSrc = await fs.mkdtemp(path.join(os.tmpdir(), 'gen-bg-'));
  await fs.ensureDir(path.join(tmpSrc, 'media'));
  // real 2400×2400 png so the resize path actually runs
  await sharp({ create: { width: 2400, height: 2400, channels: 3, background: '#88cc88' } })
    .png().toFile(path.join(tmpSrc, 'media', 'MELT background.png.jpg'));
});
afterAll(async () => { await fs.remove(tmpSrc); });

describe('generateBackground', () => {
  it('resolves wiki-link value, writes 1920px webp, returns URL', async () => {
    const { generateBackground } = await import('../../scripts/generate-background.js');
    const config = { site: { background_image: '[[MELT background.png.jpg]]' } };
    const url = await generateBackground({ config, srcDir: tmpSrc });
    expect(url).toBe('/media/optimized/site-background.webp');
    const out = path.join(tmpSrc, 'media', 'optimized', 'site-background.webp');
    expect(fs.existsSync(out)).toBe(true);
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(1920);
    expect(meta.format).toBe('webp');
    expect(fs.existsSync(path.join(tmpSrc, '.background-hash'))).toBe(true);
  });

  it('returns null and writes nothing when background_image is not set', async () => {
    const { generateBackground } = await import('../../scripts/generate-background.js');
    const url = await generateBackground({ config: { site: {} }, srcDir: tmpSrc });
    expect(url).toBeNull();
  });

  it('skips sharp when hash matches (cache hit leaves mtime unchanged)', async () => {
    const { generateBackground } = await import('../../scripts/generate-background.js');
    const config = { site: { background_image: '[[MELT background.png.jpg]]' } };
    await generateBackground({ config, srcDir: tmpSrc });
    const out = path.join(tmpSrc, 'media', 'optimized', 'site-background.webp');
    const mtime1 = (await fs.stat(out)).mtimeMs;
    await generateBackground({ config, srcDir: tmpSrc });
    const mtime2 = (await fs.stat(out)).mtimeMs;
    expect(mtime2).toBe(mtime1);
  });

  it('md-link value with alt text also resolves', async () => {
    const { generateBackground } = await import('../../scripts/generate-background.js');
    const config = { site: { background_image: '[a watercolor wash](MELT background.png.jpg)' } };
    const url = await generateBackground({ config, srcDir: tmpSrc });
    expect(url).toBe('/media/optimized/site-background.webp');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/build/generate-background.test.js`
Expected: FAIL — `Cannot find module '../../scripts/generate-background.js'`

- [ ] **Step 3: Implement `scripts/generate-background.js`**

Follow `scripts/generate-favicons.js` for the hash-cache pattern and its `resolveLogoValue`-style resolution (wiki-link → glob `**/${filename}`, md-link → path, decode for disk). Key structure:

```js
// scripts/generate-background.js
// Generates an optimized site background image from `background_image` in _bloob-settings.md.
// Mirrors generate-favicons.js: hash-cached, runs inside assemble-src after preprocessing.
import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { glob } from "glob";

const OUT_REL = path.join("media", "optimized", "site-background.webp");
const OUT_URL = "/media/optimized/site-background.webp";
const HASH_FILE = ".background-hash";
const MAX_WIDTH = 1920;
const QUALITY = 80;

/** Resolve [[wiki]], [alt](path), or plain path to an absolute file under srcDir, or null. */
async function resolveSourceFile(value, srcDir) {
  if (!value) return null;
  const s = String(value).trim();
  const wiki = s.match(/^\[\[(.+?)\]\]$/);
  const md = s.match(/^\[.*?\]\((.+?)\)$/);
  let rel = wiki ? wiki[1] : md ? decodeURIComponent(md[1]) : s;
  const direct = path.join(srcDir, rel);
  if (await fs.pathExists(direct)) return direct;
  const matches = await glob(`**/${rel}`, {
    cwd: srcDir, nodir: true,
    ignore: ["_includes/**", "_data/**", "assets/**", "og/**", "media/optimized/**"],
  });
  return matches.length ? path.join(srcDir, matches[0]) : null;
}

export async function generateBackground({ config, srcDir }) {
  const value = config.site?.background_image;
  if (!value) return null;
  const srcFile = await resolveSourceFile(value, srcDir);
  if (!srcFile) {
    console.warn(`[background] background_image not found in src/: ${value}`);
    return null;
  }
  const outFile = path.join(srcDir, OUT_REL);
  const hashFile = path.join(srcDir, HASH_FILE);
  const hash = crypto.createHash("md5").update(await fs.readFile(srcFile)).digest("hex");
  const prev = (await fs.pathExists(hashFile)) ? (await fs.readFile(hashFile, "utf-8")).trim() : null;
  if (prev === hash && (await fs.pathExists(outFile))) return OUT_URL; // cache hit
  await fs.ensureDir(path.dirname(outFile));
  await sharp(srcFile).resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY }).toFile(outFile);
  await fs.writeFile(hashFile, hash);
  console.log(`[background] Wrote ${OUT_REL}`);
  return OUT_URL;
}
```

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run tests/build/generate-background.test.js` → PASS (4 tests)

- [ ] **Step 5: Wire into `assemble-src.js`**

In `generateSiteData` (near the `logoUrl` lines):

```js
import { generateBackground } from "./generate-background.js";
// inside generateSiteData, after logoAlt:
const backgroundImage = await generateBackground({ config, srcDir: SRC_DIR });
// in the siteJs template, after logoAlt line:
//   backgroundImage: ${JSON.stringify(backgroundImage)},
```

- [ ] **Step 6: Full suite** — `npm test` → all pass. Then commit:

```bash
git add scripts/generate-background.js tests/build/generate-background.test.js scripts/assemble-src.js
git commit -m "feat(pipeline): background_image setting → optimized site background (site.backgroundImage)"
```

---

### Task 2: Melt theme renders the background

**Files:**
- Modify: `themes/melt/layouts/base.njk` (emit the fixed background element)
- Modify: `themes/melt/assets/css/main.css`

**Interfaces:**
- Consumes: `site.backgroundImage` (string|null) from Task 1.

- [ ] **Step 1: Add the background element to `base.njk`** — first child of `<body>`:

```njk
{% if site.backgroundImage %}
<div class="site-background" aria-hidden="true" style="background-image:url('{{ site.backgroundImage }}')"></div>
{% endif %}
```

- [ ] **Step 2: CSS in `main.css`** (keep the existing gradient as fallback when no image):

```css
/* Fixed full-bleed site background — a fixed element, NOT background-attachment:fixed
   (that property is broken on iOS Safari). Sits behind everything. */
.site-background {
  position: fixed;
  inset: 0;
  z-index: -1;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
```

- [ ] **Step 3: Verify on localhost** — `npm run dev:melt`, headless Chrome screenshot of `/` (desktop 1114×928 and mobile 390×844 via `--window-size`): background photo visible, content scrolls over it, no horizontal scrollbar. Kill server after.
- [ ] **Step 4: Blend-mode experiment (time-boxed)** — try `mix-blend-mode: soft-light` / `multiply` on `.home-tagline` and nav bubbles; screenshot each; keep only what clearly improves legibility, else revert. This is a taste call — leave a `/* blend-mode candidates: ... */` comment for Leon either way.
- [ ] **Step 5: Commit**

```bash
git add themes/melt/layouts/base.njk themes/melt/assets/css/main.css
git commit -m "feat(melt): fixed full-bleed site background from site.backgroundImage"
```

---

### Task 3: Scene-nav v2 parser (TDD — the core)

**Files:**
- Rewrite: `lib/visualizers/scene-nav/parser.js`
- Rewrite: `lib/visualizers/scene-nav/scene-nav.test.js` (parser portion)

**Interfaces:**
- Produces: `parse(rawText)` → **unchanged output model**: `{ aspectRatio, edgeFade, backgrounds:[{image, alt, x, y, scale, rotation, mobileOverride}], elements:[{type, image, alt, x, y, scale, rotation, resetRotationOnHover, label, glow, glowIntensity, action, value, flipH, flipV, onlyShowOn, mobileOverride}], mobile:{breakpoint, aspectRatio, backgrounds}|null, debug:boolean }`. New vs old model: `alt` (string|null) on elements+backgrounds; `debug` flag. `action`/`value` are **derived from `goto:`/`filter:`** at parse time. Also export `serializeBlock(sceneData)` — Task 9 depends on it (inverse of parse; returns `::: scene-nav\n...\n:::` text).
- js-yaml dependency is dropped from this file.

**Grammar (locked):**

```
::: scene-nav
aspectRatio: 16/9            ← header lines: key: value until first top-level bullet
edgeFade: 0.05
mobile: breakpoint 768, aspectRatio 9/16
debug: on

- [alt text](image.png)      ← top-level bullet (no leading whitespace) = element
	- background               ← bare flag: this element is a background layer
	- at: 45.8, -3.6           ← x, y percentages
	- scale: 18
	- rotation: 36
	- glow: #00E5FF
	- glowIntensity: 1.5
	- label: hover text        ← default = md-link alt text
	- goto: [x](page.md)       ← or https://… or #anchor-id → action/value derived
	- filter: character:bloob  ← optional; action=filter
	- onlyShowOn: mobile
	- flipH / flipV            ← bare flags
	- mobile:                  ← nested bullets, one more level deep
		- at: 58, 10.3
		- scale: 29.5
:::
```

Parsing rules: element bullets match `/^-\s+/`; ANY line matching `/^\s+-\s+/` (tabs or spaces, any depth) is a property of the current element; a property line indented deeper than the previous `mobile:` property belongs to the mobile override (track the indent length of the `mobile:` line — never assume tab width). Image ref forms: `[alt](path)` → `{image: decodeURIComponent(path), alt}` (empty alt → null); `[[path]]` → `{image: path, alt: null}`; bare string → `{image: line, alt: null}`. `goto:` derivation: value starting `#` → `action:"anchor", value` without `#`; md-link `[x](url)` → `action:"link", value:url`; bare URL/path → `action:"link"`. No `goto`/`filter` → `action:"link", value:null` (inert; browser.js ignores empty). Unparseable block → `console.warn("[scene-nav] v2 grammar parse error: …")` + return empty scene (`{aspectRatio:null, edgeFade:0, backgrounds:[], elements:[], mobile:null, debug:false}`).

- [ ] **Step 1: Write the failing tests** (replace the old parser tests in `scene-nav.test.js`; keep any manifest/renderer tests):

```js
import { describe, it, expect } from 'vitest';
import { parse, serializeBlock } from './parser.js';

const FULL = `aspectRatio: 16/9
edgeFade: 0.05
mobile: breakpoint 768, aspectRatio 9/16
debug: on

- [A watercolor beach](../media/bg-beach.png)
\t- background
\t- at: 25.1, 30
\t- scale: 75
- [Resources — a glowing bubble](Resources.png)
\t- at: 45.8, -3.6
\t- scale: 18
\t- rotation: 36
\t- glow: #00E5FF
\t- glowIntensity: 1.5
\t- goto: [Resources](/resources/)
\t- mobile:
\t\t- at: 58, 10.3
\t\t- scale: 29.5
- [[Sign up bubble.png]]
    - at: 33.3, 25.3
    - goto: #signup
- [Shop item](shop.png)
\t- filter: character:bloob
`;

describe('scene-nav v2 parser', () => {
  it('parses header settings incl. compact mobile and debug', () => {
    const d = parse(FULL);
    expect(d.aspectRatio).toBe('16/9');
    expect(d.edgeFade).toBeCloseTo(0.05);
    expect(d.mobile).toEqual(expect.objectContaining({ breakpoint: 768, aspectRatio: '9/16' }));
    expect(d.debug).toBe(true);
  });
  it('background flag element lands in backgrounds with alt', () => {
    const d = parse(FULL);
    expect(d.backgrounds).toHaveLength(1);
    expect(d.backgrounds[0]).toEqual(expect.objectContaining({
      image: '../media/bg-beach.png', alt: 'A watercolor beach', x: 25.1, y: 30, scale: 75 }));
    expect(d.elements.map(e => e.image)).not.toContain('../media/bg-beach.png');
  });
  it('md-link element: alt, at, goto→link action, nested-bullet mobile override', () => {
    const el = parse(FULL).elements[0];
    expect(el).toEqual(expect.objectContaining({
      image: 'Resources.png', alt: 'Resources — a glowing bubble',
      x: 45.8, y: -3.6, scale: 18, rotation: 36,
      glow: '#00E5FF', glowIntensity: 1.5,
      action: 'link', value: '/resources/' }));
    expect(el.label).toBe('Resources — a glowing bubble'); // alt doubles as default label
    expect(el.mobileOverride).toEqual({ x: 58, y: 10.3, scale: 29.5 });
  });
  it('wiki-link image + space-indented props + #anchor goto', () => {
    const el = parse(FULL).elements[1];
    expect(el.image).toBe('Sign up bubble.png');
    expect(el.alt).toBeNull();
    expect(el).toEqual(expect.objectContaining({ x: 33.3, y: 25.3, action: 'anchor', value: 'signup' }));
  });
  it('filter property → filter action', () => {
    expect(parse(FULL).elements[2]).toEqual(
      expect.objectContaining({ action: 'filter', value: 'character:bloob' }));
  });
  it('percent-encoded md-link path is decoded', () => {
    const d = parse('- [x](Sign%20up.png)\n\t- at: 1, 2\n');
    expect(d.elements[0].image).toBe('Sign up.png');
  });
  it('old YAML grammar fails safe with a warning, returns empty scene', () => {
    const d = parse('elements:\n  - image: a.png\n    x: 1\n');
    expect(d.elements).toEqual([]);
    expect(d.backgrounds).toEqual([]);
  });
  it('serializeBlock round-trips through parse', () => {
    const d = parse(FULL);
    const text = serializeBlock(d);
    expect(text.startsWith('::: scene-nav')).toBe(true);
    const d2 = parse(text.replace(/^::: scene-nav\n/, '').replace(/\n:::\s*$/, ''));
    expect(d2.elements).toEqual(d.elements);
    expect(d2.backgrounds).toEqual(d.backgrounds);
    expect(d2.mobile).toEqual(d.mobile);
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run lib/visualizers/scene-nav/scene-nav.test.js` → FAIL (`serializeBlock` not exported; grammar not understood)

- [ ] **Step 3: Implement the parser.** Structure (complete the marked sections with the rules above — every rule is specified; no invention needed):

```js
// lib/visualizers/scene-nav/parser.js — v2 nested-bullet grammar (shape-named block).
// Pure: raw block text → scene data. Old YAML code-fence grammar removed 2026-07-20.
const DEFAULTS = { type: "image", glow: "#FFD700", glowIntensity: 1 };

function parseImageRef(text) {
  const md = text.match(/^\[(.*?)\]\((.+?)\)$/);
  if (md) return { image: decodeURIComponent(md[2]), alt: md[1].trim() || null };
  const wiki = text.match(/^\[\[(.+?)\]\]$/);
  if (wiki) return { image: wiki[1], alt: null };
  return { image: text.trim(), alt: null };
}

function deriveAction(props) {
  if (props.filter) return { action: "filter", value: props.filter };
  const g = props.goto;
  if (!g) return { action: "link", value: null };
  const md = g.match(/^\[.*?\]\((.+?)\)$/);
  const target = md ? md[1] : g;
  if (target.startsWith("#")) return { action: "anchor", value: target.slice(1) };
  return { action: "link", value: target };
}

function parseAt(v) { // "45.8, -3.6" → {x, y}
  const [x, y] = String(v).split(",").map(s => Number(s.trim()));
  return { x: x || 0, y: y || 0 };
}

export function parse(rawText) {
  const empty = { aspectRatio: null, edgeFade: 0, backgrounds: [], elements: [], mobile: null, debug: false };
  const lines = rawText.split("\n");
  // 1. header lines (before first /^- /): key: value → aspectRatio, edgeFade,
  //    debug (on|true), mobile ("breakpoint 768, aspectRatio 9/16" → split on ",",
  //    each "key value" pair)
  // 2. element blocks: /^-\s+(.*)/ opens an element (parseImageRef on the rest);
  //    /^(\s+)-\s+(.*)/ is a property line. Track mobileIndent: when the property key
  //    is "mobile" with empty value, record its indent length; subsequent property
  //    lines with indent.length > mobileIndent go into the mobile override object.
  //    Property parsing: bare flags (background, flipH, flipV) vs "key: value";
  //    at → parseAt; numeric keys (scale, rotation, glowIntensity) → Number.
  // 3. after the walk: elements with the background flag → backgrounds array
  //    ({image, alt, x, y, scale: scale||100, rotation, mobileOverride});
  //    the rest → elements with DEFAULTS + deriveAction(props), label = props.label ?? alt.
  // 4. Guard: if no elements/backgrounds parsed AND rawText contains a non-bullet,
  //    non-header structure (e.g. "elements:") → warn "[scene-nav] v2 grammar parse
  //    error" and return empty.
  // (implementation as specified — see tests)
}

export function serializeBlock(sceneData) {
  // Inverse of parse: emits "::: scene-nav\n" + header lines (only non-default values)
  // + one "- [alt](image)" bullet per background (with "\t- background") and element,
  // with "\t- key: value" properties (only non-default values; at: joins x, y),
  // nested "\t- mobile:\n\t\t- …" when mobileOverride present, closing "\n:::".
  // Tab indentation on output (input accepts any).
}
```

- [ ] **Step 4: Run tests until green** — `npx vitest run lib/visualizers/scene-nav/scene-nav.test.js` → PASS
- [ ] **Step 5: Commit** — `git add lib/visualizers/scene-nav/ && git commit -m "feat(scene-nav): v2 nested-bullet grammar parser + block serializer"`

---

### Task 4: `:::` container activation (index.js) — old code fence removed

**Files:**
- Rewrite: `lib/visualizers/scene-nav/index.js`
- Modify: `lib/visualizers/scene-nav/manifest.json` (`"activation": {"method": "container", "trigger": "scene-nav"}`)
- Test: extend `scene-nav.test.js`

**Interfaces:**
- Consumes: `parse` (Task 3), `render` (Task 5 — write against current signature `render(sceneData, settings)`).
- Produces: `transform(html)` replacing `<section class="scene-nav" … data-vis-raw="BASE64" …>…</section>`; keeps `debug` flag available to the runtime by adding `data-scene-debug="true"` on the rendered wrapper when `sceneData.debug`.

- [ ] **Step 1: Failing test** — model on circular-nav's transform; base64 a v2 block, assert the section is replaced and old `language-scene-nav` fences are left untouched (deprecation: warn once if `<code class="language-scene-nav">` is still found):

```js
import { transform } from './index.js';
it('replaces ::: container section via data-vis-raw', () => {
  const raw = Buffer.from('- [a](x.png)\n\t- at: 1, 2\n').toString('base64');
  const html = `<section class="scene-nav" data-vis-settings='{}' data-vis-raw="${raw}"><p>ignored</p></section>`;
  const out = transform(html);
  expect(out).toContain('scene-nav-container');
  expect(out).not.toContain('data-vis-raw');
});
it('leaves legacy code fences untouched but warns', () => {
  const html = '<pre><code class="language-scene-nav">elements:</code></pre>';
  expect(transform(html)).toBe(html);
});
```

- [ ] **Step 2: Verify fail**, then **Step 3: implement** — copy the section-regex shape from `lib/visualizers/circular-nav/index.js:58-79` verbatim, swapping class name and calling `parse` → `render`; append `console.warn("[scene-nav] legacy \`\`\`scene-nav code fence found — migrate to ::: scene-nav (v2)")` when the legacy pattern matches; delete the js-yaml import and old fence-replacement code.
- [ ] **Step 4: Tests green**, **Step 5: Commit** — `feat(scene-nav): activate via ::: container (data-vis-raw); deprecate code fence`

---

### Task 5: Renderer — alt text, background alt, debug attr

**Files:**
- Modify: `lib/visualizers/scene-nav/renderer.js` (3 diffs)
- Test: extend `scene-nav.test.js`

**Interfaces:**
- Consumes: scene data with `alt` fields + `debug` (Task 3). Produces: same HTML contract browser.js already reads (`data-glow`, `data-action`, `data-value`, …) plus `data-scene-debug` on `.scene-nav-wrapper`/container.

- [ ] **Step 1: Failing tests** — `render` output contains `alt="Resources — a glowing bubble"` for an element with alt; `alt=""` + `aria-hidden="true"` on background `<img>`; `data-scene-debug="true"` present when `sceneData.debug`.
- [ ] **Step 2: Implement diffs:**
  - `renderElement`: `alt="${escAttr(el.alt || el.label || "")}"` (was `el.label || ""`).
  - `renderBg`: add `aria-hidden="true"` to the img (alt stays `""` — backgrounds are decorative even when authored with alt; the alt is kept in data for the builder).
  - `render`/`buildContainer`: when `sceneData.debug`, add ` data-scene-debug="true"` to the outermost element returned.
- [ ] **Step 3: Green → commit** — `feat(scene-nav): alt text rendering + debug attribute`

---

### Task 6: browser.js — lazy-load builder on debug

**Files:**
- Modify: `lib/visualizers/scene-nav/browser.js`
- Modify: `scripts/bundle-visualizers.js` (generic `builder/index.js` entry support)

**Interfaces:**
- Produces: on DOM ready, if `document.querySelector('[data-scene-debug="true"]')` exists → `import("/assets/js/visualizers/scene-nav-builder.js")` and call its default export `initBuilder(container)`. `bundle-visualizers.js` gains: for every `lib/visualizers/*/builder/index.js`, esbuild-bundle to `assets/js/visualizers/[name]-builder.js` (same options as browser.js bundles; NOT listed in `visualizers.json` script includes — it is only ever dynamically imported).

- [ ] **Step 1:** Add the bundler rule (mirror the existing browser.js esbuild call in `bundle-visualizers.js`; output name `${name}-builder.js`). Regression: run `node scripts/bundle-visualizers.js` → existing bundles unchanged, no builder bundle yet (folder doesn't exist until Task 9 — the glob simply matches nothing; that's the backwards-compatible no-op).
- [ ] **Step 2:** Append to `browser.js`:

```js
// Debug mode: lazy-load the builder overlay. Ships as a separate bundle; normal
// visitors never fetch it.
document.querySelectorAll('[data-scene-debug="true"]').forEach((container) => {
  import("/assets/js/visualizers/scene-nav-builder.js")
    .then((m) => m.default(container))
    .catch((e) => console.warn("[scene-nav] builder failed to load:", e));
});
```

- [ ] **Step 3: Commit** — `feat(scene-nav): debug-mode lazy-loads builder bundle; bundler builds builder/ entries`

---

### Task 7: Migrate the marbles legacy file

**Files:**
- Modify: `../bloob-haus-marbles/say-hello-to/the-core-family-of-studio-bloob.md`

Mechanical mapping (apply to every background and element in the existing fence):

| Old (YAML fence) | New (nested bullets) |
|---|---|
| ` ```scene-nav … ``` ` | `::: scene-nav … :::` |
| `backgrounds: - image: ![](p.png) x/y/scale` | `- [](p.png)` + `- background` + `- at: x, y` + `- scale: n` |
| `elements: - image: ![](p.png)` | `- [<label as alt>](p.png)` (use the existing `label:` text as the md-link alt) |
| `x: 66.8` + `y: 4.5` | `- at: 66.8, 4.5` |
| `action: link` + `value: URL` | `- goto: URL` |
| `mobile: {x, y, scale}` | `- mobile:` + nested `- at: x, y` / `- scale: n` |
| `label:` | drop when identical to alt; else keep `- label:` |
| top-level `mobile: breakpoint/aspectRatio` | header `mobile: breakpoint 768, aspectRatio 9/16` |
| `edgeFade`, `rotation`, `glow`, `glowIntensity` | same keys, bullet form |

- [ ] **Step 1:** Rewrite the block (read the FULL existing fence first — it has more elements than the excerpt in the spec).
- [ ] **Step 2:** Build marbles (`npm run dev:marbles`), headless-screenshot the page at its URL (`/say-hello-to/the-core-family-of-studio-bloob/`), compare against a pre-migration screenshot taken BEFORE Task 4 landed (take it now if missing). Element positions/glow/links must match. Kill server.
- [ ] **Step 3:** Commit in the **marbles content repo**: `content: migrate core-family scene to scene-nav v2 grammar`

---

### Task 8: MELT homepage goes live on scene-nav

**Files:**
- Modify: `../melt-website/_index.md` (replace `:::circular-nav` + delete the `%%` draft)

- [ ] **Step 1:** Write the live block. Images from `media/menu-images/`; positions from the draft; targets from the circular-nav block; every image gets descriptive alt text. Complete block:

```markdown
::: scene-nav
aspectRatio: 16/9
mobile: breakpoint 768, aspectRatio 9/16

- [Sign up for the next MELT — a warm red glowing bubble](media/menu-images/Sign%20up%20for%20the%20next%20MELT.png)
	- at: 33.3, 25.3
	- scale: 18
	- glow: #FF5252
	- goto: [RSVP](RSVP.md)
- [Resources](media/menu-images/Resources.png)
	- at: 45.8, -3.6
	- scale: 18
	- glow: #00E5FF
	- goto: [resources](Resources/index.md)
- [Playlists](media/menu-images/Playlists.png)
	- at: 58, 8
	- scale: 16
	- glow: #B388FF
	- goto: [playlists](Playlists/_index.md)
- [What is MELT?](media/menu-images/About%20us.png)
	- at: 23.2, -3.7
	- scale: 18
	- glow: #FFD700
	- goto: [about](About%20MELT.md)
- [About MELT — mutual aid fund](media/menu-images/MELT%20mutual%20aid%20fund.png)
	- at: 56.5, 28
	- scale: 18
	- glow: #FFD700
	- goto: [maf](melt-maf.md)
- [An evening with MELT](media/menu-images/An%20evening%20with%20MELT.png)
	- at: 21.9, 56.1
	- scale: 17
	- glow: #69F0AE
	- goto: [evening](articles/an-evening-with-melt.md)
- [Host your own MELT](media/menu-images/Host%20your%20own%20MELT.png)
	- at: 45.1, 62.1
	- scale: 18
	- glow: #FF8A65
	- goto: [host](host-your-own-melt.md)
- [Contact us](media/menu-images/Contact%20us.png)
	- at: 11.2, 25.3
	- scale: 16
	- glow: #FF8A65
	- goto: [contact](contact-us.md)
:::
```

(Exact filenames: verify with `ls ../melt-website/media/menu-images/` — the draft names imply these; fix any that differ.)

- [ ] **Step 2: Link-resolution check (known open risk from spec):** build melt, inspect the rendered homepage HTML: `goto:` md-links inside the block must arrive at `parse` already resolved to final URLs (inject-container-raw runs AFTER link resolution). If `data-value` still shows `RSVP.md` instead of `/rsvp/`-style URLs, the md-link resolver skipped `:::` block content → fix belongs in `scripts/utils/markdown-link-resolver.js` scope (resolve links inside container blocks too) — write a regression test there first, then fix. Same check for image paths.
- [ ] **Step 3:** Headless screenshots desktop + mobile (`--window-size=390,844`); verify: all 8 bubbles render, alt attributes present (`grep 'alt="' page.html`), clicking targets = correct hrefs (`grep data-value`). Kill server.
- [ ] **Step 4:** Commit in melt-website repo: `content: homepage scene-nav v2 replaces circular-nav`

---

### Task 9: Builder overlay (magic-machine consolidation)

**Files:**
- Create: `lib/visualizers/scene-nav/builder/index.js` (entry: `export default function initBuilder(container)`)
- Create: `lib/visualizers/scene-nav/builder/panel.js` (side panel UI)
- Create: `lib/visualizers/scene-nav/builder/drag.js` (pointer drag/scale engine)
- Create: `lib/visualizers/scene-nav/builder/embed-serializer.js` (ported from magic machine)
- Create: `lib/visualizers/scene-nav/builder/builder.css` (snb- prefix; bundled by esbuild CSS import or copied — follow how existing browser.js handles CSS)
- Test: `lib/visualizers/scene-nav/builder/embed-serializer.test.js`

**Interfaces:**
- Consumes: `serializeBlock(sceneData)` from `../parser.js` (Task 3); the rendered DOM (`.scene-nav-container`, `.scene-nav-el` with data attrs).
- Produces: `initBuilder(container)` — reconstructs scene data from the DOM data attributes + a `<script type="application/json" class="scene-nav-data">` blob that Task 9 Step 1 adds to the renderer when `debug` is on (cleanest data hand-off; avoids re-parsing the DOM), and mounts the overlay.

Sub-steps:

- [ ] **Step 1: Data hand-off.** In `renderer.js`, when `sceneData.debug`: append `<script type="application/json" class="scene-nav-data">${JSON.stringify(sceneData)}</script>` inside the wrapper (escape `</` as `<\/`). Test: render with debug → blob parses back to the scene data.
- [ ] **Step 2: Drag engine (`drag.js`).** `makeDraggable(el, {onChange})`: pointerdown → track pointermove deltas as % of container box → write `left`/`top` inline styles live → pointerup fires `onChange({x, y})` rounded to 1 decimal. Shift+drag vertical = scale. Pure DOM module, no panel knowledge.
- [ ] **Step 3: Panel (`panel.js`).** Fixed right-side column (`.snb-panel`, ~300px, full height, own scroll; body gets `.snb-open` padding-right so content isn't covered). Contents top-to-bottom: scene settings (aspectRatio text input, edgeFade range, mobile breakpoint number, mobile-mode toggle button), element list (one row per element: alt/label, click = select, highlights the canvas element), selected-element form (at x/y number inputs, scale, rotation, glow color input, glowIntensity range, label text, goto text, filter text), export buttons. Two-way: form edits update the live element styles + scene data; drag updates the form. Mobile-mode toggle: container gets the mobile aspect ratio + per-element mobileOverride values are the ones being edited (badge "editing mobile layout"). Follow frontend-design skill at build time for the visual pass; keep it quiet/utilitarian — this is a tool, the scene is the star.
- [ ] **Step 4: Export menu.** Button "Copy ::: block" → `navigator.clipboard.writeText(serializeBlock(currentSceneData))` + confirmation toast. Button "Copy embed HTML" → Step 5's serializer output.
- [ ] **Step 5: Embed serializer port.** Source: `lib/magic-machines/scene-nav-builder/app/index.html` — locate the embed-generation function (search `embed`), port to `embed-serializer.js` as `generateEmbedHtml(sceneData, {filterMode = "or"} = {})` returning a self-contained HTML string (inline style + script; edge fade masks; mobile media-query dual containers; filter click handling with or/and). TDD: test asserts output contains dual containers when mobile set, the mask-image CSS when edgeFade > 0, and the filter-mode conditional; plus a smoke test that the string parses as HTML (`new DOMParser` unavailable in node — assert balanced tags via a simple count instead).
- [ ] **Step 6: Bundle + localhost dev-loop verification.** `node scripts/bundle-visualizers.js` (REQUIRED after builder edits in dev — document this in schema.md); `npm run dev:melt` with `debug: on` in `_index.md`'s block; headless screenshot: panel visible; then scripted CDP or manual check: drag updates `at`, Copy block round-trips through `parse` (paste → rebuild → identical scene). Acceptance criterion from Leon: works on localhost dev build. Kill server; remove `debug: on` from the live file.
- [ ] **Step 7: Commit** — `feat(scene-nav): builder overlay (debug mode) — drag positioning, panel, ::: block + Shopify embed export`

---

### Task 10: Delete magic machine, schema.md, docs sweep

**Files:**
- Delete: `lib/magic-machines/scene-nav-builder/`
- Rewrite: `lib/visualizers/scene-nav/schema.md` (canonical-template sections: what it is / fence format / parsing rules / settings table / placement (coordinates) / container policy / translation behavior / closed-state / builder / authors / examples — garden's schema.md is the reference)
- Create: `lib/visualizers/scene-nav/DECISIONS.md` (grammar decisions; embed-export-as-serializer; nested-bullet mobile override deviation)
- Modify: `docs/architecture/shapes.md` (status table: scene-nav → builder ✓), `docs/architecture/magic-machines.md` (remove scene-nav-builder; add consolidation note), `docs/architecture/settings-registry.md` (`background_image` universal row; melt `subtitle` page-frontmatter row), `docs/TECH-DEBT.md` (close/annotate anything superseded), `docs/CHANGELOG.md`, `docs/implementation-plans/DECISIONS.md` (precedent: "a magic machine whose output is a shape's fence is that shape's builder")
- Manual (both vault repos): `_bloob-settings.md` "All Possible Settings" table

- [ ] **Step 1:** Parity checklist from the spec — verify each item against Task 9's build before deleting (drag/scale/rotation/glow ✓, edge fade ✓, mobile mode ✓, embed export incl. filter mode ✓, import path = debug overlay reads live block ✓).
- [ ] **Step 2:** `git rm -r lib/magic-machines/scene-nav-builder/`; grep the repo for `scene-nav-builder` and fix every reference.
- [ ] **Step 3:** Write schema.md + DECISIONS.md; sweep the docs listed above.
- [ ] **Step 4:** `npm test` full suite; `npm run build` (defaults buffbaby) as the no-regression canary for a site that uses neither feature — build must succeed with identical output.
- [ ] **Step 5:** Commit — `chore(scene-nav): consolidate builder, delete magic machine; schema + docs sweep`

---

## Self-review notes (done at write time)

- **Spec coverage:** background pipeline (T1-2), grammar+parsing (T3), `:::` activation + code-fence removal (T4), alt text (T3/T5/T8), goto/filter (T3), migration of both files (T7-8), builder consolidation + embed export + deletion gate (T9-10), docs (T10), localhost debug acceptance (T9 S6). Deferred items from spec stay deferred.
- **Type consistency:** `parse`/`serializeBlock` (parser.js), `render(sceneData, settings)` (renderer.js), `generateBackground({config, srcDir})`, `initBuilder(container)`, `generateEmbedHtml(sceneData, {filterMode})` — names used identically across tasks.
- **Known risk carried explicitly:** md-link resolution inside `:::` blocks (T8 S2) — test-first fix in the resolver if it doesn't hold.
