# Visualizer Architecture

**Status:** Modular architecture with auto-discovery. Two runtime visualizers: checkbox-tracker, page-preview.  
**Location:** `docs/architecture/`  
**Updated:** 2026-02-13

Visualizers are the core of Bloob Haus - "little machines" that transform text into visual/interactive experiences. This document describes how the visualizer system works.

---

## Core Concepts

| Concept | Definition |
|---------|------------|
| **Marble** | A note/object that can be held, shared, embedded |
| **Visualizer** | A machine that transforms content into an experience |
| **Room** | A container for marbles (maps to folders/sections) |
| **Haus** | A user's site (subdomain like `leon.bloob.haus`) |

---

## Visualizer Design Principle

**All visualizers MUST be pure functions:**

1. `parser(markdown) → data` - No side effects, JSON-serializable output
2. `renderer(data) → html` - No DOM manipulation, returns string

This enables:
- Build-time static generation (Eleventy)
- Instant browser preview (same code, different context)  
- Obsidian plugin (same parser, platform-specific renderer)
- Future: server-side rendering, API endpoints, etc.

**Never put DOM operations in parser or renderer.**
**Never put file system operations in parser or renderer.**

---

## Two Types of Visualizers

### Build-time Visualizers
Run during preprocessing (Node.js). Parse custom markdown syntax into data, then render to HTML.

**Key decision:** Build-time parsers run in the **preprocessor** (before markdown-it), not in Eleventy's `addTransform` (after). This ensures parsers receive raw markdown, so the same parser code works in Eleventy, browser preview, and Obsidian plugins. See [DECISIONS.md](../implementation-plans/DECISIONS.md) for full rationale.

**Embedding syntax: Fenced code blocks.** Visualizers are placed in content using markdown fenced code blocks with the visualizer name as the language identifier:

````markdown
```tag-cloud
style: bubbles
minCount: 2
colorScale: warm
```
````

The preprocessor finds these blocks in raw markdown, passes the content inside the fence to the visualizer's `parser.js`, and replaces the entire block with the rendered HTML output. This happens *before* markdown-it runs, so the code fence never reaches the markdown parser.

**Why code fences:**
- Standard markdown syntax — every markdown parser understands fenced code blocks
- Obsidian compatibility — renders as a code block (readable, not broken). A future Obsidian plugin could render live previews (same pattern as Mermaid)
- Structured config — the content inside the fence can be YAML, JSON, plain text, or any format the visualizer's parser expects
- Graceful degradation — in any renderer without the visualizer, it just shows as a code block
- Code sharing — the preprocessor parses raw markdown, so the same parser works in Eleventy, browser preview, and Obsidian plugins

**A code fence with no content is valid** — the visualizer uses its defaults:

````markdown
```search-bar
```
````

**Note:** Code fences must span multiple lines. Inline placement (`` ```tag-cloud``` `` on a single line) is not possible — markdown treats that as inline code. For block-level widgets like search bars, tag clouds, and timelines, this is fine. If inline widget placement is ever needed, a different syntax (like custom directives or `@syntax{}`) would be required.

```
raw markdown with ```tag-cloud block
    ↓ parser.js (during preprocess-content.js) → structured data
    ↓ renderer.js (data → HTML string)
modified markdown (code fence replaced with HTML)
    ↓ markdown-it renders remaining standard markdown
final HTML page
```

**Examples:** Tag cloud, search bar, timeline, yoga sequence, recipe card layout

**When to use:** When you need to parse custom markdown syntax or generate structured data for the page. The code fence is the standard way to say "place this visualizer here with this config."

### Runtime Visualizers
Run in the browser (JS + CSS). Enhance already-rendered HTML with interactivity.

```
rendered HTML in the DOM
    ↓ browser.js (DOM events, localStorage, etc.)
