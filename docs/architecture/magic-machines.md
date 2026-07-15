# Magic Machines Architecture

**Status:** AI + script types planned; standalone-app (`gui`) type implemented (`youtube-non-addictive-interface`). **Shape builders moved out — see the correction below.**
**Location:** `docs/architecture/`

> **2026-07-13 correction — builders are not magic machines.** A GUI that authors a *shape's own core
> data* (e.g. `scene-nav-builder`, the `garden` builder) is a **shape builder**: a face of the shape. It
> shares the shape's schema/parser *by construction* and lives *inside the shape folder*
> (`lib/visualizers/<shape>/builder/`) — see `shapes.md` and `ontology.md`. Only **standalone apps** that
> author no shape and transform no content (e.g. `youtube-non-addictive-interface`) remain here as
> `type: "gui"`. This doc still describes the old "GUI = magic machine" model in places; those are being
> corrected as `scene-nav-builder` migrates (garden work — `bloob-haus-cloud` plan 2026-07-13). Full
> derivation in `shape-authoring-log.md`.

Magic Machines are modular tools that **transform content** (content → content) — AI-powered or pure
script — plus standalone apps. They are the "transform" counterpart to Visualizers (the "read" tools).
They live in `lib/magic-machines/`, share a manifest format, and can pair with a visualizer. The
**authoring** counterpart to a visualizer is *not* here — it is the shape's own **builder** (see the
correction above).

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
| `"gui"` | **Standalone app** — a self-contained tool that authors no shape and transforms no content | `youtube-non-addictive-interface` |
| `"ai"` | Sends content to an LLM and writes the result back | `recipe-unit-extractor` (planned) |
| `"script"` | Pure code transformation, no AI, no UI | link-checker (planned) |

Standalone `gui` apps are the simplest to use (just open in a browser). AI machines batch-process files. Script machines are deterministic transforms. **A GUI that authors a shape is not here** — it's a *shape builder* inside the shape folder (see the correction at the top).

---

## GUI apps (and the builder pattern that moved to shapes)

Two different things historically lived under "GUI magic machine":

1. **Standalone `gui` apps** — self-contained HTML tools that author no shape (e.g.
   `youtube-non-addictive-interface`). These stay magic machines.
2. **Shape builders** — GUIs that author a shape's core data (e.g. `scene-nav-builder`). These are
   *faces of a shape* and now live in `lib/visualizers/<shape>/builder/` — see `shapes.md`.

The conventions below (standalone HTML, the required debug-log panel, the pairing convention) apply to
**both**, which is why they're documented here for now. They describe a GUI that produces output through
a visual interface rather than a script; portable standalone HTML apps.

**Conventions:**
- Live in `lib/magic-machines/<name>/app/`
- The `app/` folder contains a single `index.html` — no framework, no build step
- Can be opened directly in a browser (`file://`) or hosted
- Produce a code fence that a paired visualizer reads

### Required: Debug Log Panel

**Every GUI magic machine must include a debug log panel.** Users are often non-developers who can't open browser DevTools. The debug log gives them full visibility into what the tool is doing and why it might be failing.

**Required elements:**
- A small `debug` button in the topbar (always visible, non-intrusive)
- A slide-up or overlay panel showing timestamped log entries, color-coded by level (`info`, `warn`, `error`, `ok`)
- Auto-opens the panel on the first `error`-level entry
- A **"Copy debug log"** button — one click copies the full log as plain text for sharing/pasting in a bug report
- A **"Clear"** and **"Close"** button

**Implementation pattern** (from `ken-burns-zoom-builder`):

```js
const debugEntries = [];

function dbg(msg, level = 'info') {
  const ts = new Date().toISOString().split('T')[1].slice(0, 12);
  debugEntries.push({ ts, level, msg });
  const el = document.createElement('div');
  el.className = `debug-entry ${level}`;
  el.textContent = `[${ts}] ${msg}`;
  debugLogEl.appendChild(el);
  debugLogEl.scrollTop = debugLogEl.scrollHeight;
  if (level === 'error') debugPanel.classList.add('open');
}
```

Log these events at minimum: page load, any external library detection, all network fetches (start + size + result), any heavy async operation, and the actual `err.message` + `err.stack` in every catch block.

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

### Shared Logic: Builder vs. Visualizer — DISSOLVED (2026-07-13)

This section used to warn that `scene-nav-builder` and the `scene-nav` visualizer duplicate a fence
parser that "must stay in sync." **The shape model dissolves the problem rather than deferring it.** A
builder is a *face of the shape*; it shares the shape's one schema and one parser *by construction*.
When `scene-nav-builder` migrates into `lib/visualizers/scene-nav/builder/`, the duplication disappears
— there is nothing left to keep in sync. Kept as a tombstone so anyone who remembers the old warning
sees why it's gone. See `shape-authoring-log.md`.

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
