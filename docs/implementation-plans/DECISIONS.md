# Decision Log

Track major architectural and technical decisions with their rationale.

---

## Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-28 | `templateFormats: ["md", "njk"]` — exclude HTML from Eleventy pipeline | HTML vault attachments were being processed as pages and added to collections. All theme templates use `.njk`; HTML files are passthrough-only |
| 2026-05-28 | Auto-compress PNG/JPG over 20 MiB during attachment copy | Cloudflare Pages hard limit is 25 MiB. Compress during copy so vault source is never modified; 20 MiB threshold gives headroom |
| 2026-05-28 | AE fork uses `altron-alters/bloob-haus-webapp`; upstream sync via cherry-pick only | `git push upstream main` is banned — AE fork has deleted LSanten's site workflows. Fixes go upstream via cherry-pick or PR |
| 2026-01-29 | Hugo over Eleventy | Faster builds, single binary |
| 2026-01-29 | @flowershow/remark-wiki-link | Battle-tested, maintained |
| 2026-01-29 | Consent-first publishing | Aligns with values, prevents accidents |
| 2026-01-29 | Cloudflare for multi-user | Unlimited bandwidth, cost protection |
| 2026-01-29 | Microformats2 in templates | Low effort, IndieWeb compatibility |
| 2026-02-02 | Visualizer build-time resolution (Approach A) | Smaller payloads, fail-fast, audit trail. Runtime resolution (Approach B) doesn't scale with many visualizers |
| 2026-02-02 | Separate search-index.json and links.json | Different use cases, search needs speed, link data is larger |
| 2026-02-02 | Modular visualizer folder structure | Future-proofs for many visualizers, clear separation of concerns |
| 2026-02-03 | Cooklang-inspired syntax for recipes | Established spec, good ecosystem, human-readable, supports scaling |
| 2026-02-03 | Magic Machines as separate concept from Visualizers | Clear separation: visualizers=read/display, machines=write/transform |
| 2026-02-03 | Magic machine status tracking in frontmatter | Enables idempotent runs, auditing, and selective re-processing |
| 2026-02-03 | Flat YAML keys for magic machine status | Obsidian Properties compatibility, easier Dataview queries |
| 2026-02-05 | Migrate from Hugo to Eleventy | JS throughout enables dual-use visualizers (build + browser + Obsidian), native collections for backlinks |
| 2026-02-05 | Visualizer parsers run in preprocessor (not addTransform) | Parsers receive raw markdown, enabling code sharing across Eleventy, browser preview, and Obsidian plugins |
| 2026-02-05 | markdown-it-task-lists for checkbox rendering | Standard markdown parser concern (like Goldmark in Hugo), not a visualizer responsibility |
| 2026-02-05 | Slugify both folder paths and filenames in URLs | Clean URLs, no spaces; consistent across Eleventy permalinks, preprocessor links, and Obsidian copy-link plugin |
| 2026-02-09 | OG images live at /og/, not /media/og/ | /media/ is purely user content (all optimized, including nested folders); system-generated assets like OG images get their own top-level dir to avoid image optimizer conflicts |
| 2026-02-19 | Dynamic section collections | Replace hardcoded per-section collections with auto-generated ones from discovered sections — enables multi-site without touching eleventy.config.js |
| 2026-02-19 | File identity: filename-based, UUIDs deferred | Filenames are stable identifiers for URLs. UUID-based tracking deferred to Phase 3+ when rename-tracking is needed |
| 2026-02-19 | Dev workflow: concurrently-based file watcher | `npm run dev` runs assemble + theme watcher + Eleventy serve in parallel via `concurrently` |
| 2026-03-23 | Color pair contract: `--pair-bg / --pair-title / --pair-text` per `.bg-*` class | Named tokens map to CSS custom properties (theme controls colors); hex values emit same var names as inline styles — renderers and cascade rules work identically for both paths. Single `resolveBg()` utility in `_utils/bg-color.js` is the only entry point for both. |
| 2026-04-25 | GUI magic machines self-host third-party JS in `app/vendor/` | CDN dynamic imports for GUI tools are unreliable: `unpkg` serves UMD bundles with no named ESM exports; `esm.sh` redirects can fail silently in some CSP/browser contexts. Self-hosted ESM files in `vendor/` are served with correct MIME type from the same origin — no network dependency, no format ambiguity. Rule: any third-party JS loaded by a magic machine's `app/` must be vendored locally. |
| 2026-04-25 | Three-tier testing model for bloob-haus tools | (1) `npm run dev:magic-machine <name>` — instant, no content, tests GUI tools standalone. (2) `npm run dev:* -- --page=file.md` — fast Eleventy build of one page, tests visualizer rendering. (3) `npm run dev:*` full build — needed for cross-cutting changes, layout, pipeline bugs. Use the lightest tier that covers the change. |
| 2026-02-19 | Image cache outside _site/ | Use `.cache/eleventy-img/` so optimized images persist across builds (not destroyed when _site/ is cleaned) |
| 2026-02-19 | Validation report + --strict flag | Broken links collected during preprocessing with structured report; --strict flag fails CI builds on broken links |
| 2026-02-19 | CLAUDE.md for development practices | Auto-read by Claude Code; contains session checklists, code quality rules, documentation rules |
| 2026-02-19 | TECH-DEBT.md as living inventory | Dedicated technical debt tracking file, reviewed at session start |
| 2026-02-19 | Configurable URL slug strategy per site | Two strategies: "slugify" (lowercase, buffbaby) and "preserve-case" (keep casing, marbles). Set via `permalinks.strategy` in sites/*.yaml |
| 2026-05-18 | preserve-case as default slug strategy for new vaults | Users writing filenames like `My Note.md` expect `my-note` or `My-Note` in the URL, not `my%20note`. preserve-case (spaces→hyphens, case kept) is the least surprising default. buffbaby explicitly opts into slugify to preserve its existing lowercase URLs. |
| 2026-05-18 | Sanitize filenames (spaces→hyphens) in preprocess, not Eleventy config | Replacing spaces at copy-time in preprocess-content.js is more transparent than a computed permalink in eleventyComputed.js — src/ files match actual URLs, no Eleventy magic required. All downstream consumers (graph, tag index, link resolvers) use slug-strategy-computed URLs from file-index-builder, which independently apply the same transform — so pipeline stays consistent. |
| 2026-02-19 | Shared slug-strategy.js utility | Centralized slug logic used by file-index-builder, eleventyComputed, transclusion-handler, and link resolvers — replaces 7 scattered implementations |
| 2026-02-19 | Content subfolder support (`content.path`) | Sites can point to a subfolder within a repo (e.g., `_mms-md` in LSanten.github.io). Clone-content auto-detects repo switches. |
| 2026-04-28 | Attachment resolver scans entire vault, not just `attachmentFolder` | Obsidian's `attachmentFolder` setting only controls where new files are *pasted*, not where it *finds* existing ones. Users routinely place images in arbitrary subfolders. Restricting the scan caused silent missing-image bugs. Excluding `.obsidian/`, `node_modules/`, `.git/` is sufficient; false positives (non-user files) are negligible. |
| 2026-04-28 | Redirect resolved at preprocess time, stored in graph.json | Resolving `redirect:` at preprocess time (not in Eleventy or browser) lets all consumers (head.njk meta refresh, folder-preview browser.js, future visualizers) read the same resolved URL from graph.json without re-implementing resolution logic. Supports wiki-links, markdown links, and bare URLs via a single `redirect-resolver.js` utility. |
| 2026-02-19 | Preprocessor cleans src/ before writing | Prevents cross-site content contamination on local builds. All .md files and media/ removed from src/ before each build. |
| 2026-02-19 | Per-file exclude_files list in YAML | Allows excluding specific files by name (e.g., `ALL`) without needing a blocklist tag in the file itself. |
| 2026-03-05 | `preprocess-content.js` loads site config itself | Publish settings (`blocklist_tag`, `publish_mode`, `exclude_files`) are read directly from `_bloob-settings.md` inside the preprocessor — not from env vars set by callers. Prevents private content leaks when scripts are called outside the orchestrators. |
| 2026-05-20 | Transclusion indicator toggle is build-time, not CSS | When `showIndicators: false`, the `<div class="transclusion-embed">` wrapper is omitted entirely at preprocessing — embedded content lands as raw markdown inline. Alternative (always emit the div, toggle via CSS class on `<body>`) would require per-theme CSS and a template change. Build-time omission is zero-CSS, works on all themes identically, and produces cleaner HTML output. |
| 2026-03-05 | Dev pipeline unified via `dev-local.js` | `dev:*` npm scripts now call `dev-local.js` (same orchestration as prod) instead of manually chaining raw scripts. Eliminates class of bugs where env vars or step ordering differ between dev and prod. |
| 2026-02-19 | Reserved directory filtering in section discovery | `media`, `assets`, `tags`, `pagefind`, `og`, `search` excluded from auto-discovered sections to prevent non-content dirs appearing in nav. |
| 2026-02-27 | Folder-based URL structure over pathPrefix (temporary workaround) | Eleventy's pathPrefix + subdirectory output causes doubled paths. Folder structure works for now; proper mount_path fix needed for multi-repo architecture. See detailed record below. |
| 2026-02-27 | marbles-pouch body color #dce8f8 (light blue) not lavender | Visual decision based on old site reference; white banner, blue body, white footer creates clear hierarchy |
| 2026-02-27 | SVG waves use filled paths with all y-values within viewBox | Peaks outside viewBox create disconnected arch artifacts; in-bounds paths render correctly at all viewport widths |
| 2026-02-27 | Remove `<h1>` from page.njk layout | Marble content files provide their own `# Title` heading; rendering it in both layout and markdown caused duplication |
| 2026-02-27 | Default banner image = marble.png when bloob_object not set | Most content is marbles; marble.png (woven-marble-3.png) as universal fallback avoids blank banners |
| 2026-02-27 | bloob-object: marble added to all existing marbles content files | 471 files updated; ensures consistent banner rendering before user updates individual files |
| 2026-02-28 | Tags visualizer fetches tagIndex.json at runtime | Tag data is already generated by preprocessor; a simple fetch in browser.js avoids build-time complexity and keeps the transform thin |
| 2026-03-23 | Post-preprocess cleanup removes conflicting theme index.njk files | See detailed record below. |
| 2026-02-28 | tagIndex.json served as static asset via passthrough copy | `src/_data/tagIndex.json` is Eleventy data (not auto-served); explicit passthrough to `/tagIndex.json` needed for browser fetch |
| 2026-02-28 | Recent Marbles dates hidden for now | Date display deferred pending a proper date visualization strategy — dates will be revisited in Phase 3+ |
| 2026-02-28 | Pagefind UI border overrides in theme main.css (not visualizer styles.css) | Search visualizer is theme-aware; `resetStyles: false` preserves Pagefind defaults that are then selectively overridden per-theme |
| 2026-05-20 | PhotoSwipe in `_base/partials/` not as a visualizer | PhotoSwipe is a theme-level feature, not visualizer infrastructure — it activates on any `pswp-gallery__item` anchor regardless of how it got there. Two includes (head + scripts) in a new theme activates the full lightbox. Dimension discovery uses `addFilter('itemData')` reading `img.naturalWidth` from the loaded thumbnail — renderers don't need image dimensions at build time. |
| 2026-05-20 | photo-grid: config and image lines coexist with no separator | Parser distinguishes `key: value` lines from `![[image]]` lines by line shape — images always start with `!`. Inspired by obsidian-image-grid plugin which independently arrived at the same pattern. Avoids `---` which looks like a horizontal rule in Obsidian preview. |
| 2026-05-20 | photo-grid: columns not collapsed on mobile | Photo grids (portrait massage shots, 3-col detail grids) intentionally preserve layout on narrow screens. Collapsing to single column destroys the author's intended visual rhythm. `1fr` cells scale proportionally — no breakpoints needed. |
| 2026-03-05 | Internal link pills applied client-side (not build-time) | Build-time injection only caught wiki-links; JS approach catches all `<a>` elements including "Pages that link here", connections graph, and cross-site links. Single `internal-links.js` in `_base/` works for all themes. |
| 2026-03-05 | Pill icons sourced from graph.json (not injected at preprocess time) | graph.json is already fetched once for pills; adding `bloobIcon` per node adds no extra network request and makes icons available to the connections graph too |
| 2026-03-05 | bloob-object `default` image → favicon.png as pill icon | `default` means "use the theme's built-in rendering", not "no image". Favicon is always present and site-branded, making it a clean universal fallback |
| 2026-03-05 | Shared client-side JS in `_base/assets/js/` (not per-theme) | One file, zero duplication. Assembler copies it to `src/assets/js/` before theme assets so themes can override if needed. New themes just add one `<script>` tag. |
| 2026-03-19 | CSS Token Standard: visualizer `styles.css` must use `var(--token)` from `main.css` | `main.css` declares design tokens (colors, fonts, spacing); visualizer CSS inherits them via custom properties so any theme rebrand propagates automatically. No hardcoded hex or font names in visualizer code. |
| 2026-03-19 | `:::` containers as standard activation for content-restructuring visualizers | Author writes data inline (images, tables, links) inside the fence; Obsidian renders it natively; `![[wikilink]]` syntax works. Code fences reserved for data-fetching visualizers (YAML config pointing at external data). |
| 2026-03-23 | `inject-container-raw.js` utility implements `data-vis-raw` pipeline | Scans markdown for `:::` blocks BEFORE markdown-it, base64-encodes raw content, injects `_raw="..."` onto the opener info string. `markdownItContainer` extracts it into `data-vis-raw` attribute. Build-time transforms read raw markdown, not rendered HTML. |
| 2026-03-23 | `browser.js` owns its library initialization entirely | For hybrid visualizers that use a third-party lib (e.g., Swiper): `browser.js` must destroy any instance created by `theme.min.js` and re-initialize with full config. Don't try to reconfigure after-the-fact — reinitialize. |
| 2026-03-23 | Settings flow for `:::` containers: settings key → `data-*` DOM attr → browser.js | Container settings (e.g., `time=3s`) are parsed by renderer.js and baked into the DOM as `data-*` attributes (e.g., `data-slide-time="3000"`). `browser.js` reads them at runtime — no settings duplication across build/runtime boundary. |
| 2026-03-23 | Use non-hyphenated key names for `:::` container settings | Hyphenated keys (e.g., `slide-time`) cause ambiguity in the `key=value` parser because `-` is also used as a separator in some edge cases. Use simple keys: `time`, `limit`, `style`. |
| 2026-04-21 | `infinite_scroll: false` in musings = Swiper `loop: false`, not removing Swiper | The musings section uses a fixed-height container in theme.min.css. Rendering a static stack instead of Swiper causes card overflow that bleeds into adjacent sections. The correct behavior is always to render Swiper HTML; `infinite_scroll: false` only changes the `loop` option via `browser.js` reinit. |
| 2026-04-21 | `CONTENT_DIR` env var threaded from orchestrators into `eleventy.config.js` | `loadSiteConfig()` needs the content dir path to find `_bloob-settings.md`. When called from `eleventy.config.js`, the `--content=` CLI arg is not available unless explicitly passed via env var. Both `dev-local.js` and `build-site.js` now set `process.env.CONTENT_DIR` so `eleventy.config.js` can read it. |
| 2026-04-22 | `publish_mode: status_field` — YAML frontmatter field as first-class publish control | The tag-based blocklist was a blunt instrument: binary publish/don't-publish, no way to express "build but don't index" or "build but hide from listings." A dedicated `website_status` field in frontmatter makes intent explicit, is writable by the GSheet apps script, and supports four semantic states: `draft` (don't build), `unlisted` (build, noindex, hidden everywhere), `archived` (build, indexable, hidden from listings/search), `public` (fully visible). Hardcoded vocabulary avoids per-site config sprawl while remaining extensible. See detailed record below. |
| 2026-05-19 | Preserve vault directory structure for all attachments | Flattening to `/media/` broke relative HTML paths (`<img src="../projects/file.png">`) and prevented users from organizing files freely. Preserving vault structure means URLs always match where files live in the vault — no mental model mismatch. `byVaultPath` index enables path-aware resolution; `byBasename` kept as fallback for wiki-links with no path info. |
| 2026-05-19 | User-authored HTML `<img>` tags get `class="no-optimize"` at resolve time | The image optimizer wraps `<img>` in PhotoSwipe markup and drops inline attributes like `style="display:block; margin:auto;"`. User-authored HTML embeds should pass through unchanged — adding `no-optimize` at pattern-3 resolution time is the least-surprise approach: optimizer already has the mechanism, no new config, and markdown-style `![]()` images still get optimized. |
| 2026-05-19 | Favicon hash cache must verify output files exist before skipping | Hash equality alone is not sufficient to skip regeneration — the output file may have been deleted by a cleanup step between builds. Cache is now valid only when hash matches AND both `favicon.png` and `apple-touch-icon.png` exist on disk. |
| 2026-05-19 | `resolveLogoUrl` globs `src-*/` to find wiki-link logo files | Hardcoding `/media/${filename}` broke if a logo lives anywhere other than the vault's `media/` folder. Globbing the already-preprocessed `src-*/` tree at assemble time is correct because assemble always runs after preprocess has copied all vault files. Falls back to `/media/` with a warning for backward compat. |
| 2026-04-24 | Magic machine URL routing: site-level vs. shared | Site-specific machines live at `{subdomain}.bloob.haus/magic-machine/{name}/` served by that site's build (existing pattern). Future shared/global machines live at `bloob.haus/magic-machine/{name}/`. Users can mark their machines as public (listed) or unlisted (accessible by link, not indexed) — same visibility model as content pages. This mirrors the content `website_status` pattern. Singular `/magic-machine/` (not plural) is the canonical path segment. |

---

## How to Add Decisions

When making a significant technical or architectural decision:

1. Add a row to the table above
2. Include the date, a brief description, and the rationale
3. For complex decisions, consider adding a section below with more detail

---

## Detailed Decision Records

### Visualizer Build-time vs Runtime Resolution (2026-02-02)

**Context:** Visualizers can be resolved either at build time (Approach A) or runtime (Approach B).

**Approach A (Chosen):** Resolve during preprocessing
- Scan pages for frontmatter declarations
- Generate manifest of active visualizers per page
- Include only needed CSS/JS

**Approach B (Rejected):** Runtime auto-detection
- Include all visualizers on every page
- Each visualizer checks if it should activate

**Decision:** Approach A

**Rationale:**
- Smaller page payloads (don't load unused visualizers)
- Build fails fast if visualizer is missing
- Clear audit trail of what's active where
- Approach B doesn't scale with many visualizers

---

### Magic Machines Status Tracking Format (2026-02-03)

**Context:** Need to track which files have been processed by magic machines.

**Options considered:**
1. Nested YAML: `magic_machine_status: { machine: date }`
2. Flat keys: `mm_unit_extractor: 2026-02-03`
3. External tracking file

**Decision:** Flat YAML keys (`mm_<machine-name>: date`)

**Rationale:**
- Obsidian Properties don't display nested YAML well
- Easy to query with Dataview: `WHERE mm_unit_extractor`
- Simple to parse programmatically
- Presence of key = processed; absence = not processed

---

### Hugo to Eleventy Migration (2026-02-05)

**Context:** Bloob Haus needed site-wide awareness for features like backlinks and spatial visualization. The core vision is "visualizers that work both in the web app and in Obsidian."

**Decision:** Migrate from Hugo to Eleventy.

**Rationale:**
1. Code sharing — Hugo uses Go templates; Eleventy uses JS. Same parsing logic for build-time and browser.
2. Native collections — site-wide data access without JSON file workarounds.
3. Dual-use visualizers — JS throughout enables build-time + browser + Obsidian plugin.
4. Standard conventions — recognizable to developers.

**Trade-offs:**
- Slower builds than Hugo (~seconds vs ~milliseconds for large sites)
- Migration effort

---

### Visualizer Parsers in Preprocessor, Not addTransform (2026-02-05)

**Context:** Eleventy's `addTransform` runs after markdown is rendered to HTML. This means a transform-based parser would receive HTML, not raw markdown. But the visualizer architecture requires `parser(markdown) → data` so the same parser works in Eleventy, browser preview, and Obsidian plugins.

**Options considered:**
1. **addTransform (post-render):** Parser receives HTML after markdown-it processing. Simpler Eleventy integration, but parsers must work with HTML, not markdown. Breaks code sharing with Obsidian/browser where input is raw markdown.
2. **Preprocessor (pre-render):** Parser runs during `preprocess-content.js` before markdown-it. Parser receives raw markdown. Same parser code works everywhere.

**Decision:** Preprocessor-first for build-time visualizers with custom syntax.

**How it works:**
```
Raw markdown with ::: timeline
    ↓ preprocessor runs parser(markdown) → data
    ↓ preprocessor runs renderer(data) → html
