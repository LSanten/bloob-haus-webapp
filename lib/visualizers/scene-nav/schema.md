# Scene Nav

## What this shape is

Interactive image-map navigation: transparent PNGs positioned over a scene (optionally on
background layers). Elements glow on hover and act on click. v2 grammar (2026-07-20) — the
old ```scene-nav YAML code fence is **deprecated and no longer rendered** (the build warns).

## Activation

`::: scene-nav` block in the page body (container scope, `data-vis-raw` pipeline).
File-scope (`bloob-shape: scene-nav`) is not built yet.

## Fence format

````markdown
::: scene-nav
aspectRatio: 16/9
edgeFade: 0.05
mobile: breakpoint 768, aspectRatio 9/16
debug: on

- [alt text for the image](media/beach.png)
	- background
	- at: 25.1, 30
	- scale: 75
- [Resources — a glowing bubble](media/Resources.png)
	- at: 45.8, -3.6
	- scale: 18
	- rotation: 36
	- glow: #00E5FF
	- glowIntensity: 1.5
	- goto: [resources](Resources/index.md)
	- mobile:
		- at: 58, 10.3
		- scale: 29.5
:::
````

- **Header lines** (before the first bullet): `aspectRatio`, `edgeFade` (0–1, edge fade mask),
  `mobile: breakpoint N[, aspectRatio A/B]`, `debug: on` (mounts the builder overlay).
- **Top-level bullet = element.** The md-link label is the image **alt text** and default
  hover label; the target is the image (md-link, `[[wiki-link]]`, or bare path).
- **Nested bullets = properties**: `background` (bare flag — renders as a background layer),
  `at: x, y` (percent from top-left), `scale` (% of container width), `rotation` (deg),
  `glow` (#hex), `glowIntensity` (0.2–3), `goto`, `filter`, `onlyShowOn`
  (desktop/mobile), `flipH`/`flipV` (bare flags), `mobile:` (deeper bullets: `at`/`scale`/`rotation`).
- **`label` (tri-state)**: absent → the image's alt text (shown on hover); `label: false`/`off` →
  **no** hover label; `label: Custom text` → override.
- **`hoverGlow` / `hoverScale`** (v2.1): both default **on**; set `hoverGlow: off` to disable the
  hover glow and `hoverScale: off` to disable the hover enlarge, per element.
- **Boolean vocabulary**: any on/off attribute accepts `on`/`true` and `off`/`false`,
  case-insensitive (so authors don't hit syntax errors).
- **`goto:` derives the action**: internal md-link `[label](target.md)`, `[[wiki]]` link, or URL →
  link; `#id` → anchor scroll; `filter: tag` instead → in-embed filtering (Shopify). Internal links
  are resolved to final URLs by the build.

## Parsing rules

The shape owns its parsing (`parser.js`) — shape-named block, not YAML. Nesting = any
deeper leading whitespace (tabs or spaces; never a hardcoded tab width). CRLF input is
normalized. Unparseable blocks warn (`[scene-nav] v2 grammar parse error`) and render
nothing rather than throwing.

## Container-contents policy

Override: everything inside is scene-nav's grammar; there is no pass-through content.

## Placement system

Coordinates (`at: x, y` percentages + `scale`), with independent mobile-layout overrides.

## Builder

`builder/` — a debug-mode overlay, lazy-loaded only when a block sets `debug: on`
(bundled to `assets/js/visualizers/scene-nav-builder.js`, ESM). A collapsible right-hand
side panel with foldable sections: **Scene** (aspectRatio, edgeFade, mobile layout),
**Add image (mockup)**, **Elements** list, **Selected element** (x/y/scale/rotation sliders,
flip H/V, glow swatches + custom picker, glowIntensity, hover-glow / hover-enlarge /
show-label toggles, goto, show-on), **Background layers**, **Export**. Drag to position,
Shift+drag to scale; a hide/reopen toggle collapses the panel.

- **Mockup upload:** "Add image/background" adds a local object-URL preview element you can
  position immediately; the file is **not** written to the vault (a notice says so — add it
  to your media folder before publishing). Backend persistence is deferred to the webapp.
- **Export = Copy ::: block:** reproduces the **authored** grammar — raw image refs (basename
  or path, literal spaces), `label: false`, and the exact `goto: [label](note.md)` / `[[wiki]]`
  form (via the pre-resolution `data-vis-raw-source` capture), so it round-trips cleanly back
  into Obsidian. The Shopify embed export (`embed-serializer.js`) stays in the code but is not
  shown in this UI. Replaces the deleted `lib/magic-machines/scene-nav-builder` magic machine.

Dev loop: after editing builder code run `node scripts/bundle-visualizers.js`, then reload.

## Closed-state visual

Default wikilink pill (TBD — no custom closed-state renderer).

## Authors

- Leon Santen (bloob.haus)
