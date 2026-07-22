# Scene-Nav Builder Rework + Ref Resolution — Design Spec

**Status:** ✅ Implemented 2026-07-21 (S62), branch `scene-nav-builder-rework`. All parts landed (grammar v2.1, image resolution, builder GUI, goto raw-preservation); only backend image-save for mockup upload remains deferred. See CHANGELOG S62.
**Supersedes/extends:** `2026-07-20_scene-nav-shape-v2-and-melt-background.md` (v2 grammar), `2026-07-20_scene-nav-v2-plan.md` (builder consolidation).
**Scope:** the `scene-nav` shape (`lib/visualizers/scene-nav/`), its debug-mode builder overlay, and the shared authoring/resolution conventions that this work makes explicit.

---

## 1. Problem & goals

Yesterday's session (S61) consolidated the scene-nav builder into a debug-mode overlay and shipped the v2 nested-bullet grammar. Working from that base, this effort has four goals:

1. **Restore the old magic-machine GUI's settings model** (the deleted `lib/magic-machines/scene-nav-builder/app/index.html`) inside the *new* on-page sidebar — its section organization, toggles, glow swatches, flip, show-on, etc. — but only the **bloob-haus-relevant** subset. Shopify-specific controls stay out of the UI (the embed export code stays, silent).
2. **Add new per-element controls:** hover-glow on/off, hover-enlarge on/off, and a label on/off (`label: false`).
3. **Make the builder round-trip the exact source grammar** ("Copy ::: block" reproduces what the author would have typed), including basename image refs and `[label](target.md)` links.
4. **Make basename-style refs actually resolve** in the build (the current `[Contact us](Contact us.png)` on the melt homepage 404s — verified), for images *and* note-links, wiki *and* markdown syntax.

### The bug that motivated the resolution work

The melt homepage `::: scene-nav` block mixes two conventions:

```
- [Sign up for the next MELT — …](media/menu-images/Sign up for the next MELT.png)   ← full path (works)
- [Contact us](Contact us.png)                                                        ← basename (404s today)
```

