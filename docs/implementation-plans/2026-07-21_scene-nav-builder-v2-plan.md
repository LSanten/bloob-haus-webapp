# Scene-Nav Builder v2 Implementation Plan

> **For agentic workers:** implement task-by-task (checkbox tracking). Pure logic is TDD'd in `scene-nav.test.js`; DOM/interaction is verified with a full melt build + headless Chrome screenshot (`debug: on` mounts the builder). Spec: `2026-07-21_scene-nav-builder-rework-and-resolution.md` §9b.

**Goal:** Add icon-first entry, on-canvas resize/rotate handles, marquee + Cmd/Shift multi-select with group move/resize/rotate and relative bulk-edit, editable number fields, and mobile breakpoint/aspect-ratio fields + the cross-shape mobile-inheritance standard — to the scene-nav debug builder.

**Architecture:** Extract pure interaction logic into `builder/selection.js` (selection sets, marquee hit-test, range select, group transform math, mobile-state) so it is unit-testable in Node; keep DOM wiring in `builder/panel.js` + `builder/drag.js` + `browser.js`. Backwards compatible with the v1 grammar (no new grammar keys — this is builder-only, except docs).

**Tech Stack:** ESM, Vitest, esbuild (builder bundle). No new deps.

## Global Constraints

- Branch `scene-nav-builder-rework`; **do not push** (Leon reviews). Commit per task.
- Dev Server Rule: dev server stopped while editing; restart only to verify, then stop again.
- Only full-build **melt**; marbles verification = per-page build only.
- After editing `browser.js`/`builder/*`, run `node scripts/bundle-visualizers.js` before browser verification.
- Keep the existing 597 tests green; run `npx vitest run` before each commit.

---

## Plan A — interaction polish + mobile clarity

### Task A1: Pure selection + mobile-state helpers (`builder/selection.js`)

**Files:** Create `lib/visualizers/scene-nav/builder/selection.js`; Test in `scene-nav.test.js`.

**Interfaces (Produces):**
- `elementsInRect(elements, rect)` — `elements: [{x,y,scale}]`, `rect:{x,y,w,h}` (all %) → array of indices whose center (`x + scale/2`, `y + scale/2`) is inside `rect`.
- `rangeSelect(count, anchor, target)` → array of indices from min..max inclusive.
- `toggle(set, i)` → new `Set` with `i` toggled.
- `mobileState(scene)` → `{ diverged: boolean, overrides: number }` — `diverged` true if `scene.mobile?.aspectRatio` is set and differs from `scene.aspectRatio`, OR any element/background has a non-empty `mobileOverride`; `overrides` = count of elements/bgs with mobileOverride.

- [ ] Write failing tests (each helper: 1–2 cases incl. edge — empty rect, single, full range, mobile same-vs-diverged).
- [ ] Implement the four pure functions.
- [ ] `npx vitest run lib/visualizers/scene-nav/scene-nav.test.js` green.
- [ ] Commit `feat(scene-nav): pure selection + mobile-state helpers`.

### Task A2: Group transform math (`builder/selection.js`)

