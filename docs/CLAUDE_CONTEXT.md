# Bloob Haus - Claude Code Context

**Purpose:** Share this file at the start of each Claude Code session.
**Last Updated:** 2026-07-03
**Current Phase:** melt theme under active development; alter-engineers pending deployment. Multi-site operational.

**See also:** `CLAUDE.md` at repo root for development practices (auto-read by Claude Code). `docs/TECH-DEBT.md` for outstanding technical debt.

---

## Quick Status

| Milestone | Status |
|-----------|--------|
| Phase 1: Recipe Site (Hugo) | ✅ COMPLETE |
| Hugo → Eleventy Migration (M0-M7) | ✅ COMPLETE |
| Site Enhancements (RSS, sitemap, images) | ✅ COMPLETE |
| Templatized Builder (multi-site) | ✅ COMPLETE |
| Test Suite (Phase 1 + 1.5) | ✅ COMPLETE |
| GitHub Actions CI/CD | ✅ COMPLETE |
| Cloudflare Pages hosting | ✅ COMPLETE |
| DNS migration (Porkbun → Cloudflare) | ✅ COMPLETE |
| Phase 2: graph.json API | ✅ COMPLETE |
| Phase 2: Graph visualizer | ✅ COMPLETE |
| Phase 2: Validation report + --strict | ✅ COMPLETE |
| CLAUDE.md + TECH-DEBT.md | ✅ COMPLETE |
| Cleanup: vercel.json + unused deps | ✅ COMPLETE |
| Test suite Phase 2 (publish-filter, file-index-builder, slug-strategy) | ✅ COMPLETE |
| Marbles site (sites/marbles.yaml) | ✅ COMPLETE |
| Multi-site build isolation (src/ cleanup, repo-switch detection) | ✅ COMPLETE |
| Configurable slug strategies (slugify, preserve-case) | ✅ COMPLETE |
| Per-file exclude_files list | ✅ COMPLETE |
| Reserved directory filtering in section discovery | ✅ COMPLETE |
| Snippet injection (`goat-counter-tracking`, `fast-comments-embed`, header/footer fences in `_bloob-settings.md`) | ✅ COMPLETE |
| Consolidated `url:` block + canonical page ID (lowercased host+path, `bloob-page-id` override, `<meta name="bloob-page-id">`) | ✅ COMPLETE |
| Comments as a shape behavior (partial in shape `layout.njk`; article commentable; per-page `comments:false`) | ✅ COMPLETE |
| Bloob-shapes unification (`_bloob-types.md`→`_bloob-shapes.md`) | 📋 PLANNED — see phase-2 plan |

**LIVE SITES:**
- https://buffbaby.bloob.haus (Buff Baby Kitchen)
- https://leons.bloob.haus (Leon's Marbles — Cloudflare project name: `leons`, content repo: `LSanten/bloob-haus-marbles`)

**IN DEVELOPMENT:**
- melt site (`sites/melt.yaml`, theme `themes/melt/`) — Whitney & Vicki's massage collective. Content repo at `../melt-website/`. Dev command: `npm run dev:melt` (port 8083). Circular nav (`circular-nav` visualizer), search visualizer fully wired (sticky input, ID pills, iframe preview, WASM prewarm). Folder index pages use parent folder name as slug + `is_folder: true` flag.
- alter-engineers site (`sites/alter-engineers.yaml`, theme `themes/alter-engineers/`) — All homepage sections are content-driven from `index.md`. Live: hero, projects (`card-preview`), team (`image-grid`), heading-and-paragraph, services, slideshow (partners logos), image-text (solutions), `quotes-stack` (testimonials carousel), testimonials, folder-preview (articles slider-cards). Redirect support active. Content repo at live ACE Drive vault. Dev command: `npm run dev:alter-engineers`
- Remaining for alter-engineers launch: deploy pipeline (Cloudflare Pages + GitHub Actions), project images, DNS cutover.
- `ken-burns-zoom-builder` magic machine — working video export (WebCodecs + self-hosted mp4-muxer). Served at `/magic-machine/ken-burns-zoom-builder/` on sites with `features.magic_machines: true`. Disabled on alter-engineers.

---

## What This Project Is

Bloob Haus transforms Obsidian markdown vaults into hosted static websites using Eleventy.