The attachment resolver only rewrites **image embeds** `![alt](x.png)` (leading `!`). Scene-nav deliberately writes **links** `[alt](x.png)` (no `!`, so Obsidian doesn't embed the image and clutter the source view). Those links fall through the general resolver untouched — so full paths only "work" by lining up with where media is copied (and only on the homepage; a scene-nav on a subpage would 404 on relative paths too), and basenames don't resolve at all. Note-links (`goto: [x](x.md)`) *do* get resolved to final URLs by the general pass — which is why the builder can't currently reproduce the `.md` source form.

---

## 2. The unifying insight

Three asks — "basename images resolve", "both wiki and markdown resolve", and "Copy ::: block reproduces my syntax" — collapse into **one architectural move:**

> **A shape owns resolution of its own refs.** Scene-nav keeps the *raw authored refs* (basename / `.md` / `[[wiki]]`) as its single source of truth, and resolves them to final URLs only for *rendered* output — never mutating the source-of-truth.

This is the natural corollary of the existing "a shape may own its parsing" principle (garden precedent, `shapes.md`). It yields, for free:

- ✅ basename images resolve (the Contact us fix)
- ✅ wiki and markdown link forms both resolve
- ✅ round-trip reproduces the exact authored grammar
- ✅ scene-navs work on subpages (root-relative resolved URLs, not fragile relative paths)

---

## 3. Authoring & resolution conventions (document these)

These conventions are **not scene-nav-specific** — they apply to every shape that carries links or images (garden has note-links too). Document them **once**, compactly, in `docs/architecture/shapes.md` and cross-link from `visualizers.md` (per the anti-sprawl rule — a few lines, linked, not restated).

1. **Dual link syntax, always.** Every shape that takes a link/image ref accepts **both** wiki `[[name]]` and markdown `[label](target)` forms, for images *and* note-links. Wiki is auto-enabled and handled gracefully (many authors use only wiki). Wiki carries no inline label → the label comes from a nested `label:` attribute (or defaults). Markdown carries the label as the link text.

2. **Basename-first resolution (the Obsidian model).** Refs resolve by **bare name, no folder**. Folders are added only to disambiguate when two files share a name (same rule Obsidian applies). Applies to images and note-links. Full/relative paths remain valid (backwards compatible).

3. **A shape resolves its own refs when the general pass can't.** When a shape's grammar uses link forms the general preprocessor skips (e.g. `[alt](x.png)` without `!`, chosen to keep Obsidian source uncluttered), the shape resolves them itself against the attachment/file indexes. Raw refs stay in the source-of-truth; resolution is a **render-time projection**, never written back.

4. **Literal spaces are the authored form; encoding is a render concern.** Authors (and the builder) write literal spaces (`Contact us.png`). The parser accepts both literal spaces and `%20` (decoding to a literal space internally). Proper URL-encoding happens **only** in the resolved output URL — the author never has to think about it.

5. **Tri-state attribute + boolean vocabulary (all shapes).** For any optional attribute: **absent → default**, **`false`/`off` → disable**, **`true`/`on` → enable**, **other value → override**. Both `false`/`off` and `true`/`on` are accepted (case-insensitive) everywhere, so authors don't hit syntax errors guessing the keyword. Distinct from **bare flags** (`- background`, `- flipH` → boolean true) and **keyed values** (`- at: x, y`).

6. **A write-face emits authorable, markdown-preferred output.** Whatever the builder produces must be something a human could have typed in Obsidian and that re-parses + re-renders identically. It preserves the authored **target** granularity (full path stays full path — the builder may have loaded from a real vault file; basename stays basename), but normalizes the **wrapper** to markdown `[label](target)` because that form is more expressive (carries the label inline).

---

## 4. Grammar changes (scene-nav v2.1 — additive, backwards compatible)

| Key | Form | Meaning | Default |
|-----|------|---------|---------|
| `label` | `label: false`/`off` \| `label: Custom` \| absent | tri-state: off / override / = alt text | alt text (hover label) |
| `hoverGlow` | `hoverGlow: false`/`off` | disable the hover glow for this element | on |
| `hoverScale` | `hoverScale: false`/`off` | disable the hover enlarge (the `scale(1.06)`) | on |
| image ref | `[[name.png]]` (wiki) also accepted | wiki image ref; label via nested `label:` | — |
| `goto` | `[[note]]` (wiki) also accepted | wiki note-link; resolves like markdown/bare/#anchor | — |

- `label: false`/`off` → **no** label span (today it would render the literal word "false" — a bug this fixes).
- `hoverGlow`/`hoverScale` flow: parser → element data → `data-hover-glow` / `data-hover-scale` attrs (renderer) → `browser.js` honors them → `serializeBlock` emits when off.
- Wiki forms flow through `parseImageRef` (already handles `[[...]]` for images) and a new `[[...]]` branch in `deriveAction` for `goto`.

---

## 5. Resolution design

**Source of truth = the raw authored block.** Scene-nav resolves its refs at render via a **resolution map** the preprocessor already has the data for: attachment `byBasename` / `byVaultPath` (images) + the note file-index `slug → url` (note-links). Resolved output URLs are properly encoded and root-relative.

Phased to de-risk (images are urgent and low-risk; goto raw-preservation touches more):

- **Phase A — images (low risk).** Scene-nav `[alt](x.png)` / `[[x.png]]` image refs already pass through the general resolver *untouched*, so their raw form already survives into the block. Add: (a) expose the resolution map to scene-nav's transform, (b) resolve each element/background image (basename-first, then vault-path, then verbatim fallback) to a root-relative encoded URL at render. Full paths and existing marbles content resolve identically (verbatim fallback guarantees no regression). **This alone fixes the Contact us 404 and makes both conventions resolve.**

- **Phase B — goto raw-preservation (higher risk).** Today the general pass resolves `goto: [x](x.md)` → `/x/` *before* scene-nav sees it, so the builder can't reproduce the `.md` source. Fix by feeding scene-nav the **pre-resolution** raw block as its source of truth (a generic, additive "capture raw `:::` content before link resolution" step — existing pipeline behavior unchanged, so marbles is unaffected), and having scene-nav resolve `goto` itself (basename/`.md`/`[[wiki]]`/`#anchor`/bare-URL) via the same map. The rendered `data-value` is identical to today; only the *builder's* serialized output gains fidelity.

> **Plan-level detail:** exact plumbing of the resolution map (a generated data file the transform reads, vs. resolving during preprocess with a raw-source hand-off) is for writing-plans. Hard constraint: **the marbles `say-hello-to/the-core-family-of-studio-bloob` scene-nav must render correctly (all images/links load) before and after** (multi-site rule). Note this page is at a *subpath*, so relative `media/x.png` refs may already be broken there — resolution to root-relative URLs likely *fixes* them rather than being a no-op. Verify in a marbles build; treat any change as an improvement to confirm, not a silent regression.

---

## 6. Builder GUI rework

Reorganize `builder/panel.js` into **collapsible sections** mirroring the old GUI's structure, in the existing right-hand on-page sidebar (keep the current push-body behavior — confirmed fine).

- **Panel chrome:** a **collapse/hide toggle** (chevron in the header → collapses to a thin edge tab; click to reopen; body reflows full-width when hidden).
- **Add (mockup upload):** "Add image" / "Add background" → file picker → local `object-URL` preview on the canvas → inserts a new element/background using the file's **basename** ref, so you can prototype and position elements immediately (as the old standalone machine allowed). A **persistent notice** makes the mockup nature explicit: *"local preview only — this image is not saved to your vault. Add the file to your vault's media folder before publishing."* (The **backend persistence** of the uploaded image is the only deferred part — see §9; the upload *UI + prototyping* is in scope now.) This gives the builder the "add element" capability it lacks today.
- **Scene section:** aspect-ratio (buttons), edgeFade (slider), mobile-layout toggle → breakpoint + mobile aspect ratio (the existing mobile-canvas switch stays).
- **Selected element section** (bloob-haus subset ported from old GUI): label (text) + **show-label toggle** (`label: false`), scale (slider), rotation (slider), **flip H / flip V**, **glow-color swatches + custom picker**, glow-intensity (slider), **hover-glow toggle**, **hover-enlarge toggle**, reset-rotation-on-hover (checkbox), goto (text), show-on (both/desktop/mobile, when mobile enabled).
- **Background section:** background list + per-bg transform (scale / x / y / rotation).
- **Export section:** **Copy ::: block** only. The **"Copy embed HTML (Shopify)" button and all Shopify-only controls are removed from the UI** (filter mode, image prefix, canvas colors). `embed-serializer.js` and its capability **stay in the code, silent** — reachable later, not shown now.

---

## 7. Round-trip serialization rules (`serializeBlock`)

- Emit markdown `[label](target)` for images and `goto` (normalize wiki → markdown).
- **Preserve the authored target** granularity: full path → full path; basename → basename; new refs → basename. (No `%20` — literal spaces.)
- `label`: emit `label: false` when off; emit `label: X` when overridden; omit when it equals alt.
- `hoverGlow: false` / `hoverScale: false` emitted only when off.
- Round-trips through `parse()` to an equivalent scene (positions, props, refs) that re-renders identically.

---

## 8. Docs & tests

- **schema.md** (scene-nav): document v2.1 keys (`hoverGlow`, `hoverScale`, `label` tri-state), wiki+markdown ref forms, and the shape-owns-resolution behavior.
- **shapes.md + visualizers.md:** add the compact "Authoring & resolution conventions" block (§3), linked not restated.
- **settings-registry.md:** add the new per-element keys.
- **DECISIONS.md:** record "shape owns resolution of its own refs; raw is source-of-truth, resolution is render-time"; and the tri-state/`false`-`off` vocabulary as a cross-shape convention.
- **CHANGELOG.md:** S62 entry.
- **Tests:** parser (new keys, wiki goto, tri-state, `false`/`off`), `serializeBlock` round-trip (images/goto/label/hover toggles, wiki→md normalization, path preservation), the image resolver (basename/vault-path/verbatim fallback), `browser.js` hover-toggle behavior. Keep the existing 570-test suite green; verify marbles + melt builds.

---

## 9. Deferred (out of scope here)

- **Backend persistence of uploaded images.** The upload *UI* (mockup preview + add-element + basename-ref insertion) is **in scope** (§6) for prototyping. What's deferred is actually **saving** the uploaded file: that belongs to the webapp backend, which must persist the image properly. Under the dev workflow the file is never written to the vault — the author places it manually (the persistent notice says so). Wire real persistence once the backend image-save exists.
- Scene-level hover defaults (per-element is enough for now).
- Playlists bubble image asset; mobile position tuning; scrim opacity — tracked in the melt project notes, unrelated to this rework.

---

## 9b. Builder v2 iteration (2026-07-21, same session — ✅ implemented)

A second round of builder UX, agreed after reviewing v1. Implemented per `…_scene-nav-builder-v2-plan.md` (pure logic TDD'd, DOM verified via headless-Chrome harness; single + multi-select confirmed).

- **Icon-first entry (multi-block clarity).** `debug: on` shows a small **"✎ edit" icon** anchored to each scene-nav artboard — **not** an auto-opened sidebar. Clicking opens one shared sidebar **bound to that shape** + a subtle active outline. Fixes the real bug that N debug blocks mounted N overlapping panels. One sidebar at a time; ✕ returns to the icon.
- **On-canvas transform handles (no hidden modifier keys).** A selected element shows a **resize grip** (scales from the opposite corner) and a **rotate grip** (around center); body-drag still moves. The v1 Shift+drag=scale gesture is retired.
- **Multi-select.** Canvas **marquee** (drag empty space → select elements inside); **Cmd-click** toggles one; **Shift-click** range-selects (sidebar list); selection mirrored canvas ↔ list. **Drag any selected element → whole group moves.**
- **Relative multi-edit (the key model).** Single selection = **absolute** controls (x/y/scale/rotation, now typeable). Multi selection = header "**N selected**" and **relative** controls: scale = proportional ×factor about the group center (no absolute value), move = shared delta, rotate = shared Δ°; group handles do the same; simple props (glow, hover toggles, label) bulk-apply.
- **Editable numbers.** x/y/scale/rotation are `<input type=number>` (type or slide).
- **Mobile inheritance standard (cross-shape).** A mobile layout **inherits desktop by default**; it *diverges* only where the author sets a mobile aspect-ratio **or** per-element mobile positions — no divergence → identical to desktop. Builder surfaces **breakpoint + mobile aspect-ratio** fields and a state chip (**"same as desktop"** vs **"customized (N)"**). Melt's `mobile: … aspectRatio 9/16` is an explicit (untuned) divergence — the sole cause of its "broken mobile"; flag for the author to keep-and-tune or drop.
- **Doc fixes.** Conventions point 6 corrected (goto is now **preserved verbatim**, not normalized); new mobile-inheritance standard added to `shapes.md`.

## 10. Phasing & risks

**Suggested sequence** (also a natural decomposition into two plans if preferred):

1. **Grammar + image resolution (Phase A)** — unblocks the melt 404, additive, low risk.
2. **Builder GUI rework** — sections, hide, ported controls, hover/label toggles, glow swatches; serializer emits the new keys (goto still resolved-URL until Phase B).
3. **Goto raw-preservation (Phase B)** — the pre-resolution raw-source hand-off; highest risk (touches shared capture + marbles parity).
4. **Docs + conventions + tests** — throughout.

**Top risks:** (a) marbles core-family scene-nav image/link-load parity across the resolution change (mandatory verification — may be a fix, not a no-op); (b) the resolution-map plumbing to a sync Eleventy transform; (c) the builder gains an "add element / mockup upload" capability it lacks today — it must also degrade gracefully when the source has zero elements, and make the not-yet-saved state unmistakable.
