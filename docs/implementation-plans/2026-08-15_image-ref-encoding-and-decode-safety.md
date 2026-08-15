# Image-Ref Encoding & Decode Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop a literal `%` in a filename from crashing the build, and make the scene-nav builder emit percent-encoded image refs so its "Copy ::: block" output resolves in Obsidian.

**Architecture:** Two independent changes to `lib/visualizers/scene-nav/`. (1) A pure `safeDecode` helper replaces two unguarded `decodeURIComponent` calls. (2) A pure `encodeRef` helper is applied at the two `serializeBlock` sites that write image refs. Both are pure functions in the shape's own directory, consistent with the pure-renderer standard — `parser.js` and `resolve.js` stay pure and browser-bundlable.

**Tech Stack:** Node ESM, Vitest, no new dependencies.

**Spec:** This document (originated from a live bug found on melt, 2026-08-15). Background: `docs/implementation-plans/2026-07-21_scene-nav-builder-rework-and-resolution.md` (the doc that established the current literal-spaces rule), `docs/architecture/shapes.md` → "Authoring & resolution conventions".

## Global Constraints

- Cross-platform: no inline `VAR=value node …` in `package.json`; `path.join`/`path.resolve` for paths. (This plan adds no scripts, but the rule stands.)
- `lib/visualizers/**` is **shape work** — the SHAPE TRINITY (`ontology.md` + `shapes.md` + `visualizers.md`) must be read before starting. All three were read on 2026-08-15 to produce this plan; re-read `shapes.md` → "Authoring & resolution conventions" before Task 3.
- Pure-renderer standard (`visualizers.md`): `parser.js` and `resolve.js` are **pure**. New helpers must be pure, dependency-free, and importable in both Node and browser bundles. No `location`, no DOM, no `fs`.
- Multi-Site rule: `lib/**` is shared infrastructure. scene-nav is used by **melt** today; verify melt end-to-end and confirm no other site regresses.
- Rule of Three: do **not** hoist `safeDecode` into a global shared util. It is used twice inside scene-nav (plus an unrelated copy in `scripts/utils/transclusion-handler.js`, which is Node-only and must not import from `lib/`). A shape-local module is correct.
- Write the regression test **first** for every fix (CLAUDE.md Code Quality Rules).

---

## Decision required before Task 2

**Task 1 is unconditional — implement it regardless.** Task 2 onward changes a *documented cross-shape convention* and needs Leon's sign-off.

`docs/architecture/shapes.md:369` currently says:

> **4. Literal spaces are authored; encoding is a render concern.** Authors and builders write literal spaces (`Contact us.png`); parsers accept both literal spaces and `%20`. URL-encoding happens only in the resolved output URL.

The stated rationale (`2026-07-21_scene-nav-builder-rework-and-resolution.md:56`) is *"the author never has to think about it."* The melt bug is the counter-evidence: the author **does** have to think about it, because a literal-space ref does not resolve in Obsidian's editor, so the vault source looks broken even though the site builds fine.

**Recommendation: Option A.** It is what Obsidian itself writes in "Use [[Wikilinks]]: off" mode, so it matches the tool the vault is authored in.

| | Option A — always emit `%20` **(recommended)** | Option B — preserve the authored form verbatim | Option C — CommonMark angle brackets |
|---|---|---|---|
| Builder emits | `[alt](Sign%20up.png)` | whatever the author typed | `[alt](<Sign up.png>)` |
| Resolves in Obsidian | yes | only if author already used `%20` | yes |
| Deterministic output | yes | no — two vaults diverge | yes |
| Parser change needed | no (already decodes) | yes — must retain a raw `imageRaw` | yes — must strip `<…>` |
| Cost | one-time cosmetic diff in `_index.md` on next round-trip | mixed encodings persist forever | least familiar syntax; more parser surface |

Option B is *closer* to shapes.md rule #3 ("raw refs are the source-of-truth") but does not fix the user's problem for refs already authored with spaces, which is most of melt's `_index.md`. Option A trades verbatim fidelity for a guarantee that **every** emitted ref works in both hosts.

**Tasks 2–4 below implement Option A.** If Leon picks B or C, stop and re-plan — the task bodies do not transfer.

### Note: `goto:` targets — verbatim, except for spaces (Task 5)

`serializeBlock` writes `el.gotoRaw` (parser.js:347), the verbatim authored string, which shapes.md rule #6 requires. Task 5 narrows "verbatim" by exactly one rule: **a space inside a markdown-link target is encoded.** Everything else — wiki-links, absolute URLs, anchors, path granularity, the author's choice of link syntax — stays byte-identical.

The wiki/markdown split is not a preference, it is two different grammars:

| Form | Spaces legal? | Action |
|---|---|---|
| `[[an evening with melt]]` | yes — Obsidian's own syntax, no URL grammar involved | **never touch.** Encoding would make it hunt for a file literally named `an%20evening...` |
| `[label](an evening with melt.md)` | no — CommonMark link destination; a raw space terminates it | **encode the target** |
| `[label](https://bit.ly/x)` | n/a — already a valid URL | never touch |
| `#anchor`, bare `note.md` | no spaces present | never touch |

