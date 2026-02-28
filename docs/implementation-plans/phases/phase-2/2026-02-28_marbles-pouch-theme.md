# Implementation Plan: Marbles Pouch Theme + Object Identity System

**Created:** 2026-02-28
**Status:** In progress — Parts 1, 2, 6 complete; visual polish + search done; Parts 3, 4 pending; Part 7 deploy in progress
**Phase:** 2.5 (parallel to existing phase-2 work)
**Goal:** Build the `marbles-pouch` theme for `leons.bloob.haus`, standardize the Bloob Object identity system, and add base-layer features (image zoom, LaTeX) that benefit all themes.

---

## Overview

This plan covers:
1. **`_bloob-objects.md` system** — object identity (type, image, banner text)
2. **`marbles-pouch` theme** — visual theme for Leon's marbles site
3. **`themes.md` updates** — standardize the theme contract (done ✅)
4. **Collapsible sections visualizer** — `## > Title` / `## ^ Title` syntax
5. **Marble preview visualizer** — `[preview - Title](file.md)` syntax
6. **Base layer: image zoom** — `medium-zoom` library, on by default all themes
7. **Base layer: LaTeX** — KaTeX CDN, theme-configurable, on by default for marbles-pouch
8. **Deploy marbles site** — local test then Cloudflare Pages

---

## Part 1: `_bloob-objects.md` System

### What it is
Every note can declare `bloob-object: marble` (or `note`, `letter`, `pouch`, `recipe`, etc.) in its frontmatter. The `_bloob-objects.md` file in the content repo root maps each object type to an identity image, banner text, and description.

### Spec

**Frontmatter in any note:**
```yaml
bloob-object: marble
```

**`_bloob-objects.md` in content repo root:**
```markdown
---
bloob-settings: objects
---

| object_type | display_name  | image                      | banner_text                      | description                                         |
|-------------|---------------|----------------------------|----------------------------------|-----------------------------------------------------|
| marble      | Marble        | /assets/objects/marble.png | Here is a marble for you.        | A marble is a note I want to share with you.        |
| note        | Note          | /assets/objects/note.png   | Here is a note.                  | A sketch, draft, or work in progress.               |
| letter      | Letter        | /assets/objects/letter.png | Here is a letter for you.        | A personal letter or message.                       |
| pouch       | Marble Pouch  | /assets/objects/pouch.png  | Here is a collection of marbles. | A curated set of marbles on a theme.                |
```

**Image resolution order:**
1. Path declared in `_bloob-objects.md` (user override — any URL or /media/ path)
2. `themes/[theme]/assets/objects/[object_type].png` (theme ships defaults)
3. `themes/_base/assets/objects/[object_type].png` (system fallback)
4. No image — banner renders without image

### Implementation tasks

- [x] **O1** — Add `_bloob-objects.md` parser to `scripts/utils/bloob-objects-reader.js`
  - Reads the markdown table from `_bloob-objects.md` in content repo root
  - Parses it into a JS object keyed by `object_type`
  - Writes `src/_data/bloobObjects.json`
  - If file is missing, outputs empty object (no crash)
- [x] **O2** — Add `bloob_object` extraction to `preprocess-content.js`
  - Read `bloob-object:` from frontmatter
  - Normalize to lowercase, strip leading `#` if present
  - Pass through as `bloob_object` in processed frontmatter
- [x] **O3** — Add `bloob-objects-reader.js` as a preprocessing step in `preprocess-content.js` (runs once before per-file processing, like `graph-builder.js`)
- [x] **O4** — Add `bloobObjects` to `src/_data/` so it's available in all templates
- [x] **O5** — Added `bloob-object: marble` to all 471 `.md` files in marbles content repo (2026-02-27)
- [x] **O6** — Ship starter object images in `themes/marbles-pouch/assets/objects/`: `marble.png` (woven-marble-3.png from old site), plus `shape-2/3/4.png` decorative shapes; note/letter/pouch still need dedicated images

**Decisions:**
- `_bloob-objects.md` lives in the **content repo root** (user-owned, per-site)
- `bloob-object:` uses the `bloob-` prefix convention (consistent with `bloob-settings`)
- Homepage gets its own entry — see Part 2 for homepage banner
- The `_bloob-objects.md` parser is a preprocessing utility, not a visualizer

---

## Part 2: `marbles-pouch` Theme

