# Scene Nav — Claude Code Handoff

**Date:** 2026-03-03
**Context:** First magic machine + visualizer built together. Establishes conventions for both systems.

---

## What This Is

An interactive image-map builder where you:
1. Upload a transparent background PNG
2. Add character/element PNGs on top
3. Position + size them visually
4. Configure hover glow effects (color, intensity)
5. Configure click actions (Shopify filter, link, anchor scroll)

It outputs:
- A ```` ```scene-nav``` ```` code fence (YAML) — the source of truth for Bloob Haus
- Standalone HTML/CSS/JS embed code — for Shopify, any website

**Immediate goal:** Get this working in Shopify to filter products by character.
**Long-term goal:** This becomes a reusable visualizer + builder pattern in Bloob Haus.

---

## Architecture: Where Things Live

This is unusual because it spans THREE concerns:

```
bloob-haus-webapp/
├── lib/
│   ├── visualizers/
│   │   └── scene-nav/              ← VISUALIZER (renders the scene)
│   │       ├── manifest.json
│   │       ├── schema.md           ← Documents the ```scene-nav``` YAML format
│   │       ├── index.js            ← Build-time: parses code fence → HTML
│   │       ├── parser.js           ← Pure: YAML string → scene data object
│   │       ├── renderer.js         ← Pure: scene data → HTML string
│   │       ├── browser.js          ← Runtime: hover glow, click actions
│   │       └── styles.css
│   │
│   └── magic-machines/
│       └── scene-nav-builder/      ← MAGIC MACHINE (creates the code fence)
│           ├── manifest.json
│           └── app/                ← The builder GUI (standalone JS app)
│               ├── index.html      ← Single-file builder, no framework needed
│               └── README.md
│
└── scripts/
    └── magic-machines/
        └── runner.js               ← (future) Generic magic machine runner
```

### Why This Split

- **Visualizer** (`lib/visualizers/scene-nav/`): Follows existing visualizer conventions exactly. Pure functions. Runs at build time to render code fences into HTML. `browser.js` handles hover/glow at runtime.
- **Magic Machine** (`lib/magic-machines/scene-nav-builder/`): The builder tool. Unlike AI-powered magic machines (which take content → transformed content), this is a **GUI magic machine** — it produces markdown output through a visual interface. Same concept, different interaction model.
- **The builder app** is standalone JS — no React, no build step. Just an HTML file with vanilla JS. This is important because:
  - It can be hosted anywhere (studio.bloob.haus, local file, etc.)
  - It can be embedded in the Bloob Haus webapp later
  - Users don't need a dev environment to use it
  - It establishes that magic machines can have GUIs

---

## Development Strategy

### Phase 1: Standalone Builder (DO THIS FIRST)

Convert the React prototype into a single vanilla JS/HTML file. No dependencies. No build step.

**Why vanilla JS instead of React:**
- The builder needs to work as a standalone tool
- It needs to be embeddable (iframe or inline) in Shopify admin, Bloob Haus webapp, etc.
- No bundler = no friction to iterate
- Follows the "magic machine as portable tool" philosophy

**The prototype exists as a React JSX artifact** (from Claude Chat session 2026-03-03). Core features already working:
- PNG upload (background + elements)
- Drag to position
- Aspect-ratio-locked sizing (single slider)
- Glow color picker + intensity slider
- Three action types: filter, link, anchor
- Code output in two formats: markdown code fence + embed HTML

**To convert from React prototype → vanilla JS:**
- Replace useState with plain object state + render function
- Replace JSX with DOM creation or innerHTML templates
- Keep the same visual design (dark theme, Space Mono + DM Sans)
- Keep the same three-mode UI (Edit / Preview / Code)

**File:** `lib/magic-machines/scene-nav-builder/app/index.html`

### Phase 2: Visualizer (Renders Code Fences)

Create the visualizer that reads ```` ```scene-nav``` ```` code fences in markdown and renders the interactive scene.

**parser.js** — Pure function:
```js
// Input: raw YAML string from inside the code fence
// Output: { background, elements: [{ image, x, y, scale, label, glow, glowIntensity, action, value }] }
export function parse(yamlString) { ... }
```

