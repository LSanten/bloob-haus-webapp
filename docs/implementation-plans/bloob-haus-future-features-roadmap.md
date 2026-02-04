# Bloob Haus: Future Features Roadmap

**Purpose:** Document features planned for Phase 2 and beyond. This is a "parking lot" to capture ideas without letting them creep into Phase 1.  
**Last Updated:** February 3, 2026  
**Status:** Planning document - features require approval before implementation

---

## Phase Overview

| Phase | Focus | Status |
|-------|-------|--------|
| Phase 1 | Recipe site (buffbaby.bloob.haus) | In Development |
| Phase 2 | Enhanced linking + API foundation | Planning |
| Phase 3 | Quick Mode + Multi-user | Planning |
| Phase 4 | Interactive visualizers + Magic Machines | Planning |
| Phase 5+ | Advanced features | Ideas |

**Core Architecture Systems:**
- [Visualizer Architecture](#visualizer-architecture-core-system) - "Read" tools that display content
- [Magic Machines Architecture](#magic-machines-architecture-core-system) - "Write" tools that transform content

---

## Phase 2: Enhanced Linking & API Foundation

**Goal:** Add backlinks, graph data, and prepare for webapp features.

### 2.1 JSON Generation (Two Files)

Generate two separate JSON files during build for different purposes:

#### `links.json` - Bidirectional Links (for backlinks & graph)

```json
{
  "vegan-masala-chai": {
    "outgoing": ["/mochi-muffins/", "/spice-guide/"],
    "incoming": ["/breakfast-ideas/", "/tea-recipes/"]
  }
}
```

**Use cases:**
- Display backlinks section on each page
- Power graph visualization
- Detect broken links before deploy

#### `search-index.json` - Search & Display Data

```json
{
  "vegan-masala-chai": {
    "title": "Vegan Masala Chai",
    "subtitle": "A warming spiced tea",
    "excerpt": "This traditional Indian tea combines black tea with aromatic spices...",
    "url": "/recipes/vegan-masala-chai/",
    "tags": ["drinks", "vegan"],
    "section": "recipes",
    "image": "/media/chai-photo.jpg"
  }
}
```

**Field sources:**
| Field | Source | Notes |
|-------|--------|-------|
| `title` | First `#` or `##` heading | Primary search target |
| `subtitle` | Heading immediately after title (if exists) | Optional context |
| `excerpt` | First paragraph, truncated ~200 chars | Preview in results |
| `url` | Generated from filename | Link to page |
| `tags` | Frontmatter | For filtering |
| `section` | Folder (recipes, notes, etc.) | For filtering |
| `image` | 1) Frontmatter `image:`, 2) First image in content, 3) null | For result cards |

**Why two files:**
- Search needs to be fast - don't load link data users don't need
- Different use cases: search on every page, backlinks only on specific pages
- Excerpt text can be large - keep separate from link graph

**Privacy consideration:** Only scan published files, never expose links to/from private files.

**Use cases:**
- Client-side search bar with rich result previews
- Filter by tags or section
- Show image thumbnails in search results

### 2.2 Backlinks Display
Show "Pages that link here" section at bottom of each page.

**Implementation:** Hugo partial that reads `links.json` and displays incoming links.

### 2.3 Pre-build Validation
Before Hugo runs, validate:
- No broken wiki-links
- No broken image references
- Required frontmatter fields present

Output report of issues. Optionally fail build on errors.

### 2.4 API Routes (Next.js)
Add Next.js API layer for:
- `/api/build` - Trigger rebuild programmatically
- `/api/status` - Check build status
- `/api/links` - Serve links.json for client-side graph

**Architecture change:** Wrap Hugo in Next.js app (already planned for Quick Mode).

### 2.5 Staging/Preview
Preview changes before going live:
- Branch deploys (Vercel does this automatically)
- Or explicit "draft" mode with preview URL

---

## Phase 3: Quick Mode & Multi-User

**Goal:** Anyone can create visualizations without GitHub.

### 3.1 Quick Mode
Core flow:
1. User visits bloob.haus
2. Pastes markdown into text area
3. Selects visualizer/theme
4. Gets instant hosted URL (e.g., `bloob.haus/m/abc123`)

**No GitHub required.** Content stored in database.

### 3.2 User Accounts
- Authentication (NextAuth.js)
- User dashboard showing their marbles
- Edit, delete, unpublish capabilities

### 3.3 Multi-User Repo Mode
- GitHub OAuth for connecting repos
- Each user gets subdomain: `username.bloob.haus`
- Per-user site configuration