### Note: `garden` is already inconsistent with rule #4

`lib/visualizers/garden/parser.js:214` tokenizes attributes on `/\s+/`, so `src:Contact us.png` cannot parse — garden already *requires* an encoded ref. This is corroborating evidence that rule #4 is the outlier, but **garden is out of scope for this plan**. Record it in TECH-DEBT (Task 3) rather than fixing it here.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `lib/visualizers/scene-nav/decode.js` | **create** | Pure `safeDecode` + `encodeRef`. No imports. |
| `lib/visualizers/scene-nav/decode.test.js` | **create** | Co-located unit tests for both helpers. |
| `lib/visualizers/scene-nav/parser.js` | modify (65, 321, 333) | Use `safeDecode` on parse; `encodeRef` on serialize. |
| `lib/visualizers/scene-nav/resolve.js` | modify (26) | Use `safeDecode`. |
| `lib/visualizers/scene-nav/scene-nav.test.js` | modify | Round-trip + crash regression tests. |
| `lib/visualizers/scene-nav/schema.md` | modify | Document the emitted encoding. |
| `docs/architecture/shapes.md` | modify (369–371, 376–382) | Amend conventions #4 and #6. |
| `docs/implementation-plans/2026-07-21_scene-nav-builder-rework-and-resolution.md` | modify (56, 110) | Mark the superseded lines. |
| `docs/implementation-plans/DECISIONS.md` | modify | New dated decision entry. |
| `docs/TECH-DEBT.md` | modify | New row for garden's `src:` grammar. |

Why a new `decode.js` rather than adding to `parser.js`: `resolve.js` currently has **zero imports** and is the reference example of a pure resolver in `visualizers.md:123`. Making it import from `parser.js` would couple the resolver to the parser for five lines. A third pure module is the established pattern in this shape (`link-target.js`, `overlays.js`).

---

## Task 1: Stop a literal `%` in a filename from crashing the build

A filename containing `%` (e.g. `50% off flyer.png`) makes `decodeURIComponent` throw `URIError: URI malformed`, which aborts the whole build with an error that names neither the file nor the shape.

**Files:**
- Create: `lib/visualizers/scene-nav/decode.js`
- Create: `lib/visualizers/scene-nav/decode.test.js`
- Modify: `lib/visualizers/scene-nav/parser.js:65`
- Modify: `lib/visualizers/scene-nav/resolve.js:26`

**Interfaces:**
- Produces: `safeDecode(value: string) => string` — percent-decodes, returning the input verbatim if it is not valid percent-encoding. Never throws.

- [ ] **Step 1: Write the failing test**

Create `lib/visualizers/scene-nav/decode.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { safeDecode } from './decode.js';

describe('safeDecode', () => {
  it('decodes valid percent-escapes', () => {
    expect(safeDecode('Sign%20up.png')).toBe('Sign up.png');
  });

  it('returns the input verbatim when the escape is malformed', () => {
    expect(safeDecode('50% off flyer.png')).toBe('50% off flyer.png');
  });

  it('leaves a string with no escapes untouched', () => {
    expect(safeDecode('Contact us.png')).toBe('Contact us.png');
  });

  it('never throws on a lone trailing percent', () => {
    expect(() => safeDecode('weird%')).not.toThrow();
    expect(safeDecode('weird%')).toBe('weird%');
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails for the right reason**

```bash
npx vitest run lib/visualizers/scene-nav/decode.test.js
```

Expected: FAIL — `Failed to resolve import "./decode.js"`. If it fails with any *other* message, stop and investigate; a test that fails for the wrong reason proves nothing.

- [ ] **Step 3: Create the helper**

Create `lib/visualizers/scene-nav/decode.js`:

```js
/**
 * Scene Nav — ref encoding helpers (pure, no imports).
 *
 * Kept separate from parser.js so resolve.js stays import-free (see visualizers.md
 * → "resolve.js — the only host-dependent seam").
 */

/**
 * Percent-decode a ref without ever throwing.
 *
 * `decodeURIComponent` throws URIError on a literal `%` that is not a valid escape —
 * "50% off flyer.png" is a plausible filename and used to abort the entire build with
 * an error naming neither the file nor the shape. An undecodable ref is far more likely
 * to be a literal percent than a typo, so returning it verbatim is also the correct
 * interpretation, not just the safe one.
 *
 * @param {string} value
 * @returns {string}
 */