**renderer.js** — Pure function:
```js
// Input: parsed scene data object
// Output: HTML string with positioned images + inline styles
export function render(sceneData) { ... }
```

**browser.js** — Side effects:
```js
// Attaches hover glow + click action event listeners to rendered scene
// Uses CSS filter: drop-shadow() for glow (the key technique)
```

**manifest.json:**
```json
{
  "name": "scene-nav",
  "type": "hybrid",
  "version": "1.0.0",
  "description": "Interactive image-map navigation with hover glow effects",
  "activation": {
    "method": "code-fence",
    "language": "scene-nav"
  },
  "files": {
    "transform": "index.js",
    "parser": "parser.js",
    "renderer": "renderer.js",
    "browser": "browser.js",
    "css": "styles.css"
  },
  "settings": {
    "maxWidth": {
      "type": "string",
      "default": "900px",
      "description": "Maximum width of the scene container"
    }
  }
}
```

### Phase 3: Shopify Integration

The embed code from the builder is already Shopify-ready. Steps:

1. **Upload character PNGs** to Shopify Files (Settings → Files). Get CDN URLs.
2. **Replace data-URIs** in embed code with Shopify CDN URLs.
3. **Create a custom section** in your Shopify theme:
   - `sections/scene-nav.liquid` — contains the embed HTML/CSS/JS
   - OR paste embed code into a Custom Liquid section via theme editor
4. **Tag products** with character names: `character:bloob`, `character:tiger`, etc.
5. **Wire up filtering** — two options:
   - **URL-based (simple):** Click → redirects to `/collections/all?filter.p.tag=character:bloob`
   - **AJAX (smooth):** Listen for `bloob:filter` custom event, use Shopify AJAX API to filter product grid without page reload

**For the Shopify CLI approach** you're already using:
- Create `sections/scene-nav.liquid` in your theme
- The section schema can expose settings for which collection to filter
- Products tagged with character names get filtered via Liquid or JS

### Phase 4: Connect Builder ↔ Visualizer

The builder outputs a ```` ```scene-nav``` ```` code fence. The visualizer reads it. But we also want:
- Builder can **import** an existing code fence (paste YAML → reconstruct the scene)
- Builder can **export** updated code fence after editing
- This makes the builder a true round-trip editing tool

---

## Code Fence Format (```scene-nav```)

This is the source of truth. Document in `schema.md`.

```yaml
background: space-background.png
elements:
  - image: bloob-character.png
    x: 25.5
    y: 30.2
    scale: 18
    label: "Bloob"
    glow: "#FFD700"
    glowIntensity: 1.5
    action: filter
    value: "character:bloob"
  - image: tiger-character.png
    x: 60.0
    y: 45.0
    scale: 22
    label: "Tiger"
    glow: "#FF6B9D"
    action: link
    value: "https://example.com/tiger"
```

**Field reference:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `background` | string | no | Filename of background image |
| `elements` | array | yes | List of positioned elements |
| `elements[].image` | string | yes | Filename of element image |
| `elements[].x` | number | yes | Horizontal position (% from left) |
| `elements[].y` | number | yes | Vertical position (% from top) |
| `elements[].scale` | number | yes | Width as % of container |
| `elements[].label` | string | no | Tooltip text on hover |
| `elements[].glow` | string | no | Hex color for hover glow. Default: "#FFD700" |
| `elements[].glowIntensity` | number | no | Glow strength multiplier. Default: 1 |
| `elements[].action` | string | yes | One of: "filter", "link", "anchor" |
| `elements[].value` | string | no | Tag name, URL, or heading ID |

---

## Key Technical Details

### The Glow Effect

CSS `filter: drop-shadow()` traces the alpha contour of transparent PNGs. Stack three for a convincing glow:

```css
filter:
  drop-shadow(0 0 8px #FFD700)
  drop-shadow(0 0 20px #FFD700)
  drop-shadow(0 0 40px #FFD70080);
```

The radius values (8, 20, 40) are multiplied by `glowIntensity`. This works in all modern browsers. No canvas, no SVG, no image processing.

### Positioning System

