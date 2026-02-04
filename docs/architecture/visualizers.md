# Visualizer Architecture

**Status:** Foundation laid in Phase 1 (checkbox-tracker), full system planned for Phase 4+  
**Location:** `docs/architecture/`

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

## Two Types of Visualizers

### Build-time Visualizers
Run during preprocessing (Node.js). Transform markdown syntax into HTML + data.

```
markdown with special syntax
    ↓ parser.js (during preprocess-content.js)
transformed HTML + data.json
```

**Examples:** Timeline, yoga sequence, recipe card layout

**When to use:** When you need to parse custom markdown syntax or generate structured data for the page.

### Runtime Visualizers
Run in the browser (JS + CSS). Enhance rendered HTML with interactivity.

```
rendered HTML + data.json
    ↓ visualizer.js (in browser)
interactive experience
```

**Examples:** Checkbox tracker, link previews, graph visualization

**When to use:** When you need client-side interactivity, state persistence, or dynamic behavior.

### Hybrid Visualizers
Some need both: build-time generates data, runtime renders it.

**Examples:** 
- Graph: build-time generates `links.json`, runtime renders D3 visualization
- Timeline: build-time parses table syntax → JSON, runtime renders interactive timeline

---

## Folder Structure

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

## Auto-Detection Syntax (Needs Further Design)

Auto-detection should be careful and explicit. Ideas to explore:

| Pattern | Visualizer | Notes |
|---------|------------|-------|
| `- [ ]` in content | checkbox-tracker | Current implementation |
| `\| date \| event \|` tables | timeline | Need to distinguish from regular tables |
| `[[yoga:pose-name]]` | yoga-sequence | Namespaced wiki-links? |
| Code blocks with language | various | ` ```timeline ` as trigger? |

**Open question:** Should auto-detection require opt-in at folder/site level? To prevent unexpected behavior.

---

## Current Implementation (Phase 1)

```
hugo/assets/
├── css/visualizers/checkbox-tracker.css
└── js/visualizers/checkbox-tracker.js
```

- Checkbox tracker uses auto-detection (finds checkboxes in DOM)
- Loaded on all pages (Approach B temporarily, will optimize later)
- No manifest system yet
- No folder config yet

---

## Implementation Phases

| Phase | Milestone |
|-------|-----------|
| Phase 1 ✓ | Checkbox tracker working, folder structure established |
| Phase 2 | Add `links.json` generation (build-time for graph visualizer) |
| Phase 4 | Full visualizer registry, manifest system, folder configs |
| Phase 4 | Link preview, graph visualization runtime visualizers |
| Phase 4+ | Timeline, yoga-sequence build-time visualizers |
| Phase 5+ | Webapp visualizer library, user uploads, UI configuration |

---

## Related Documents

- [Magic Machines Architecture](magic-machines.md) - The "write" counterpart to visualizers
- [Recipe Scaling Plan](../implementation-plans/phases/2026-02-03_recipe-scaling.md) - Example hybrid visualizer