### Visual identity
- **Background:** `#eed6f1` (lavender/pink)
- **Accent/purple:** `#914c9a`
- **Green:** `#4FD675`
- **Text:** `#333`
- **Font:** Nunito Sans (Google Fonts — free, open source)
- **No top navigation bar** (marbles are wiki-link navigated, not folder-navigated)
- **SVG wave footer** (ported from old site)
- **Banner** on every page (object-aware via `_bloob-objects.md`)
- **Banner modal** — "What is a [object]?" glassmorphism-inspired modal
- **Layout:** Single-column, max-width ~700px, centered

### CSS custom properties (all visualizers inherit these)
```css
:root {
  --bg-color: #eed6f1;
  --text-color: #333333;
  --text-light: #666666;
  --accent-color: #914c9a;
  --accent-dark: #6b2d73;
  --link-color: #914c9a;
  --link-hover: #4FD675;
  --border-color: rgba(145, 76, 154, 0.2);
  --card-bg: rgba(255, 255, 255, 0.6);
  --footer-bg: #e0c4e3;
  --font-body: "Nunito Sans", sans-serif;
  --font-heading: "Nunito Sans", sans-serif;
  --spacing-xs: 0.5rem;
  --spacing-sm: 1rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  --spacing-xl: 3rem;
  --max-width: 700px;
}
```

### Files to create

```
themes/marbles-pouch/
├── theme.yaml                ← metadata + feature declarations
├── layouts/
│   ├── base.njk              ← HTML skeleton with banner
│   └── page.njk              ← Content page
├── partials/
│   ├── banner.njk            ← Object-aware banner (image + text + modal trigger)
│   ├── banner-modal.njk      ← "What is a [object]?" modal
│   ├── footer.njk            ← Footer with SVG wave + social links
│   └── scripts.njk           ← JS includes
├── pages/
│   ├── index.njk             ← Homepage (with its own banner config)
│   ├── 404.njk
│   ├── tags.njk
│   └── feed.njk
└── assets/
    ├── css/main.css          ← Full theme stylesheet
    └── objects/
        ├── marble.png        ← Default marble identity image (woven-marble-3.png from old site)
        ├── note.png
        ├── letter.png
        └── pouch.png         ← Placeholder until custom pouch image is made
```

### Implementation tasks

- [x] **T1** — Create `themes/marbles-pouch/theme.yaml` with feature declarations and visualizer defaults
- [x] **T2** — Create `themes/marbles-pouch/assets/css/main.css`
  - CSS custom properties (full palette)
  - Body, typography, links
  - Banner section styles
  - Footer with SVG wave
  - Banner modal styles (clean, no glassmorphism dependency — just a backdrop blur card)
  - Responsive (mobile-first)
- [x] **T3** — Create `themes/marbles-pouch/layouts/base.njk`
  - Includes banner (if `not hide_banner`)
  - No nav (marbles-pouch has no section nav)
  - Includes footer
  - Includes scripts
- [x] **T4** — Create `themes/marbles-pouch/partials/banner.njk`
  - Reads `bloob_object` from page frontmatter
  - Looks up `bloobObjects[bloob_object]` for image + banner_text
  - Renders object image centered
  - Renders banner text below image
  - "What is a [object]?" button that opens the modal
  - Decorative SVG shapes (ported from old site: shape-2, shape-3, shape-4)
- [x] **T5** — Create `themes/marbles-pouch/partials/banner-modal.njk`
  - Modal overlay with backdrop-filter blur card
  - Reads `bloobObjects[bloob_object].description` for modal body text
  - Close button (X) and click-outside-to-close behavior
  - Pure CSS + minimal vanilla JS (no jQuery)
- [x] **T6** — Create `themes/marbles-pouch/partials/footer.njk`
  - SVG wave border (ported from old site path data)
  - Social links (LinkedIn, email)
  - Link to marble pouch / homepage
  - CC license mark
- [x] **T7** — Create `themes/marbles-pouch/pages/index.njk`
  - Homepage banner uses a special homepage object entry (or site.title/description)
  - Lists recent marbles + Pagefind search bar (enabled via `features.search: true` in site YAML)
  - Note: homepage config is currently hardcoded; document this as future work