**Current state:** buffbaby.bloob.haus is live with Leon's recipes from a private GitHub repo, powered by Eleventy 3.x with a templatized multi-site builder, modular visualizer architecture, backlinks, interactive link graph, RSS feed, sitemap, and optimized images. The builder supports multiple sites via YAML config + pluggable themes.

---

## What's Working

- Full preprocessing pipeline (Obsidian → Eleventy-ready markdown)
- Eleventy 3.x site with warm color theme
- Auto-deployment via GitHub Actions → Cloudflare Pages
- Content repo push triggers builder via `repository_dispatch`
- Custom domain with HTTPS (Cloudflare SSL)
- Git-based date tracking
- Comment stripping for privacy
- Clickable recipe cards
- Auto-generated navigation
- Interactive checkboxes with localStorage persistence
- Backlinks (static list of pages that link here, per-page)
- `/graph.json` — site-wide bidirectional link graph API (always generated)
- `/graph-settings.json` — vault-wide graph settings from `.bloob/graph.yaml`
- Interactive force-directed graph visualizer on every page (local neighborhood + full-graph modal, hover tooltip with OG image preview)
- RSS feed (`/feed.xml`)
- Sitemap (`/sitemap.xml`)
- robots.txt
- Custom 404 page
- Image optimization (WebP + JPEG at 600w/1200w, lazy loading)
- **File-scope shapes** (`bloob-shape:` frontmatter key) — a page's entire body is rendered by the named shape's `renderFilescope(settings, body)` function. Config declared in a `::: settings` block at the top of the body. Dispatch wired in `preprocess-content.js` steps 6e.3 + 6e.6. First live shape: `rss-feed` (fetches podcast RSS at build time, renders episode list). See `docs/architecture/visualizers.md` for full type documentation.
- Modular visualizer architecture with auto-discovery
- `:::` container visualizers (image-grid, photo-grid live; `markdownItContainer` parses key=value settings → `data-vis-settings`)
- `photo-grid` visualizer: `cols: N` uniform or `layout: 1,3,1` mixed-row grids; `ratio`/`gap`/`padding` params; PhotoSwipe lightbox automatic; columns preserved on mobile
- PhotoSwipe 5 lightbox: shared via `themes/_base/partials/photoswipe-{head,scripts}.njk`; enabled in melt + marbles-pouch; hover zoom-in icon; no upscaling for low-res images
- CSS Token Standard: all visualizer `styles.css` use `var(--accent-color)` etc. from `main.css` — documented in `docs/architecture/visualizers.md`
- **`themes/_base/assets/css/base.css`** — universal stylesheet loaded before `main.css` in all theme `head.njk` files. Home for styles that apply across all themes regardless of feature (e.g. `overflow-wrap: break-word` on links). Theme styles override freely.
- **`markdown-it` `linkify: true`** — bare `https://` URLs in content auto-link without markdown syntax
- **Pandoc-style footnotes** (`[^label]` / `[^label]: text`) — rendered via `markdown-it-footnote` plugin; styled by `lib/visualizers/citations/` (CSS-only, no JS)
- **`default_shape` in `_bloob-settings.md`** — site-wide default shape applied to pages with no explicit `bloob-shape:` frontmatter. Only influences layout selection; body rendering never fires from the default. Unknown/future shape names fall back silently to `page.njk`. See `docs/architecture/shapes.md`.
- **Shape fallback hardening** — `bloob-shape:` values with no matching `lib/visualizers/[name]/` folder no longer crash the build; they log a warning and fall through to `page.njk`
- `| md` and `| mdinline` Nunjucks filters for rendering markdown frontmatter strings
- alter-engineers theme: hero partial, Satoshi font via Fontshare CDN, correct brand color tokens
- Templatized builder: themes in `themes/`, site config in `sites/*.yaml`
- Config-driven builds with `--site=` flag
- Configurable URL slug strategy per site ("slugify" or "preserve-case")
- Per-file `exclude_files` list in site YAML config
- Multi-site build isolation (src/ cleaned between builds, repo-switch detection)
- Reserved directory filtering (media, assets, etc. excluded from section nav)
- Test suite: 297 tests across 16 files (Vitest), co-located visualizer tests
- Validation report with `--strict` flag for CI (fails build on broken links)

