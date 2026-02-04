# Recipe Scaling System & Magic Machines Architecture

**Status:** Planning  
**Created:** 2026-02-03  
**Related:** [bloob-haus-future-features-roadmap.md](bloob-haus-future-features-roadmap.md)  
**Location:** `docs/implementation-plans/`

---

## Overview

This document covers two related but independent systems:

1. **Recipe Scaling Visualizer** - A visualizer that parses Cooklang-style syntax and enables ingredient scaling in the UI
2. **Magic Machines** - A new architectural concept for AI-powered content transformation tools

Both follow the modular, pluggable philosophy established in the Visualizer Architecture.

---

## Part 1: Recipe Scaling System

### The Problem

Recipes currently have quantities scattered in two places:
- Ingredient lists: `- [ ] 2 cups rice`
- Instructions: `Add (2 cups) rice to the pot`

Users want to:
1. Scale recipes up/down (2 servings → 4 servings)
2. Have both locations update automatically
3. Not lose the natural writing flow when authoring

### Proposed Syntax: Cooklang-Inspired

Adopt a syntax inspired by [Cooklang](https://cooklang.org/) but adapted for our Markdown/checkbox context.

#### Ingredient Syntax

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

#### Instruction Syntax (Inline References)

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

#### Servings Metadata

```yaml
---
title: Khichdi
servings: 4
tags:
  - "#soups"
---
```

The `servings` frontmatter declares the base serving size for scaling calculations.

### Display Rendering

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

### Architecture Components

```
┌─────────────────────────────────────────────────────────────┐
│                    RECIPE SCALING SYSTEM                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │  BUILD-TIME     │    │  RUNTIME        │                │
│  │  (parser.js)    │    │  (scaler.js)    │                │
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

### Folder Structure

```
scripts/visualizers/recipe-scaler/
├── manifest.json
├── parser.js           ← Build-time: parse Cooklang syntax
├── README.md
└── tests/
    └── parser.test.js

hugo/assets/
├── js/visualizers/
│   └── recipe-scaler.js    ← Runtime: scaling UI + calculations
└── css/visualizers/
    └── recipe-scaler.css   ← Styling for quantities, scaling widget
```

### Manifest

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
    "parser": "parser.js",
    "js": "recipe-scaler.js",
    "css": "recipe-scaler.css"
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

### Implementation Phases

| Phase | Milestone | Notes |
|-------|-----------|-------|
| 1 | Design syntax spec | This document |
| 2 | Build parser.js | Extract ingredients, quantities, units |
| 3 | Build runtime scaler.js | UI widget, DOM updates |
| 4 | Migrate existing recipes | Via Magic Machine (see Part 2) |
| 5 | Obsidian preview plugin | Far future |

---

## Part 2: Magic Machines Architecture

### Concept

**Magic Machines** are modular AI-powered tools that transform content. They are the "write" counterpart to Visualizers (which are "read" tools).

| Concept | Direction | Purpose |
|---------|-----------|---------|
| **Visualizer** | Content → Display | Transform content into visual/interactive experience |
| **Magic Machine** | Content → Content | Transform content using AI or algorithms |

### Core Principles

1. **Modular & Pluggable** - Like visualizers, magic machines are self-contained units
2. **Declarative** - Defined in JSON manifests with prompts, settings, I/O formats
3. **Idempotent-ish** - Running twice should produce same result (or be skipped)
4. **Auditable** - Track which files have been processed

### Magic Machine Manifest Format

```json
{
  "name": "recipe-unit-extractor",
  "version": "1.0.0",
  "description": "Converts natural language quantities to Cooklang syntax",
  "type": "ai",
  "model": {
    "provider": "anthropic",
    "model": "claude-3-haiku",
    "maxTokens": 4096
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
    "key": "mm_unit_extractor",
    "valueFormat": "date"
  },
  "settings": {
    "dryRun": {
      "type": "boolean",
      "default": true,
      "description": "Preview changes without writing"
    },
    "skipCompleted": {
      "type": "boolean", 
      "default": true,
      "description": "Skip files already marked as processed"
    }
  }
}
```

### Prompt File Format

```markdown
<!-- prompts/recipe-unit-extractor.md -->

# Recipe Unit Extractor

## Task
Convert natural language ingredient quantities to Cooklang-style syntax.

## Input Format
A markdown recipe file with ingredients and instructions.

## Output Format
The same file with quantities converted to `@ingredient{qty%unit}` syntax.

## Rules
1. Preserve all existing structure (frontmatter, headings, checkboxes)
2. Convert ingredient lines: `- [ ] 2 cups rice` → `- [ ] @rice{2%cups}`
3. Convert inline quantities in instructions: `(2 cups)` → `@rice{2%cups}`
4. Keep fixed quantities (like "salt to taste") as `{=%unit}` or unchanged
5. Fractions should remain as fractions: `1/2`, `1/4`, etc.
6. If unsure about an ingredient name, keep it simple: `@butter{2%tbsp}`

## Examples

### Input
```
- [ ] 2 tablespoons ghee
- [ ] 1/2 teaspoon turmeric

## Instructions
- [ ] Warm the (2 tbsp) ghee, then add (1/2 tsp) turmeric
```

### Output
```
- [ ] @ghee{2%tbsp}
- [ ] @turmeric{1/2%tsp}

## Instructions
- [ ] Warm the @ghee{2%tbsp}, then add @turmeric{1/2%tsp}
```
```

### Processing Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    MAGIC MACHINE FLOW                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────┐                                         │
│   │ manifest.json │◄── Defines machine behavior            │
│   └──────┬───────┘                                         │
│          │                                                  │
│          ▼                                                  │
│   ┌──────────────┐    ┌──────────────┐                     │
│   │   selector   │───►│ file1.md     │                     │
│   │              │    │ file2.md     │ ◄── Input files     │
│   │              │    │ file3.md     │                     │
│   └──────────────┘    └──────┬───────┘                     │
│                              │                              │
│                              ▼                              │
│   ┌──────────────┐    ┌──────────────┐                     │
│   │   prompt.md  │───►│   AI MODEL   │                     │
│   └──────────────┘    └──────┬───────┘                     │
│                              │                              │
│                              ▼                              │
│                       ┌──────────────┐                     │
│                       │ JSON Output  │                     │
│                       │ {            │                     │
│                       │   file: ..., │                     │
│                       │   content:...│                     │
│                       │ }            │                     │
│                       └──────┬───────┘                     │
│                              │                              │
│                              ▼                              │
│   ┌─────────────────────────────────────────┐              │
│   │  WRITE BACK (mode: in-place | new-file) │              │
│   └─────────────────────────────────────────┘              │
│                              │                              │
│                              ▼                              │
│   ┌─────────────────────────────────────────┐              │
│   │  UPDATE STATUS in frontmatter           │              │
│   │  magic_machine_status: completed        │              │
│   └─────────────────────────────────────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Status Tracking

To prevent re-processing and enable auditing, magic machines track status in frontmatter.

**Important:** Obsidian Properties [don't support nested YAML well](https://forum.obsidian.md/t/yaml-frontmatter-formatting/43673). Use a **flat structure** with descriptive key names for best compatibility:

```yaml
---
title: Khichdi
servings: 4
mm_unit_extractor: 2026-02-03
mm_tag_suggester: 2026-02-03
---
```

**Naming convention:** `mm_<machine-name>` with ISO date value.

**Alternative formats considered:**

```yaml
# Option A: Simple date (chosen - most Obsidian-friendly)
mm_unit_extractor: 2026-02-03

# Option B: With status (if we need more than just "completed")
mm_unit_extractor: "completed:2026-02-03"

# Option C: Nested (NOT recommended - Obsidian Properties won't display nicely)
magic_machine_status:
  recipe-unit-extractor: "completed:2026-02-03"
```

**Why flat structure:**
- Obsidian Properties GUI displays flat keys cleanly
- Easy to query with Dataview: `WHERE mm_unit_extractor`
- Simple to parse programmatically
- Presence of key = processed; absence = not processed

This allows:
- Skipping already-processed files
- Knowing when/which machine processed a file
- Re-running specific machines if needed
- Clean display in Obsidian's Properties panel

### Folder Structure

```
scripts/magic-machines/
├── registry.json                    ← Lists all available machines
├── runner.js                        ← Core execution engine
├── recipe-unit-extractor/
│   ├── manifest.json
│   ├── prompt.md
│   └── README.md
├── tag-suggester/
│   ├── manifest.json
│   └── prompt.md
└── excerpt-generator/
    ├── manifest.json
    └── prompt.md
```

### Runner Interface

```bash
# Run a specific magic machine
node scripts/magic-machines/runner.js recipe-unit-extractor

# Dry run (preview only)
node scripts/magic-machines/runner.js recipe-unit-extractor --dry-run

# Force re-run on all files (ignore status)
node scripts/magic-machines/runner.js recipe-unit-extractor --force

# Run on specific file
node scripts/magic-machines/runner.js recipe-unit-extractor --file recipes/khichdi.md
```

### Future: Remote Execution

When content lives on GitHub (not local), magic machines need a different flow:

```
┌──────────────────────────────────────────────────────────────┐
│                 REMOTE MAGIC MACHINE FLOW                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │  Obsidian   │────►│ Bloob Haus  │────►│   GitHub    │   │
│  │  (trigger)  │     │    API      │     │   (OAuth)   │   │
│  └─────────────┘     └──────┬──────┘     └─────────────┘   │
│                             │                               │
│                             ▼                               │
│                      ┌─────────────┐                       │
│                      │ Magic Machine│                       │
│                      │   Runner     │                       │
│                      └──────┬──────┘                       │
│                             │                               │
│                             ▼                               │
│                      ┌─────────────┐                       │
│                      │ Commit to   │                       │
│                      │ GitHub repo │                       │
│                      └──────┬──────┘                       │
│                             │                               │
│                             ▼                               │
│                      ┌─────────────┐                       │
│                      │ Obsidian    │◄── Pull/sync         │
│                      │ sync plugin │    (manual or auto)   │
│                      └─────────────┘                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Considerations:**
- User must pull repo after remote edits (or have auto-sync)
- Obsidian plugin could trigger pull after magic machine completes
- Alternative: Obsidian plugin calls API directly without GitHub intermediary

### Example Magic Machines

| Machine | Purpose | Input | Output |
|---------|---------|-------|--------|
| `recipe-unit-extractor` | Convert quantities to Cooklang | Recipe markdown | Modified markdown |
| `tag-suggester` | Suggest tags based on content | Any markdown | Tags added to frontmatter |
| `excerpt-generator` | Generate search excerpts | Any markdown | `excerpt:` in frontmatter |
| `link-suggester` | Suggest related content links | Any markdown | Suggested links (review mode) |
| `grammar-checker` | Fix grammar/typos | Any markdown | Modified markdown |

---

## Part 3: Migration Plan

### Phase 1: Local Development (Current)

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
- [Visualizer Architecture](../bloob-haus-future-features-roadmap.md#visualizer-architecture-core-system)