All positions are **percentages** relative to the container. This makes scenes responsive — they scale with the container width. The background image sets the container's aspect ratio. Element `scale` is width-as-percentage; height follows the image's natural aspect ratio (no squishing).

### Shopify Filter Event

The embed code dispatches a custom event:
```js
window.dispatchEvent(new CustomEvent('bloob:filter', { detail: { tag: 'character:bloob' } }));
```

Your Shopify theme JS listens for this and filters the product grid. As a fallback, it also navigates to the collection URL with a filter parameter.

---

## Establishing Magic Machine Conventions

This is the first magic machine. Decisions made here set the pattern:

### 1. Magic machines live in `lib/magic-machines/`
Parallel to `lib/visualizers/`. Same self-contained folder structure.

### 2. Every magic machine has a `manifest.json`
Same convention as visualizers. Required fields: `name`, `type`, `version`, `description`.

### 3. Type taxonomy for magic machines:
- `"type": "ai"` — AI-powered (sends content to an LLM). Example: recipe-unit-extractor.
- `"type": "gui"` — Has a visual builder interface. Example: scene-nav-builder.
- `"type": "script"` — Pure code transformation, no AI, no GUI. Example: (future) link-checker.

### 4. GUI magic machines have an `app/` subfolder
Contains the standalone builder (HTML/JS). Can be served independently or embedded.

### 5. Magic machines that pair with a visualizer share a name prefix
`scene-nav` (visualizer) + `scene-nav-builder` (magic machine). The builder produces input for the visualizer.

### 6. Document in DECISIONS.md:
```markdown
### First Magic Machine Convention (2026-03-03)

**Context:** Building scene-nav-builder, the first magic machine. Need to establish folder structure and conventions.

**Decision:** Magic machines live in `lib/magic-machines/`, parallel to `lib/visualizers/`. Three types: ai, gui, script. GUI machines have an `app/` subfolder with a standalone builder.

**Rationale:**
- Parallel structure to visualizers (familiar, consistent)
- Type taxonomy distinguishes AI-powered vs manual vs automated
- Standalone app subfolder keeps builders portable
- Name-prefix linking (scene-nav ↔ scene-nav-builder) makes relationships clear
```

---

## Prompt for Claude Code

When starting a Claude Code session, provide this context:

```
I'm building the first magic machine for Bloob Haus — a "scene-nav-builder" that lets
users visually position transparent PNG images to create interactive navigation scenes.

Context docs to read:
- docs/architecture/visualizers.md (visualizer conventions)
- docs/architecture/magic-machines.md (magic machine architecture)
- docs/implementation-plans/DECISIONS.md (decision log — add new decisions here)
- This handoff document

The prototype exists as a React JSX artifact. I need to:
1. Convert it to a standalone vanilla JS/HTML builder (no React, no build step)
2. Place it in lib/magic-machines/scene-nav-builder/app/index.html
3. Create the paired visualizer in lib/visualizers/scene-nav/
4. Generate embed code I can paste into my Shopify theme

Start with the standalone builder (Phase 1). The React prototype has:
- PNG upload (background + elements), drag positioning
- Aspect-ratio-locked size slider
- Glow color picker + intensity slider
- Three action types: filter (Shopify tag), link (new tab), anchor (scroll)
- Two code outputs: ```scene-nav``` markdown fence + standalone embed HTML

Key technique: CSS filter: drop-shadow() on transparent PNGs for the glow effect.
```

---

## Files to Include in Claude Code Session

1. This handoff document
2. The React prototype JSX (from Claude Chat — save it locally first)
3. `docs/architecture/visualizers.md` (already in repo)
4. `docs/architecture/magic-machines.md` (already in repo)

---

## Open Questions

1. **Builder hosting:** Should the builder live at `studio.bloob.haus/scene-nav` eventually? Or embedded in the main webapp?
2. **Image hosting:** For the code fence, images are referenced by filename. The visualizer needs to resolve those filenames to URLs. Convention: images in the same folder as the markdown file? Or a shared `media/` folder?
3. **Import/export:** Should the builder be able to import an existing code fence for editing? (Recommend: yes, Phase 4.)
4. **Mobile:** The builder is drag-based. Touch support is needed eventually but not for v1.