interactive experience
```

**Examples:** Checkbox tracker, link previews, graph visualization

**When to use:** When you need client-side interactivity, state persistence, or dynamic behavior. Standard markdown syntax (like `- [ ]` for checkboxes) is handled by markdown-it plugins, not by visualizers.

### Hybrid Visualizers
Some need both: build-time generates data, runtime renders it interactively.

**Examples:** 
- Graph: build-time generates `links.json`, runtime renders D3 visualization
- Timeline: build-time parses `::: timeline` blocks → JSON, runtime renders interactive timeline

---

## Folder Structure

```
lib/visualizers/                        ← Source of truth for all visualizer code
├── checkbox-tracker/                   ← Each visualizer is a self-contained package
│   ├── manifest.json                   ← Metadata, activation method, settings schema
│   ├── schema.md                       ← Human + AI readable input documentation
│   ├── index.js                        ← Module entry point (exports type, name, transform)
│   ├── browser.js                      ← Runtime: DOM events, localStorage (side effects)
│   └── styles.css                      ← Visualizer-specific CSS
├── tag-cloud/                          ← (future) Build-time visualizer example
│   ├── manifest.json
│   ├── schema.md                       ← Documents what goes inside ```tag-cloud fences
│   ├── index.js
│   ├── parser.js                       ← Pure: markdown → structured data
│   ├── renderer.js                     ← Pure: data → HTML string
│   ├── browser.js                      ← Runtime interactivity (optional)
│   └── styles.css
└── ...

scripts/
├── preprocess-content.js               ← Orchestrates build-time visualizer parsers
├── bundle-visualizers.js               ← esbuild: bundles browser.js + copies CSS
└── utils/

src/
├── _data/
│   └── visualizers.json                ← Generated manifest (auto-includes in templates)
├── assets/                             ← Generated by bundle-visualizers.js
│   ├── css/visualizers/
│   │   ├── checkbox-tracker.css        ← Copied from lib/visualizers/
│   │   └── page-preview.css            ← Copied from lib/visualizers/
│   └── js/visualizers/
│       ├── checkbox-tracker.js         ← Bundled from lib/visualizers/ via esbuild
│       └── page-preview.js             ← Bundled from lib/visualizers/ via esbuild
├── _includes/partials/
│   ├── head.njk                        ← Loops over visualizers data to include CSS
│   └── scripts.njk                     ← Loops over visualizers data to include JS

eleventy.config.js                      ← addTransform for post-render HTML modifications
```

**Adding a new visualizer = adding a new folder in `lib/visualizers/`.** No changes to any other file needed — the bundler auto-discovers folders, writes a manifest, and templates auto-include from that manifest.

---

## Visualizer Input Documentation (`schema.md`)

Every visualizer package **must** include a `schema.md` file that documents what goes inside its code fence. This file serves three audiences:

1. **Human authors** — plain language explanation of the input format, available options, and examples
2. **AI tools** — a Magic Machine or LLM can read this file and generate valid visualizer input automatically
3. **Webapp UI** — the schema drives settings forms and configuration interfaces for non-technical users

**Example `schema.md` for a tag-cloud visualizer:**

```markdown
# Tag Cloud Input Schema

Displays an interactive tag cloud from the site's tag index.

## Format

YAML key-value pairs. All fields are optional.

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| style | string | "flat" | Display style: "flat", "bubbles", "force" |
| minCount | number | 1 | Only show tags with at least this many pages |
| colorScale | string | "warm" | Color scheme: "warm", "cool", "monochrome" |
| limit | number | (all) | Maximum number of tags to display |
| linkToTag | boolean | true | Tags link to their tag page |

## Examples

Minimal (all defaults):
    ```tag-cloud
    ```

Custom styling:
    ```tag-cloud
    style: bubbles
    minCount: 3
    colorScale: cool
    ```
```

The `schema.md` is the **API documentation** for the visualizer. It should be clear enough that someone (or an AI) who has never seen the visualizer before can write valid input after reading it.

**Future:** The webapp could expose `schema.md` files as documentation pages in a visualizer library, and AI-powered tools could use them to auto-generate visualizer configurations.

---

## Visualizer Manifest Format

Each visualizer declares its metadata:

