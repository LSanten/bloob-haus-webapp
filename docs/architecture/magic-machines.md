# Magic Machines Architecture

**Status:** Planning  
**Location:** `docs/architecture/`

Magic Machines are modular AI-powered tools that transform content. They are the "write" counterpart to Visualizers (which are "read" tools).

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
- [Recipe Scaling Plan](../implementation-plans/phases/phase-2/2026-02-03_recipe-scaling.md) - First magic machine implementation
