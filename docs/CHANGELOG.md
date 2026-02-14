# Bloob Haus - Changelog

Development session history and completed work.

---

## Session Log

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