```json
{
  "name": "checkbox-tracker",
  "type": "runtime",
  "version": "1.0.0",
  "description": "Enables clickable checkboxes with persistent state",
  "activation": {
    "method": "auto-detect",
    "pattern": "input[type=checkbox]"
  },
  "files": {
    "js": "checkbox-tracker.js",
    "css": "checkbox-tracker.css"
  },
  "settings": {
    "undoWindowMs": {
      "type": "number",
      "default": 60000,
      "description": "How long the undo window stays open (ms)"
    }
  }
}
```

---

## Activation Methods (with Precedence)

Visualizers can be activated in five ways. These serve different purposes and coexist:

| Precedence | Method | Scope | Purpose | Example |
|------------|--------|-------|---------|---------|
| 1 (highest) | **Code fence** | Exact position in content | "Place this widget here with this config" | `` ```tag-cloud `` in markdown body |
| 2 | **Page frontmatter** | Single page | "This page uses these visualizers" | `visualizers: [timeline, graph]` |
| 3 | **Folder config** | All pages in folder | "All recipes get recipe-scaler" | `.bloob/visualizers.json` |
| 4 | **Auto-detection** | Pages matching pattern | "Any page with checkboxes gets tracker" | Checkbox tracker detects `- [ ]` |
| 5 (lowest) | **Global config** | Entire site | "Every page gets page-preview" | Webapp settings or site config |

**Code fences vs. other methods:** Code fences provide *placement control* — they say exactly where in the content a widget appears and what config it uses. The other methods are *activation without placement* — they say "this visualizer is active on this page" but the visualizer decides where/how it manifests (e.g., checkbox-tracker enhances existing checkboxes, page-preview adds buttons to links).

**Example frontmatter:**
```yaml
---
title: My Timeline
visualizers:
  - timeline
  - graph
timeline:
  style: horizontal
---
```

**Example folder config (`.bloob/visualizers.json`):**
```json
{
  "visualizers": ["recipe-card"],
  "recipe-card": {
    "showScalingCalculator": true
  }
}
```

---

## Build Process Integration (Approach A - Chosen)

**Decision:** Resolve visualizers at build time, not runtime.

During preprocessing:
1. Scan all pages for frontmatter `visualizers` declarations
2. Scan all folders for `.bloob/visualizers.json` configs
3. Run auto-detection patterns across content
4. Check global config for site-wide visualizers
5. Generate `active-visualizers.json` manifest mapping pages → visualizers
6. Run build-time visualizers on relevant pages
7. Hugo uses manifest to include only needed CSS/JS per page (or bundle all active ones)

**Why this approach:**
- Smaller page payloads (don't load unused visualizers)
- Build fails fast if visualizer is missing
- Clear audit trail of what's active where

**Alternative considered (Approach B - Runtime resolution):**
- Include ALL runtime visualizers on every page
- Each visualizer auto-detects if it should activate
- Simpler but doesn't scale (20 visualizers = bloated pages)

---

## Site-Wide Visualizers (Webapp Feature)

For the webapp (Phase 3+), users should be able to:
1. Browse a **visualizer library** of pre-built visualizers
2. **Enable visualizers** for their site without coding
3. **Configure settings** via UI (maps to global config)
4. **Upload custom visualizers** (JS/CSS files with manifest)

**Storage:** Visualizer code lives in Bloob Haus infrastructure, not user's repo. User's config just references which visualizers are active.

```json
// User's site config (stored in webapp DB or .bloob/config.json)
{
  "visualizers": {
    "enabled": ["checkbox-tracker", "link-preview", "graph"],
    "settings": {
      "checkbox-tracker": { "undoWindowMs": 30000 },
      "graph": { "showGlobal": false }
    }
  }
}
```

---

## Auto-Detection Syntax

Auto-detection activates visualizers based on content patterns, without explicit opt-in from the author.

| Pattern | Visualizer | Notes |
|---------|------------|-------|
| `- [ ]` in content | checkbox-tracker | Current implementation |
| `.recipe-card-link` elements | page-preview | Current implementation |
| Code fences (`` ```visualizer-name ``) | varies | Standard embedding syntax (see Build-time Visualizers above) |

