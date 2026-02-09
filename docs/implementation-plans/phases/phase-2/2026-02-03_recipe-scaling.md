# Recipe Scaling System Implementation Plan

**Status:** Planning  
**Created:** 2026-02-03  
**Location:** `docs/implementation-plans/phases/phase-2/`

---

## Overview

This document covers the implementation plan for the Recipe Scaling Visualizer - a hybrid visualizer that parses Cooklang-style syntax and enables ingredient scaling in the UI.

**Related:**
- [Visualizer Architecture](../../architecture/visualizers.md)
- [Magic Machines Architecture](../../architecture/magic-machines.md) - Used for migrating existing recipes

---

## The Problem

Recipes currently have quantities scattered in two places:
- Ingredient lists: `- [ ] 2 cups rice`
- Instructions: `Add (2 cups) rice to the pot`

Users want to:
1. Scale recipes up/down (2 servings → 4 servings)
2. Have both locations update automatically
3. Not lose the natural writing flow when authoring

---

## Proposed Syntax: Cooklang-Inspired

Adopt a syntax inspired by [Cooklang](https://cooklang.org/) but adapted for our Markdown/checkbox context.

### Ingredient Syntax

```markdown
## Ingredients

- [ ] @rice{2%cups}
- [ ] @ghee{2%tbsp}
- [ ] @turmeric{1/2%tsp}
- [ ] @salt{=%tsp} to taste      ← Fixed quantity (doesn't scale)
```

**Pattern:** `@ingredient{quantity%unit}`

- `@` marks an ingredient (parseable)
- `{quantity%unit}` contains the amount
- `{=quantity%unit}` marks as fixed (won't scale)
- Fractions like `1/2` are supported

### Instruction Syntax (Inline References)

```markdown
## Instructions

- [ ] Warm the @ghee{2%tbsp}, then add @turmeric{1/2%tsp}
- [ ] Add @rice{2%cups} and stir for ~{1%minute}
- [ ] Add {8%cups} water and bring to boil
```

**Patterns:**
- `@ingredient{qty%unit}` - Named ingredient reference
- `{qty%unit}` - Anonymous quantity (just a number that scales)
- `~{time%unit}` - Timer (optional, for future timer visualizer)

### Servings Metadata

```yaml
---
title: Khichdi
servings: 4
tags:
  - "#soups"
---
```

The `servings` frontmatter declares the base serving size for scaling calculations.

---

## Display Rendering

The build-time parser transforms:

**Input:**
```markdown
- [ ] @ghee{2%tbsp}
```

**Output HTML:**
```html
<li class="ingredient" data-ingredient="ghee" data-qty="2" data-unit="tbsp">
  <input type="checkbox">
  <span class="ingredient-name">ghee</span>
  <span class="quantity" data-base="2">2</span>
  <span class="unit">tbsp</span>
</li>
```

The runtime visualizer reads `data-base` and recalculates when servings change.

---

## Architecture Components

```
┌─────────────────────────────────────────────────────────────┐
│                    RECIPE SCALING SYSTEM                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │  BUILD-TIME     │    │  RUNTIME        │                │
│  │  (index.js)     │    │  (browser.js)   │                │
│  │                 │    │                 │                │
│  │  • Parse @{}    │    │  • Scaling UI   │                │
│  │  • Extract qty  │    │  • Recalculate  │                │
│  │  • Generate     │    │  • Update DOM   │                │
│  │    data attrs   │    │  • Persist      │                │
│  └────────┬────────┘    └────────┬────────┘                │
│           │                      │                          │
│           ▼                      ▼                          │
│  ┌─────────────────────────────────────────┐               │
│  │              HTML OUTPUT                 │               │
│  │  <span data-base="2" data-unit="cups">  │               │
│  └─────────────────────────────────────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Folder Structure

Follows the modular visualizer pattern established by `checkbox-tracker` (see [Visualizer Architecture](../../architecture/visualizers.md)):

```
lib/visualizers/recipe-scaler/
├── index.js            ← Exports { type, name, transform } — module contract
├── browser.js          ← Runtime: scaling UI + calculations (bundled by esbuild → IIFE)
├── styles.css          ← Styling for quantities, scaling widget (copied to src/assets/css/visualizers/)
├── manifest.json
└── tests/
    └── parser.test.js
```

The `scripts/bundle-visualizers.js` auto-discovers this folder and bundles `browser.js` → `src/assets/js/visualizers/recipe-scaler.js` and copies `styles.css` → `src/assets/css/visualizers/recipe-scaler.css`.

---

## Manifest

```json
{
  "name": "recipe-scaler",
  "type": "hybrid",
  "version": "1.0.0",
  "description": "Parses Cooklang-style ingredient syntax and enables recipe scaling",
  "activation": {
    "method": "frontmatter",
    "key": "servings"
  },
  "files": {
    "transform": "index.js",
    "browser": "browser.js",
    "css": "styles.css"
  },
  "settings": {
    "showScalingWidget": {
      "type": "boolean",
      "default": true,
      "description": "Show the serving size adjuster widget"
    },
    "fractionDisplay": {
      "type": "string",
      "default": "fraction",
      "options": ["fraction", "decimal"],
      "description": "How to display quantities (1/2 vs 0.5)"
    }
  }
}
```

---

## Implementation Phases

| Phase | Milestone | Notes |
|-------|-----------|-------|
| 1 | Design syntax spec | This document |
| 2 | Build parser.js | Extract ingredients, quantities, units |
| 3 | Build runtime scaler.js | UI widget, DOM updates |
| 4 | Migrate existing recipes | Via Magic Machine (see [architecture](../../architecture/magic-machines.md)) |
| 5 | Obsidian preview plugin | Far future |

---

## Migration Plan

### Phase 1: Local Development

1. Build recipe-scaler parser and visualizer
2. Build magic machine runner
3. Create recipe-unit-extractor machine
4. Test on buffbaby vault locally

### Phase 2: Production Use

1. Run magic machine on all recipes (one-time migration)
2. Deploy recipe-scaler visualizer to site
3. Update recipe formatting guide

### Phase 3: Webapp Integration

1. Add magic machines to webapp (power user feature)
2. GitHub OAuth for remote file manipulation
3. Obsidian plugin for seamless sync (far future)

---

## Open Questions

1. **Syntax bikeshedding:** Is `@ingredient{qty%unit}` the right syntax? Alternatives:
   - `[2 cups]rice` - More compact
   - `{{2 cups: rice}}` - Double braces
   - `<qty:2:cups:rice>` - XML-ish

2. **Ingredient linking:** Should `@rice` link to an ingredient database or note?

3. **Timer integration:** Should `~{5%minutes}` become a clickable timer?

4. **Magic machine approval flow:** Should there be a review/diff step before writing?

5. **Obsidian preview:** How much effort to build Obsidian plugin that renders Cooklang syntax?

---

## References

- [Cooklang Specification](https://cooklang.org/docs/spec/)
- [Cooklang GitHub](https://github.com/cooklang/spec)
- [Visualizer Architecture](../../architecture/visualizers.md)
- [Magic Machines Architecture](../../architecture/magic-machines.md)