- [x] **T8** — Create `themes/marbles-pouch/pages/404.njk`, `tags.njk`, `feed.njk`
- [x] **T9** — Add `marble.png` to `themes/marbles-pouch/assets/objects/` (woven-marble-3.png from old site); `note.png`, `letter.png`, `pouch.png` still pending — `_bloob-objects.md` uses `none` for these until images are created

### Homepage banner note
Homepages don't have a `bloob-object` type; their banner is currently hardcoded per theme. This is a known gap — a future `_bloob-homepage.md` or `homepage:` section in `_bloob-settings.md` could standardize this. For now, `pages/index.njk` hardcodes its banner text and image, and this is documented in `themes.md` under Future Considerations.

---

## Part 3: Collapsible Sections Visualizer

### Syntax
```markdown
## > This section starts collapsed

Content...

## ^ This section starts expanded

Content...
```

### How it works
- **Preprocessor** (`scripts/utils/collapsible-handler.js`) converts `## > Title` and `## ^ Title` markers to `<details>`/`<summary>` HTML before Eleventy processes the file
- Uses native browser `<details>`/`<summary>` — no JavaScript required for open/close
- Themes style via CSS: `details`, `details summary`, `details[open]`
- `marbles-pouch` theme ships default styles; other themes inherit minimal `_base` styles

### Implementation tasks

**Note:** CSS for collapsibles is done (native `<details>` element in main.css). The preprocessor that converts `## > Title` markdown syntax to `<details>` HTML is not yet built.

- [ ] **C1** — Create `scripts/utils/collapsible-handler.js`
  - Regex scan for `## > Title` and `## ^ Title` patterns
  - Convert to `<details open>` / `<details>` with `<summary>` header
  - Handle nested headers (h2 closes when h2 found, etc.) — port logic from old `collapsible_converter.rb`
  - Handle end-of-section detection (next header at same or higher level closes the section)
- [ ] **C2** — Add `collapsible-handler.js` to the core preprocessing pipeline in `preprocess-content.js`
- [ ] **C3** — Add CSS for collapsibles to `themes/_base/assets/css/collapsibles.css` (minimal, inherits theme variables)
- [x] **C4** — Add collapsible styles to `themes/marbles-pouch/assets/css/main.css` (themed version)
- [ ] **C5** — Write tests for `collapsible-handler.js`
  - Collapsed header converts correctly
  - Expanded header converts correctly
  - Nested headers close outer sections correctly
  - Regular headers (no `>` or `^`) are unchanged

**Note on `<details>` vs custom JS:** Using native `<details>`/`<summary>` means:
- No visualizer JS bundle needed for basic open/close
- CSS-only animation via `details[open]` selector
- Obsidian renders `<details>` in its preview (imperfectly, but it works)
- Screen reader accessible out of the box

---

## Part 4: Marble Preview Visualizer

### Syntax
```markdown
[preview - My Marble Title](FILENAME.md)
[preview:sentences=3 - My Marble Title](FILENAME.md)
```

### How it works
- **Preprocessor** (`scripts/utils/preview-handler.js`) converts preview syntax to a placeholder HTML comment: `<!-- MARBLE_PREVIEW:FILENAME:{"sentences":3} -->`
- **Build-time visualizer** (`lib/visualizers/marble-preview/index.js`) transforms the placeholder into a rendered preview card HTML block
- The preview card shows: object identity image (from `bloobObjects`), title, first N sentences of content
- Inherits all theme CSS custom properties — no hardcoded colors

### Implementation tasks

- [ ] **P1** — Create `scripts/utils/preview-handler.js`
  - Regex: `\[(preview)(?::([^\]-]+))?\s*-\s*([^\]]+)\]\(([^)]+)\)`
  - Extracts: template name, params (e.g. `sentences=3`), display title, filename
  - Outputs placeholder comment: `<!-- MARBLE_PREVIEW:FILENAME:CONFIG_JSON -->`
- [ ] **P2** — Create `lib/visualizers/marble-preview/manifest.json`
  - `type: "hybrid"` (build-time transform + optional runtime)
  - Declares CSS/JS presence
- [ ] **P3** — Create `lib/visualizers/marble-preview/index.js` (build-time)
  - Reads HTML rendered by Eleventy
  - Finds `MARBLE_PREVIEW` comment markers
  - For each: looks up the target page in `src/` to get first N sentences + title + `bloob_object`
  - Renders a preview card HTML block
  - Card HTML uses CSS custom property classes (no inline styles)
