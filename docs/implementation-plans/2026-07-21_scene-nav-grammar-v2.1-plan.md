# Scene-Nav Grammar v2.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-element `hoverGlow`/`hoverScale`/`label` on-off controls, a shared `on/off/true/false` boolean vocabulary, and wiki-link `goto` support to the scene-nav shape — with full parse → render → runtime → serialize wiring and the shared authoring conventions documented.

**Architecture:** Extend the existing pure `parser.js`/`renderer.js` and runtime `browser.js` of `lib/visualizers/scene-nav/`. All additions are backwards compatible: new keys default to today's behavior (glow on, enlarge on, label = alt text), so existing melt/marbles scenes render identically. This is Plan 1 of 3 (grammar → builder GUI → ref resolution) from the design spec `2026-07-21_scene-nav-builder-rework-and-resolution.md`.

**Tech Stack:** Node ESM, Vitest, esbuild (visualizer bundling). No new dependencies.

## Global Constraints

- Cross-platform (Mac/Windows): no inline `VAR=value` env in package.json; `path.join` for paths. (Not directly exercised here — pure JS modules — but keep in mind.)
- Backwards compatible: every new grammar key is optional; absence = current behavior. Existing tests in `lib/visualizers/scene-nav/scene-nav.test.js` must stay green.
- Tri-state + boolean vocabulary (from spec §3.5): optional attribute → **absent = default**, **`false`/`off` = disable**, **`true`/`on` = enable**, **other value = override**; `false`/`off` and `true`/`on` accepted case-insensitively.
- After editing any visualizer runtime (`browser.js`), the bundle only refreshes on full build; in dev run `node scripts/bundle-visualizers.js` before browser verification.
- Run the full suite with `npx vitest run lib/visualizers/scene-nav/scene-nav.test.js` (fast) and `npm test` (whole repo) before the final commit.

---

### Task 1: Boolean vocabulary + `hoverGlow`/`hoverScale` parsing

**Files:**
- Modify: `lib/visualizers/scene-nav/parser.js` (add `booleanKeyword` helper near the other small helpers ~`parseOnlyShowOn`; set `hoverGlow`/`hoverScale` in the element-construction block inside `parse()`)
- Test: `lib/visualizers/scene-nav/scene-nav.test.js` (new `describe` block)

**Interfaces:**
- Produces: `booleanKeyword(value) → true | false | null` (module-internal). Element objects gain `hoverGlow: boolean` and `hoverScale: boolean` (both default `true`).

- [ ] **Step 1: Write the failing test**

Add to `scene-nav.test.js` after the `scene-nav v2 parser` describe block:

```js
describe('scene-nav v2.1 — hover toggles', () => {
  it('elements default hoverGlow and hoverScale to true', () => {
    const el = parse('- [a](x.png)\n\t- at: 1, 2\n').elements[0];
    expect(el.hoverGlow).toBe(true);
    expect(el.hoverScale).toBe(true);
  });
  it('hoverGlow: off / hoverScale: false disable the effects (case-insensitive)', () => {
    const el = parse('- [a](x.png)\n\t- at: 1, 2\n\t- hoverGlow: off\n\t- hoverScale: FALSE\n').elements[0];
    expect(el.hoverGlow).toBe(false);
    expect(el.hoverScale).toBe(false);
  });
  it('hoverGlow: on / true keep the effect enabled', () => {
    const el = parse('- [a](x.png)\n\t- at: 1, 2\n\t- hoverGlow: on\n').elements[0];
    expect(el.hoverGlow).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/visualizers/scene-nav/scene-nav.test.js -t "hover toggles"`
Expected: FAIL — `el.hoverGlow` is `undefined`.

- [ ] **Step 3: Add the helper and wire the fields**

In `parser.js`, add near `parseOnlyShowOn`:

```js
// Interprets on/true → true, off/false → false (case-insensitive); anything else → null.
// Shared boolean vocabulary for scene-nav's tri-state attributes.
function booleanKeyword(value) {
  const s = String(value).trim().toLowerCase();
  if (s === "on" || s === "true") return true;
  if (s === "off" || s === "false") return false;
  return null;
}
```