**Open question:** Should auto-detection require opt-in at folder/site level? To prevent unexpected behavior.

---

## Future Consideration: Obsidian Callouts as Activation

Obsidian's callout syntax (`> [!type]`) is another potential way to embed visualizers:

```markdown
> [!search-bar]

> [!tag-cloud]
> style: bubbles
```

**Pros:** Native Obsidian syntax, renders as a styled block in the editor, supports content inside the blockquote. **Cons:** Limited parameter passing, stretches the intended semantics of callouts.

This approach could complement code fences for cases where visual feedback in Obsidian is important. Not currently planned for implementation, but noted as a viable future option. The build pipeline would detect `<blockquote>` elements with `data-callout="visualizer-name"` and replace them with widget HTML.

---

## Current Implementation (Post-Migration M4)

```
lib/visualizers/
├── checkbox-tracker/
│   ├── manifest.json       ← type: "runtime", activation: auto-detect
│   ├── index.js            ← exports type, name; no-op transform (runtime-only)
│   ├── browser.js          ← DOM: enables checkboxes, localStorage persistence, reset button
│   └── styles.css          ← Custom checkbox styling, floating reset button
├── page-preview/
│   ├── manifest.json       ← type: "runtime", activation: auto-detect
│   ├── index.js            ← exports type, name; no-op transform (runtime-only)
│   ├── browser.js          ← DOM: preview button + modal overlay via fetch()
│   └── styles.css          ← Preview button, modal overlay, responsive styles
```

**Build pipeline:**
1. `scripts/bundle-visualizers.js` — auto-discovers `lib/visualizers/*/`, bundles with esbuild, writes `src/_data/visualizers.json` manifest
2. Nunjucks templates (`head.njk`, `scripts.njk`) — loop over `visualizers.json` to auto-include CSS/JS
3. `eleventy.config.js` — auto-loads visualizer modules, registers `addTransform` for build-time visualizers
4. `markdown-it-task-lists` plugin — converts `- [ ]` to `<input type="checkbox">` (markdown parser layer)
5. `browser.js` — runtime enhancement (interactivity, persistence)

**What's working:**
- Checkbox tracker: styled checkboxes, click persistence, floating reset button with undo
- Page preview: eye icon button on recipe cards, tag pages, search results; modal overlay with fetched content
- Auto-discovery: new visualizer = new folder, no config changes needed anywhere
- esbuild bundling with sourcemaps in dev
- Auto-generated CSS/JS includes via `visualizers.json` data file (no more hardcoded `<link>`/`<script>` tags)

**Not yet implemented:**
- Per-page visualizer activation (frontmatter `visualizers:` field)
- Folder config (`.bloob/visualizers.json`)
- Build-time visualizer integration in preprocessor
- Per-page CSS/JS inclusion (currently all visualizers loaded on every page)

---

## Implementation Phases

| Phase | Milestone |
|-------|-----------|
| Phase 1 ✓ | Checkbox tracker working (Hugo) |
| M4 ✓ | Modular visualizer architecture, esbuild bundling, auto-discovery (Eleventy) |
| ✓ | Page preview visualizer — modal overlay with preview button on cards/search/tags |
| ✓ | Auto-generated CSS/JS includes via `visualizers.json` data file |
| ✓ | Architecture: code fence embedding syntax, `schema.md` spec, activation hierarchy |
| Next | Code fence detection in preprocessor (first candidate: tag-cloud or search-bar) |
| Next | Per-page visualizer activation via frontmatter |
| Future | Full manifest system, folder configs, per-page CSS/JS inclusion |
| Future | Webapp visualizer library, user uploads, UI configuration |
| Future | Obsidian plugin to render code fence visualizer previews |

---

## Related Documents

- [Magic Machines Architecture](magic-machines.md) - The "write" counterpart to visualizers
- [Search Architecture](search.md) - Search, tags, and Pagefind
- [Recipe Scaling Plan](../implementation-plans/phases/phase-2/2026-02-03_recipe-scaling.md) - Example hybrid visualizer
