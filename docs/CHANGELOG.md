# Bloob Haus - Changelog

Development session history and completed work.

---

## Session Log

### Session 14 - February 19, 2026
**Worked on:** Engineering review implementation, marbles site launch, multi-site build isolation

**Infrastructure Cleanup (from engineering review):**
- Deleted `vercel.json` (migrated to Cloudflare Pages)
- Removed 5 unused npm dependencies (remark-wiki-link, execa, unified, remark-parse, remark-stringify)
- Created `CLAUDE.md` (auto-read development guide) and `docs/TECH-DEBT.md`

**New Features:**
- Configurable URL slug strategy per site: "slugify" (lowercase, buffbaby) and "preserve-case" (keep casing, marbles) via `permalinks.strategy` in sites/*.yaml
- Centralized `scripts/utils/slug-strategy.js` replacing 7 scattered slugify implementations
- Dynamic section collections in `eleventy.config.js` — auto-discovers sections from URL structure
- Dev workflow: `npm run dev` with `concurrently` (theme watcher + Eleventy serve)
- Image optimization caching in `.cache/eleventy-img/` (persists across builds)
- Validation report: broken link collection during preprocessing with `--strict` CI flag
- Per-file `exclude_files` list in site YAML config (e.g., exclude `ALL.md` from marbles)
- Reserved directory filtering: `media`, `assets`, `tags`, `pagefind`, `og`, `search` excluded from section discovery

**Multi-Site Build Isolation:**
- Content subfolder support: `content.path` in YAML config points to subfolder within a repo
- Branch support: `content.branch` specifies which branch to clone
- Repo-switch detection: `clone-content.js` detects if wrong repo is in `content-source/` and re-clones
- Preprocessor now cleans all `.md` files and `media/` from `src/` before writing new content (prevents cross-site contamination on local builds)

**Marbles Site:**
- Created `sites/marbles.yaml` — preserve-case URLs, `#private-marble-keep-from-public` blocklist tag, content from `LSanten/LSanten.github.io:_mms-md`
- Successfully built: 419 pages indexed, ~35s build time
- Verified: no recipe content bleeding, no `ALL` page, no `media` in nav

**Tests:**
- Added 44 new tests: publish-filter (12), file-index-builder (16), slug-strategy (16)
- Total: 14 files, 191 tests, all passing

**Documentation:**
- Updated DECISIONS.md with 10 new decisions
- Updated CLAUDE_CONTEXT.md with current status
- Updated TECH-DEBT.md with resolved items
- Updated IDEAS.md with future improvements

**Files changed:** 20+ files across scripts/, sites/, tests/, docs/, eleventy.config.js, package.json

---

### Session 13 - February 18, 2026
**Worked on:** Graph hover tooltip with OG image preview; OG filename encoding fix

**Graph Hover Tooltip:**
- Added `makeTooltip()` function in `lib/visualizers/graph/browser.js`
  - Creates a `position:fixed` div appended to `document.body` (not inside the canvas container)
  - Follows the mouse via `mousemove` listener on the canvas element using `e.clientX/Y` — zero coordinate math, works perfectly with `position:fixed`
  - Shows a small card (150px wide) above the cursor with: OG preview image (if available) + page title
  - `position:fixed` + `clientX/Y` avoids the coordinate-space mismatch that made `graph2ScreenCoords()` + `position:absolute` fail (`graph2ScreenCoords` returns viewport coords, not element-relative coords)
- Applied tooltip to both inline graph and full-graph modal
- Disabled force-graph's native label tooltip: `nodeLabel(() => "")`
- `nodeCanvasObjectMode(() => "after")` kept as always-after for click detection
- `tooltip.attach(canvas)` called via `setTimeout(..., 100)` after graph initialization so the canvas element exists

**OG Image Filename Encoding Fix:**
- Root cause: filenames on disk used raw characters (`@`, spaces) but the pipeline was writing encoded names (e.g. `%40`, `%20`) then URL-encoding them again — double-encoding
- **Rule established:** disk filenames always use raw characters; URL `src`/`href` attributes always use `encodeURIComponent`
- `scripts/preprocess-content.js` — `decodeURIComponent` on the raw markdown image path (normalizes any already-encoded chars), then `encodeURIComponent` on the base name before storing as `/og/{encoded}-og.{ext}` in frontmatter
- `scripts/generate-og-images.js` — reads the frontmatter `image` URL, `decodeURIComponent`s the base name back to raw, writes disk file with raw name (e.g. `cleanshot_2026-01-10-at-22-11-06@2x-og.png`)
- This is the single normalization point — all downstream consumers (templates, graph.json) use the URL as-is; disk operations decode first

**graph.json image field:**
- `scripts/utils/graph-builder.js` — page nodes now include `image: "/og/..."` when the page has an OG image
- `scripts/preprocess-content.js` — sets `perPageLinks[url].image` alongside the frontmatter image field
- Graph tooltip uses `node.image` to display the preview

**Files changed:**
- `lib/visualizers/graph/browser.js` — hover tooltip (mouse-following card with image + title)
- `scripts/preprocess-content.js` — image field in perPageLinks, encode/decode fix
- `scripts/utils/graph-builder.js` — image field on page nodes
- `scripts/generate-og-images.js` — disk files written with raw filenames

---

### Session 12 - February 18, 2026
**Worked on:** Phase 2 — graph.json linking API + graph visualizer

**graph.json Linking API (Step 1):**
- Created `scripts/utils/graph-builder.js` — pure `buildGraph(perPageLinks)` function
  - Input: per-page map of `{ title, outgoing: [url] }` collected during preprocessing
  - Output: `{ nodes: [{ id, title, section }], links: [{ source, target }] }` — D3 / force-graph compatible
  - URL as node ID (no numeric indirection), section derived from URL path (`/recipes/chai/` → `"recipes"`)
  - Heading anchors stripped from link targets, self-links and unknown targets filtered, duplicates deduplicated
- Modified `preprocess-content.js` to collect resolved outgoing links per page during step 6f (from both wiki-link and markdown-link resolver output)
- New step 7: builds graph data and writes `src/graph.json` → served at `/graph.json`
- Added `eleventy.config.js` passthrough copy for `src/graph.json`
- `graph.json` is **always generated** regardless of whether the graph visualizer is active

**Note on backlinks vs graph.json — they're complementary, not redundant:**
| | Backlinks | graph.json |
|---|---|---|
| Direction | Incoming only | Bidirectional (outgoing + incoming) |
| Format | Eleventy data (not a public file) | Served JSON endpoint at `/graph.json` |
| Source | Reads processed markdown from disk at Eleventy build time | Built from link resolver results during preprocessing |
| Purpose | Static "pages that link here" list on each page | Site-wide data API for visualization and future tools |
| Scope | Per-page | Entire site at once |

**Graph Visualizer (Step 2):**
- Created `lib/visualizers/graph/` — hybrid visualizer (build-time transform + runtime browser)
- `manifest.json` — type: hybrid, settings schema, TODO note for right/left positioning
- `index.js` — build-time transform: detects ` ```graph ` code fences in rendered HTML, parses YAML settings, replaces with `<div class="graph-visualizer" data-graph-position="inline" data-graph-settings='...'>` container
- `browser.js` — runtime:
  - Loads `force-graph` (MIT, vasturiano) from jsDelivr CDN at runtime (avoids ~300KB bundle)
  - Fetches `/graph.json` and `/graph-settings.json` (shared, cached fetch promises)
  - BFS local graph filtering to N-depth neighborhood of current page
  - Renders interactive canvas graph with node labels, click-to-navigate
  - Full-graph modal (all pages) via "Full graph" button, Escape/overlay-click to close
  - Colors inherit from warm-kitchen CSS variables (`--accent-color`, `--border-color`, etc.) with optional hex overrides
- `styles.css` — graph header, canvas, full-graph modal; uses CSS variables for theme matching
- `graph.test.js` — 15 co-located tests (manifest, exports, transform behavior)

**Settings system (lowest to highest priority):**
1. Manifest defaults (`only_if_linked: true`, `depth: 2`, `show_full_graph: true`)
2. `.bloob/graph.yaml` in content vault → preprocessor reads + writes `src/graph-settings.json` → served at `/graph-settings.json`
3. Per-page frontmatter: `graph: { depth: 3 }`
4. Inline code fence: ` ```graph\ndepth: 1\n``` ` (also positions graph at that location)

**Wired into build:**
- `themes/warm-kitchen/layouts/page.njk` — graph container at bottom of every page, passes `data-current-page` and frontmatter settings; conditional on graph visualizer being bundled
- `sites/buffbaby.yaml` — added `graph` to visualizers list
- `eleventy.config.js` — passthrough copies for both `graph.json` and `graph-settings.json`

**Test suite:** 11 files, 137 tests (was 104 → 122 → 137)

---

### Session 11 - February 17, 2026
**Worked on:** Cloudflare Pages + GitHub Actions migration

**GitHub Actions CI/CD:**
- Created `.github/workflows/deploy-buffbaby.yml` — single-site deploy workflow
  - Triggers: push to main (paths-ignore docs), `repository_dispatch` from content repo, manual
  - Steps: checkout → Node 20 → npm ci → npm test (104 tests) → build:buffbaby → deploy to Cloudflare Pages via wrangler
- Created `.github/workflows/rebuild-all.yml` — matrix-based rebuild of all sites
  - Auto-discovers sites from `sites/*.yaml` using `jq`
  - Triggers on changes to themes/, scripts/, lib/, eleventy.config.js, package.json
  - Runs tests once, then builds/deploys each site in parallel (`fail-fast: false`)
- Created `.github/workflows/trigger-build.yml` in **buffbaby** content repo
  - Pushes to buffbaby → `repository_dispatch` → triggers `deploy-buffbaby` in builder repo
  - Full chain verified: content push → build → test → deploy (1m 25s)

**Cloudflare Pages Setup:**
- Created Cloudflare account and added `bloob.haus` domain
- Created `buffbaby` Cloudflare Pages project (Direct Upload mode)
- Site deployed and accessible at `buffbaby-f5k.pages.dev`
- Added custom domain `buffbaby.bloob.haus` in Cloudflare Pages

**DNS Migration (Porkbun → Cloudflare):**
- Changed nameservers from Porkbun to Cloudflare (`dimitris.ns.cloudflare.com`, `kara.ns.cloudflare.com`)
- Added CNAME record: `buffbaby` → `buffbaby-f5k.pages.dev` (proxied)
- DNS propagated and verified: `buffbaby.bloob.haus` serving from Cloudflare with SSL (HTTP 200, `cf-ray` header confirmed)

**GitHub Secrets Configured:**
- `CONTENT_REPO_TOKEN` — GitHub PAT for cloning private content repos
- `CLOUDFLARE_API_TOKEN` — Cloudflare API token with Pages edit permissions
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account identifier
- `BUILDER_REPO_TOKEN` — added to buffbaby repo for repository_dispatch

**Remaining cleanup:**
- Decommission Vercel (remove vercel.json, delete project) — no rush, traffic already on Cloudflare

---

### Session 10 - February 17, 2026
**Worked on:** Test suite implementation (Phase 1 + 1.5)

**Test Infrastructure:**
- Installed Vitest as test framework (native ESM support, zero config)
- Created `vitest.config.js` with dual glob patterns: `tests/**/*.test.js` (central) + `lib/**/*.test.js` (co-located)
- Created `tests/helpers/mock-index.js` — shared factories for mock file/attachment indexes
- Added `npm test` and `npm run test:watch` scripts to `package.json`

**Phase 1 — Pure Function Unit Tests (5 files, 62 tests):**
- `tests/utils/comment-stripper.test.js` — 11 tests (Obsidian %% %%, HTML comments, whitespace collapse)
- `tests/utils/attachment-resolver.test.js` — 14 tests (URL decoding, wiki-style images, case-insensitive lookup, the %20 bug case)
- `tests/utils/wiki-link-resolver.test.js` — 11 tests (title/filename/normalized lookup, headings, broken links, transclusion skip)
- `tests/utils/markdown-link-resolver.test.js` — 9 tests (folder stripping, URL decoding, heading anchors, external URLs untouched)
- `tests/utils/transclusion-handler.test.js` — 17 tests (page embeds, all 10 media extensions excluded, multiple transclusions)

**Phase 1.5 — Templatizer & Co-located Visualizer Tests (4 files, 42 tests):**
- `tests/build/config-loader.test.js` — 12 tests (YAML loading, CLI arg/env var priority, schema shape, error handling)
- `tests/build/assemble-src.test.js` — 10 tests (theme structure validation, site.js generation contract, module exports)
- `lib/visualizers/checkbox-tracker/checkbox-tracker.test.js` — 10 tests (co-located: manifest, exports, no-op transform)
- `lib/visualizers/page-preview/page-preview.test.js` — 10 tests (co-located: manifest, exports, no-op transform)

**Architecture Decisions:**
- Co-located tests: modular packages (visualizers, future machines) carry their own `.test.js` files
- Central tests: pipeline utilities and build orchestration tested in `tests/`
- Vitest auto-discovers both via glob patterns

**Updated test suite plan** with Phase 1.5, co-located architecture, test template for new visualizers, activation config reference table.

**Results:** 9 test files, 104 tests, all passing in ~700ms.

---

### Session 9 - February 16, 2026
**Worked on:** Templatize the builder for multi-site support

**Templatized Builder Architecture:**
- Extracted all theme files from `src/` into `themes/warm-kitchen/` (layouts, partials, pages, CSS)
- Created `themes/_base/` for shared partials (`head.njk`, `backlinks.njk`) used across all themes
- `src/` is now entirely generated at build time (gitignored) — never edit files in `src/` directly
- Theme partials override base partials when they share the same name

**Config-Driven Builds:**
- Created `sites/buffbaby.yaml` — all site configuration in one YAML file (name, content repo, theme, features, media settings, publish mode)
- Created `scripts/utils/config-loader.js` — shared YAML config loader used by assemble, build, and eleventy
- Created `scripts/assemble-src.js` — assembles `src/` from theme + base files + generates `site.js` from config
- Updated `scripts/build-site.js` — config-driven orchestration with `--site=` flag (defaults to `buffbaby`)
- Updated `eleventy.config.js` — reads site config, conditionally enables backlinks and image optimization
- Environment variables simplified: only `GITHUB_TOKEN` required as env var; everything else in YAML config

**Package Updates:**
- Added `js-yaml` dependency for YAML config parsing
- Updated `package.json` scripts: `build`, `build:buffbaby`, `dev`, `dev:buffbaby`, `assemble`

**Multi-Site Architecture:**
- Adding a new site (e.g., marbles) requires only:
  1. Create `themes/spatial-garden/` with layouts, partials, pages, CSS
  2. Create `sites/marbles.yaml` pointing to theme + content repo
  3. Run `SITE_NAME=marbles npm run build`
- Zero changes needed to buffbaby's theme or config

**Build Verified:**
- `npm run build` produces identical output to pre-refactor build
- 109 pages written, 67 indexed by Pagefind, 14.19s build time

---

### Session 8 - February 13, 2026
**Worked on:** Homepage redesign, search UX, recipe ordering fix

**Homepage Redesign:**
- Replaced "Recent Recipes" + "Resources" layout with search-first design
- Pagefind search bar now centered prominently below header
- Full tag cloud ("Browse by Tag") displayed below search bar
- Recent Recipes list at the bottom of the page

**Search UX (Mobile):**
- Fixed mobile Pagefind layout: search results now appear above tag filters on phone
- Root cause: conflicting `flex-direction: column-reverse` with explicit `order` values were canceling out
- Fixed to `flex-direction: column` with `order: 1` (results) and `order: 2` (filters)

**Recipe Ordering Fix (Git Dates):**
- Root cause: `clone-content.js` used `git clone --depth 1` (shallow clone), so `git log` returned no per-file dates
- Without dates, Eleventy fell back to filesystem creation time (identical for all files on fresh deploy)
- Fix: full clone instead of shallow — all 64 files now get correct git dates
- Added auto-unshallow: existing shallow repos detected and unshallowed with `git fetch --unshallow`
- Added `gitDatesFound` / `gitDatesMissing` counters to preprocessing summary for visibility

**Build Target Cleanup:**
- Changed default `BUILD_TARGET` from `"hugo"` to `"eleventy"` in `preprocess-content.js` and `build-site.js`
- Hugo is no longer used; prevents accidental writes to a `hugo/` folder

---

### Session 7 - February 8-9, 2026
**Worked on:** Tag system, Pagefind search, page-preview visualizer, bug fixes

**Tag System & Pagefind Search:**
- Created `scripts/utils/tag-extractor.js` — extracts and normalizes tags from frontmatter and inline content
- Added tag collections and `tagList` collection to `eleventy.config.js`
- Created tag index page (`/tags/`) with weighted tag cloud
- Created per-tag pages (`/tags/<tag>/`) listing all tagged content
- Created `src/_includes/partials/tags.njk` for tag badges on content pages
- Integrated Pagefind search with `src/search.njk` — full-text search with tag filters
- Added Pagefind build step to Eleventy build pipeline
- Tag filtering ignores provenance tags (internal metadata)

**Search UX Polish:**
- Search icon added to navigation bar
- Thumbnails shown in search results via `data-pagefind-meta="image"` on pages
- Empty filters hidden, tag filters collapsed by default
- Filter label renamed for clarity
- Mobile layout: tag filters moved below search results

**Page Preview Modal:**
- Built recipe preview modal — hover/click to preview page content without navigating
- Rebuilt as hover button with extended interaction area
- Fixed search result image display with `!important` overrides for Pagefind's scoped styles
- Modularized as `lib/visualizers/page-preview/` visualizer package (manifest, browser.js, styles.css)

**Visualizer Auto-Discovery Improvements:**
- `bundle-visualizers.js` now auto-generates CSS and JS include paths
- `head.njk` and `scripts.njk` updated to loop over discovered visualizers instead of hardcoded paths

**Bug Fixes:**
- Duplicate image bug: OG images moved from `/media/og/` to `/og/` to avoid being re-optimized by image transform
- Image optimizer now skips `/media/` subdirectories (only processes top-level `/media/` images)

**Documentation:**
- Restructured `docs/implementation-plans/phases/` into `phase-2/` and `phase-3/` subdirs
- Created `docs/architecture/search.md` — search, tags, and Pagefind architecture doc
- Created tag system and search implementation plan (`2026-02-08`)
- Created multi-index search architecture doc for Phase 3
- Moved completed tag/search plan to `_completed/`
- Source attribution line commented out pending better recipe provenance design
- Added reserved root folder validation to IDEAS
- Added duplicate image fix to DECISIONS log

---

### Session 6 - February 7, 2026
**Worked on:** Image processing improvements, OG preview images for chat sharing

**PNG Preservation:**
- Changed Eleventy image transform to detect source format: PNG sources output WebP + PNG (not JPEG), preserving full gradient alpha transparency
- JPEG sources continue as WebP + JPEG (unchanged behavior)
- GIFs skip the transform entirely — served untouched to preserve animation

**OG Preview Images for Chat Sharing:**
- Added `extractFirstImage()` utility to `attachment-resolver.js` — extracts first image reference from processed markdown
- Preprocessor now sets `image` frontmatter field on pages with images, pointing to `/media/og/{name}-og.{format}`
- Created `scripts/generate-og-images.js` — dedicated OG preview generator:
  - Generates 1200w-wide previews optimized for social sharing
  - PNG sources produce PNG previews (preserves transparency), JPEG sources produce JPEG previews
  - GIFs copied as-is to preserve animation
  - Iterative quality/dimension reduction to stay under 300KB (WhatsApp-compatible)
  - File hash tracking (`.og-tracking.json`) skips unchanged images on subsequent builds
  - Orphan cleanup for removed pages
- Wired into build pipeline as Step 2.5 (between preprocessing and Eleventy build)

**Head Meta Tag Improvements:**
- Added `og:image:width` and `og:image:type` meta tags (supports JPEG, PNG, GIF)
- Added `og:site_name` meta tag
- Added `<link rel="canonical">` for SEO

**EXIF Orientation Fix:**
- Fixed OG preview images that appeared rotated — `generate-og-images.js` now applies EXIF orientation correction

**Dependencies:**
- Added `sharp` as explicit dependency (was only transitive via eleventy-img)

**Build Stats:**
- 11 OG preview images generated, all under 300KB
- Second build skips all 11 (caching works)
- PNG images now correctly output as WebP + PNG in `_site/media/optimized/`

---

### Session 5 - February 5, 2026
**Worked on:** Hugo → Eleventy migration (M0-M7), site enhancements (RSS, sitemap, image optimization)

**Migration M0: Preparation**
- Created `src/` directory structure for Eleventy
- Created `lib/visualizers/checkbox-tracker/` modular visualizer package
- Installed Eleventy 3.x and esbuild as dev dependencies
- Updated `.gitignore` for generated section dirs, `_site/`, `src/media/`
- Added npm scripts (`build:eleventy`, `dev:eleventy`)
- Created `.eleventyignore` with `node_modules/`

**Migration M1: Eleventy Foundation**
- Created `eleventy.config.js` (ESM, `export default async function`)
- `setUseGitIgnore(false)` — required because generated content dirs are gitignored
- Created `src/_data/site.js` (title, description, URL, author)
- Created `src/_data/eleventyComputed.js` — slugified permalinks for both folder paths and filenames
- Ported all templates from Hugo Go templates to Nunjucks: `base.njk`, `page.njk`, `list.njk`
- Ported all partials: `head.njk`, `nav.njk`, `footer.njk`, `scripts.njk`
- Copied CSS + JS assets to `src/assets/`
- Added filters: `dateFormat`, `truncate`, `head`, `capitalize`, `titleCase`

**Migration M2: Preprocessing Integration**
- Modified `preprocess-content.js` with `BUILD_TARGET` support (lazy getter for ESM timing)
- Modified `build-site.js` with `--target=` flag (hugo or eleventy)
- Eleventy target adds `layout: layouts/page.njk` to frontmatter
- Verified: 67 pages, 22 media, 0 broken links

**Migration M3: Template Parity**
- Set up section collections in `eleventy.config.js` (`recipes`, `notes`, `resources`, `listsOfFavorites`)
- Auto-detect sections collection (mirrors Hugo's `.Site.Sections`)
- Created homepage `src/index.njk` with recent recipes and resources
- Created section index pages (`src/recipes/index.njk`, etc.)
- `titleCase` filter handles hyphen-to-space conversion for slugified section names in nav

**Migration M4: Visualizer Architecture**
- Created modular visualizer package: `lib/visualizers/checkbox-tracker/` with `index.js`, `browser.js`, `styles.css`, `manifest.json`
- `index.js` exports `{ type, name, transform }` — module contract for all visualizers
- Created `scripts/bundle-visualizers.js` — auto-discovers visualizer folders, bundles with esbuild
- esbuild bundles `browser.js` → IIFE in `src/assets/js/visualizers/`, copies `styles.css` → `src/assets/css/visualizers/`
- `eleventy.config.js` auto-loads visualizers and registers `addTransform` for build-time types
- Runtime visualizers (like checkbox-tracker) pass through unchanged; build-time visualizers modify HTML
- Added `markdown-it-task-lists` plugin for `- [ ]` checkbox rendering (markdown parser layer)
- Fixed CSS/JS selectors for `<label>`-wrapped checkboxes from task-lists plugin

**Migration M5: Backlinks**
- Implemented `addCollection("withBacklinks")` — reads markdown source files, extracts internal links via regex
- Two-pass algorithm: first builds link map, then computes backlinks per page
- Created `src/_includes/partials/backlinks.njk` with styled backlink list
- Added backlinks CSS to `main.css` (pill-style links)

**Migration M6: Deployment**
- Full build test: 72 pages, 22 media, 26 assets copied, 0 broken links
- Updated `vercel.json`: `buildCommand` → `npm run build:eleventy`, `outputDirectory` → `_site`
- Pushed all migration commits (9 total) to origin/main
- Verified production deployment on buffbaby.bloob.haus

**Migration M7: Cleanup**
- Archived Hugo version to `archive/hugo-version` branch
- Removed `hugo/` folder and all Hugo templates, CSS, JS, static media
- Uninstalled `hugo-bin` dependency
- Cleaned up `package.json` scripts (removed Hugo-specific scripts, simplified `build` and `dev`)
- Cleaned up `.gitignore` (removed Hugo paths) and `vercel.json`
- Updated `docs/CLAUDE_CONTEXT.md` and `docs/implementation-plans/ROADMAP.md`
- Created `README.md` with project overview, quick start, and docs links

**Site Enhancements (post-migration):**
- **RSS feed** (`/feed.xml`) — Atom feed with 20 most recent recipes, full content, using `@11ty/eleventy-plugin-rss`
- **Sitemap** (`/sitemap.xml`) — all pages with lastmod dates
- **robots.txt** — allows all crawlers, references sitemap
- **Custom 404 page** — styled error page with link back to homepage
- **Image optimization** — `@11ty/eleventy-img` via `addTransform`, generates WebP + JPEG at 600w/1200w, `<picture>` elements with `loading="lazy"` and `decoding="async"`. Reduces 48MB of raw iPhone photos to ~6MB optimized.

**Key Technical Decisions:**
- `BUILD_TARGET` env var uses lazy getter (not module-level const) due to ESM import timing
- Visualizer parsers run in preprocessor (raw markdown), not `addTransform` (HTML)
- `addTransform` kept as secondary hook for post-render HTML modifications
- Image optimization runs as `addTransform` on rendered HTML — no changes needed to preprocessor or markdown content
- Backlinks read source files from disk (stable API, not Eleventy internals)

**Build Stats:**
- 77 files written (72 pages + feed.xml + sitemap.xml + robots.txt + 404.html + optimized image variants)
- Build time: ~11s (up from ~5s due to image processing)
- 10 commits pushed to origin/main

---

### Session 4 - February 3, 2026
**Worked on:** Recipe cleanup (buffbaby vault), Magic Machines architecture, documentation reorganization

**Recipe Cleanup (buffbaby vault):**
- Added missing `# titles` to 2 files (gf pancakes, Tuna Rools)
- Converted `**bold**` section headers to `##` headers (4 files)
- Deleted emoji section markers (👉🏻)
- Converted 74 files from bullets/numbered lists to checkboxes (`- [ ]`)
- Fixed YAML frontmatter that was accidentally converted
- Standardized recipe formatting across ~80 recipe files