- [ ] **P4** — Create `lib/visualizers/marble-preview/styles.css`
  - `.marble-preview-card` using `var(--card-bg)`, `var(--border-color)`, `var(--accent-color)` etc.
  - Minimal, clean design
  - Hover state
- [ ] **P5** — Write tests for `preview-handler.js` and `marble-preview/index.js`

**Sentence extraction:** The `sentences=N` param limits how many sentences from the target note's body are shown. Default: 2. The preprocessor can extract first N sentences by simple `.split('.')` on the stripped text content.

**Research note:** No markdown standard exists for preview cards — `[preview - Title](file.md)` is a custom Bloob extension. This is documented and intentional.

---

## Part 5: Base Layer — Image Zoom

### Library choice
**`medium-zoom`** — 4KB, zero dependencies, mobile pinch-zoom, desktop scroll-zoom, keyboard accessible. Used by millions of sites. Replaces the custom ~200-line scroll/drag implementation in the old site.

```html
<!-- CDN include in _base/partials/scripts.njk -->
<script src="https://cdn.jsdelivr.net/npm/medium-zoom@1.1.0/dist/medium-zoom.min.js"></script>
<script>
  mediumZoom('article img:not(.no-zoom)', { background: 'var(--zoom-overlay-bg, rgba(0,0,0,0.85))' });
</script>
```

### Default behavior
- **On by default** for all themes (opt-out)
- To disable site-wide: `image_zoom: false` in `_bloob-settings.md`
- To disable per-image: add `.no-zoom` class (or `data-no-zoom` attribute)
- Mobile: pinch-to-zoom works natively via `medium-zoom`
- Styling: theme defines `--zoom-overlay-bg` CSS variable

### Implementation tasks

- [x] **Z1** — Add `medium-zoom` script include to `themes/marbles-pouch/partials/scripts.njk` (conditional on `site.features.image_zoom !== false`)
- [x] **Z2** — Add `--zoom-overlay-bg` CSS variable to `themes/marbles-pouch/assets/css/main.css`
- [ ] **Z3** — Add `image_zoom` to `_bloob-settings.md` schema documentation
- [ ] **Z4** — Add `image_zoom` to `bloob-settings-reader.js` processing
- [ ] **Z5** — Test on mobile (iOS Safari) and desktop (Chrome, Firefox)

---

## Part 6: Base Layer — LaTeX (KaTeX)

### LaTeX as a visualizer
KaTeX renders `$...$` (inline) and `$$...$$` (block) math. It's a visualizer because:
- It's optional (not all sites need it)
- It's activatable per-site via `_bloob-settings.md` or theme defaults
- The `marbles-pouch` theme sets `visualizer_defaults.latex: true`

### Activation
- **Theme default:** `marbles-pouch/theme.yaml` sets `visualizer_defaults.latex: true`
- **User override:** `_bloob-settings.md` can set `visualizers: latex: false` to disable
- **CDN approach** (same as old site — works well, good license):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
<script>
  document.addEventListener("DOMContentLoaded", function() {
    renderMathInElement(document.body, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false }
      ],
      throwOnError: false
    });
  });
</script>
```

### Implementation tasks

- [x] **L1** — Create `lib/visualizers/latex/manifest.json` (`type: "runtime"`, `hasJs: true`, `hasCss: true`)
- [x] **L2** — Create `lib/visualizers/latex/browser.js` — KaTeX CDN init script
- [x] **L3** — Create `lib/visualizers/latex/styles.css` — KaTeX CDN stylesheet link (or minimal wrapper)
- [x] **L4** — Add `latex` to `marbles-pouch/theme.yaml` visualizer_defaults
- [ ] **L5** — Document LaTeX activation in `_bloob-settings.md` schema

---

## Part 7: Deploy Marbles Site

### Prerequisites (must complete Parts 1–6 first)

- [x] **D1** — Update `sites/marbles.yaml` with `features.search: true`; theme and visualizer config already in place
- [ ] **D2** — Ensure marbles content repo (`LSanten/bloob-haus-marbles`) has `_bloob-settings.md` and `_bloob-objects.md`
- [ ] **D3** — Local test: `SITE_NAME=marbles npm run build` succeeds
- [ ] **D4** — Local dev server test: `SITE_NAME=marbles npm run dev` renders correctly
- [ ] **D5** — Create Cloudflare Pages project for `marbles.bloob.haus`
- [ ] **D6** — Create `.github/workflows/deploy-marbles.yml` (mirror of `deploy-buffbaby.yml`)
- [ ] **D7** — Add DNS record in Cloudflare for `marbles.bloob.haus`
- [ ] **D8** — Push to trigger deploy, verify live site

---

## Implementation Order

Recommended sequence to minimize blocked work:

```
O1-O4 (bloob-objects reader + data pipeline)
  ↓
