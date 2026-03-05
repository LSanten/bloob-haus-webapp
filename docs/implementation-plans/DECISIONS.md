# Decision Log

Track major architectural and technical decisions with their rationale.

---

## Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
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
| 2026-02-19 | Image cache outside _site/ | Use `.cache/eleventy-img/` so optimized images persist across builds (not destroyed when _site/ is cleaned) |
| 2026-02-19 | Validation report + --strict flag | Broken links collected during preprocessing with structured report; --strict flag fails CI builds on broken links |
| 2026-02-19 | CLAUDE.md for development practices | Auto-read by Claude Code; contains session checklists, code quality rules, documentation rules |
| 2026-02-19 | TECH-DEBT.md as living inventory | Dedicated technical debt tracking file, reviewed at session start |
| 2026-02-19 | Configurable URL slug strategy per site | Two strategies: "slugify" (lowercase, buffbaby) and "preserve-case" (keep casing, marbles). Set via `permalinks.strategy` in sites/*.yaml |
| 2026-02-19 | Shared slug-strategy.js utility | Centralized slug logic used by file-index-builder, eleventyComputed, transclusion-handler, and link resolvers — replaces 7 scattered implementations |
| 2026-02-19 | Content subfolder support (`content.path`) | Sites can point to a subfolder within a repo (e.g., `_mms-md` in LSanten.github.io). Clone-content auto-detects repo switches. |
| 2026-02-19 | Preprocessor cleans src/ before writing | Prevents cross-site content contamination on local builds. All .md files and media/ removed from src/ before each build. |
| 2026-02-19 | Per-file exclude_files list in YAML | Allows excluding specific files by name (e.g., `ALL`) without needing a blocklist tag in the file itself. |
| 2026-03-05 | `preprocess-content.js` loads site config itself | Publish settings (`blocklist_tag`, `publish_mode`, `exclude_files`) are read directly from `_bloob-settings.md` inside the preprocessor — not from env vars set by callers. Prevents private content leaks when scripts are called outside the orchestrators. |
| 2026-03-05 | Dev pipeline unified via `dev-local.js` | `dev:*` npm scripts now call `dev-local.js` (same orchestration as prod) instead of manually chaining raw scripts. Eliminates class of bugs where env vars or step ordering differ between dev and prod. |
| 2026-02-19 | Reserved directory filtering in section discovery | `media`, `assets`, `tags`, `pagefind`, `og`, `search` excluded from auto-discovered sections to prevent non-content dirs appearing in nav. |
| 2026-02-27 | Folder-based URL structure over pathPrefix (temporary workaround) | Eleventy's pathPrefix + subdirectory output causes doubled paths. Folder structure works for now; proper mount_path fix needed for multi-repo architecture. See detailed record below. |
| 2026-02-27 | marbles-pouch body color #dce8f8 (light blue) not lavender | Visual decision based on old site reference; white banner, blue body, white footer creates clear hierarchy |
| 2026-02-27 | SVG waves use filled paths with all y-values within viewBox | Peaks outside viewBox create disconnected arch artifacts; in-bounds paths render correctly at all viewport widths |
| 2026-02-27 | Remove `<h1>` from page.njk layout | Marble content files provide their own `# Title` heading; rendering it in both layout and markdown caused duplication |
| 2026-02-27 | Default banner image = marble.png when bloob_object not set | Most content is marbles; marble.png (woven-marble-3.png) as universal fallback avoids blank banners |
| 2026-02-27 | bloob-object: marble added to all existing marbles content files | 471 files updated; ensures consistent banner rendering before user updates individual files |
| 2026-02-28 | Tags visualizer fetches tagIndex.json at runtime | Tag data is already generated by preprocessor; a simple fetch in browser.js avoids build-time complexity and keeps the transform thin |
| 2026-02-28 | tagIndex.json served as static asset via passthrough copy | `src/_data/tagIndex.json` is Eleventy data (not auto-served); explicit passthrough to `/tagIndex.json` needed for browser fetch |
| 2026-02-28 | Recent Marbles dates hidden for now | Date display deferred pending a proper date visualization strategy — dates will be revisited in Phase 3+ |
| 2026-02-28 | Pagefind UI border overrides in theme main.css (not visualizer styles.css) | Search visualizer is theme-aware; `resetStyles: false` preserves Pagefind defaults that are then selectively overridden per-theme |

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