In `parse()`, inside the `elements.push({ ... })` object (the non-background branch), add these two fields (place them right after `glowIntensity`):

```js
      hoverGlow: p.hoverGlow !== undefined ? booleanKeyword(p.hoverGlow) !== false : true,
      hoverScale: p.hoverScale !== undefined ? booleanKeyword(p.hoverScale) !== false : true,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/visualizers/scene-nav/scene-nav.test.js -t "hover toggles"`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/visualizers/scene-nav/parser.js lib/visualizers/scene-nav/scene-nav.test.js
git commit -m "feat(scene-nav): parse hoverGlow/hoverScale toggles + boolean vocabulary"
```

---

### Task 2: `label` tri-state (`label: false/off` suppresses)

**Files:**
- Modify: `lib/visualizers/scene-nav/parser.js` (element-construction `label:` line inside `parse()`)
- Test: `lib/visualizers/scene-nav/scene-nav.test.js`

**Interfaces:**
- Consumes: `booleanKeyword` from Task 1.
- Produces: element `label` is now `string` (override or alt), `false` (explicitly suppressed via `label: false/off`), or `null` (no alt, no label). Renderer already treats falsy `label` as "no label span" — no renderer change needed for suppression.

- [ ] **Step 1: Write the failing test**

Add to the `scene-nav v2.1 — hover toggles` describe block (or a new `label tri-state` block):

```js
describe('scene-nav v2.1 — label tri-state', () => {
  it('label defaults to the alt text', () => {
    const el = parse('- [Contact us](x.png)\n\t- at: 1, 2\n').elements[0];
    expect(el.label).toBe('Contact us');
  });
  it('label: false suppresses the label', () => {
    const el = parse('- [Contact us](x.png)\n\t- at: 1, 2\n\t- label: false\n').elements[0];
    expect(el.label).toBe(false);
  });
  it('label: off suppresses the label (case-insensitive)', () => {
    const el = parse('- [Contact us](x.png)\n\t- at: 1, 2\n\t- label: OFF\n').elements[0];
    expect(el.label).toBe(false);
  });
  it('label: text overrides the label', () => {
    const el = parse('- [Contact us](x.png)\n\t- at: 1, 2\n\t- label: Say hi\n').elements[0];
    expect(el.label).toBe('Say hi');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/visualizers/scene-nav/scene-nav.test.js -t "label tri-state"`
Expected: FAIL — `label: false` yields the string `"false"`, not the boolean `false`.

- [ ] **Step 3: Implement the tri-state**

In `parser.js`, add a helper next to `booleanKeyword`:

```js
// Tri-state: undefined → alt (default); off/false → false (suppressed); on/true → alt; else override string.
function resolveLabel(rawLabel, alt) {
  if (rawLabel === undefined) return alt;
  const kw = booleanKeyword(rawLabel);
  if (kw === false) return false;
  if (kw === true) return alt;
  return rawLabel;
}
```

In `parse()`, replace the existing element `label:` line:

```js
      label: p.label !== undefined ? p.label : alt,
```

with:

```js
      label: resolveLabel(p.label, alt),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/visualizers/scene-nav/scene-nav.test.js -t "label tri-state"`
Expected: PASS (4 tests).

- [ ] **Step 5: Verify renderer suppresses the label span (no code change expected)**

Add one renderer test to the existing `render` describe block:

```js
  it('renders no label span when label is false', () => {
    const scene = { ...basicScene, elements: [{ ...basicScene.elements[0], label: false }] };
    const html = render(scene);
    expect(html).not.toContain('scene-nav-label');
  });
```

Run: `npx vitest run lib/visualizers/scene-nav/scene-nav.test.js -t "label is false"`
Expected: PASS (the existing `el.label ?` guard already treats `false` as falsy).

- [ ] **Step 6: Commit**

```bash
git add lib/visualizers/scene-nav/parser.js lib/visualizers/scene-nav/scene-nav.test.js
git commit -m "feat(scene-nav): label tri-state (label: false/off suppresses hover label)"
```

---

### Task 3: Wiki-link `goto` support

**Files:**
- Modify: `lib/visualizers/scene-nav/parser.js` (`deriveAction`)
- Test: `lib/visualizers/scene-nav/scene-nav.test.js`

**Interfaces:**
- Produces: `goto: [[note]]` resolves like markdown/bare — `{ action: "link", value: "note" }`; `goto: [[#id]]` → anchor. (Images already accept `[[wiki]]` via `parseImageRef`; this closes the gap for `goto`.)

- [ ] **Step 1: Write the failing test**

```js
describe('scene-nav v2.1 — wiki goto', () => {
  it('goto: [[note]] is treated as a link to that note', () => {
    const el = parse('- [a](x.png)\n\t- at: 1, 2\n\t- goto: [[About MELT]]\n').elements[0];
    expect(el.action).toBe('link');
    expect(el.value).toBe('About MELT');
  });
  it('markdown and bare goto still work', () => {
    const md = parse('- [a](x.png)\n\t- goto: [x](/y/)\n').elements[0];
    expect(md.value).toBe('/y/');
    const bare = parse('- [a](x.png)\n\t- goto: /host/\n').elements[0];
    expect(bare.value).toBe('/host/');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/visualizers/scene-nav/scene-nav.test.js -t "wiki goto"`
Expected: FAIL — `value` is the literal `"[[About MELT]]"`.

- [ ] **Step 3: Implement**

In `parser.js`, replace `deriveAction` with:

```js
function deriveAction(props) {
  if (props.filter) return { action: "filter", value: props.filter };
  const g = props.goto;
  if (!g) return { action: "link", value: null };
  const md = g.match(/^\[.*?\]\((.+?)\)$/);
  const wiki = g.match(/^\[\[(.+?)\]\]$/);
  const target = md ? md[1] : wiki ? wiki[1] : g;
  if (target.startsWith("#")) return { action: "anchor", value: target.slice(1) };
  return { action: "link", value: target };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/visualizers/scene-nav/scene-nav.test.js -t "wiki goto"`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/visualizers/scene-nav/parser.js lib/visualizers/scene-nav/scene-nav.test.js
git commit -m "feat(scene-nav): support wiki-link [[note]] in goto"
```

---

### Task 4: Renderer emits `data-hover-glow` / `data-hover-scale`

**Files:**
- Modify: `lib/visualizers/scene-nav/renderer.js` (`renderElement`)
- Test: `lib/visualizers/scene-nav/scene-nav.test.js`

**Interfaces:**
- Consumes: element `hoverGlow`/`hoverScale` (Task 1).
- Produces: an element div carries `data-hover-glow="false"` only when `hoverGlow === false` (same for `hoverScale`). Absence = enabled (browser default).

- [ ] **Step 1: Write the failing test**

```js
describe('render — hover attributes', () => {
  const base = {
    type: 'image', image: 'x.png', x: 1, y: 2, scale: 18, rotation: 0,
    resetRotationOnHover: true, label: null, glow: '#FFD700', glowIntensity: 1,
    action: 'link', value: null, onlyShowOn: null, mobileOverride: null,
  };
  it('omits hover attrs when effects enabled (default)', () => {
    const html = render({ aspectRatio: null, edgeFade: 0, backgrounds: [], mobile: null,
      elements: [{ ...base, hoverGlow: true, hoverScale: true }] });
    expect(html).not.toContain('data-hover-glow');
    expect(html).not.toContain('data-hover-scale');
  });
  it('emits data-hover-glow="false" / data-hover-scale="false" when disabled', () => {
    const html = render({ aspectRatio: null, edgeFade: 0, backgrounds: [], mobile: null,
      elements: [{ ...base, hoverGlow: false, hoverScale: false }] });
    expect(html).toContain('data-hover-glow="false"');
    expect(html).toContain('data-hover-scale="false"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/visualizers/scene-nav/scene-nav.test.js -t "hover attributes"`
Expected: FAIL — attributes never rendered.

- [ ] **Step 3: Implement**

In `renderer.js` `renderElement`, just before the `return` that builds the `<div class="${cls}" ...>`, add:

```js
  const hoverGlowAttr  = el.hoverGlow  === false ? ` data-hover-glow="false"`  : "";
  const hoverScaleAttr = el.hoverScale === false ? ` data-hover-scale="false"` : "";
```

Then add `${hoverGlowAttr}${hoverScaleAttr}` into the opening tag, right after the `data-reset-rotation-on-hover="..."` attribute line:

```js
  data-reset-rotation-on-hover="${escAttr(String(el.resetRotationOnHover))}"${hoverGlowAttr}${hoverScaleAttr}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/visualizers/scene-nav/scene-nav.test.js -t "hover attributes"`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/visualizers/scene-nav/renderer.js lib/visualizers/scene-nav/scene-nav.test.js
git commit -m "feat(scene-nav): render data-hover-glow/data-hover-scale when disabled"
```

---

### Task 5: Runtime honors hover toggles (`browser.js`)

**Files:**
- Modify: `lib/visualizers/scene-nav/browser.js` (guard top-level DOM code; extract + export `hoverStyles`; wire `initElement`)
- Test: `lib/visualizers/scene-nav/scene-nav.test.js`

**Interfaces:**
- Produces: `hoverStyles({ hoverGlow, hoverScale, glowFilter, baseTransform, resetRot }) → { filter, transform }` — pure, exported, unit-tested. `initElement` reads `data-hover-glow`/`data-hover-scale` and applies it on mouseenter.

- [ ] **Step 1: Write the failing test**

```js
import { hoverStyles } from './browser.js';

describe('scene-nav browser — hoverStyles', () => {
  const glow = 'drop-shadow(x)';
  it('applies glow + scale by default', () => {
    expect(hoverStyles({ hoverGlow: true, hoverScale: true, glowFilter: glow, baseTransform: 'rotate(10deg)', resetRot: true }))
      .toEqual({ filter: glow, transform: 'scale(1.06)' });
  });
  it('drops glow when hoverGlow is false', () => {
    expect(hoverStyles({ hoverGlow: false, hoverScale: true, glowFilter: glow, baseTransform: '', resetRot: true }).filter).toBe('');
  });
  it('drops the scale when hoverScale is false, keeping rotation if not reset', () => {
    expect(hoverStyles({ hoverGlow: true, hoverScale: false, glowFilter: glow, baseTransform: 'rotate(10deg)', resetRot: false }).transform)
      .toBe('rotate(10deg)');
  });
  it('empty transform when scale off and rotation reset', () => {
    expect(hoverStyles({ hoverGlow: true, hoverScale: false, glowFilter: glow, baseTransform: 'rotate(10deg)', resetRot: true }).transform)
      .toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/visualizers/scene-nav/scene-nav.test.js -t "hoverStyles"`
Expected: FAIL — importing `browser.js` throws (top-level `document` access) and/or `hoverStyles` is not exported.

- [ ] **Step 3: Guard the DOM code and add `hoverStyles`**

In `browser.js`, add the exported pure helper near `buildGlowFilter`:

```js
// Pure: computes the mouseenter filter+transform from the element's hover flags.
export function hoverStyles({ hoverGlow, hoverScale, glowFilter, baseTransform, resetRot }) {
  const filter = hoverGlow ? glowFilter : "";
  const rot = resetRot ? "" : baseTransform;
  const transform = [rot, hoverScale ? "scale(1.06)" : ""].filter(Boolean).join(" ");
  return { filter, transform };
}
```

Wrap the two top-level runtime blocks (the `document.addEventListener("DOMContentLoaded", ...)` init and the `document.querySelectorAll('[data-scene-debug="true"]')` builder loader) in a single guard so the module is importable in Node:

```js
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".scene-nav-el").forEach(initElement);
  });

  document.querySelectorAll('[data-scene-debug="true"]').forEach((container) => {
    import("/assets/js/visualizers/scene-nav-builder.js")
      .then((m) => m.default(container))
      .catch((e) => console.warn("[scene-nav] builder failed to load:", e));
  });
}
```

- [ ] **Step 4: Wire `initElement` to read the flags and use `hoverStyles`**

In `initElement`, after the existing `const resetRot = ...` line add:

```js
  const hoverGlow  = el.dataset.hoverGlow  !== "false";
  const hoverScale = el.dataset.hoverScale !== "false";
```

Replace the `mouseenter` handler body with:

```js
  el.addEventListener("mouseenter", () => {
    const s = hoverStyles({ hoverGlow, hoverScale, glowFilter, baseTransform, resetRot });
    el.style.filter = s.filter;
    el.style.transform = s.transform;
  });
```

(The `mouseleave` handler and the click handler stay unchanged.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run lib/visualizers/scene-nav/scene-nav.test.js -t "hoverStyles"`
Expected: PASS (4 tests).

- [ ] **Step 6: Rebuild the runtime bundle and commit**

```bash
node scripts/bundle-visualizers.js
git add lib/visualizers/scene-nav/browser.js lib/visualizers/scene-nav/scene-nav.test.js
git commit -m "feat(scene-nav): runtime honors hoverGlow/hoverScale; guard DOM code for tests"
```

---

### Task 6: `serializeBlock` emits the new keys + round-trip

**Files:**
- Modify: `lib/visualizers/scene-nav/parser.js` (`serializeBlock`)
- Test: `lib/visualizers/scene-nav/scene-nav.test.js`

**Interfaces:**
- Consumes: element `label` (string | false | null), `hoverGlow`/`hoverScale` (boolean) from Tasks 1–2.
- Produces: `serializeBlock` emits `- label: false`, `- hoverGlow: false`, `- hoverScale: false` only when set to the disabling value; round-trips through `parse()` to an equal scene.

- [ ] **Step 1: Write the failing test**

```js
describe('scene-nav v2.1 — serialize round-trip of new keys', () => {
  function roundTrip(block) {
    const d = parse(block);
    const text = serializeBlock(d);
    const d2 = parse(text.replace(/^::: scene-nav\n/, '').replace(/\n:::\s*$/, ''));
    return { d, d2 };
  }
  it('round-trips label: false, hoverGlow: off, hoverScale: off', () => {
    const { d, d2 } = roundTrip(
      '- [Contact us](Contact us.png)\n\t- at: 1, 2\n\t- label: false\n\t- hoverGlow: off\n\t- hoverScale: off\n'
    );
    expect(d2.elements).toEqual(d.elements);
    expect(d.elements[0].label).toBe(false);
    expect(d.elements[0].hoverGlow).toBe(false);
  });
  it('does not emit hover/label keys when at defaults', () => {
    const d = parse('- [Contact us](Contact us.png)\n\t- at: 1, 2\n');
    const text = serializeBlock(d);
    expect(text).not.toContain('hoverGlow');
    expect(text).not.toContain('hoverScale');
    expect(text).not.toContain('label:');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/visualizers/scene-nav/scene-nav.test.js -t "serialize round-trip of new keys"`
Expected: FAIL — `serializeBlock` doesn't emit the new keys, so `label`/`hoverGlow` come back at defaults and `d2.elements` differs.

- [ ] **Step 3: Implement**

In `serializeBlock`, inside the `for (const el of d.elements || [])` loop, replace the existing label block:

```js
    if (el.label !== null && el.label !== undefined && el.label !== el.alt) {
      lines.push(`\t- label: ${el.label}`);
    }
```

with:

```js
    if (el.label === false) lines.push(`\t- label: false`);
    else if (el.label != null && el.label !== el.alt) lines.push(`\t- label: ${el.label}`);
    if (el.hoverGlow === false) lines.push(`\t- hoverGlow: false`);
    if (el.hoverScale === false) lines.push(`\t- hoverScale: false`);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/visualizers/scene-nav/scene-nav.test.js -t "serialize round-trip of new keys"`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the whole scene-nav suite (guard against regressions)**

Run: `npx vitest run lib/visualizers/scene-nav/scene-nav.test.js`
Expected: PASS — all existing + new tests (existing round-trip test still green because defaults emit nothing).

- [ ] **Step 6: Commit**

```bash
git add lib/visualizers/scene-nav/parser.js lib/visualizers/scene-nav/scene-nav.test.js
git commit -m "feat(scene-nav): serialize label:false + hoverGlow/hoverScale, round-trip"
```

---

### Task 7: Docs — grammar + shared conventions

**Files:**
- Modify: `lib/visualizers/scene-nav/schema.md` (document v2.1 keys)
- Modify: `docs/architecture/shapes.md` (add "Authoring & resolution conventions" block)
- Modify: `docs/architecture/visualizers.md` (one-line cross-link to the conventions block)
- Modify: `docs/architecture/settings-registry.md` (new per-element keys under scene-nav)
- Modify: `docs/implementation-plans/DECISIONS.md` (record the conventions decision)
- Modify: `docs/CHANGELOG.md` (S62 entry)

**Interfaces:** none (documentation only).

- [ ] **Step 1: Update `schema.md`**

In the nested-bullets properties list, add: `hoverGlow` (on/off, default on — disable the hover glow), `hoverScale` (on/off, default on — disable the hover enlarge), and `label` tri-state (`label: false`/`off` = no hover label; a value overrides; absent = the image's alt text). Note the boolean vocabulary: `on`/`true` and `off`/`false` both accepted, case-insensitive. Note `goto:` accepts `[[wiki]]` in addition to `[md](target)`, bare URL, and `#anchor`.

- [ ] **Step 2: Add the conventions block to `shapes.md`**

Add a new section `## Authoring & resolution conventions` with the six conventions from the design spec §3 (dual wiki+markdown syntax; basename-first resolution; a shape resolves its own refs when the general pass can't; literal spaces authored / encoding is a render concern; tri-state + `on/off/true/false` vocabulary; write-face emits authorable markdown preserving the authored target). Keep it to a few lines each. Reference the spec file for the full rationale.

- [ ] **Step 3: Cross-link from `visualizers.md`**

Add one line under the Core Concepts / framing note pointing to `shapes.md` → "Authoring & resolution conventions" (do not restate — anti-sprawl).

- [ ] **Step 4: Update `settings-registry.md`**

Under the scene-nav rows, add `hoverGlow`, `hoverScale`, and the `label: false` behavior as per-element (block) settings.

- [ ] **Step 5: Update `DECISIONS.md` and `CHANGELOG.md`**

`DECISIONS.md`: add a dated entry — "scene-nav v2.1: shapes carry a shared `on/off/true/false` boolean vocabulary and tri-state attributes; authoring/resolution conventions documented in shapes.md." `CHANGELOG.md`: add the S62 entry summarizing Plan 1.

- [ ] **Step 6: Run the full test suite, then commit**

Run: `npm test`
Expected: PASS (existing 570 + the new scene-nav tests).

```bash
git add lib/visualizers/scene-nav/schema.md docs/architecture/shapes.md docs/architecture/visualizers.md docs/architecture/settings-registry.md docs/implementation-plans/DECISIONS.md docs/CHANGELOG.md
git commit -m "docs(scene-nav): v2.1 grammar keys + shared authoring/resolution conventions"
```

---

## Self-Review

**Spec coverage (of Plan-1 scope):** grammar `hoverGlow`/`hoverScale` (Tasks 1,4,5,6) ✓; `label: false` tri-state (Tasks 2,6) ✓; boolean `on/off/true/false` vocabulary (Task 1) ✓; wiki `goto` (Task 3) ✓; conventions documented (Task 7) ✓. Resolution (spec §5) and builder GUI (§6) are **Plans 2 & 3** — intentionally out of scope here.

**Type consistency:** `booleanKeyword`/`resolveLabel` defined in Task 1–2 and reused in Task 6 serialize; `hoverStyles` signature identical in Task 5 test and impl; element fields `hoverGlow`/`hoverScale` (boolean) and `label` (string|false|null) used consistently across parser/renderer/browser/serialize.

**Placeholder scan:** none — every code step shows the exact code.

**Backwards-compat:** all new fields default to current behavior; existing round-trip/render tests untouched. Verified by Task 6 Step 5 (full scene-nav suite) and Task 7 Step 6 (`npm test`).
