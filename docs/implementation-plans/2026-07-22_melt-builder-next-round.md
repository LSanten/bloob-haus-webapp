# Melt Scene-Nav Builder — Next Round (bugs + undo + overlay)

**Status:** Updated 2026-07-22 (S64). For a FRESH session — prior sessions (S62–S64) grew very large.
**Branch/deploy:** builder v2 + the S64 link fix are on `main` and **deployed** (melt.bloob.haus live).
**Read first:** spec `2026-07-21_scene-nav-builder-rework-and-resolution.md` §9b + plan
`2026-07-21_scene-nav-builder-v2-plan.md`.
**Resume dev:** `npm run dev:melt` → localhost:8080 → click "✎ Edit scene". **Verify drag bugs in a REAL
browser — headless can't drag.**

---

## Done in S64 (2026-07-22)

### ✅ Deployed live
Fast-forwarded builder v2 (builder + image resolution) → `main` → **melt.bloob.haus is LIVE** (HTTP 200,
scene-nav homepage, 14 elements; vault already in sync).

**`debug: on` is currently live on the public page** — the "✎ Edit scene" pill shows to all visitors, with
the known B1/B2 bugs. Shipped "as is" for Leon's own testing. For a clean public site: set `debug: off` in
`melt-website/_index.md` and push the vault (webhook auto-rebuilds). No web-app change needed.

### ✅ Debug-mode gating — DECISION: deferred to backend
Idea: builder/debug should show only in local dev now, and later when logged-in with edit access. **Decision:**
the real "logged-in = edit access" gate needs the Phase-3 backend (auth) — building it now would be throwaway,
and the manual vault `debug` toggle already gives a clean public site. Build the real gate when the backend
lands (see `bloob-haus-cloud`).

### ✅ FIXED — folder-index link resolution (was the top-priority bug)
- **Symptom:** `goto: [_index](Resources/_index.md)` (and any markdown link to a folder index by its
  `_index.md` path) did NOT resolve to `/resources/` in the built/dev site, though Obsidian follows it fine.
- **Root cause (global, not scene-nav-specific):** `scripts/utils/file-index-builder.js` registered only the
  `<folder>/index` path alias for folder indexes. A `<folder>/_index` link missed that alias and fell back to
  the bare `_index` filename key — which **collides across every folder index** (last-write-wins) → resolved
  to the wrong folder. `resolveMarkdownLinks` (preprocess step 6e) and `resolveLink` both consume this index,
  so the bug hit all sites/shapes; scene-nav `goto` was just the visible case.
- **Fix (commit `c4357a2`):** register BOTH `<folder>/index` and `<folder>/_index` aliases for every folder
  index, regardless of on-disk spelling. Purely additive, backwards-compatible.
- **Tests:** TDD, 5 regression tests across `tests/utils/file-index-builder.test.js` and
  `tests/utils/markdown-link-resolver.test.js` (incl. a two-folder collision repro against a REAL
  `buildFileIndex`). 613/613 green.
- **Verified:** real melt build renders `data-value="/resources/"`; live site 12/12 samples after deploy.
- **Known adjacent limitation (NOT fixed, pre-existing):** the path-aware branch matches the raw
  (un-slugified) folder path, so folders whose **name has spaces** still fall back to the bare filename for
  path-qualified links. Same limitation already applied to `index.md`; this fix brings `_index` to parity.
  Fix later if a spaced-folder index link breaks (slugify the folder segment before lookup + tests).

### ✅ STARTED — F2 alpha-masked GIF overlay (Phase A landed; see F2 below)
Water loop asset pulled in + runtime rendering implemented this session. Builder dropdown (Phase B) pending.

---

## Bugs (still to fix)

### B1 — Rotation grip doesn't persist (resize does)
**Symptom:** dragging the top (rotate) grip rotates the element while held, but the rotation reverts on
release. The corner (resize) grip works and persists.

**Root cause (confirmed):** `lib/visualizers/scene-nav/browser.js` `initElement` adds `mouseenter` /
`mouseleave` handlers that write `el.style.transform`. On `mouseleave` it sets `transform =
baseTransform`, where `baseTransform` is the element's **original** `data-rotation` captured at init —
clobbering the rotation the builder just applied. Resize survives because it changes `style.width`, not
`transform`. The S63 click-block fix only blocked `click`, not hover.

**Fix:** gate browser.js's hover effect while a scene is in edit mode. Cleanest: early-return in the
`mouseenter`/`mouseleave` handlers when `el.closest('.scene-nav-container.snb-active, .scene-nav-wrapper.snb-active')`
(the builder already adds `.snb-active` to the active scene). Optionally suppress hover glow/scale
entirely while editing (distracting during layout). **Verify:** rotate a bubble → release → rotation
persists; then close the builder → normal hover glow still works on the live page.