export function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
npx vitest run lib/visualizers/scene-nav/decode.test.js
```

Expected: PASS (4 tests).

- [ ] **Step 5: Write the failing integration tests**

Append to `lib/visualizers/scene-nav/scene-nav.test.js`, inside the existing top-level `describe`:

```js
describe('literal % in a filename does not crash', () => {
  it('parses an element whose image ref contains a literal percent', () => {
    const src = '- [Flyer](media/50% off flyer.png)\n\t- at: 10, 20\n';
    expect(() => parse(src)).not.toThrow();
    expect(parse(src).elements[0].image).toBe('media/50% off flyer.png');
  });

  it('resolves an image ref containing a literal percent', () => {
    const index = { byBasename: {}, byVaultPath: {} };
    expect(() => resolveImageRef('media/50% off flyer.png', index)).not.toThrow();
    expect(resolveImageRef('media/50% off flyer.png', index))
      .toBe('media/50% off flyer.png');
  });
});
```

Note: `parse` and `resolveImageRef` are already imported at the top of that file — confirm before adding, and add to the existing import if not.

- [ ] **Step 6: Run and confirm both fail with `URIError: URI malformed`**

```bash
npx vitest run lib/visualizers/scene-nav/scene-nav.test.js
```

Expected: 2 FAIL, both `URIError: URI malformed`. This is the exact crash reproduced as a test.

- [ ] **Step 7: Apply `safeDecode` at both call sites**

In `lib/visualizers/scene-nav/parser.js`, add to the imports at the top of the file:

```js
import { safeDecode } from "./decode.js";
```

Then change line 65 from:

```js
  if (md) return { image: decodeURIComponent(md[2]), alt: md[1].trim() || null };
```

to:

```js
  if (md) return { image: safeDecode(md[2]), alt: md[1].trim() || null };
```

In `lib/visualizers/scene-nav/resolve.js`, add at the top (the file currently has no imports):

```js
import { safeDecode } from "./decode.js";
```

Then change line 26 from:

```js
  const decoded = decodeURIComponent(ref);
```

to:

```js
  const decoded = safeDecode(ref);
```

- [ ] **Step 8: Run the shape's full test suite**

```bash
npx vitest run lib/visualizers/scene-nav/
```

Expected: all PASS, including the 2 new integration tests.

- [ ] **Step 9: Confirm the bundle still builds**

`resolve.js` and `parser.js` are browser-bundled; a new import must not break the bundle.

```bash
node scripts/bundle-visualizers.js
```

Expected: completes with no error, scene-nav listed.

- [ ] **Step 10: Commit**

```bash
git add lib/visualizers/scene-nav/decode.js lib/visualizers/scene-nav/decode.test.js \
        lib/visualizers/scene-nav/parser.js lib/visualizers/scene-nav/resolve.js \
        lib/visualizers/scene-nav/scene-nav.test.js
git commit -m "fix(scene-nav): a literal % in a filename no longer crashes the build"
```

---

## Task 2: Builder emits percent-encoded image refs

**Gated on the Option A decision above.**

**Files:**
- Modify: `lib/visualizers/scene-nav/decode.js`
- Modify: `lib/visualizers/scene-nav/decode.test.js`
- Modify: `lib/visualizers/scene-nav/parser.js:321,333`
- Modify: `lib/visualizers/scene-nav/scene-nav.test.js`

**Interfaces:**
- Consumes: `safeDecode` from Task 1.
- Produces: `encodeRef(ref: string) => string` — percent-encodes each path segment of a vault-relative ref, preserving `/`. Absolute URLs and `data:` URIs pass through untouched.

- [ ] **Step 1: Write the failing test for `encodeRef`**

Append to `lib/visualizers/scene-nav/decode.test.js`:

```js
import { encodeRef } from './decode.js';