**Magic Machines Architecture:**
- Introduced "Magic Machines" concept - AI-powered content transformation tools
- Designed as "write" counterpart to Visualizers ("read" tools)
- Created modular manifest format (JSON with prompts, settings, I/O)
- Designed flat YAML frontmatter for status tracking (`mm_<machine-name>: date`)
- Flat structure chosen for Obsidian Properties compatibility

**Recipe Scaling System Plan:**
- Researched Cooklang markup language for recipes
- Designed Cooklang-inspired syntax: `@ingredient{qty%unit}`
- Planned hybrid visualizer (build-time parser + runtime scaler)
- Documented scaling UI and servings metadata approach

**Documentation Reorganization:**
- Created `docs/implementation-plans/` folder
- Moved all implementation plans and roadmaps to new location
- Established naming conventions:
  - `bloob-haus-*.md` for roadmaps/phase plans
  - `YYYY-MM-DD_*.md` for feature-specific plans
- Updated CLAUDE_CONTEXT.md with new conventions
- Created `2026-02-03_recipe-scaling-and-magic-machines.md`

---

### Session 3 - February 2, 2026
**Worked on:** Interactive checkboxes, visualizer architecture, documentation

**Checkbox Tracker Visualizer:**
- Created modular visualizer folder structure (`hugo/assets/js/visualizers/`, `css/visualizers/`)
- Implemented checkbox-tracker.js with localStorage persistence
- Floating reset button appears only when boxes are checked
- 60-second undo window after reset ("Undo clearing")
- Checkbox states persist across page reloads and visits