T1-T2 (theme.yaml + CSS)
  ↓
Z1-Z5 (image zoom — quick win, tests on any content)
  ↓
L1-L5 (LaTeX visualizer — quick win)
  ↓
T3-T6 (banner, modal, footer — requires O1-O4)
  ↓
C1-C5 (collapsible sections — independent, can parallelize)
  ↓
T7-T9 (homepage, 404, other pages)
  ↓
P1-P5 (marble preview visualizer — most complex, do last)
  ↓
D1-D8 (deploy)
```

---

## Open Design Questions (deferred)

| Question | Status | Notes |
|----------|--------|-------|
| Homepage banner standardization | Deferred | Homepages currently hardcoded per theme. Future: `_bloob-homepage.md` or `homepage:` in `_bloob-settings.md` |
| Per-page banner image override | Deferred | `banner_image:` in frontmatter — simple to add later |
| Pouch visualizer (marble grid) | Phase 4+ | When `bloob-object: pouch`, render links as visual grid |
| Bookshelf visualizer | Phase 4+ | When `bloob-object: bookshelf`, render links as books |
| `<details>` circles preview indicator | Deferred | Old site showed image circles of content inside collapsed sections — omit from base scope |
| Magic machine delivery model for collections | Needs design — see note below | Old Python scripts ran locally; future must work in web/cloud context |

### Magic Machines for Collections — Design Note

The old marbles site had Python scripts that ran locally to maintain frontmatter on `.md` files: adding `date_created`, `date_lastchanged`, `bloob-object`, tags, and other metadata automatically. We just did this manually for `bloob-object: marble` across 471 files — that was a one-time migration, but going forward this kind of maintenance needs to be systematic and **must not assume local script execution**.

**The core tension:**
- Magic machines need to write to content files (frontmatter mutation)
- The future architecture is: user edits in Obsidian → pushes to GitHub → webapp builds → site updates
- There is no guaranteed "local Python environment" in that loop

**Three possible delivery models to evaluate:**

1. **GitHub Actions on push** — A workflow runs on every push to the content repo. It checks for missing frontmatter fields and opens a PR (or commits directly to main) with additions. Runs in the cloud, no local dependency. Downside: async (user pushes, then waits for bot commit), potential commit loops.

2. **Obsidian plugin (client-side)** — A Bloob Haus Obsidian plugin runs magic machines locally on save/open. Writes frontmatter before the user ever pushes. Upside: instant, user sees changes immediately. Downside: requires plugin installation and maintenance; doesn't work for users who edit outside Obsidian.

3. **Build-time normalization (read-only)** — The preprocessor fills in missing values at build time without writing back to source files. `bloob-object` defaults to `marble` if missing. `date_created` falls back to git log. No source mutation. Upside: zero delivery complexity. Downside: metadata never persists back to the vault; Obsidian Dataview queries won't see it; user can't see or correct it in their editor.

**Likely answer: a combination**
- Build-time normalization for display (preprocessor fills gaps so the site never breaks)
- GitHub Actions bot for durable backfill (runs once when a field is missing, writes it back to the repo)
- Obsidian plugin as a future enhancement (not required for v1)

**This affects:** `bloob-object`, `date_created`, `date_lastchanged`, tags, any future auto-generated fields.

**Action:** Design this properly before building any new magic machine. The current `bloob-object: marble` backfill was done manually as a one-time migration — this is not a scalable pattern for new users or new object types.

---

## Related Documents

- [Theme Architecture](../../architecture/themes.md) — Updated contract (includes bloob-objects, base layer features, CSS variable contract)
- [Visualizer Architecture](../../architecture/visualizers.md) — How visualizers integrate with templates
- [ROADMAP.md](../ROADMAP.md) — Phase overview
- [DECISIONS.md](../DECISIONS.md) — Log decisions from this plan as they're made