**Build pipeline:**
```bash
npm run build                             # Full build (defaults to buffbaby)
npm run build:buffbaby                    # Explicit buffbaby build
npm run dev                               # Eleventy dev server with hot reload
npm run dev:alter-engineers               # Dev server for alter-engineers site
npm run dev:alter-engineers -- --page=projects/my-page.md  # Build only one file (fast visualizer testing)
npm run dev:magic-machine ken-burns-zoom-builder  # Standalone magic machine server (port 8090, no Eleventy)
node scripts/test-ken-burns-export.js [url]       # Playwright headless export test
```

**Deployment (GitHub Actions → Cloudflare Pages):**
- Push to `buffbaby` repo → triggers `deploy-buffbaby` workflow → builds → deploys to Cloudflare
- Push to `bloob-haus-webapp` repo → `deploy-buffbaby` + `rebuild-all` workflows fire
- Manual: `workflow_dispatch` from GitHub Actions tab

---

## Project Structure

```
bloob-haus-webapp/
├── .github/workflows/
│   ├── deploy-buffbaby.yml      ✅ CI/CD: test → build → deploy buffbaby to Cloudflare
│   └── rebuild-all.yml          ✅ CI/CD: rebuild all sites on infrastructure changes
├── eleventy.config.js           ✅ Eleventy configuration (ESM, reads site config)
├── CLAUDE.md                    ✅ Development practices (auto-read by Claude Code)
├── package.json                 ✅ Scripts and dependencies
│
├── sites/                       ✅ Per-site configuration (YAML)
│   ├── buffbaby.yaml            ✅ Buff Baby Kitchen config
│   ├── marbles.yaml             ✅ Leon's Marbles config (preserve-case slugs)
│   └── melt.yaml                ✅ MELT massage collective config (preserve-case slugs, search enabled)
│
├── themes/                      ✅ Theme library
│   ├── _base/                   ✅ Shared across all themes
│   │   └── partials/
│   │       ├── head.njk         ✅ <head> with meta, OG, fonts
│   │       └── backlinks.njk    ✅ Backlinks partial
│   └── warm-kitchen/            ✅ Buffbaby's theme
│       ├── layouts/             ✅ base.njk, page.njk, list.njk
│       ├── partials/            ✅ nav, footer, scripts, tags
│       ├── pages/               ✅ Homepage, 404, feed, sitemap, tags, search
│       │   └── sections/        ✅ Section index pages (recipes/, notes/, etc.)
│       └── assets/css/          ✅ main.css (warm color palette)
│
├── src/                         ← ENTIRELY GENERATED (gitignored)
│   ├── _data/
│   │   ├── site.js              ← Generated from sites/*.yaml
│   │   ├── tagIndex.json        ← Generated by preprocessor
│   │   └── eleventyComputed.js  ← Copied from lib/eleventyComputed.js by assemble-src
│   ├── _includes/               ← Assembled from themes/
│   ├── assets/                  ← Assembled from themes/ + visualizer bundler
│   ├── media/                   ← Images (generated by preprocessor)
│   ├── graph.json               ← Site-wide link graph API (always generated)
│   ├── graph-settings.json      ← Vault graph settings (from .bloob/graph.yaml)
│   ├── *.njk                    ← Copied from theme pages/
│   ├── recipes/*.md             ← Generated content
│   ├── notes/*.md               ← Generated content
│   └── ...
│
├── lib/eleventyComputed.js      ✅ Slugified permalink logic — copied into src-*/`_data/` by assemble-src
├── lib/visualizers/             ← Visualizer source packages
│   ├── checkbox-tracker/        ✅ Runtime: localStorage checkbox persistence
│   ├── page-preview/            ✅ Runtime: hover/click preview modal
│   ├── folder-preview/          ✅ Hybrid: lists pages in a folder (reads graph.json at runtime)
│   ├── fridge-magnets/          ✅ (see visualizers.md)
│   ├── scene-nav/               ✅ Hybrid: interactive image scene navigator with builder
│   ├── tags/                    ✅ Build-time: tag cloud
│   ├── search/                  ✅ Pagefind integration — sticky input, ID pills, iframe preview, WASM prewarm
│   ├── latex/                   ✅ Runtime: LaTeX math rendering
│   └── graph/                   ✅ Hybrid: force-directed link graph
│       ├── manifest.json        ✅ Settings schema
│       ├── index.js             ✅ Build-time: ```graph fence → container div
│       ├── browser.js           ✅ Runtime: force-graph CDN, BFS filter, modal
│       ├── styles.css           ✅ CSS variable-based styles
│       └── graph.test.js        ✅ Co-located tests
│
├── scripts/
│   ├── assemble-src.js          ✅ Assembles src/ from theme + config
│   ├── build-site.js            ✅ Config-driven build orchestrator
│   ├── clone-content.js         ✅ Clones private GitHub repo
│   ├── preprocess-content.js    ✅ Orchestrates preprocessing (9 steps)
│   ├── bundle-visualizers.js    ✅ esbuild bundler (auto-discovers)
│   ├── generate-og-images.js    ✅ OG preview image generator
│   └── utils/
│       ├── config-loader.js         ✅ YAML site config loader
│       ├── config-reader.js         ✅ Reads Obsidian config
│       ├── publish-filter.js        ✅ Dual-mode filtering
│       ├── file-index-builder.js    ✅ Filename-based URLs
│       ├── wiki-link-resolver.js    ✅ [[Links]] resolution
│       ├── markdown-link-resolver.js ✅ Standard links
│       ├── attachment-resolver.js   ✅ Image handling
│       ├── transclusion-handler.js  ✅ ![[Embed]] inline expansion (showIndicators flag)
│       ├── comment-stripper.js      ✅ Privacy protection
│       ├── tag-extractor.js         ✅ Tag extraction & normalization
│       ├── slug-strategy.js          ✅ Centralized slug strategies (slugify, preserve-case)
│       ├── git-date-extractor.js    ✅ Last modified dates
│       ├── graph-builder.js         ✅ Builds nodes+links from per-page link data
│       └── graph-settings-loader.js ✅ Reads .bloob/graph.yaml from vault
│
├── tests/                       ✅ Central test suite
│   ├── helpers/mock-index.js    ✅ Shared mock factories
│   ├── utils/                   ✅ Preprocessing unit tests (Phase 1)
│   └── build/                   ✅ Config/assembly tests (Phase 1.5)
│
├── vitest.config.js             ✅ Test config (discovers tests/ + lib/)
├── content-source/              ← Cloned from GitHub (gitignored)
├── _site/                       ← Eleventy output (gitignored)
└── docs/                        ✅ Documentation
```

---

## Key Features

### URL Structure
- **Slugs from FILENAME** - Stable URLs even when titles change
- **Folder-based URLs** - `/recipes/challah/`, `/resources/guide/`
- **Slugified paths** - Spaces → hyphens, lowercase (`/lists-of-favorites/`)
- **Titles from first `#` heading** - Display only, preserves formatting