**Documentation & Planning:**
- Documented visualizer architecture in future-features-roadmap.md
- Defined build-time vs runtime visualizers
- Defined activation methods (frontmatter, folder config, auto-detect, global)
- Chose Approach A (build-time resolution) over Approach B (runtime resolution)
- Updated CLAUDE_CONTEXT.md and TODO.md
- Created Phase 2 implementation plan skeleton

**Other Changes:**
- Renamed site from "Buff Baby Bakery" to "Buff Baby Kitchen"
- Reduced checkbox spacing
- Updated search-index.json spec (added image field)

---

### Session 2 - January 30, 2026
**Worked on:** Tasks 2-17 (Full implementation and deployment)

**Preprocessing Pipeline (Tasks 2-10):**
- Content clone script with GitHub PAT authentication
- Obsidian config reader (attachment folder detection)
- Dual-mode publish filter (allowlist/blocklist)
- File index builder with folder-based URLs
- Wiki-link resolver ([[links]])
- Markdown link resolver ([text](file.md))
- Attachment resolver (images copied to /media/)
- Transclusion placeholder handler
- Comment stripper (Obsidian %% %% and HTML <!-- -->)
- Git date extractor (last modified dates for sorting)
- Full preprocessing orchestration

**Hugo Site (Tasks 11-12):**
- Complete template system (baseof, single, list, index)
- Warm color theme with Google Fonts
- Responsive design
- Clickable recipe cards showing full content
- Auto-detected navigation for all sections
- First heading underlined on recipe pages
- Open Graph meta tags for social sharing

