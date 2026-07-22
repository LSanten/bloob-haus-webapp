# Melt Scene-Nav Builder — Next Round (bugs + undo)

**Status:** Planned 2026-07-22. For a FRESH session — the prior session (S62–S63) grew very large.
**Branch:** `scene-nav-builder-rework` (unpushed, 16 commits, 608 tests). **Read first:** spec
`2026-07-21_scene-nav-builder-rework-and-resolution.md` §9b + plan `2026-07-21_scene-nav-builder-v2-plan.md`.
**Resume dev:** `npm run dev:melt` → localhost:8080 → click "✎ Edit scene". **Verify in a REAL browser —
headless can't drag**, and every bug below is a drag interaction.

---

## Bugs (must fix, found in hands-on testing)

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

---

## Feature

### F1 — Undo / redo ("reverse last action")
A visible **"↶ Undo"** button in the panel (+ `⌘Z` / `⌘⇧Z`, and a redo button).

**Implementation:** an undo stack of scene snapshots. Add a `commit()` helper that pushes
`structuredClone(scene)` **before** each discrete mutation boundary — drag end, handle end (resize/rotate),
number-field change, add/remove element, bulk edit. Undo pops → replace `scene` contents → re-apply to the
rendered DOM (positions/scale/rotation/flip for every element) → `renderPanel()` + `wireCanvas()`. Cap the
stack (~50); push to a redo stack on undo. Watch the two-model split from Plan 3b: the builder edits the
**pre-resolution** scene (raw refs) — snapshot that same object.

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
- **`frontend-design` skill** — invoke for B2's interaction UI + any handle/marquee visual polish.
- **WebSearch** — available; use for a robust rubber-band-selection / transform-handle reference.
- Pure logic (`builder/selection.js`: `elementsInRect`, `groupBBox`, `scaleGroup`, `rotateGroupPositions`,
  `moveGroup`, `mobileState`) is tested — reuse it; bugs live in the DOM wiring (`handles.js`,
  `panel.js` `wireCanvas`/`refreshHandles`, `mountMarquee`).

## Definition of done
Rotation persists on release; marquee selects exactly the enclosed bubbles; undo reverses the last action;
all verified in a real browser; branch still green (`npx vitest run`); then decide merge/push.