### Publishing Model (Dual Mode)
| Mode | Behavior | Config |
|------|----------|--------|
| **blocklist** (Leon's) | Publish all EXCEPT `#not-for-public` | Current setup |
| **allowlist** | Only publish if `publish: true` | Alternative |

### Link Resolution
- `[[Wiki Links]]` → Resolved to folder-based URLs
- `[text](file.md)` → Resolved to folder-based URLs
- Broken links → `<span class="broken-link">` (doesn't crash build)

### Visualizer Architecture
- Self-contained packages in `lib/visualizers/<name>/`
- Auto-discovery: add a folder → auto-bundled and loaded
- Three types: `runtime` (browser-only), `build-time` (HTML transform only), `hybrid` (both)
- Pure function design: `parser(md) → data`, `renderer(data) → html`
- Co-located tests: each visualizer carries its own `<name>.test.js`
- See `docs/architecture/visualizers.md` for full details

### Graph API
- `/graph.json` — always generated at build time regardless of visualizer activation
  - `nodes: [{ id, title, section, type, image?, bloobIcon? }]`
    - `id` — page URL path (e.g. `/projects/campbell-library/`)
    - `image` — OG image URL, only present if page body contains an image (auto-extracted from first image in markdown body, NOT from frontmatter)
    - `bloobIcon` — 24×24 icon path for the page's bloob-object type; absent if no bloob-object
    - `excerpt` / `description` — NOT in graph.json nodes; only in tag index (`_data/tagIndex.json`)
  - `links: [{ source, target }]` — bidirectional, deduplicated, anchors stripped
- `/graph-settings.json` — vault-wide settings from `.bloob/graph.yaml`, defaults applied
- Graph **differs from backlinks**: backlinks = incoming-only static list per page; graph.json = full bidirectional site map served as a public JSON endpoint
- **`folder-preview` uses graph.json**: its browser.js reads all nodes, filters by `node.section`, renders a list. Currently renders plain `<ul>` list only — no card/image support yet.

### Graph Hover Tooltip
- Hovering a node shows a floating card (150px) above the cursor: OG preview image (if page has one) + page title
- Implemented as `position:fixed` div on `document.body` — follows mouse via `mousemove` on canvas using `e.clientX/Y`
- This avoids coordinate-space issues: `graph2ScreenCoords()` returns viewport coords, not element-relative; `position:fixed` + `clientX/Y` are both viewport coords, so no math needed
- `node.image` comes from `graph.json` (written by `graph-builder.js` when page has `image` frontmatter)

### Graph Visualizer Settings (`.bloob/graph.yaml`)
```yaml
only_if_linked: true   # hide if page has no connections (default: true)
depth: 2               # local neighborhood hops (default: 2)
show_full_graph: true  # "Full graph" button for modal (default: true)
colors:                # all optional — inherits CSS variables by default
  node: "#d2691e"
  node_current: "#8b4513"
  link: "#e8dcc4"
  text: "#666666"
  bg: "#fffaf0"
```
Per-page override: frontmatter `graph: { depth: 1 }`. Inline positioning: ` ```graph\ndepth: 1\n``` `.

### Image Optimization
- `@11ty/eleventy-img` via `addTransform` on rendered HTML
- Generates WebP + JPEG at 600w and 1200w
- `<picture>` elements with `loading="lazy"` and `decoding="async"`
- Original 48MB → ~6MB optimized

### OG Image Filename Encoding Rule
- **Disk filenames use raw characters** (`@`, spaces, etc.) — never `%`-encoded on disk
- **URLs use `encodeURIComponent`** — frontmatter `image` field stores `/og/{encoded}-og.{ext}`
- Single normalization point in `preprocess-content.js`: `decodeURIComponent` incoming path (normalize) → `encodeURIComponent` for URL storage
- `generate-og-images.js` decodes frontmatter URL back to raw name before writing to disk
- Downstream consumers (templates, graph.json node `image` field) use the URL as-is; disk operations always decode first

---

## Environment Variables

```bash
# Required in .env.local (local) and GitHub Actions secrets (production)
GITHUB_TOKEN=ghp_xxx              # GitHub PAT with repo scope (secret, not in YAML)

# Optional overrides (these are now in sites/*.yaml)
SITE_NAME=buffbaby                # Which site config to load (default: buffbaby)
SITE_URL=https://buffbaby.bloob.haus  # Override URL from config
```

Most configuration has moved to `sites/buffbaby.yaml` (content repo, publish mode, theme, features, etc.). Only secrets remain as env vars.

---

## Build Pipeline Flow

```
1. Load site config (sites/buffbaby.yaml)
    ↓
2. Assemble src/ from theme (assemble-src.js)
    ├─ Copy themes/_base/ → src/_includes/
    ├─ Copy themes/warm-kitchen/ → src/_includes/, src/assets/, src/*.njk
    └─ Generate src/_data/site.js from config
    ↓
3. Clone content repo (clone-content.js)
    ↓ GitHub → content-source/
4. Preprocess content (preprocess-content.js)
    ├─ Strip comments (%% %% and <!-- -->)
    ├─ Filter (#not-for-public)
    ├─ Build index (filename → URL)
    ├─ Resolve [[wiki-links]] and [text](file.md)  ← collects per-page outgoing links
    ├─ Resolve images → /media/
    ├─ Handle transclusions
    ├─ Extract tags and git dates
    ├─ Add layout: layouts/page.njk
    ├─ Build + write src/graph.json (nodes+links, always)
    ├─ Read .bloob/graph.yaml → write src/graph-settings.json
    └─ Build + write src/_data/tagIndex.json
    ↓ content → src/
5. Convert GIFs to MP4 (optimize-gifs.js)  ← Step 5.8
    ├─ Glob srcDir/**/*.gif
    ├─ Skip if .mp4 counterpart already exists (dev cache)
    ├─ Run ffmpeg-static: yuv420p, faststart, even-dimension scale
    ├─ Delete original .gif from srcDir (keeps assets under CF Pages 25MB limit)
    └─ Opt-out: media.convert_gif_to_mp4: false in _bloob-settings.md
    ↓
6. Generate OG images (generate-og-images.js)
7. Bundle visualizers (bundle-visualizers.js)
    ↓ JS + CSS → src/assets/
7. Eleventy build
    ├─ markdown-it + task-lists plugin
    ├─ Collections (recipes, notes, backlinks)
    ├─ Image optimization transform
    └─ Visualizer transforms (build-time)
    ↓ → _site/
8. Pagefind search index
    ↓
9. Deploy to Cloudflare Pages (via wrangler in GitHub Actions)
    ↓
buffbaby.bloob.haus (via Cloudflare CDN)
```

---

## Commands

```bash
# Full build pipeline (defaults to buffbaby)
npm run build
npm run build:buffbaby       # Explicit site name

# Local development (after running build once for content)
npm run dev

# Individual steps (for debugging)
node scripts/assemble-src.js --site=buffbaby   # Assemble src/ from theme
node scripts/clone-content.js
node scripts/preprocess-content.js
node scripts/bundle-visualizers.js
npx @11ty/eleventy

# Tests
npm test                 # Run all 191 tests once
npm run test:watch       # Watch mode (re-runs on file changes)

# Adding a new site (future)
# 1. Create themes/my-theme/ with layouts, partials, pages, assets
# 2. Create sites/my-site.yaml pointing to theme + content repo
# 3. SITE_NAME=my-site npm run build
```

---

## Key Technical Decisions

- **Templatized builder** — themes in `themes/`, site config in `sites/*.yaml`, `src/` entirely generated
- **`assemble-src.js`** — copies theme + base into `src/` before content preprocessing
- **Config fallback chain** — `sites/{name}.yaml` in builder repo; secrets stay as env vars
- **Eleventy 3.x with ESM** — `"type": "module"`, `export default async function`
- **`setUseGitIgnore(false)`** — generated content dirs are gitignored but must be processed
- **Visualizer parsers in preprocessor** — receive raw markdown, enabling code sharing with browser/Obsidian
- **`addTransform` for images** — post-render HTML modification, no preprocessor changes needed
- **Backlinks via `addCollection`** — reads source files from disk, not Eleventy internals
- **Feature flags in config** — backlinks, image optimization, search conditionally enabled per site

See `docs/implementation-plans/DECISIONS.md` for the full decision log.

---

## What to Do Next

**As of 2026-07-03:** Comments (FastComments), GoatCounter analytics, and the URL/page-ID
contract shipped (see CHANGELOG Sessions 54–55). **Next up: the bloob-shapes unification** —
`_bloob-types.md` → `_bloob-shapes.md`, drop the `layout` column, make `fastcomments` /
`showvisitorcount` declared per-shape behaviors. Context seed + plan:
`docs/implementation-plans/phases/phase-2/2026-07-03_bloob-shapes-unification.md`. Also pending
on the vault side: push the marbles/melt/buffbaby `_bloob-settings.md` edits, confirm the
FastComments tenant + domain allowlist. The AE items below may be stale — verify against the
current AE repo before acting.

---

**alter-engineers is the active focus.** All homepage sections now render from `index.md` via `{{ content | safe }}`. Dev command now points to the live content vault at `G:/Shared drives/.../Website/_live-website-content-obsidian-repo`. Detailed plan: `docs/implementation-plans/phases/ae-launch/2026-04-28_ae-launch-sprint.md`.

**Bug fixes (priority order):**
1. **Hero floating arrows** — `folder-preview/browser.js` adds `.swiper-button-prev/.swiper-button-next` classes to nav elements; Swiper CSS positions them absolutely and they escape to the viewport edges. Fix: remove those default classes, style custom `.articles__prev-button/.articles__next-button` in `folder-preview/styles.css`.
2. **Musings scroll passthrough** — add `releaseOnEdges: true` to mousewheel config in `quotes-stack/browser.js` so page scrolls resume when carousel hits the end.
3. **OUR SOLUTIONS text weight** — paragraph in `::: image-text id=solutions` is too heavy; fix via `main.css` `.image-text p` selector.
4. **Musings → quotes-stack rename** — rename folder + manifest trigger; keep CSS class names/IDs unchanged (theme.min.js compatibility).

**New feature:**
5. ✅ **Redirect support (universal)** — `redirect:` or `Redirect:` frontmatter → meta refresh + JS redirect on page load; folder-preview cards open redirect URL in new tab. Implemented: `scripts/utils/redirect-resolver.js`, wired into `preprocess-content.js`, `graph-builder.js`, `_base/head.njk`, `folder-preview/browser.js`.

**Remaining AE tasks:**
6. Add images to project `.md` files (so `card-preview` shows photos)
7. Deploy pipeline — GitHub Actions + Cloudflare Pages for alter-engineers
8. Cleanup: update `homepage.njk` comments (all sections now live via content)

**Other sites:**
- Deploy marbles to Cloudflare Pages (create project + workflow)

**Transclusion (`![[file.md]]`):**
`scripts/utils/transclusion-handler.js` embeds the target page's markdown body inline (with cycle detection, recursive expansion, heading bump). `showIndicators` flag (default `true`) wraps the embed in `<div class="transclusion-embed">`; when `false`, content flows seamlessly with no wrapper. Controlled via `transclusion_indicators:` frontmatter (per-page) or `features.transclusion_indicators:` in `_bloob-settings.md` (site-wide). Heading/block slice (`![[Page#Heading]]`) is not yet implemented — full page is embedded.

See `docs/implementation-plans/ROADMAP.md` for the full roadmap.

---

## Documentation Map

```
CLAUDE.md                       ← Development practices (auto-read by Claude Code)
docs/
├── CLAUDE_CONTEXT.md           ← This file (quick orientation)
├── TECH-DEBT.md                ← Technical debt inventory
├── CHANGELOG.md                ← Session history & milestones
│
├── architecture/               ← How systems work
│   ├── visualizers.md          ← Read/display components
│   ├── magic-machines.md       ← Write/transform AI tools
│   ├── search.md              ← Search, tags, and Pagefind
│   ├── themes.md              ← Theme contract, CSS tokens, bloob-objects system
│   ├── theme-standards.md     ← Theme standards
│   ├── bring-your-own-theme.md ← Custom theme onboarding
│   ├── ontology.md            ← The why/what of shapes (design brief)
│   ├── shapes.md              ← The how of shapes (incl. "Comments — a shape behavior")
│   ├── urls-and-ids.md        ← Canonical URL contract + page-ID + FastComments setup
│   ├── security-by-obscurity.md ← Unlisted/client-facing content convention
│   └── settings-registry.md   ← ALL settings (universal + per-theme). Update when adding any new setting.
│
└── implementation-plans/
    ├── ROADMAP.md              ← Phase overview & priorities
    ├── DECISIONS.md            ← Architectural decision log
    ├── IDEAS.md                ← Future ideas parking lot
    │
    ├── _completed/             ← Finished plans (historical)
    │   ├── phase-1-implementation-plan.md
    │   ├── 2026-02-05_Migration-Checklist.md
    │   └── 2026-02-05_Migration-plan-from HUGO to ELEVENTY.md
    │
    └── phases/                 ← Active implementation plans
        ├── phase-2/             ← Phase 2 plans
        │   ├── phase-2-linking-api.md
        │   ├── 2026-02-03_recipe-scaling.md
        │   ├── 2026-02-07_test-suite.md
        │   └── 2026-02-08 tag system and search implementation.md
        └── phase-3/             ← Phase 3 plans (future)
            └── 2026-02-08 multi index search architecture.md
```

**Naming conventions for new plans:**
- `YYYY-MM-DD_descriptive-name.md` for feature-specific plans

**External reference:** The Obsidian vault `bloobhaus-obsidian` contains the original vision docs including the Vicki engineering report.

---

## Keeping Docs Updated

When making changes, update the relevant docs:

| Change Type | Update |
|-------------|--------|
| New folder structure in codebase | Update "Project Structure" in this file |
| New/changed architecture (visualizers, magic machines, etc.) | Update `architecture/` docs |
| New or changed setting in any theme | Update `architecture/settings-registry.md` |
| Implementation work on a phase | Update the plan in `phases/<phase-N>/` |
| Completed a session | Add to `CHANGELOG.md` |
| Significant technical decision | Add to `DECISIONS.md` |
| New feature idea | Add to `IDEAS.md` |
| Phase-level roadmap changes | Update `ROADMAP.md` |

---

*buffbaby.bloob.haus is LIVE on Eleventy and auto-updating!*
