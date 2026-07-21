# Scene-Nav Shape v2 + MELT Background Image — Design Spec

**Date:** 2026-07-20
**Status:** Approved design, pending implementation plan
**Driven by:** MELT homepage work (`../melt-website/_index.md`); benefits all sites

## Summary

Three pieces, in dependency order:

1. **Background image pipeline** (shared) — `background_image` in `_bloob-settings.md` → optimized webp → `site.backgroundImage`; melt theme renders it fixed full-bleed.
2. **Scene-nav shape v2** (shared) — new `::: scene-nav` nested-bullet grammar replacing the YAML code fence; shape-named block that owns its parsing (garden precedent). Old syntax deprecated and removed; the single legacy file is migrated.
3. **Scene-nav builder** (shared) — the `scene-nav-builder` magic machine is consolidated into `lib/visualizers/scene-nav/builder/` as a debug-mode overlay module. Magic machine deleted once export parity is reached.

Already shipped this session (context): logo md-link glob fallback in `resolveLogoUrl`, `site.logoAlt` alt-text transport, melt h1/tab-title/subtitle quick wins.

---

## 1. Background image pipeline

### Setting (universal, opt-in)

```yaml
# _bloob-settings.md
background_image: "[[MELT website background-MEDIUM-SIZE.png.jpg]]"
# or md-link form with alt text: "[a watercolor wash](background.png)"
```

### Build step (shared — new `scripts/generate-background.js`, called from assemble-src)

- Resolves the value with the same logic as logo/favicon (wiki-link glob, md-link with
  existence-check + glob fallback).
- Sharp-resize: **max width 1920px, webp quality 80** (`withoutEnlargement`). Expected output
  for the MELT source (2000×2000, 2.2 MB): ~200–400 KB.
- Output: `src-*/media/optimized/site-background.webp`, cached by content hash
  (`.background-hash`, same pattern as `.favicon-hash`).
- Exposes `site.backgroundImage` (URL string or null) in `_data/site.js`.
- Backwards compatible: no `background_image` key → step is a no-op, `site.backgroundImage`
  is null, no theme change activates.

### Melt theme consumption

- `base.njk` (or head partial): when `site.backgroundImage` is set, emit a
  `--site-background-image` custom property / inline style.
- CSS: fixed-attachment full-bleed cover layer behind all content (implemented as a
  `position: fixed; inset: 0; z-index: -1` element — NOT `background-attachment: fixed`,
  which is broken on iOS Safari).
- Blend modes: text/nav elements may use `mix-blend-mode` over the image (Photoshop-style).
  Tuning happens in melt's `main.css` during implementation; not a pipeline concern.

### Registry

Add `background_image` to `docs/architecture/settings-registry.md` under Universal (opt-in;
themes decide how/whether to render it — melt is the first consumer).

---

## 2. Scene-nav shape v2

### Grammar (shape-named block — scene-nav owns its parsing)

````markdown
::: scene-nav
aspectRatio: 16/9
edgeFade: 0.05
mobile: breakpoint 768, aspectRatio 9/16
debug: on

- [A watercolor beach scene](../media/background-beach.png)
	- background
	- at: 25.1, 30
	- scale: 75
- [Resources — a glowing bubble](Resources.png)
	- at: 45.8, -3.6
	- scale: 18
	- rotation: 36
	- glow: #00E5FF
	- glowIntensity: 1.5
	- goto: [Resources](Resources/index.md)
	- mobile: at 58, 10.3 · scale 29.5
:::
````

**Rules:**

- **Header lines** (before the first `-` top-level bullet): `key: value` scene-wide settings —
  `aspectRatio`, `edgeFade`, `mobile:` (compact `breakpoint N, aspectRatio A/B`), `debug`.
- **Top-level bullet = one element.** Its content is an image reference: md-link
  `[alt text](path.png)` (preferred — clickable in Obsidian, label becomes alt text AND
  default hover label), wiki-link `[[path.png]]`, or bare filename.
- **Nested bullets = element properties.** Any deeper indentation (tabs OR spaces, any width)
  counts as nesting — never hardcode tab width (garden parsing rule).
  - `background` (bare flag) — this element is a background layer, not an interactive element
  - `at: x, y` — percentages from top-left (replaces separate `x:`/`y:`)
  - `scale: n` — width as % of container
  - `rotation: deg`
  - `glow: #hex` / `glowIntensity: n`
  - `label: text` — hover label override (default: md-link label)
  - `goto:` — md-link/wiki-link to a vault page (resolved to final URL by the existing
    markdown/wiki link resolvers at preprocess time), an external URL, or `#anchor-id`.
    Replaces the old `action`/`value` pair; action is inferred (internal/external link vs anchor).
  - `filter: tag` — optional, kept for the Shopify embed use case (in-embed product filtering).
    Not the default; internal-nav scenes use `goto:`.
  - `mobile: at x, y · scale n` — per-element mobile overrides (compact form; `·` or
    whitespace separated; keys `at`, `scale`, `rotation` accepted)
- **Alt text:** every element `<img>` renders with `alt` from the md-link label (empty label →
  `alt=""` decorative). Background layers always render `alt=""` + `aria-hidden`.

### Pipeline & scope