### B2 — Marquee rubber-band selection is buggy
**Symptom:** click-drag on empty canvas to draw a selection rectangle "completely buggy, not working."

**Likely causes:** `handles.js` `mountMarquee` has a fragile event model — `isEmptyTarget` (target ===
container || bg-clip) misfires (the `.scene-nav-bg-clip` and any `<img>` intercept the target; elements'
`stopPropagation`), pointer-capture on the container conflicts with element drags, and z-index/overflow.

**Fix approach (use the `frontend-design` skill + WebSearch a proven pattern):** rewrite with a robust
model — a dedicated transparent **selection overlay** mounted over the artboard only while editing that
owns marquee pointer events, with elements still hit-testable for direct-drag; convert the pixel rect →
%-rect and feed the already-tested `elementsInRect` (selection.js). Draw the rect with
`requestAnimationFrame`. The selection **math is unit-tested and correct** — only the DOM wiring is
broken. **Verify interactively** (drag across a cluster → exactly the enclosed bubbles select).

### B3 — Background "flash of old background" on load — ✅ FIXED (S64)
**Symptom:** for a blink the old background (the `html --gradient` fallback) showed before the melt
watercolor `background_image` loaded in.

**Root cause:** `themes/melt/layouts/base.njk` paints the watercolor via an inline
`style="background-image:url(...)"` on `<div class="site-background">` — a CSS background image, fetched
LATE (low priority, only after the body div is parsed) with **no preload**. The optimized image is still
~1 MB (`/media/optimized/site-background.webp`, 1920×1920). Worse, `.site-background` had **no
background-color**, so the transparent div let the `html` gradient paint through until the image decoded.

**Fix (melt theme only, commit + deployed):**
- `themes/melt/partials/head.njk` — preload the bg image (`<link rel="preload" as="image"
  href="{{ site.backgroundImage }}" fetchpriority="high">`), so the fetch starts at first-byte. Same URL as
  the div → no double fetch.
- `themes/melt/assets/css/main.css` — give `.site-background` a `background-color` = the watercolor's own
  average tone `rgb(152, 209, 154)` (sampled from the image), so the div is **opaque from first paint** and
  the gradient can never show through; the scrim tints the placeholder to a sage matching the loaded photo.
**Verify (do in a real browser):** hard-reload with cache disabled + Slow-3G throttle → no gradient flash;
worst case a brief sage tone matching the photo, then the watercolor. Structural checks (preload present +
URL match + opaque placeholder) confirmed in the build.

---

## Features

### F1 — Undo / redo ("reverse last action")
A visible **"↶ Undo"** button in the panel (+ `⌘Z` / `⌘⇧Z`, and a redo button).

**Implementation:** an undo stack of scene snapshots. Add a `commit()` helper that pushes
`structuredClone(scene)` **before** each discrete mutation boundary — drag end, handle end (resize/rotate),
number-field change, add/remove element, bulk edit. Undo pops → replace `scene` contents → re-apply to the
rendered DOM (positions/scale/rotation/flip for every element) → `renderPanel()` + `wireCanvas()`. Cap the
stack (~50); push to a redo stack on undo. Watch the two-model split from Plan 3b: the builder edits the
**pre-resolution** scene (raw refs) — snapshot that same object.

### F2 — Alpha-masked animated overlay on scene elements

**Goal:** an optional looping overlay (a fine-tuned B&W moving-water loop) painted **only where an element's
artwork has opaque pixels** — the exact effect from the Studio Bloob shop (header logo + footer waterdog).
Curated, repo-owned loops; the user picks one per element from a short list — no uploads, no per-user tuning.

**Format decision (S64): GIF.** Leon already has the GIF-making pipeline (ffmpeg grayscale + contrast-crush +
crossfade-loop, documented in `bloobhaus-notes/studio-bloob-shop-dev/docs/footer-waterdog-overlay.md`), it's
proven to look good on phone, and the technique is format-agnostic. WebP would be ~5–10× smaller but isn't
worth diverging the pipeline now — the CSS is identical, so swapping to WebP later is a file swap.