**Build & Deploy (Tasks 13-17):**
- Full build script orchestration
- Local testing with dev server
- Vercel deployment with environment variables
- Custom domain setup (buffbaby.bloob.haus)
- Auto-rebuild webhook on content changes

**Key Features Added Beyond Original Plan:**
- Comment stripping for privacy (`%% notes %%` removed)
- Git-based date extraction for "Recent Recipes" sorting
- Clickable recipe cards (whole card is link, not just title)
- Auto-detection of all top-level sections in nav
- Support for h1, h2, AND h3 first headings
- Bold/italic formatting preserved in titles
- YouTube embed support (HTML passthrough)

**Test Results:**
- 59 recipes published
- 21 recipes kept private (#not-for-public tag)
- All links resolved correctly
- All images working
- Comments stripped successfully
- Auto-deployment working

---

### Session 1 - January 29, 2026
**Worked on:** Project Setup (Task 1)

**Completed:**
- Initialized npm project with ES modules
- Installed all dependencies (223 packages)
- Hugo v0.152.2 verified working
- Created folder structure
- Set up GitHub repository

---

## Quick Reference

| Session | Date | Summary |
|---------|------|---------|
| 1 | Jan 29, 2026 | Project setup |
| 2 | Jan 30, 2026 | Full implementation & deployment - site goes LIVE |
| 3 | Feb 2, 2026 | Checkbox visualizer, modular structure, site rename |
| 4 | Feb 3, 2026 | Recipe cleanup, Magic Machines architecture, docs reorganization |
| 5 | Feb 5, 2026 | Hugo → Eleventy migration (M0-M7), RSS, sitemap, image optimization |
| 6 | Feb 7, 2026 | PNG preservation, OG preview images, GIF support, EXIF fix, SEO meta tags |
| 7 | Feb 8-9, 2026 | Tag system, Pagefind search, page-preview visualizer, image bug fixes |
| 8 | Feb 13, 2026 | Homepage redesign (search-first), recipe ordering fix, build target cleanup |
| 9 | Feb 16, 2026 | Templatize builder: multi-site architecture, config-driven builds |
| 10 | Feb 17, 2026 | Test suite: Vitest, 104 tests (Phase 1 + 1.5), co-located architecture |
| 11 | Feb 17, 2026 | Cloudflare Pages + GitHub Actions migration, DNS to Cloudflare |
| 12 | Feb 18, 2026 | graph.json API + graph visualizer (force-directed, local + global modal) |
| 13 | Feb 18, 2026 | Graph hover tooltip with OG image preview; OG filename encoding fix |
| 14 | Feb 19, 2026 | Engineering review implementation, marbles site, multi-site isolation |

---

## Milestones

| Date | Milestone |
|------|-----------|
| Jan 30, 2026 | 🎉 **buffbaby.bloob.haus goes LIVE** (Hugo) |
| Feb 2, 2026 | Interactive checkboxes added |
| Feb 3, 2026 | Documentation restructured, architecture documented |
| Feb 5, 2026 | 🎉 **Hugo → Eleventy migration complete** (M0-M7) |
| Feb 5, 2026 | RSS feed, sitemap, robots.txt, 404 page, image optimization added |
| Feb 7, 2026 | PNG transparency preserved, OG preview images for chat sharing, EXIF fix, canonical URLs |
| Feb 8-9, 2026 | Tag system, Pagefind search, page-preview visualizer, duplicate image bug fixes |
| Feb 13, 2026 | Search-first homepage, recipe ordering fixed (full git history), Hugo defaults removed |
| Feb 16, 2026 | Templatized builder: themes/, sites/*.yaml, config-driven builds, src/ fully generated |
| Feb 17, 2026 | Test suite foundation: 9 files, 104 tests, co-located visualizer tests, Vitest |
| Feb 17, 2026 | GitHub Actions CI/CD + Cloudflare Pages hosting live, DNS migrated to Cloudflare |
| Feb 18, 2026 | graph.json API + graph visualizer: force-directed, local neighborhood + full-graph modal |
| Feb 18, 2026 | Graph hover tooltip with OG preview image; OG filename encoding unified (raw on disk, encoded in URLs) |
| Feb 19, 2026 | Engineering review implemented: cleanup, slug strategies, marbles site built, multi-site build isolation, 191 tests |