**Interfaces (Produces):**
- `groupBBox(elements, indices)` → `{x,y,w,h,cx,cy}` (union of each element's `x,y,scale`-square; `cx,cy` = center).
- `scaleGroup(elements, indices, factor)` → returns updated `[{i,x,y,scale}]`: each selected element's `scale*=factor` and its position scaled about the group center `(cx,cy)` so the arrangement grows/shrinks proportionally.
- `rotateGroupPositions(elements, indices, deg)` → rotates each selected element's center about the group center by `deg`, returns new `x,y` (element `rotation += deg` handled by caller).
- `moveGroup(elements, indices, dx, dy)` → each selected `x+=dx, y+=dy`.

- [ ] Write failing tests: `scaleGroup(factor=2)` doubles a two-element spread about center; `moveGroup` shifts both; `rotateGroupPositions(90)` maps a point right-of-center to below-center (within tolerance).
- [ ] Implement.
- [ ] Tests green. Commit `feat(scene-nav): group transform math (scale/move/rotate about group center)`.

### Task A3: Editable number inputs

**Files:** `builder/panel.js` (`slider()` helper).

- [ ] Replace the read-only `.snb-val` span in `slider()` with an `<input type="number">` bound to the same key: editing the number calls `writeVal` + `applyToDom` (and updates the slider position); dragging the slider updates the number. Keep the slider for coarse control.
- [ ] Verify via melt build + headless screenshot (number field editable next to slider). Commit `feat(scene-nav): editable number inputs for x/y/scale/rotation`.

### Task A4: On-canvas resize + rotate handles (single selection)

**Files:** Create `builder/handles.js` (mount grips over the selected element; pointer math); `builder/panel.js` wires it on `select()`.

**Interfaces (Produces):** `mountHandles(node, container, el, { onResize, onRotate })` → returns a cleanup fn; draws a resize grip (bottom-right) and a rotate grip (top). Resize: drag changes `scale` keeping the opposite (top-left) corner fixed; rotate: drag around the element center sets `rotation`. Writes via callbacks (which call `writeVal` + `applyToDom`).

- [ ] Implement `handles.js` (DOM grips + CSS injected in panel style block: `.snb-grip`, `.snb-grip-rotate`).
- [ ] Remove the Shift=scale branch from `drag.js` (`start.scaling`); body-drag = move only. Group-move added in B3.
- [ ] Bundle + melt build + headless screenshot (grips visible on selected bubble; drag resizes/rotates). Commit `feat(scene-nav): on-canvas resize + rotate handles; retire shift-drag scale`.

### Task A5: Icon-first entry + active outline

**Files:** `builder/index.js` (entry), `browser.js` (debug loader), `builder/panel.js` (mount/unmount, active outline).

- [ ] `browser.js` debug loader unchanged (still imports the builder bundle per `[data-scene-debug]` container), but the builder's default export now mounts an **"✎ edit" icon** anchored to the container corner (position:absolute within the container, or fixed relative to its bounds) instead of opening the panel.
- [ ] Clicking the icon calls `initPanel(container, scene)` for THAT container; opening a panel for one container closes any open panel (module-level `activePanel` teardown) and adds an `.snb-active` outline to the active container; ✕ tears down the panel and restores icons.
- [ ] Multiple `debug` blocks → multiple icons, one shared panel. Verify with a temporary second `::: scene-nav debug: on` block on a scratch page (or reason via code) — at minimum melt's single block: icon shows, click opens panel bound to it, ✕ closes to icon.
- [ ] Bundle + melt build + headless screenshot (icon state, then opened state). Commit `feat(scene-nav): icon-first builder entry + active-shape outline (fixes multi-block overlap)`.

### Task A6: Mobile breakpoint + aspect-ratio fields + state chip; inheritance standard

**Files:** `builder/panel.js` (Scene section), `renderer.js`/`parser.js` (confirm inheritance — likely no code change), `docs/architecture/shapes.md`, `lib/visualizers/scene-nav/schema.md`.

- [ ] In the Scene section: when `scene.mobile` exists, show **breakpoint** (`number`) and **mobile aspectRatio** (`text`, placeholder = desktop value) fields, editable (`scene.mobile.breakpoint`, `scene.mobile.aspectRatio`); an **"+ add mobile layout"** button when `scene.mobile` is null (creates `{breakpoint:768, aspectRatio:null, backgrounds:[]}`). Show a state chip from `mobileState(scene)`: "Mobile: same as desktop" vs "customized (N)".
- [ ] Confirm renderer already inherits desktop aspect-ratio when `mobile.aspectRatio` is null (`mobile.aspectRatio || aspectRatio`) — add a regression test if missing.
- [ ] `shapes.md`: add the **mobile-inheritance standard** (a mobile layout inherits desktop; diverges only on explicit mobile aspect-ratio or per-element overrides) near the conventions block. Fix **conventions point 6** (goto preserved verbatim, not normalized; images still normalize to markdown). `schema.md`: note the builder's mobile fields + state.
- [ ] Tests green (`npx vitest run`). Commit `feat(scene-nav): builder mobile fields + state chip; document mobile-inheritance standard + goto-verbatim fix`.

---

## Plan B — multi-select engine

### Task B1: Selection state in the panel + sidebar Cmd/Shift

**Files:** `builder/panel.js`.

- [ ] Replace the single `selected` index with a `selection` `Set<number>` + a `primary` (last-clicked) index. `select(i, {additive, range})` updates it (`toggle` for Cmd, `rangeSelect` for Shift, replace otherwise).
- [ ] Sidebar list: `onclick` reads `e.metaKey||e.ctrlKey` → additive, `e.shiftKey` → range. Selected `<li>`s get `.snb-sel`. Canvas element clicks likewise (metaKey → toggle).
- [ ] `wireCanvas` marks every element in `selection` with `.snb-sel-el`.
- [ ] Bundle + melt build + headless screenshot (Cmd/Shift multi-highlight in list). Commit `feat(scene-nav): multi-selection state (Cmd toggle, Shift range) in list + canvas`.

### Task B2: Marquee rubber-band select

**Files:** `builder/handles.js` or new `builder/marquee.js`; `builder/panel.js` wiring.

- [ ] Pointerdown on empty container area (not on a `.scene-nav-el`) starts a marquee: draw a `.snb-marquee` div sized to the drag rect; on pointerup, convert the pixel rect → % rect (via container box) and call `elementsInRect` → set selection; clear the marquee div.
- [ ] Bundle + melt build + headless screenshot (marquee selects a cluster). Commit `feat(scene-nav): marquee rubber-band selection on the canvas`.

### Task B3: Group move + relative sidebar (multi-selection)

**Files:** `builder/panel.js`, `builder/drag.js`.

- [ ] `drag.js`/wiring: dragging a selected element when `selection.size>1` moves the whole selection (`moveGroup` deltas applied to all, DOM updated for all).
- [ ] Panel "Selected" section: when `selection.size>1`, header shows "**N selected**" and renders **relative** controls — a **scale ×** stepper/slider (applies `scaleGroup(factor)` about the group center), a **rotate Δ°** control (`rotateGroupPositions` + each `rotation += Δ`), arrow/drag move — plus bulk toggles (glow color, hover glow, hover enlarge, show label) that write to every selected element. Single selection keeps the absolute fields from A3.
- [ ] Bundle + melt build + headless screenshot (N selected → proportional group resize). Commit `feat(scene-nav): group move + relative bulk-edit for multi-selection`.

### Task B4: Group transform handles (multi-selection)

**Files:** `builder/handles.js`.

- [ ] When `selection.size>1`, mount group grips on the group bounding box (`groupBBox`): resize grip → `scaleGroup`; rotate grip → `rotateGroupPositions` + rotation delta. Reuse the single-element handle visuals.
- [ ] Bundle + melt build + headless screenshot. Commit `feat(scene-nav): on-canvas group resize/rotate handles`.

---

## Close-out (after B4)

- [ ] `docs/CHANGELOG.md`: extend the S62 entry with the v2 builder iteration.
- [ ] Spec §9b status → implemented; `DECISIONS.md` entry for the mobile-inheritance standard + icon-first-entry precedent.
- [ ] `npx vitest run` (all green) + final melt build + headless screenshot.
- [ ] Commit docs. **Do not push.** Report branch state to Leon.

## Self-Review

- **Coverage:** icon-first (A5) ✓; handles single (A4) + group (B4) ✓; marquee (B2) ✓; Cmd/Shift select (B1) ✓; group move + relative bulk-edit (B3) ✓; editable numbers (A3) ✓; mobile fields + standard (A6) ✓; doc fixes (A6) ✓.
- **Types:** `selection:Set<number>` + `primary:number` consistent across B1–B4; `scaleGroup/moveGroup/rotateGroupPositions/groupBBox/elementsInRect/rangeSelect/mobileState` signatures fixed in A1–A2 and consumed unchanged in B.
- **Risk:** DOM interaction isn't unit-tested — mitigated by extracting pure logic (A1–A2, TDD) and headless-screenshot verification per DOM task. Icon-first changes the debug entry UX (was auto-open) — intended.