describe('encodeRef', () => {
  it('encodes spaces in a bare filename', () => {
    expect(encodeRef('Contact us.png')).toBe('Contact%20us.png');
  });

  it('encodes each path segment but keeps the separators', () => {
    expect(encodeRef('media/menu-images/Sign up for the next MELT.png'))
      .toBe('media/menu-images/Sign%20up%20for%20the%20next%20MELT.png');
  });

  it('leaves an already-safe ref untouched', () => {
    expect(encodeRef('media/Resources.png')).toBe('media/Resources.png');
  });

  it('leaves absolute URLs alone', () => {
    expect(encodeRef('https://example.com/a b.png')).toBe('https://example.com/a b.png');
    expect(encodeRef('//cdn.example.com/a b.png')).toBe('//cdn.example.com/a b.png');
  });

  it('leaves data URIs alone', () => {
    expect(encodeRef('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
  });

  it('encodes a literal percent so the result round-trips', () => {
    expect(encodeRef('50% off flyer.png')).toBe('50%25%20off%20flyer.png');
    expect(safeDecode(encodeRef('50% off flyer.png'))).toBe('50% off flyer.png');
  });
});
```

- [ ] **Step 2: Run and confirm it fails**

```bash
npx vitest run lib/visualizers/scene-nav/decode.test.js
```

Expected: FAIL — `encodeRef is not a function`.

- [ ] **Step 3: Implement `encodeRef`**

Append to `lib/visualizers/scene-nav/decode.js`:

```js
/**
 * Percent-encode a vault-relative image ref for emission into markdown.
 *
 * The builder's "Copy ::: block" output is pasted back into an Obsidian vault, where a
 * markdown link with literal spaces does not resolve — the author sees a broken image in
 * the editor even though the site builds correctly. Emitting the encoded form makes one
 * string work in both hosts. `parser.js` decodes on the way in, so this is symmetric and
 * the round-trip is stable.
 *
 * Encodes per path segment so `/` keeps separating folders. Absolute URLs and data: URIs
 * are already valid and are passed through untouched.
 *
 * @param {string} ref - a decoded ref, as held in the parsed model
 * @returns {string}
 */
export function encodeRef(ref) {
  if (!ref) return ref;
  if (/^(https?:)?\/\//.test(ref) || ref.startsWith("data:")) return ref;
  return ref.split("/").map(encodeURIComponent).join("/");
}
```

- [ ] **Step 4: Run and confirm the helper tests pass**

```bash
npx vitest run lib/visualizers/scene-nav/decode.test.js
```

Expected: PASS (10 tests).

- [ ] **Step 5: Write the failing round-trip test**

Append to `lib/visualizers/scene-nav/scene-nav.test.js`. `serializeBlock` must be in the imports — add it if absent.

```js
describe('builder round-trip emits Obsidian-resolvable image refs', () => {
  const block = [
    '::: scene-nav',
    'aspectRatio: 16/9',
    '',
    '- [Sign up](media/menu-images/Sign up for the next MELT.png)',
    '\t- at: 36.8, 37.8',
    '\t- scale: 23.8',
    '\t- goto: [Sign up](https://bit.ly/bodyworkjam)',
    ':::',
  ].join('\n');

  it('emits the image ref percent-encoded', () => {
    const out = serializeBlock(parse(block));
    expect(out).toContain('](media/menu-images/Sign%20up%20for%20the%20next%20MELT.png)');
    expect(out).not.toContain('](media/menu-images/Sign up for the next MELT.png)');
  });

  it('leaves the goto target verbatim', () => {
    const out = serializeBlock(parse(block));
    expect(out).toContain('- goto: [Sign up](https://bit.ly/bodyworkjam)');
  });

  it('round-trips to an identical model (stable, not lossy)', () => {
    const once = serializeBlock(parse(block));
    const twice = serializeBlock(parse(once));
    expect(twice).toBe(once);
    expect(parse(once).elements[0].image)
      .toBe('media/menu-images/Sign up for the next MELT.png');
  });

  it('accepts an already-encoded ref without double-encoding it', () => {
    const encoded = block.replace('Sign up for the next MELT.png',
                                  'Sign%20up%20for%20the%20next%20MELT.png');
    const out = serializeBlock(parse(encoded));
    expect(out).toContain('](media/menu-images/Sign%20up%20for%20the%20next%20MELT.png)');
    expect(out).not.toContain('%2520');
  });
});
```

The third test is the important one: it proves the model still holds a **decoded** ref, so resolution and basename lookup are unaffected.

- [ ] **Step 6: Run and confirm the first, third and fourth fail**

```bash
npx vitest run lib/visualizers/scene-nav/scene-nav.test.js
```

Expected: the "emits … percent-encoded" and "accepts an already-encoded ref" tests FAIL (output has literal spaces). The "leaves the goto target verbatim" test should already PASS — it is a guard against regressing behavior that is already correct.

- [ ] **Step 7: Apply `encodeRef` at both serializer sites**

In `lib/visualizers/scene-nav/parser.js`, extend the Task 1 import:

```js
import { safeDecode, encodeRef } from "./decode.js";
```

Change line 321 from:

```js
    lines.push(`- [${bg.alt || ""}](${bg.image})`);
```

to:

```js
    lines.push(`- [${bg.alt || ""}](${encodeRef(bg.image)})`);
```

Change line 333 from:

```js
    lines.push(`- [${el.alt || ""}](${el.image})`);
```

to:

```js
    lines.push(`- [${el.alt || ""}](${encodeRef(el.image)})`);
```

Do **not** touch line 347 (`el.gotoRaw`) or any other `goto` branch.

- [ ] **Step 8: Run the shape's full suite**

```bash
npx vitest run lib/visualizers/scene-nav/
```

Expected: all PASS. Pay attention to the pre-existing `embed-serializer.test.js` and `link-target.test.js` — neither should change.

- [ ] **Step 9: Run the whole suite for cross-shape regressions**

```bash
npm test
```

Expected: all PASS. Baseline on 2026-08-15 was **874 tests / 49 files**; the count should now be higher, and **nothing previously passing may fail**.

- [ ] **Step 10: Commit**

```bash
git add lib/visualizers/scene-nav/decode.js lib/visualizers/scene-nav/decode.test.js \
        lib/visualizers/scene-nav/parser.js lib/visualizers/scene-nav/scene-nav.test.js
git commit -m "feat(scene-nav): builder emits percent-encoded image refs so they resolve in Obsidian"
```

---

## Task 3: Update the docs that this contradicts

Skipping this task leaves `shapes.md` asserting the opposite of what the code does — the exact drift the SHAPE TRINITY rule exists to prevent.

**Files:**
- Modify: `docs/architecture/shapes.md:369-371, 376-382`
- Modify: `docs/implementation-plans/2026-07-21_scene-nav-builder-rework-and-resolution.md:56, 110`
- Modify: `lib/visualizers/scene-nav/schema.md`
- Modify: `docs/implementation-plans/DECISIONS.md`
- Modify: `docs/TECH-DEBT.md`

- [ ] **Step 1: Amend `shapes.md` convention #4**

Replace lines 369–371 with:

```markdown
4. **Refs are stored decoded and emitted encoded.** Parsers accept **both** literal spaces
   (`Contact us.png`) and `%20`, and hold the **decoded** form in the model, so basename
   resolution never has to think about encoding. Anything that *writes markdown back out* — a
   builder's export, a serializer — emits the **percent-encoded** form, because a markdown link
   with literal spaces does not resolve in Obsidian's editor. One emitted string then works in
   both hosts. *(Amended 2026-08-15; previously builders emitted literal spaces, which produced
   refs that built correctly but appeared broken in the vault.)*
```

- [ ] **Step 2: Amend `shapes.md` convention #6**

In lines 376–382, replace the parenthetical `(full path stays full path; basename stays basename, literal spaces)` with:

```markdown
(full path stays full path; basename stays basename; spaces are percent-encoded per #4)
```

Then replace the **note-links (`goto`) are preserved verbatim** sentence with:

```markdown
**Note-links (`goto`) are preserved verbatim, with one exception:** a space inside a
**markdown-link target** is percent-encoded, because a raw space terminates a CommonMark link
destination and the link would not resolve in Obsidian. **Wiki-links are never re-encoded** —
`[[an evening with melt]]` is Obsidian's own syntax, where spaces are legal and `%20` would make
it hunt for a file literally named `an%20evening...`. Absolute URLs, anchors, the author's choice
of link syntax, and path granularity all stay byte-identical.
```

- [ ] **Step 3: Mark the superseded rationale**

In `docs/implementation-plans/2026-07-21_scene-nav-builder-rework-and-resolution.md`, append to line 56 and line 110:

```markdown
**[SUPERSEDED 2026-08-15 — builders now emit `%20`; see 2026-08-15_image-ref-encoding-and-decode-safety.md]**
```

Do not delete the lines. They are the historical record of why the original choice was made.

- [ ] **Step 4: Document the emitted form in the shape's own schema**

In `lib/visualizers/scene-nav/schema.md`, in the section describing image refs, add:

```markdown
**Encoding.** Write image refs either way — `[alt](Contact us.png)` or
`[alt](Contact%20us.png)`; both parse to the same thing. The builder's
"Copy ::: block" always emits the **encoded** form, so the block you paste back
resolves in Obsidian's editor as well as on the site. `goto:` targets are
emitted **verbatim**, exactly as authored.
```

- [ ] **Step 5: Make the rule reach future shapes, not just scene-nav**

The canonical `schema.md` template is still an open question (`shapes.md` → "Open architectural
questions" → #3). Bake the round-trip requirement into its `## Builder` line now, so the next shape
with a GUI inherits it instead of rediscovering this bug.

In `docs/architecture/shapes.md`, change line 756 from:

```
## Builder (does this shape have a GUI author? where it lives, what core it reads/writes)
```

to:

```
## Builder (does this shape have a GUI author? where it lives, what core it reads/writes,
##   and — if it exports markdown — confirmation that its output re-opens in Obsidian)
```

- [ ] **Step 6: Add the decision entry**

Append to `docs/implementation-plans/DECISIONS.md`:

```markdown
## 2026-08-15 — Builders emit percent-encoded image refs

**Decision:** A shape that writes markdown back out emits image refs percent-encoded
(`Sign%20up.png`). Parsers continue to accept both forms and store the decoded form.
`goto:` note-links remain verbatim.

**Supersedes:** the 2026-07-21 "literal spaces are the authored form" rule
(`shapes.md` convention #4).

**Rationale:** the original rule's goal was "the author never has to think about
encoding." In practice the opposite happened: a literal-space ref does not resolve in
Obsidian's editor, so melt's `_index.md` showed broken images in the vault while the
site built fine. Obsidian itself writes `%20` in "Use [[Wikilinks]]: off" mode, so the
encoded form is what the authoring tool round-trips natively. Encoding on the way out
and decoding on the way in is symmetric and keeps resolution encoding-agnostic.

**Also fixed:** `decodeURIComponent` was unguarded in `parser.js` and `resolve.js`, so a
filename with a literal `%` (`50% off flyer.png`) aborted the build with
`URIError: URI malformed`. Now routed through a `safeDecode` helper.
```

- [ ] **Step 7: Add the garden TECH-DEBT row**

Append a row to `docs/TECH-DEBT.md`:

```markdown
### garden `src:` attribute cannot hold a filename with spaces

`lib/visualizers/garden/parser.js:214` tokenizes attributes on `/\s+/`, so
`src:Contact us.png` parses as `src:Contact` plus a stray `us.png` flag. Garden
therefore already requires an encoded ref, unlike every other shape, and it does
so silently — there is no warning, the image just goes missing.

**How to check:** author a garden element with `src:` pointing at a file whose name
contains a space; confirm the rendered `<img>` src is truncated at the first space.

**Fix direction:** accept a quoted value (`src:"Contact us.png"`) and/or decode `%20`,
matching shapes.md convention #4. Not urgent — no live site hits it today.
```

- [ ] **Step 8: Commit**

```bash
git add docs/architecture/shapes.md docs/TECH-DEBT.md \
        docs/implementation-plans/DECISIONS.md \
        docs/implementation-plans/2026-07-21_scene-nav-builder-rework-and-resolution.md \
        lib/visualizers/scene-nav/schema.md
git commit -m "docs(shapes): builders emit percent-encoded image refs (amends convention #4)"
```

---

## Task 4: Verify end-to-end on melt

Unit tests prove the helpers. This proves the actual site is unchanged — the Multi-Site rule requires it, and `_index.md` is the only live consumer.

**Files:** none modified. This task is verification only.

- [ ] **Step 1: Capture the current rendered output as a baseline**

The dev-server rule: stop any running server before editing, restart after. Nothing is edited in this task, so a single run is fine.

```bash
pkill -f "dev-local.js"; pkill -f "eleventy --serve"
npm run dev:melt
```

Wait for `Server at http://localhost:8080/`, then in a second terminal:

```bash
curl -s http://localhost:8080/ -o /tmp/home-after.html
grep -o 'data-value="[^"]*"' /tmp/home-after.html | sort -u
grep -oE '<img src="[^"]*"' /tmp/home-after.html | sort -u
```

Expected — **identical to the 2026-08-15 baseline below.** The site output must not change at all; only the builder's clipboard export changes.

```
data-value="/about/"
data-value="/articles/an-evening-with-melt/"
data-value="/contact-us/"
data-value="/host-your-own-melt/"
data-value="/melt-maf/"
data-value="/resources/"
data-value="https://bit.ly/bodyworkjam"

<img src="/media/menu-images/About%20us.png"
<img src="/media/menu-images/An%20evening%20with%20MELT.png"
<img src="/media/menu-images/Contact%20us.png"
<img src="/media/menu-images/Host%20your%20own%20MELT.png"
<img src="/media/menu-images/MELT%20mutual%20aid%20fund.png"
<img src="/media/menu-images/Resources.png"
<img src="/media/menu-images/Sign%20up%20for%20the%20next%20MELT.png"
<img src="/media/optimized/melt-log-with-text-nav.webp"
```

If any line differs, **stop** — the render path was changed, which this plan does not intend.

- [ ] **Step 2: Verify the builder export by hand**

`_index.md` has `debug: on`, so the builder overlay loads on the melt homepage.

1. Open `http://localhost:8080/`.
2. In the builder panel, open the **Export** section and click **"Copy ::: block"**.
3. Paste into a scratch file.

Expected: every image ref is percent-encoded —

```
- [Sign up for the next MELT — a warm glowing bubble](media/menu-images/Sign%20up%20for%20the%20next%20MELT.png)
```

and every `goto:` is byte-identical to `_index.md`, including the already-encoded
`goto: [an evening with melt](an%20evening%20with%20melt.md)`.

This step needs a human at a browser. If you cannot drive it, **ask Leon to click it** — per CLAUDE.md's "Verify Before Fixing", that is the cheapest available step, not a reason to design around it.

- [ ] **Step 3: Confirm the pasted block resolves in Obsidian**

Paste the copied block into a scratch note in `/Users/lsanten/_local/GitHubLocal/melt-website/`. In Obsidian's reading view, the menu images should now render — they do not today. **This is the whole point of the change; do not mark Task 2 done without it.**

- [ ] **Step 4: Confirm no other site regresses**

scene-nav is melt-only today, so this should be a no-op — confirm rather than assume.

```bash
grep -rl "scene-nav" sites/*.yaml ../bloob-haus-marbles ../buffbaby 2>/dev/null | head
```

Expected: no hits outside melt. If there is a hit, build that site and repeat Step 1 against it.

- [ ] **Step 5: Stop the dev server**

```bash
pkill -f "dev-local.js"; pkill -f "eleventy --serve"
```

- [ ] **Step 6: Update `_index.md` to the encoded form (optional, and Leon's call)**

The vault is not rewritten automatically — the change only affects newly exported blocks. To make melt's existing homepage resolve in Obsidian today, paste the Step 2 output over the `::: scene-nav` block in `/Users/lsanten/_local/GitHubLocal/melt-website/_index.md`, then re-run Step 1 and confirm the rendered output is **still byte-identical** to the baseline.

Commit that in the **melt-website** repo, not this one.

---

## Task 5: Encode spaces in markdown-link `goto:` targets (never in wiki-links)

Closes the asymmetry left by Task 2: image refs would always paste back working, but a hand-typed
`goto: [x](an evening with melt.md)` would still be broken in Obsidian. Melt has no such `goto`
today — all seven are already safe — so this is a guarantee for future authoring, not a live fix.

**Run this task after Task 2 and before Task 3's commit**, so the doc amendment in Task 3 Step 2
describes code that already exists.

**Files:**
- Modify: `lib/visualizers/scene-nav/decode.js`
- Modify: `lib/visualizers/scene-nav/decode.test.js`
- Modify: `lib/visualizers/scene-nav/parser.js:347`
- Modify: `lib/visualizers/scene-nav/scene-nav.test.js`

**Interfaces:**
- Consumes: `encodeRef` from Task 2.
- Produces: `encodeGotoRaw(raw: string) => string` — returns the authored `goto` string with spaces
  percent-encoded **only** inside a markdown-link target. Wiki-links, absolute URLs, anchors and
  bare values pass through byte-identical.

- [ ] **Step 1: Write the failing test**

Append to `lib/visualizers/scene-nav/decode.test.js`:

```js
import { encodeGotoRaw } from './decode.js';

describe('encodeGotoRaw', () => {
  it('encodes spaces in a markdown-link target', () => {
    expect(encodeGotoRaw('[an evening](an evening with melt.md)'))
      .toBe('[an evening](an%20evening%20with%20melt.md)');
  });

  it('leaves the label untouched — only the target is encoded', () => {
    expect(encodeGotoRaw('[Sign up for the next melt](melt page.md)'))
      .toBe('[Sign up for the next melt](melt%20page.md)');
  });

  it('never re-encodes a wiki-link', () => {
    expect(encodeGotoRaw('[[an evening with melt]]'))
      .toBe('[[an evening with melt]]');
  });

  it('leaves an absolute URL alone', () => {
    expect(encodeGotoRaw('[Sign up](https://bit.ly/bodyworkjam)'))
      .toBe('[Sign up](https://bit.ly/bodyworkjam)');
  });

  it('leaves an anchor and a bare value alone', () => {
    expect(encodeGotoRaw('#our-philosophy')).toBe('#our-philosophy');
    expect(encodeGotoRaw('contact-us.md')).toBe('contact-us.md');
  });

  it('does not double-encode an already-encoded target', () => {
    expect(encodeGotoRaw('[x](an%20evening%20with%20melt.md)'))
      .toBe('[x](an%20evening%20with%20melt.md)');
  });

  it('preserves folder granularity', () => {
    expect(encodeGotoRaw('[_index](Resources/sub folder/_index.md)'))
      .toBe('[_index](Resources/sub%20folder/_index.md)');
  });
});
```

The "does not double-encode" case is the one to watch: `encodeRef` runs `encodeURIComponent` per
segment, which would turn `%20` into `%2520`. It is safe here only because the target is decoded
first — see the implementation.

- [ ] **Step 2: Run and confirm it fails**

```bash
npx vitest run lib/visualizers/scene-nav/decode.test.js
```

Expected: FAIL — `encodeGotoRaw is not a function`.

- [ ] **Step 3: Implement `encodeGotoRaw`**

Append to `lib/visualizers/scene-nav/decode.js`:

```js
/**
 * Encode spaces inside a markdown-link `goto:` target, leaving everything else verbatim.
 *
 * Two grammars, two rules (shapes.md → "Authoring & resolution conventions" #6):
 *
 *   [[an evening with melt]]          wiki-link — Obsidian's own syntax. Spaces are legal and
 *                                     `%20` would make it hunt for a file literally named
 *                                     "an%20evening...". NEVER touched.
 *   [label](an evening with melt.md)  CommonMark link destination — a raw space terminates it,
 *                                     so the link does not resolve in Obsidian. Target encoded.
 *
 * Absolute URLs, anchors and bare values are already valid and pass through untouched. The label
 * is never modified — only the target inside the parentheses.
 *
 * @param {string} raw - the authored goto string, exactly as typed
 * @returns {string}
 */
export function encodeGotoRaw(raw) {
  if (!raw) return raw;
  const md = raw.match(/^\[(.*?)\]\((.+)\)$/);
  if (!md) return raw; // wiki-link, anchor, bare value — all verbatim

  const [, label, target] = md;
  if (/^([a-z][a-z0-9+.-]*:|\/\/|#|\?)/i.test(target)) return raw; // scheme, anchor, query

  // safeDecode first so an already-encoded target does not become %2520.
  return `[${label}](${encodeRef(safeDecode(target))})`;
}
```

- [ ] **Step 4: Run and confirm the helper tests pass**

```bash
npx vitest run lib/visualizers/scene-nav/decode.test.js
```

Expected: PASS (17 tests).

- [ ] **Step 5: Write the failing integration test**

Append to the `describe('builder round-trip emits Obsidian-resolvable image refs')` block created
in Task 2:

```js
it('encodes a hand-typed goto with literal spaces', () => {
  const src = [
    '::: scene-nav',
    '',
    '- [Evening](media/An evening.png)',
    '\t- at: 10, 20',
    '\t- goto: [an evening](an evening with melt.md)',
    ':::',
  ].join('\n');
  const out = serializeBlock(parse(src));
  expect(out).toContain('- goto: [an evening](an%20evening%20with%20melt.md)');
});

it('leaves a wiki-link goto byte-identical', () => {
  const src = [
    '::: scene-nav',
    '',
    '- [Evening](media/An evening.png)',
    '\t- at: 10, 20',
    '\t- goto: [[an evening with melt]]',
    ':::',
  ].join('\n');
  const out = serializeBlock(parse(src));
  expect(out).toContain('- goto: [[an evening with melt]]');
  expect(out).not.toContain('%20]]');
});
```

- [ ] **Step 6: Run and confirm the first fails, the second passes**

```bash
npx vitest run lib/visualizers/scene-nav/scene-nav.test.js
```

Expected: the literal-spaces test FAILS; the wiki-link test PASSES already (it is a guard against
Task 5 breaking something that currently works).

- [ ] **Step 7: Apply it at the serializer**

In `lib/visualizers/scene-nav/parser.js`, extend the import:

```js
import { safeDecode, encodeRef, encodeGotoRaw } from "./decode.js";
```

Change line 347 from:

```js
    else if (el.gotoRaw) lines.push(`\t- goto: ${el.gotoRaw}`); // authored form (round-trips [label](note.md))
```

to:

```js
    // Authored form, round-tripped. Only spaces in a markdown-link target are encoded —
    // wiki-links stay byte-identical. See encodeGotoRaw.
    else if (el.gotoRaw) lines.push(`\t- goto: ${encodeGotoRaw(el.gotoRaw)}`);
```

Leave lines 348–349 (the `anchor` and bare `link` branches) alone — neither can carry a
markdown-link target.

- [ ] **Step 8: Run the shape's suite, then the whole suite**

```bash
npx vitest run lib/visualizers/scene-nav/
npm test
```

Expected: all PASS. Confirm `link-target.test.js` is untouched — routing is decided from the
*parsed* `value`, not from `gotoRaw`, so encoding must not change which tab a link opens.

- [ ] **Step 9: Confirm melt's seven real `goto`s are unchanged**

Every melt `goto` is already space-free or already encoded, so this must be a byte-for-byte no-op.

```bash
node -e "
import('./lib/visualizers/scene-nav/parser.js').then(({ parse, serializeBlock }) => {
  const fs = require('fs');
  const md = fs.readFileSync('/Users/lsanten/_local/GitHubLocal/melt-website/_index.md','utf-8');
  const block = md.slice(md.indexOf(':::'), md.indexOf('\n:::', md.indexOf(':::')+3)+4);
  const before = block.split('\n').filter(l => l.includes('goto:')).map(s => s.trim());
  const after  = serializeBlock(parse(block)).split('\n').filter(l => l.includes('goto:')).map(s => s.trim());
  const same = JSON.stringify(before) === JSON.stringify(after);
  console.log(same ? 'PASS — all goto lines byte-identical' : 'FAIL — diff:');
  if (!same) before.forEach((b,i) => b !== after[i] && console.log(' -', b, '\n +', after[i]));
});
"
```

Expected: `PASS — all goto lines byte-identical`.

- [ ] **Step 10: Commit**

```bash
git add lib/visualizers/scene-nav/decode.js lib/visualizers/scene-nav/decode.test.js \
        lib/visualizers/scene-nav/parser.js lib/visualizers/scene-nav/scene-nav.test.js
git commit -m "feat(scene-nav): encode spaces in markdown-link goto targets, never in wiki-links"
```

---

## Self-Review

**Spec coverage.** Both reported problems are covered: the `%` crash (Task 1) and the builder round-trip losing `%20` (Task 2). The doc conflict that neither of us knew about at the start is Task 3. End-to-end proof is Task 4. The `goto:` asymmetry that Task 2 would have left behind is Task 5 — markdown-link targets encoded, wiki-links never.

**Deliberately out of scope, each with a reason:**
- `garden`'s `src:` grammar — a different shape with a different (non-markdown-link) grammar; recorded as debt in Task 3 Step 6.
- `scripts/utils/transclusion-handler.js`'s own `safeDecode` — Node-only, cannot import from `lib/`; duplicating five lines is correct under Rule of Three.
- Writing a resolved URL into `goto:` when an element is created fresh in the GUI (no `gotoRaw`) — arguably violates shapes.md #3, but it is pre-existing, unrelated to encoding, and needs its own reproduction first.

**Type consistency.** `safeDecode(string) => string` and `encodeRef(string) => string` are used with those signatures in Tasks 1 and 2. `encodeRef` is always applied to `el.image` / `bg.image`, which `parseImageRef` guarantees is decoded.

**Risk.** Lowest-risk part is Task 1 (pure widening — nothing that worked stops working). Task 2 changes emitted bytes; the guard is Task 4 Step 1, which requires site output to be **unchanged**. If it differs, the change leaked into the render path, which it must not.