Modified markdown (custom syntax replaced with HTML)
    ↓ markdown-it renders remaining markdown
Final HTML page
```

**`addTransform` is kept as a secondary hook** for cases where a visualizer needs to modify the final HTML output (e.g., injecting wrapper divs, adding data attributes). But the primary parser integration point is the preprocessor.

**Rationale:**
- `parser(markdown) → data` stays pure and portable
- Same parser works in: Eleventy build, browser live preview, Obsidian plugin
- Preprocessor already handles content transformation (link resolution, frontmatter injection)
- Aligns with the visualizer architecture principle: parsers are pure functions on markdown

**Separation of concerns:**
| Layer | What it does | Input |
|-------|-------------|-------|
| Preprocessor | Custom syntax parsing (`::: timeline`) | Raw markdown |
| markdown-it + plugins | Standard markdown (`- [ ]`, `**bold**`) | Markdown |
| addTransform | Post-render HTML modifications | HTML |
| browser.js | Interactivity, state, DOM enhancement | Rendered DOM |

---

### Folder-Based URL Structure Over pathPrefix (2026-02-27)

**Context:** Needed to deploy marbles content to `leons.bloob.haus/marbles/` while potentially having other content at the root. Attempted to use Eleventy's `pathPrefix` configuration combined with `mount_path` to achieve this.

**Problem discovered:** Eleventy's `| url` filter prepends the pathPrefix to every path. When content is already output to a subdirectory (e.g., `_site/marbles/`), using `pathPrefix: "/marbles/"` causes **doubled paths**:

```
Expected: /marbles/ADAPT-CHANGE/
Actual:   /marbles/marbles/ADAPT-CHANGE/
```

**Why this happens:**
1. Content in the `marbles/` folder outputs to `_site/marbles/page-name/`
2. Templates use `| url` filter for assets and links
3. pathPrefix `/marbles/` gets prepended to all URLs
4. Result: `/marbles/` (from pathPrefix) + `/marbles/` (from folder) = doubled

**Options explored:**
1. **pathPrefix only** — works for deploying entire site to subdirectory, but doesn't allow content at root
2. **Output directory manipulation** — moving content to root output with pathPrefix caused permalink conflicts
3. **basePath global data** — still doubled because `| url` filter is independent of folder structure
4. **Folder-based approach (chosen)** — put content in a `marbles/` folder, no pathPrefix

**Decision:** Use folder structure to create URL paths, not pathPrefix.

**How it works:**
```
Content repo structure:
  marbles/           ← content folder
    ADAPT-CHANGE.md