### 3.4 Wildcard Subdomains
DNS and routing setup for `*.bloob.haus`:
- `leon.bloob.haus` → Leon's site
- `buffbaby.bloob.haus` → Recipe site
- Reserved: `www`, `api`, `app`, `studio`

### 3.5 Cloudflare Pages for User Sites
**Rationale:** Unlimited bandwidth, no viral user cost risk.
- Vercel: Dashboard + API (controlled cost)
- Cloudflare Pages: User-generated static sites

### 3.6 Pricing Model
- Free tier: 1 site, subdomain, reasonable limits
- Paid ($3-5/mo): Custom domain, multiple sites
- Metered billing for heavy usage

---

## Visualizer Architecture (Core System)

**Status:** Foundation laid in Phase 1 (checkbox-tracker), full system planned for Phase 4+

Visualizers are the core of Bloob Haus - "little machines" that transform text into visual/interactive experiences. This section documents the architectural decisions and implementation plan.

### Core Concepts

| Concept | Definition |
|---------|------------|
| **Marble** | A note/object that can be held, shared, embedded |
| **Visualizer** | A machine that transforms content into an experience |
| **Room** | A container for marbles (maps to folders/sections) |
| **Haus** | A user's site (subdomain like `leon.bloob.haus`) |

### Two Types of Visualizers

#### Build-time Visualizers
Run during preprocessing (Node.js). Transform markdown syntax into HTML + data.

```
markdown with special syntax
    ↓ parser.js (during preprocess-content.js)
transformed HTML + data.json
```

**Examples:** Timeline, yoga sequence, recipe card layout

**When to use:** When you need to parse custom markdown syntax or generate structured data for the page.

#### Runtime Visualizers
Run in the browser (JS + CSS). Enhance rendered HTML with interactivity.

```
rendered HTML + data.json
    ↓ visualizer.js (in browser)
interactive experience
```

**Examples:** Checkbox tracker, link previews, graph visualization

**When to use:** When you need client-side interactivity, state persistence, or dynamic behavior.

#### Hybrid Visualizers
Some need both: build-time generates data, runtime renders it.

**Examples:** 
- Graph: build-time generates `links.json`, runtime renders D3 visualization
- Timeline: build-time parses table syntax → JSON, runtime renders interactive timeline

### Folder Structure

```
hugo/assets/
├── css/
│   ├── main.css                      ← Template styling (replaceable)
│   └── visualizers/
│       ├── checkbox-tracker.css      ← Runtime visualizer styles
│       ├── link-preview.css
│       └── graph.css
└── js/
    └── visualizers/
        ├── checkbox-tracker.js       ← Runtime visualizer logic
        ├── link-preview.js
        └── graph.js

scripts/
├── preprocess-content.js             ← Orchestrates build-time visualizers
└── visualizers/
    ├── registry.json                 ← Lists all available visualizers
    ├── timeline/
    │   ├── parser.js                 ← Build-time parser
    │   ├── manifest.json             ← Visualizer metadata
    │   └── README.md
    └── yoga-sequence/
        ├── parser.js
        └── manifest.json
```

### Visualizer Manifest Format

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

### Activation Methods (with Precedence)

Visualizers can be activated in four ways. When conflicts occur, higher precedence wins:

| Precedence | Method | Scope | Example |
|------------|--------|-------|---------|
| 1 (highest) | **Page frontmatter** | Single page | `visualizers: [timeline, graph]` |
| 2 | **Folder config** | All pages in folder | `.bloob/visualizers.json` |
| 3 | **Auto-detection** | Pages matching pattern | Checkbox tracker detects `- [ ]` |
| 4 (lowest) | **Global config** | Entire site | `hugo/config.yaml` or webapp settings |

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

### Build Process Integration (Approach A - Chosen)

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

### Site-Wide Visualizers (Webapp Feature)

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

### Auto-Detection Syntax (Needs Further Design)

Auto-detection should be careful and explicit. Ideas to explore:

