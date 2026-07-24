# Melt Scene-Nav Builder — Next Round (bugs + undo + overlay)

**Status:** Updated 2026-07-23 (S66). For a FRESH session — prior sessions (S62–S65) grew very large.
**Branch/deploy:** builder v2 + S64 link fix + S66 work (below, `.button` contract, footer fade,
homepage spacing, per-page `background_image` override) are all on `main` as of commit `a5529af`,
pushed 2026-07-23. Deploy/live status on melt.bloob.haus not reconfirmed after this push — check before
assuming it's live.
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

## Done in S66 (2026-07-23)

### ✅ `.button` CTA contract implemented (theme was missing a Tier-1 requirement)
`docs/architecture/theme-standards.md` already documented `.button` as required in every theme's
`main.css` (author syntax in markdown: `[text](url){.button}` via `markdown-it-attrs`, already wired
into the pipeline) — melt just hadn't implemented it yet. Added `a.button` in
`themes/melt/assets/css/main.css`: a rose→purple gradient pill matching the homepage bubble-nav CTA
gradient, with a hover lift and a `focus-visible` outline. First real use: the new
`melt-website/resources/Playlists.md` page (5 Spotify links converted from plain links to buttons).

### ✅ Footer contrast fix — scoped white fade
Footer text sits directly on the fixed watercolor background photo (no scrim by design — see the
`.site-background` note above), so contrast varied by page/photo. Added a `.melt-footer::before`
gradient — solid white at the very bottom of the page, fading to transparent starting ~140px above the
footer — scoped to the footer band only, not a global veil over the content.

### ✅ Homepage logo — removed dead top space
`.home-wrapper` was `justify-content: center` + `padding-top: 80px`, vertically centering the logo
inside a `min-height: 100vh` box (pushing it further down than intended). Changed to
`justify-content: flex-start` + `padding-top: 45px` (tuned live in-browser) so the logo sits close
under the nav instead of mid-page.