**Proven technique (self-contained CSS, no JS)** — from `footer.liquid`:
```css
.el::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: url(<loop.gif>) center / cover;      /* animated loop fills the box */
  -webkit-mask-image: url(<element artwork>);       /* clip to the artwork's ALPHA */
          mask-image: url(<element artwork>);       /* opaque px show loop, transparent hides it */
  -webkit-mask-size: contain; mask-size: contain;
  -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
  -webkit-mask-position: center; mask-position: center;
  mix-blend-mode: screen;                           /* GIF's black bg vanishes; bright ripples show */
  opacity: .7;
}
```
`mask-image` on a transparent PNG masks by ALPHA (opaque → show). `screen` needs a dark/B&W loop over lighter
art (melt's watercolor bubbles qualify); near-white art would need `filter: invert(1)` + `mix-blend-mode:
multiply` instead.

**Phase A — runtime rendering (DONE this session):**
- **Asset:** `lib/visualizers/scene-nav/assets/overlays/water.gif` (pulled from the Studio Bloob CDN,
  190×107 B&W loop, ~500 KB). `bundle-visualizers.js` already copies `<shape>/assets/**` → served at
  `/assets/visualizers/scene-nav/overlays/water.gif` (no pipeline change needed).
- **Registry:** `lib/visualizers/scene-nav/overlays.js` — `OVERLAYS` map (id → file/label/opacity/blend) +
  pure `resolveOverlay(id)` → `{ url, opacity, blend, label } | null`. Single source of truth for renderer
  and the future builder dropdown. Currently one entry: `water`.
- **Grammar (per element):** `overlay: <id>` (e.g. `overlay: water`); default none. Fits the v2.1 vocab.
  Parser reads it; `serializeBlock` round-trips it (`- overlay: water`).
- **Renderer:** when `el.overlay` resolves, add class `has-overlay` and emit CSS custom props on the
  `.scene-nav-el`: `--snb-overlay` (loop url), `--snb-overlay-mask` (the element's own resolved image),
  `--snb-overlay-opacity`, `--snb-overlay-blend`. All styling in `styles.css`'s `.scene-nav-el.has-overlay::after`
  (renderer stays a pure string fn). `isolation: isolate` on `.has-overlay` keeps `screen` contained to the
  bubble. `@media (prefers-reduced-motion: reduce)` hides the `::after` — the clean "off" (a GIF can't be
  CSS-paused; hiding the overlay layer is the disable).
- **Tests (TDD):** `overlays.js` resolution, parser `overlay` key + serialize round-trip, renderer emits
  `has-overlay` + vars only when set. Full suite green.

**How to try it:** add `- overlay: water` under any bubble in `melt-website/_index.md`, `npm run dev:melt`.

**Phase B — builder GUI (NOT done):** an "Overlay" dropdown in the element panel (None / registry labels),
sourced from `OVERLAYS`; on change set the same CSS vars live for instant preview + write `overlay: <id>` to
the grammar. Reuse the existing panel control pattern (glow/flip/hover toggles).

**Scope guard (v1):** elements only (not backgrounds); one curated loop to start; no per-user tuning/upload.
Add more loops by dropping a file in `assets/overlays/` + a registry entry. Author more B&W loops with the
ffmpeg recipe in the Studio Bloob doc (seamless crossfade loop is what kills the visible "clip").

**Verify:** a bubble with `overlay: water` shows moving water only on its artwork, nothing on the transparent
area; looks right on phone; no overlay bleed onto the page bg; reduced-motion hides it; `npx vitest run` green.

**Reference:** `bloobhaus-notes/studio-bloob-shop-dev/sections/footer.liquid` (~lines 51–84) +
`docs/footer-waterdog-overlay.md` (incl. the seamless-loop ffmpeg recipe & the pure-ASCII `.liquid` gotcha).

---

## Polish / carried-over follow-ups
- **Melt `mobile: aspectRatio 9/16`** — decide keep-portrait-&-tune vs drop so mobile mirrors desktop
  (the builder chip already flags it "customized").
- **Real-browser verification pass** of ALL builder drag interactions (rotation persist, marquee, group
  move, group resize/rotate handles) — none were drag-tested (headless limitation).
- **Stale `src-melt` dev quirk:** repeated dev-server restarts can leave a stale processed `_index.md`
  (looks like a "duplicate scene"); `rm -rf src-melt _site && npm run dev:melt` clears it. Optional:
  add a `--clean` flag to `dev-local.js` that wipes the per-site src dir (re-copies media) on startup.
- **Pill/label polish:** confirm the green "editing" pill text/label reads clearly at all sizes.

## Resources
- **`frontend-design` skill** — invoke for B2's interaction UI, the F2 Phase-B dropdown, and any
  handle/marquee visual polish.
- **WebSearch** — available; use for a robust rubber-band-selection / transform-handle reference.
- Pure logic (`builder/selection.js`: `elementsInRect`, `groupBBox`, `scaleGroup`, `rotateGroupPositions`,
  `moveGroup`, `mobileState`) is tested — reuse it; bugs live in the DOM wiring (`handles.js`,
  `panel.js` `wireCanvas`/`refreshHandles`, `mountMarquee`).

## Definition of done
Rotation persists on release; marquee selects exactly the enclosed bubbles; undo reverses the last action;
no background-flash on load; F2 overlay usable from the builder dropdown; all verified in a real browser;
suite green (`npx vitest run`); then decide merge/push.
