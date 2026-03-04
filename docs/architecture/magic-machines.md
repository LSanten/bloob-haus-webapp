# Magic Machines Architecture

**Status:** In progress — GUI type implemented (`scene-nav-builder`); AI type planned
**Location:** `docs/architecture/`

Magic Machines are modular tools that produce or transform content. They are the "write" counterpart to Visualizers (which are "read" tools). A magic machine can be AI-powered, GUI-based, or a pure script transformation — but they all live in `lib/magic-machines/`, share a manifest format, and can pair with a visualizer.

---

## Core Concepts

| Concept | Direction | Purpose |
|---------|-----------|---------|
| **Visualizer** | Content → Display | Transform content into visual/interactive experience |
| **Magic Machine** | Content → Content | Transform content using AI or algorithms |

---

## Key Principles

1. **Modular & Pluggable** - Like visualizers, magic machines are self-contained units
2. **Declarative** - Defined in JSON manifests with prompts, settings, I/O formats
3. **Idempotent** - Running twice should produce same result (or be skipped)
4. **Auditable** - Track which files have been processed via frontmatter

---

## Type Taxonomy

Every magic machine declares a `type` in its manifest:

| Type | Description | Example |
|------|-------------|---------|
| `"gui"` | Visual builder that produces markdown output through a UI | `scene-nav-builder` |
| `"ai"` | Sends content to an LLM and writes the result back | `recipe-unit-extractor` (planned) |
| `"script"` | Pure code transformation, no AI, no UI | link-checker (planned) |

GUI machines are the simplest to use (just open in a browser) but the most interactive. AI machines are automated and batch-process files. Script machines are deterministic transforms.

---

## GUI Magic Machines

GUI machines produce markdown (or other output) through a visual interface rather than a script. They are portable standalone HTML apps.

**Conventions:**
- Live in `lib/magic-machines/<name>/app/`
- The `app/` folder contains a single `index.html` — no framework, no build step
- Can be opened directly in a browser (`file://`) or hosted
- Produce a code fence that a paired visualizer reads

**Scene Nav Builder** is the first GUI machine and establishes the pattern:

```
lib/magic-machines/scene-nav-builder/
├── manifest.json
└── app/
    └── index.html       ← Standalone vanilla JS builder. Open in any browser.
```

**What it does:** Upload background PNGs + character PNGs → drag to position, set glow effects and click actions → copy a ` ```scene-nav``` ` code fence or standalone embed HTML.

**Paired visualizer:** `lib/visualizers/scene-nav/` reads the ` ```scene-nav``` ` code fences at build time.

### Pairing Convention

When a machine produces output for a visualizer, they share a name prefix:

```
scene-nav-builder  →  produces  →  ```scene-nav``` fences
scene-nav          →  renders   →  ```scene-nav``` fences
```

**Naming rule:** The builder and visualizer are distinct things. In markdown frontmatter, always reference the **visualizer** name (e.g. `scene-nav`), not the builder:

```yaml
# ✓ correct — references the visualizer
visualizers:
  - scene-nav

# ✗ wrong — scene-nav-builder is the magic machine (authoring tool), not the visualizer
visualizers:
  - scene-nav-builder
```

### Shared Logic: Builder vs. Visualizer (Future Refactor)

The builder (`scene-nav-builder/app/index.html`) and the visualizer (`scene-nav/parser.js`) both parse `scene-nav` code fences — the builder for its Import tab, the visualizer at build time. Right now this logic is duplicated, which means schema changes (new fields, renamed keys) must be applied in both places manually.

**These two parsers should stay in sync.** The canonical schema reference is `lib/visualizers/scene-nav/schema.md`.

A future refactor (Phase 5+) could unify them — for example as a shared isomorphic module, or by generating the builder's import parser from the visualizer's schema. Not worth the complexity now, but worth knowing about.

---

## Magic Machine Manifest Format

Each magic machine is defined by a JSON manifest:

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

---

## Prompt File Format

Prompts are stored as markdown files with structured sections:

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
- [ ] 2 tablespoons ghee
- [ ] 1/2 teaspoon turmeric

### Output
- [ ] @ghee{2%tbsp}
- [ ] @turmeric{1/2%tsp}
```

---

## Processing Flow

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
│   │  mm_unit_extractor: 2026-02-03          │              │
│   └─────────────────────────────────────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Status Tracking

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

### Why Flat Structure

- Obsidian Properties GUI displays flat keys cleanly
- Easy to query with Dataview: `WHERE mm_unit_extractor`
- Simple to parse programmatically
- Presence of key = processed; absence = not processed

### Alternative Formats Considered

```yaml
# Option A: Simple date (chosen - most Obsidian-friendly)
mm_unit_extractor: 2026-02-03

# Option B: With status (if we need more than just "completed")
mm_unit_extractor: "completed:2026-02-03"

# Option C: Nested (NOT recommended - Obsidian Properties won't display nicely)
magic_machine_status:
  recipe-unit-extractor: "completed:2026-02-03"
```

---

## Folder Structure

Magic machines live in `lib/magic-machines/`, parallel to `lib/visualizers/`. The AI runner (future) will live in `scripts/magic-machines/`.

```
lib/magic-machines/
├── scene-nav-builder/               ← GUI type (implemented)
│   ├── manifest.json
│   └── app/
│       └── index.html               ← Standalone builder, open in browser
│
├── recipe-unit-extractor/           ← AI type (planned)
│   ├── manifest.json
│   └── prompt.md
│
└── tag-suggester/                   ← AI type (planned)
    ├── manifest.json
    └── prompt.md

scripts/magic-machines/              ← AI runner (planned, Phase 4)
├── registry.json
└── runner.js
```

---

## Runner Interface

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

---

## Example Magic Machines

| Machine | Purpose | Input | Output |
|---------|---------|-------|--------|
| `recipe-unit-extractor` | Convert quantities to Cooklang | Recipe markdown | Modified markdown |
| `tag-suggester` | Suggest tags based on content | Any markdown | Tags added to frontmatter |
| `excerpt-generator` | Generate search excerpts | Any markdown | `excerpt:` in frontmatter |
| `link-suggester` | Suggest related content links | Any markdown | Suggested links (review mode) |
| `grammar-checker` | Fix grammar/typos | Any markdown | Modified markdown |

---

## Future: Remote Execution

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

---

## Implementation Phases

| Phase | Milestone |
|-------|-----------|
| Phase 4 | Local magic machine runner, recipe-unit-extractor |
| Phase 5 | Webapp integration, GitHub OAuth for remote execution |
| Phase 5+ | Obsidian plugin for seamless sync |

---

## Related Documents

- [Visualizers Architecture](visualizers.md) - The "read" counterpart to magic machines
- [Search Architecture](search.md) - Tag suggestion as a magic machine
- [Scene Nav Handoff](../implementation-plans/phases/phase-2/2026-03-03_scene-nav-handoff.md) - First GUI machine, establishes conventions
- [Recipe Scaling Plan](../implementation-plans/phases/phase-2/2026-02-03_recipe-scaling.md) - First AI machine (planned)