### ✅ Per-page `background_image` override — shipped + actually wired into melt's content
This is the bloob-haus-wide feature Leon asked for below ("Additional add ons" → background_image
item) — the code existed uncommitted at the start of this session (`generatePageBackgrounds` in
`scripts/generate-background.js`, wired through `scripts/assemble-src.js` → `site.backgroundImages` →
`themes/melt/layouts/base.njk`'s `_pageBg` resolution) but hadn't been committed or connected to real
content. Committed + pushed this session. Melt now uses it: `_bloob-settings.md` sets the sitewide
`background_image` to the new BRIGHT variant, and `_index.md` (homepage) overrides it back to the
original MEDIUM variant via its own `background_image:` frontmatter.

### ✅ Pushed to `main`
`scene-nav-builder-rework` fast-forwarded into `main` on `bloob-haus-webapp` (commit `a5529af`, no
merge conflicts — main was a strict ancestor). `melt-website` content repo pushed to its `main` too
(Playlists content + the background/bio/settings edits that were already staged locally).

---

## Bugs (still to fix)

### B1 — Rotation grip doesn't persist — ✅ FIXED (S65)
**✅ Fixed (S65):** `browser.js` `initElement` now early-returns from mouseenter/mouseleave when the element
is inside an active builder scene (`el.closest('.scene-nav-container.snb-active, .scene-nav-wrapper.snb-active')`),
so hover no longer resets `transform` to the base rotation while editing. Runtime-bundle verified (guard
present); **needs a real-browser check**: rotate a bubble → release → rotation persists; close the builder →
hover glow still works live. Also this session: **mobile-edit clarity** — in 'edit mobile layout' the
Selected-element panel now shows only position/size/rotation (the props that actually diverge on mobile) +
a notice that glow/overlay/flip/label are desktop-shared.

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

### B2 — Marquee rubber-band selection is buggy (improved S65, still needs real-browser verify)
**S65 improvements (in, compiled):** `isEmptyTarget` widened from `=== container || bg-clip` to
`!e.target.closest('.scene-nav-el')` (so a press on the bg image / any non-bubble area starts a marquee),
and a **click on empty canvas now deselects all** (`mountMarquee` gained `onEmptyClick`). These address the
diagnosed `isEmptyTarget` misfire + missing deselect. **Still unverified in a real browser** — if the
rubber-band drag itself is still flaky, do the selection-overlay rewrite below (headless can't drag, so this
is the next-session task).

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

### B4 — Column width: nested shapes don't respect the page/folder column (NEW, deferred)
**Symptom:** on the Resources folder-index, the folder-preview bubbles + the search bar (and, on content
pages, the comments section) don't stick to the page's content column — they sit wider / aren't confined.

**Finding:** `themes/melt/assets/css/main.css` defines `--content-max-width: 680px`, but containers don't all
use it and don't impose it on nested shapes:
- `.folder-items-area` is capped at a separate `max-width: 640px` and wraps `{{ content | safe }}` — the
  nested `:::folder-preview`, `:::search`, and comments shapes render inside but set their own widths.
- `.page-content` uses `--content-max-width`, but comments/search render as their own blocks not constrained
  to it.

**Fix approach (decide scope):** a shape should govern the width of shapes nested in it. Give the page/folder
container one column token and make nested shapes (search, folder-preview, comments) inherit it (constrain
their wrappers to `var(--content-max-width); margin-inline:auto`). Decide **melt-only** (quick CSS in
`themes/melt`) vs a **bloob-haus-wide** convention for the `page` shape (a shared column token every theme's
page/folder layout applies + nested shapes respect) — the user wants the shared version eventually. Start
melt-local; lift to a shared convention when a 2nd theme needs it (Rule of Three).
**Verify:** Resources index — bubbles + search bar + comments all align to the prose column width.

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

**Color/strength model (S64, DONE + live):** `overlayColor` (default white) picks how the grayscale loop
reads — a LIGHT color → `screen` (bright ripples on dark art); a DARK color → `filter:invert(1)` + `multiply`
(dark caustics on light art, e.g. melt's watercolor bubbles). `overlayStrength` (0–100) → opacity. Pure
`resolveOverlay(id,{color,strength})` + `colorLuminance` in `overlays.js`. Melt's 7 bubbles use
`overlayColor:#3f3f3f`, `overlayStrength:55` (dark grey water). Also darkened the melt bg scrim 0.4→0.62
(`themes/melt/assets/css/main.css`) for white-text legibility. **Tune** hue/darkness per bubble via the
builder or by editing the vault.

**Phase B — builder GUI (S64, DONE + live):** the Selected-element panel has a "water overlay" control —
loop dropdown (None / `OVERLAYS` labels), color swatches (bright / dark grey / black + a color input) and a
strength slider. Edits `el.overlay`/`overlayColor`/`overlayStrength` and live-previews via `applyOverlayToDom`
(recomputes the renderer's CSS vars on the node); Copy ::: block round-trips them. **Needs real-browser
verification** (headless can't drive the builder): open with `debug: on` → ✎ Edit scene → select a bubble →
change overlay/color/strength → watch the live preview → Copy block includes the settings.

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


## Additional add ons from leon
- [ ] the heading h3 shoudl have color  #f1dbff
  - **Status (S66): still open.** `.page-body h3` currently uses `var(--color-accent-2)` (`#7a3f9e`,
    purple) — not `#f1dbff`. Not touched this session.
- [x] i would like for the `bloob.haus` in the footer to have a simialr font to how it shows up on `leons.bloob.haus` <a href="https://bloob.haus/" target="_blank" rel="noopener">bloob.haus</a>
  - **Status: already done** (pre-dates S66, confirmed still in place). `.melt-footer__credit a` in
    `themes/melt/assets/css/main.css` replicates the treatment: small-caps, `letter-spacing: 0.1em`,
    `font-weight: 700`, accent color, no underline. Satoshi isn't loaded in melt, so it uses the
    theme's own body font (Quicksand) instead — same visual rhythm, different face.
  - [ ]     --bg-color: #dce8f8;
  --banner-bg: #ffffff;
  --text-color: #333333;
  --text-light: #666666;
  --surface-text-color: #333333;
  --accent-color: #914c9a;
  --accent-dark: #6b2d73;
  --link-color: #914c9a;
  --link-hover: #4fd675;
  --border-color: rgba(145, 76, 154, 0.2);
  --card-bg: rgba(255, 255, 255, 0.85);
  --footer-bg: #ffffff;
  --zoom-overlay-bg: rgba(0, 0, 0, 0.85);
  --border-radius: 12px;
  --border-radius-sm: 6px;
  --font-body: "Nunito Sans", sans-serif;
  --font-heading: "Nunito Sans", sans-serif;
  --heading-h1-color: #303664;
  --heading-h3-color: #046d78;
  --spacing-xs: 0.5rem;
  --spacing-sm: 1rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  --spacing-xl: 3rem;
  --max-width: 840px;
  --pagefind-ui-scale: .8;
  --pagefind-ui-primary: #393939;
  --pagefind-ui-text: #393939;
  --pagefind-ui-background: #ffffff;
  --pagefind-ui-border: #eeeeee;
  --pagefind-ui-tag: #eeeeee;
  --pagefind-ui-border-width: 2px;
  --pagefind-ui-border-radius: 8px;
  --pagefind-ui-image-border-radius: 8px;
  --pagefind-ui-image-box-ratio: 3 / 2;
  --pagefind-ui-font: system, -apple-system, "BlinkMacSystemFont", ".SFNSText-Regular", "San Francisco", "Roboto", "Segoe UI", "Helvetica Neue", "Lucida Grande", "Ubuntu", "arial", sans-serif;
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
  text-align: center;
  font-size: 0.75rem;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  overflow-wrap: break-word;
  font-family: 'Satoshi', sans-serif;
  font-variant: small-caps;
  letter-spacing: 0.12em;
  font-weight: 700;
  color: var(--accent-color);
  text-decoration: none;

- [x] VERY IMPORTANT: DO FIRST: we need to have a higher contrast and ligther theme - i wodner two things: (Q1) can we make the background very light and then have the text on top for the whole theme be dark? (Q2) we could engineer a ligth dar mode / day mode thing for themes. becasue maybe someone wants to have it dark. but more importan is q1: we need to have the background canvas very bright and then dark text on top --> here is the new background with brigth: '/Users/lsanten/Library/CloudStorage/GoogleDrive-leon.santen@googlemail.com/.shortcut-targets-by-id/1Y4i8vxExCNMPz13xbWkTjMb-7gl_2Yzx/MELT materials/MELT Website/Images/MELT website background-BRIGHT-MEDIUM-SIZE.png.jpg' i think we need to copy paste it into the vault and update teh background vault reference (ACTUALLY I ALREADY RELINKED IT NOW)
  - **Status (S66): Q1 done.** Melt's text-on-light design was already the theme's default (deep
    plum `#2e1a3d` on pale mint `#d8f9d5`) — Q1 was about the background *photo* being bright enough,
    not the color system. `melt-website/_bloob-settings.md` now points `background_image` at
    `MELT website background-BRIGHT-MEDIUM-SIZE.png.jpg` (relinked as Leon noted, file committed +
    pushed to the content repo this session). **Q2 (light/dark theme toggle) still open** — explicitly
    lower priority per Leon's own note; no work done on it.

- [x] i want to add the general featuer (this could be bloob haus wide and would amek sense for themes that have backgorund iamges and also in general for a a theme), i you set the `background_image: "[[MELT website background-MEDIUM-SIZE.png.jpg]]"` in the YAML of a file, it should use that background image. we have the brither backgroundimage for he general theme set in the bloob-settings and then i have the other background image for the langind page. we need to make sur athat this overwrite functionality of the background image works reliably
  - [x] look at the YAML of this file --> /Users/lsanten/_local/GitHubLocal/melt-website/_index.md
  - **Status (S66): done.** `scripts/generate-background.js` exports `generatePageBackgrounds`,
    called from `scripts/assemble-src.js` and exposed as `site.backgroundImages`;
    `themes/melt/layouts/base.njk` resolves a page's `background_image:` frontmatter against that map
    (falling back to the sitewide default) before rendering `.site-background`. Verified wired end to
    end: `melt-website/_index.md` sets `background_image: "[[MELT website background-MEDIUM-SIZE.png.jpg]]"`
    to override the sitewide BRIGHT default back to the original photo for just the homepage. This was
    built generically (reads any page's `background_image:` key, not melt-specific) so any theme with
    a background-image system can adopt the same pattern — **not yet promoted to
    `docs/architecture/settings-registry.md`** as a formal bloob-haus-wide setting; do that when a
    second theme actually uses it (Rule of Three).