Build output:
  _site/
    marbles/
      ADAPT-CHANGE/
        index.html

URLs:
  leons.bloob.haus/marbles/ADAPT-CHANGE/  ✓
```

**Rationale:**
- Simpler mental model: folder = URL path
- No template changes needed (hardcoded asset paths work)
- No pathPrefix configuration complexity
- Avoids subtle bugs from pathPrefix + subdirectory interaction

**When pathPrefix IS appropriate:**
- Deploying an **entire site** to a subdirectory (e.g., GitHub Pages at `/repo-name/`)
- When ALL content lives under that prefix
- NOT for mounting specific content at a subpath while having other content at root

**This is a TEMPORARY WORKAROUND — not the final architecture.**

**Future multi-repo architecture requires proper mount_path:**
The long-term vision is:
```
leons.bloob.haus/           ← "Haus" landing page (shows all rooms)
leons.bloob.haus/marbles/   ← Room 1 (separate repo: bloob-haus-marbles)
leons.bloob.haus/recipes/   ← Room 2 (separate repo: bloob-haus-recipes)
leons.bloob.haus/notes/     ← Room 3 (separate repo: bloob-haus-notes)
```

Each room is a **separate GitHub repo** mounted at a subpath. This requires:
1. A working `mount_path` implementation that doesn't double URLs
2. A "haus" root that aggregates/displays all connected rooms
3. Proper handling of pathPrefix OR alternative URL rewriting approach

**The bug to fix:** Eleventy's `| url` filter behavior with pathPrefix. Options:
- Don't use pathPrefix; rewrite URLs in postprocessing
- Use Cloudflare Workers/redirect rules for path mounting
- Custom Eleventy filter that's mount_path-aware

**Current workaround (single-repo, folder-based):**
For now, putting content in folders within one repo works. But this doesn't scale to the multi-repo "haus with rooms" vision.

**Implications for future URL/API work:**
1. **mount_path needs a proper fix** — the concept is right, the implementation has a bug
2. **Haus landing pages** — need a way to generate a root page that lists all mounted rooms
3. **Cross-room linking** — links between rooms (separate repos) need special handling
4. **Reserved paths:** System paths (`/assets/`, `/tags/`, `/search/`) at root must not conflict with room names


---

## 2026-03-19 — `:::` Container Activation for Content-Restructuring Visualizers

**Decision:** Content-restructuring visualizers (image-grid, card-preview, musings, slideshow) use `:::` fenced container syntax rather than code fences.

**Rationale:**
- Inside `:::` containers, authors write native markdown — `![[image.jpg]]` shows a real preview in Obsidian, `[[wiki-link]]` is clickable and tracked in the backlink graph. Inside code fences, content is raw text with no Obsidian rendering.
- For visualizers where the author IS the data (writing team members, project links, quotes), Obsidian-native syntax is worth gold for the editing experience.
- `markdownItContainer` is already configured in `eleventy.config.js` with `validate: () => true`, so any `:::` fence already works with zero additional infrastructure.

**The `data-vis-raw` contract:**
To keep parser/renderer logic shareable across web build, Obsidian plugin, and webapp live editor, the `preprocess-hook.js` for container visualizers must extract the raw markdown content of the `:::` block BEFORE markdown-it renders it, and store it as `data-vis-raw` on the section element. The build-time transform reads `data-vis-raw`, not the rendered HTML. This ensures the parser always works on the same raw text regardless of context.

**Exception — `card-preview`:** Uses `:::` despite being data-fetching, because the project wikilinks should appear in Obsidian's backlink graph and be clickable in the editor. The enricher (graph.json lookup) is the only web-specific part.

**Rejected alternative:** Obsidian callout syntax (`> [!type]`) — constrained, Obsidian-specific, no standard markdown support.

**See:** `docs/architecture/visualizers.md` — Container Visualizers section.

---

### `publish_mode: status_field` — YAML Frontmatter Publish Control (2026-04-22)

**Context:** The existing `publish_mode: blocklist` system reads `frontmatter.tags[]` for a blocklist tag. This was discovered to be disconnected from the `status: draft` field being written to project profiles by the GSheet apps script — the field was inert, doing nothing. The alter-engineers site needed richer publish semantics for a GSheet → Obsidian → website pipeline.

**Standard status vocabulary (hardcoded in the builder):**

| Value | Built | Direct URL | Google-indexable | `sitemap.xml` | Internal search | Card/folder previews | `graph.json` |
|-------|-------|------------|-----------------|---------------|-----------------|---------------------|--------------|
| `draft` | No | No | — | No | No | No | No |
| `unlisted` | Yes | Yes | No (`noindex`) | No | No | No | No |
| `archived` | Yes | Yes | Yes | Yes | No | No | Yes (with field) |
| `public` | Yes | Yes | Yes | Yes | Yes | Yes | Yes |

**Default:** pages without `website_status` set → treated as `public` (backwards compatible for non-project content pages like `index.md`).

**Why hardcode the vocabulary?** Four states cover all known use cases; site config can extend behavior in future without proliferating per-site vocab. Named values in frontmatter are self-documenting — `website_status: unlisted` is clearer than `tags: [not-for-public]`.

**Touch points implemented (2026-04-22):**
- `scripts/utils/publish-filter.js` — new `status_field` mode branch
- `scripts/utils/bloob-settings-reader.js` — `status_field` key flows through
- `scripts/preprocess-content.js` — `status_field` in publishOptions; `unlisted` excluded from `perPageLinks`; `website_status` on all other nodes
- `scripts/utils/graph-builder.js` — `website_status` in node schema
- `themes/alter-engineers/partials/head.njk` — `<meta name="robots" content="noindex">` for `unlisted`
- `themes/alter-engineers/layouts/base.njk` — `data-pagefind-ignore` for `unlisted` + `archived`
- `themes/alter-engineers/pages/sitemap.njk` — excludes `unlisted`
- `lib/visualizers/folder-preview/browser.js` — filters `archived` from listings

**Opt-in from `_bloob-settings.md`:**
```yaml
publish_mode: status_field
status_field: website_status   # optional, this is the default field name
```

**Backwards compatible:** `blocklist` and `allowlist` modes unchanged. No existing site is affected unless they opt in.

**GSheet / apps script note:** The `Code.js` bound script already reads `website_status` correctly. The `project_profile_manager` skill inside the SkillHub library writes the actual frontmatter field — verify it writes `website_status:` not `status:` before next sync run. See `docs/implementation-plans/website-status-field.md` for full plan.

---

### GIF→MP4 conversion pipeline (2026-05-23)

**Context:** Several GIF files in the MELT vault exceeded Cloudflare Pages' 25MB per-file deploy limit, causing CI failures. Even under the limit, animated GIFs are 10–20× larger than equivalent MP4.

**Decision:** Build-time conversion using `ffmpeg-static` (npm-bundled binary). GIFs in `srcDir` are converted to MP4, then the source `.gif` is deleted from `srcDir` before Eleventy builds `_site/`. The deployed site never contains GIFs.

**Why `ffmpeg-static` over system ffmpeg?** Future users run the webapp, not local dev — they have no control over their build environment. An npm-bundled binary works identically in CI, the webapp build, and local dev on any platform.

**Why delete the GIF from srcDir?** Keeps deployed assets under the CF Pages per-file limit. GIFs remain in the vault content repo (git history). A future "download original" button can link to the raw GitHub URL.

**Why opt-out (default on)?** Conversion is lossless for UX — the video autoplay is visually identical to the GIF. The only reason to keep GIFs is if a site specifically needs a GIF download link or uses GIFs for non-animated purposes. Opt out via `media: convert_gif_to_mp4: false`.

**Autoplay blocking (NotAllowedError only):** The `browser.js` play overlay only activates on `NotAllowedError` — the specific error thrown when browser autoplay policy blocks unmuted/non-muted video. Other errors (`AbortError` from a play/load race, `NotSupportedError` from codec issues) are silently ignored. This prevents false play overlays on desktop where videos autoplay fine but the play() promise briefly rejects due to src loading timing.

**Caching:** Local dev caches (skips if .mp4 exists). CI re-converts every build (no Cloudflare build cache configured). Acceptable for now — GIF count is small.

---

### Post-preprocess cleanup of conflicting theme index.njk files (2026-03-23)

**Context:** Theme section pages (e.g. `themes/warm-kitchen/pages/sections/notes/index.njk`) and preprocessor-generated folder stubs (e.g. `src/notes/index.md`) both emit `permalink: /notes/`, causing Eleventy's `DuplicatePermalinkOutputError`.

**Root cause:** `assembleSrc` (Step 4) runs before `preprocessContent` (Step 5). Assemble tries to detect vault folders and skip the theme's `index.njk`, but can't predict all cases — for example, when the vault folder name uses spaces (`lists of favorites`), when the folder is created indirectly by the preprocessor, or when a root-level file (e.g. `Notes.md`) claims the same slug via explicit `permalink` frontmatter.

**Decision:** Add a cleanup pass in `build-site.js` between Step 5 (preprocess) and Step 5.5 (OG images). After preprocess runs, scan all `src/*/` subdirectories for any pair of `index.njk` + `index.md` and remove the `index.njk`. Content always wins over theme section pages.

**Rationale:** Trying to predict conflicts in assemble is fragile (vault structure is arbitrary). Cleaning up after the fact is simple, reliable, and matches the general principle that user content takes priority over theme defaults.

**Visualizer risk:** Low currently. Visualizers are code fences parsed from markdown — the `folder-preview` fence in a stub `index.md` works regardless of whether `index.njk` exists. However, two concerns to watch:
1. If a future theme embeds a visualizer inside a section `index.njk` (via Nunjucks macro/include), the cleanup would silently delete it. The content `index.md` would need to manually include the visualizer fence. This is a design constraint: **theme section pages cannot own visualizer invocation — that must live in content.**
2. The cleanup step only exists in `build-site.js`, **not `dev-local.js`**. Local dev will still hit the conflict if a vault has this structure. This is a known gap — if it becomes a problem, the same cleanup loop should be added to `dev-local.js`.