- Inline scope via `:::` container (the `inject-container-raw.js` / data-vis-raw pipeline —
  shared fence-boundary discovery only; grammar parsed by the shape's own `parser.js`).
- The old ```scene-nav code-fence + YAML path is **removed** (not kept alongside). Exactly one
  file uses it; it is migrated in this work. Old `x:`/`y:`/`action:`/`value:`/`backgrounds:`
  keys are not accepted by the new parser (build logs a clear "scene-nav v2 grammar" warning
  if a block fails to parse).
- File-scope (`bloob-shape: scene-nav` in frontmatter) is NOT built now — the melt homepage
  declares the block in the body per the shapes architecture (page identity stays
  `page`/`article`). Noted in schema.md as future.

### Files

```
lib/visualizers/scene-nav/
  manifest.json      updated (hybrid, authors[])
  schema.md          REWRITTEN to canonical template — includes fence-format + parsing-rules
                     sections (garden is the reference implementation)
  parser.js          REWRITTEN — nested-bullet grammar, tab/space tolerant
  renderer.js        updated — alt text, goto resolution, background layers
  browser.js         updated — glow/hover/actions; lazy-loads builder/ when debug: on
  styles.css         token-based (unchanged where possible)
  builder/           NEW — see §3
  scene-nav.test.js  rewritten alongside parser (TDD)
```

### Migration

- `bloob-haus-marbles/say-hello-to/the-core-family-of-studio-bloob.md` — rewritten to v2
  grammar (all fields carry over: backgrounds→`background` flag elements, mobile overrides,
  rotation, edgeFade; `action: link`/`value:` → `goto:`).
- `melt-website/_index.md` — the `%%`-commented draft becomes the live block (replacing
  `:::circular-nav`), using the images in `media/menu-images/`; `action: filter` entries
  become `goto:` links to their target pages.

---

## 3. Scene-nav builder (magic machine consolidation)

### Decision

The `scene-nav-builder` magic machine becomes the shape's builder module at
`lib/visualizers/scene-nav/builder/`. **The magic machine is deleted in this work cycle**
once export parity is confirmed. No standalone page is built now — the debug overlay covers
both authoring and the Shopify embed export.

### How it's served

- `debug: on` in the block → `browser.js` lazy-loads the builder module. Normal visitors
  never download builder code. The builder therefore ships per-site with the build — no new
  serving infrastructure, no central URL. (Marketplace/serving of builders rides the future
  `_bloob-shapes/` + `shapes.bloob.haus` rails already sketched in `shapes.md`; explicitly
  deferred.)

### What the builder does

- Full-height side panel over the real rendered scene: element list, selected-element
  properties (at/scale/rotation/glow/glowIntensity/label/goto/filter), scene settings
  (aspectRatio, edgeFade), mobile-layout mode toggle (edit mobile overrides at the mobile
  aspect ratio).
- Drag-to-position and resize directly on the canvas; values round-trip to the panel.
- **Export menu — two serializers, one data model:**
  1. **Copy `:::` block** — regenerates the v2 nested-bullet text for pasting into Obsidian
  2. **Copy embed HTML** — self-contained HTML/CSS/JS snippet (Shopify et al.), feature-parity
     with the magic machine's embed export (edge fade, mobile media query, filter mode)
- UI design follows the frontend-design skill guidance when built; it must not collide with
  theme CSS (scoped class prefix, own stylesheet loaded only with the builder).

### Parity checklist before deleting the magic machine

- [ ] Drag positioning, scale, rotation, glow controls
- [ ] Edge fade control
- [ ] Mobile layout mode (breakpoint, per-element overrides)
- [ ] Embed HTML export incl. filter mode (`or`/`and`)
- [ ] Import path: the debug overlay reads the current block (already parsed by the build) —
      replaces the magic machine's YAML re-import
- [ ] `lib/magic-machines/scene-nav-builder/` deleted; docs references updated
      (magic-machines.md, shapes.md status table)

---

## Testing & verification

- Parser: co-located `scene-nav.test.js` rewritten first (TDD) — grammar cases: md-link/
  wiki-link/bare images, tab vs space nesting, compact `mobile:` forms, `goto:` inference,
  background flag, alt-text extraction, malformed-block warning.
- Background step: unit test for resolution + a hash-cache test (pattern from favicon tests).
- End-to-end: melt dev build + headless Chrome screenshots (desktop and mobile viewport);
  verify alt attributes present in rendered HTML; verify builder loads only with `debug: on`.
- Migrated marbles file: build marbles site, screenshot the core-family page, compare against
  current rendering.

## Documentation obligations (end of implementation)

- `docs/architecture/settings-registry.md` — `background_image` (universal), scene-nav v2 keys
- `docs/architecture/shapes.md` — status table (scene-nav → builder ✓); magic-machine note
- `docs/architecture/magic-machines.md` — remove scene-nav-builder, note consolidation
- `lib/visualizers/scene-nav/DECISIONS.md` — grammar decisions, embed-export-as-serializer
- `docs/CHANGELOG.md`, `docs/implementation-plans/DECISIONS.md` (builder-consolidation
  precedent: "a magic machine whose output is a shape's fence is that shape's builder")
- `_bloob-settings.md` "All Possible Settings" table in both vault repos (manual)

## Out of scope (explicitly deferred)

- Standalone file://-openable builder page (thin wrapper exists as an option later — the
  module boundary makes it cheap; build when a real no-site authoring need appears)
- File-scope `bloob-shape: scene-nav`
- Builder marketplace / central serving of builders or shapes
- Goatcounter visitor counter + per-page comment/counter overrides (separate later work)
