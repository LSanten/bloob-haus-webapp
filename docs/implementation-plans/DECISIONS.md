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