| Pattern | Visualizer | Notes |
|---------|------------|-------|
| `- [ ]` in content | checkbox-tracker | Current implementation |
| `\| date \| event \|` tables | timeline | Need to distinguish from regular tables |
| `[[yoga:pose-name]]` | yoga-sequence | Namespaced wiki-links? |
| Code blocks with language | various | ` ```timeline ` as trigger? |

**Open question:** Should auto-detection require opt-in at folder/site level? To prevent unexpected behavior.

### Current Implementation (Phase 1)

```
hugo/assets/
├── css/visualizers/checkbox-tracker.css
└── js/visualizers/checkbox-tracker.js
```

- Checkbox tracker uses auto-detection (finds checkboxes in DOM)
- Loaded on all pages (Approach B temporarily, will optimize later)
- No manifest system yet
- No folder config yet

### Implementation Phases

| Phase | Milestone |
|-------|-----------|
| Phase 1 ✓ | Checkbox tracker working, folder structure established |
| Phase 2 | Add `links.json` generation (build-time for graph visualizer) |
| Phase 4 | Full visualizer registry, manifest system, folder configs |
| Phase 4 | Link preview, graph visualization runtime visualizers |
| Phase 4+ | Timeline, yoga-sequence build-time visualizers |
| Phase 5+ | Webapp visualizer library, user uploads, UI configuration |

---

## Magic Machines Architecture (Core System)

**Status:** Planning  
**See:** [Full Implementation Plan](2026-02-03_recipe-scaling-and-magic-machines.md)

Magic Machines are the "write" counterpart to Visualizers. While visualizers transform content into visual experiences (read), magic machines transform content into different content (write).

### Core Concepts

| Concept | Direction | Purpose |
|---------|-----------|---------|
| **Visualizer** | Content → Display | Transform content into visual/interactive experience |
| **Magic Machine** | Content → Content | Transform content using AI or algorithms |

### Key Principles

1. **Modular & Pluggable** - Self-contained units with JSON manifests
2. **Declarative** - Defined via manifest with prompts, settings, I/O formats
3. **Idempotent** - Track processing status to avoid re-running
4. **Auditable** - Frontmatter tracking of which machines processed a file

### Magic Machine Manifest Format

```json
{
  "name": "recipe-unit-extractor",
  "version": "1.0.0",
  "description": "Converts natural language quantities to Cooklang syntax",
  "type": "ai",
  "model": {
    "provider": "anthropic",
    "model": "claude-3-haiku"
  },
  "input": {
    "type": "markdown",
    "selector": "files matching tags: #recipe OR folder: recipes/"
  },
  "output": {
    "type": "markdown",
    "mode": "in-place"
  },
  "prompt": "prompts/recipe-unit-extractor.md",
  "statusTracking": {
    "method": "frontmatter",
    "key": "magic_machine_status"
  }
}
```

### Status Tracking

Magic machines track processing status in frontmatter to enable skip/re-run logic.

**Uses flat YAML keys** for Obsidian Properties compatibility:

```yaml
---
title: Khichdi
mm_unit_extractor: 2026-02-03
mm_tag_suggester: 2026-02-03
---
```

**Convention:** `mm_<machine-name>` with ISO date value. Presence = processed.

### Example Magic Machines

| Machine | Purpose |
|---------|---------|
| `recipe-unit-extractor` | Convert quantities to Cooklang syntax |
| `tag-suggester` | Suggest tags based on content |
| `excerpt-generator` | Generate search excerpts |
| `link-suggester` | Suggest related content links |

### Folder Structure

```
scripts/magic-machines/
├── registry.json
├── runner.js
├── recipe-unit-extractor/
│   ├── manifest.json
│   ├── prompt.md
│   └── README.md
└── tag-suggester/
    ├── manifest.json
    └── prompt.md
```

### Future: Remote Execution

When content lives on GitHub (not local), magic machines will need:
- Bloob Haus API with GitHub OAuth
- Commit changes back to user's repo
- Obsidian plugin for sync (or manual pull)

### Implementation Phases

| Phase | Milestone |
|-------|-----------|
| Phase 4 | Local magic machine runner, recipe-unit-extractor |
| Phase 5 | Webapp integration, GitHub OAuth for remote execution |
| Phase 5+ | Obsidian plugin for seamless sync |

---

## Phase 4: Interactive Visualizers

**Goal:** Go beyond static pages to dynamic, interactive visualizations.

### 4.1 Link Previews on Hover
When hovering over a wiki-link, show preview card with:
- Title
- First paragraph
- Featured image (if any)

**Implementation:** Client-side JS (Tippy.js) + preloaded data or fetch on hover.

### 4.2 Graph Visualization
Interactive graph showing note connections:
- Local graph (current note + immediate connections)
- Global graph (entire site)

**Libraries:** D3.js, vis.js, or Cytoscape.js

**Data source:** `links.json` from Phase 2.

### 4.3 Stacked Notes (Andy Matuschak Style)
When clicking a link, new note opens in a column to the right instead of replacing current page.

Good for: Recipe comparison, research, exploration.

### 4.4 Timeline Visualizer
Custom visualizer for timeline content:
```markdown
---
visualizer: timeline
---

| 2020 | Started baking |
| 2022 | Opened bakery |
| 2024 | Expanded menu |
```

### 4.5 Recipe Scaling Visualizer
Special layout for recipe content with Cooklang-style syntax support:
- Ingredients sidebar with `@ingredient{qty%unit}` parsing
- Inline quantity references in instructions
- Interactive scaling calculator (adjust servings)
- Print-friendly version

**Syntax:** Cooklang-inspired markup for scalable quantities.

**See:** [Recipe Scaling & Magic Machines Plan](2026-02-03_recipe-scaling-and-magic-machines.md)

### 4.6 Thesis Visualizations (from Master's Thesis)
Interactive visualizations for:
- Communication mapping
- Systemic sensing
- Community gardens

**Architecture:** Client-side JavaScript bundles, potentially with persistence API.

---

## Phase 5+: Advanced Features

### 5.1 Password Protection / Access Control
Options:
- **Site-wide password:** Simple Vercel/Cloudflare password
- **Per-page access:** Server-side auth (Next.js middleware)
- **Private links:** Time-limited, signed URLs

**Recommended approach:** Next.js middleware for flexibility.

### 5.2 Full Transclusion Support
Embed content from one note inside another:
- `![[Recipe Tips]]` embeds full content of Recipe Tips
- Recursive transclusion (with depth limit)
- Block-level transclusion: `![[Page#^block-id]]`

### 5.3 Mobile Publishing Workflow
- PWA or native app
- Quick capture → publish flow
- Image upload from camera roll

### 5.4 Comments / Discussions
- Per-page comments
- Could use third-party (Disqus, Giscus) or custom

### 5.5 Email Notifications
- New comment notifications
- Site update notifications
- Collaboration invites

### 5.6 Custom Domains
Users bring their own domain:
- CNAME setup instructions
- SSL certificate handling
- Vercel or Cloudflare domain verification

### 5.7 Collaboration
- Multiple editors per site
- Change suggestions / pull requests
- Activity feed

### 5.8 AI Features
- AI-assisted markdown generation (user provides API key)
- Auto-tagging / categorization
- Content suggestions

### 5.9 External Data Sources
- Google Sheets as data source for visualizations
- Airtable integration
- API data fetching at build time

### 5.10 Export Options
Every marble exportable as:
- Markdown (original)
- PDF
- Image (screenshot)
- Standalone HTML
- Embed code (iframe)

---

## IndieWeb Protocols (Ongoing)

Implement progressively as relevant:

| Protocol | What It Does | Priority |
|----------|--------------|----------|
| Microformats2 | Semantic markup | Phase 1 ✓ |
| Open Graph | Social sharing previews | Phase 1 ✓ |
| IndieAuth | Domain-based identity | Phase 3 |
| Webmention | Cross-site notifications | Phase 4 |
| Micropub | Standard posting API | Phase 5 |
| RSS/Atom | Feed subscription | Phase 2 |

---

## Technical Debt & Infrastructure

### Ongoing Considerations
- [ ] Monitoring and alerting for builds
- [ ] Error tracking (Sentry or similar)
- [ ] Analytics (privacy-respecting: Plausible, Fathom)
- [ ] Backup strategy for user content
- [ ] Rate limiting for API endpoints
- [ ] CDN caching strategy

### Hosting Evolution
1. **Now (Phase 1):** Single Vercel project
2. **Phase 3:** Vercel for app + Cloudflare Pages for user sites
3. **Future:** Evaluate based on scale and cost

---

## Ideas Parking Lot

Features that came up but aren't prioritized yet:

- [ ] RSS feed generation
- [ ] Sitemap generation
- [ ] Search (client-side: Pagefind, Lunr.js)
- [ ] Multi-language support
- [ ] Theme marketplace
- [ ] Plugin/visualizer marketplace
- [ ] Obsidian plugin for Bloob Haus
- [ ] VS Code extension
- [ ] CLI tool (`bloob publish`)
- [ ] Webhook integrations (Zapier, IFTTT)
- [ ] Version history / revision tracking
- [ ] Scheduled publishing
- [ ] A/B testing for content
- [ ] Obsidian plugin for Bloob Haus sync (push/pull with GitHub)
- [ ] Obsidian plugin for Cooklang syntax preview
- [ ] Ingredient database / linking (`@rice` → ingredient page)
- [ ] Timer visualizer (`~{5%minutes}` becomes clickable timer)

---

## Decision Log

Track major decisions and their rationale:

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

---

## How to Use This Document

1. **Before adding features to Phase 1:** Check if it's listed here. If so, keep it here.
2. **When planning next phase:** Review this document for scope.
3. **When users request features:** Add to Ideas Parking Lot with source.
4. **Before implementing anything Phase 2+:** Get explicit approval.

---

*This document is a living reference. Update as plans evolve.*
