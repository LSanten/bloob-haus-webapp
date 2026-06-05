# Shapes Architecture

Shapes are the unified concept for everything that renders content visually: `bloob-type`, `visualizer`, and `:::` block are all the same thing at different scopes. See `bloobhaus-notes/.../2026-05-31-BLOOB-HAUS-SHAPES-ARCHITECTURE.md` for the full conceptual model.

## Two scopes

- **Inline scope** — authored as a `:::` block inside a page body. Rendered by the visualizer's `transform()` + optional `browser.js`. No layout needed.
- **File scope** — its own `.md` file with `bloob-shape:` in frontmatter. Requires a `layout.njk` in the shape folder. Two sub-patterns exist (see below): the shape can replace the body entirely via `renderFilescope`, or it can act as a pure layout wrapper and leave the body untouched.

## What a complete shape carries

```
lib/visualizers/[name]/
  manifest.json       required — identity, type, defaultLayout (file-scope only)
  schema.md           required — human + AI readable contract (settings, examples)
  index.js            renderFilescope shapes only — build-time transform() and/or renderFilescope()
  browser.js          when needed — runtime rendering from graph.json or DOM
  styles.css          when needed — scoped CSS using theme CSS tokens (see "Token-based styles.css" below)
  layout.njk          file-scope shapes only — default page layout template
```

## Conversion checklist per shape type

### Inline-only shapes (`build-time`, `runtime`, or `hybrid` used only as `:::`)

These are already valid shapes. Remaining gaps are documentation only:

- [ ] `manifest.json` exists with correct `type`
- [ ] `schema.md` exists with settings table and examples

No `layout.njk` needed — ever.

### Layout-only shapes (no body renderer — pure layout wrapper)

The simplest file-scope pattern: the shape provides a `layout.njk` template and optional `styles.css`, but does NOT replace the body. The user's markdown content renders normally inside the layout. `article` is the canonical example.

Checklist:
- [ ] `manifest.json` has `"type": "layout"` and `"defaultLayout": "layouts/[name].njk"`
- [ ] No `index.js` — there is no `renderFilescope` and no `transform()`
- [ ] `layout.njk` inherits from `layouts/base.njk`; renders `{{ content | safe }}` inside its chrome
- [ ] `styles.css` uses only CSS token contract variables (see "Token-based styles.css" below)
- [ ] `schema.md` documents settings and activation
- [ ] User only needs `bloob-shape: [name]` in frontmatter — no `layout:` required

Layout resolution for layout-only shapes: the preprocessor derives the layout name directly from the shape folder name (`bloob-shape: article` → `layouts/article.njk`). This path does **not** read `manifest.defaultLayout` — that field is only used by `assemble-src.js` to know which file to copy (Step 2b.5), and by `renderFilescope` shapes to inject the layout via `shapeManifestLayout`. See the manifest.defaultLayout asymmetry note in DECISIONS.md 2026-06-05.

### renderFilescope shapes (`file-scope` type, or `hybrid` used as a full-page shape)

These shapes actively replace the page body with a custom renderer. `folder-preview` is the canonical example.

Checklist:
- [ ] `manifest.json` has `"type": "file-scope"` (or `"hybrid"` if also used inline)
- [ ] `manifest.json` has `"filescope": true`
- [ ] `manifest.json` has `"defaultLayout": "layouts/[name].njk"`
- [ ] `index.js` exports `renderFilescope(settings, body)` returning inner HTML
- [ ] `layout.njk` exists — inherits from `layouts/base.njk`, renders `{{ content | safe }}`
- [ ] `schema.md` documents settings and activation
- [ ] User only needs `bloob-shape: [name]` — no `layout:`, `title:`, `folder:`, or `permalink:` required (all auto-injected by preprocessor)

## How layout.njk gets into the build

`assemble-src.js` Step 2b.5 scans all `lib/visualizers/*/layout.njk` files and copies each one to `src-*/_includes/layouts/[defaultLayout filename]` **before** `_base` and theme layouts run. The override chain is:

```
shape layout.njk   (lowest priority — shape's own default, always present)
_base layouts      (can override shape default)
theme layouts      (highest priority — always wins)
```

Themes that want custom folder chrome create their own `layouts/folder-index.njk`. Themes that don't get the shape's default for free.

## Two shape variables in the preprocessor

The preprocessor maintains two distinct variables for shape resolution:

| Variable | Source | Purpose |
|----------|--------|---------|
| `bloobShape` | `frontmatter["bloob-shape"]` — explicit only | Drives **body rendering** (`renderFilescope`) and `::: settings` extraction. Never set from the site default. |
| `effectiveShape` | `bloobShape ?? siteConfig.default_shape` | Drives **layout selection** only. Falls back to the site-wide default when no shape is declared in frontmatter. |

This distinction matters: if `default_shape: marble` is configured and the `marble` shape later gains a `renderFilescope` renderer, regular pages won't have their bodies replaced — only pages with an explicit `bloob-shape: marble` declaration get that treatment.

## Site-wide default shape

Set `default_shape` in `_bloob-settings.md` to apply a shape's layout to all pages that don't declare one explicitly:

```yaml
default_shape: marble
```

- Only influences layout selection — body rendering never fires from the default
- If the named shape has no `lib/visualizers/[name]/` folder yet, it silently falls through to `page.njk` — safe to declare a future shape name in advance
- Documented in `docs/architecture/settings-registry.md` → Shapes

## How the preprocessor selects the layout

The preprocessor resolves the layout in this priority order (highest wins):

1. Explicit `layout: layouts/…` in the file's frontmatter
2. Layout from the `bloob-type` registry (`_bloob-objects.md`)
3. `bloobShapeLayout` — set when shape has no `renderFilescope` (layout-only shapes: `bloob-shape: article` → `layouts/article.njk`)
4. `shapeManifestLayout` — read from `manifest.json.defaultLayout` when the shape has `renderFilescope` (e.g. `folder-preview` → `layouts/folder-index.njk`)
5. Default: `layouts/page.njk` (or `layouts/base.njk` for `index.md` files)

Steps 3 and 4 use `effectiveShape` — so both an explicitly declared shape and the site's `default_shape` can supply a layout through these steps.

**A user only needs `bloob-shape: folder-preview`** — no `layout:` required. The preprocessor reads the manifest and injects the correct layout automatically. For index.md files the preprocessor also auto-injects `folder`, `folder_display`, and `title` from the directory name when the user hasn't provided them.

## The `shape_settings` mechanism

Shape layouts can read per-page configuration values that the user authors in a `:::settings` block in the page body — without polluting the user's frontmatter with shape-internal options.

**How it works:**

1. User writes a `:::settings` block in the body:
   ```
   :::settings
   share_bar: false
   :::
   ```
2. `preprocess-content.js` calls `extractSettingsBlock()` on the raw body whenever `bloob-shape` is declared in frontmatter
3. The parsed key/value pairs are written to `outputFrontmatter.shape_settings` (only if non-empty and `bloob-shape` is present)
4. The shape's `layout.njk` reads them via `{{ shape_settings.key }}`

**Example — article shape's share bar toggle:**
```njk
{% if shape_settings.share_bar !== false %}
  {% include "partials/share-bar.njk" %}
{% endif %}
```
The default is "on" (include renders unless explicitly opted out). Users opt out with `share_bar: false` in a `:::settings` block.

**Why `:::settings` instead of direct frontmatter keys:**
- Shape-internal options shouldn't compete with standard page frontmatter keys
- The `:::settings` block is strip-parsed at build time — it never appears in rendered output
- Layout templates read from a single `shape_settings` object, making it obvious which keys come from shape config vs page metadata
- See DECISIONS.md 2026-06-05 for the full rationale

## Token-based `styles.css`

Shapes ship their own `styles.css` using **only** the CSS token contract as variables. This means the shape's styles work correctly in any theme that implements the token contract — no theme-specific overrides needed.

Required tokens used by shapes (all themes must declare these — see `docs/architecture/themes.md`):
```
--accent-color    --bg-color    --text-color    --border-color    --card-bg
--font-body       --font-heading
```

Optional tokens shapes can use with safe fallbacks:
```
--article-width   (shape default: 820px)
--spacing-xs/sm/md/lg/xl
--border-radius   --border-radius-sm
--nav-height      (for fixed-nav offset — theme's responsibility to declare)
```

**The override pattern for theme-specific adjustments:**
Shape CSS is copied to `src-*` as part of the build. Themes apply overrides in their `main.css` using the shape's class names:
```css
/* AE theme — offset article-page for fixed nav bar */
.article-page {
  padding-top: calc(var(--nav-height) + var(--spacing-lg));
}
```
This keeps the shape portable while letting themes fine-tune without forking the shape's template.

## `_base` partials in shape layouts

Shape `layout.njk` files can reference `_base` partials directly:
```njk
{% include "partials/share-bar.njk" %}
```
This works because `assemble-src.js` copies `themes/_base/partials/` into `src-*/_includes/partials/` before Eleventy runs — those partials are available to all themes and all shape layouts.

**Caveat:** If a `_base` partial uses a JS querySelector to target the body content (e.g., `share-bar.njk` for heading anchor links), the new shape's body class must be added to that selector. When `article` was introduced, `share-bar.njk` needed `.article-body` added alongside `.marble-content` and `.page-body`.

## Unknown shape names — fallback behaviour

When `effectiveShape` names a shape with no `lib/visualizers/[name]/` folder:
- If the shape was **explicitly declared** in frontmatter → logs a warning, falls back to `page.njk`
- If the shape came from **`default_shape`** → silent, falls back to `page.njk`

This means content files can use `bloob-shape: note` today even though `lib/visualizers/note/` doesn't exist yet — the build won't crash. When the `note` shape is eventually built and its folder appears, those files will automatically pick up its layout.

## Deferred: body-only shape declaration

Authoring goal: a `folder-preview` code fence in the body (no `bloob-shape:` in frontmatter) should implicitly set the page's bloob-shape and inherit its `defaultLayout`. This requires the preprocessor to detect code-fence types in the body before deciding on layout — a two-pass dependency. Current position: `bloob-shape:` in frontmatter is canonical; code fences in body work via Eleventy `addTransform` but don't influence layout selection. See DECISIONS.md 2026-06-05.

## Current shape status

| Shape | Type | Complete? | Gaps |
|-------|------|-----------|------|
| `article` | layout-only | ✓ | First layout-only shape; reference implementation |
| `folder-preview` | hybrid + file-scope | ✓ | — |
| `rss-feed` | file-scope | Partial | Missing `layout.njk`, `schema.md`, `styles.css` |
| `card-preview` | build-time | Partial | Missing `schema.md` |
| `checkbox-tracker` | runtime | Partial | — |
| `citations` | runtime (CSS-only) | ✓ | — |
| `circular-nav` | hybrid | Partial | Missing `schema.md` |
| `fridge-magnets` | hybrid | Partial | Missing `schema.md` |
| `graph` | hybrid | Partial | Missing `schema.md` |
| `heading-and-paragraph` | build-time | Partial | Missing `schema.md` |
| `image-grid` | build-time | Partial | Missing `schema.md` |
| `image-text` | build-time | ✓ | — |
| `ken-burns-zoom` | unknown | Incomplete | Missing `manifest.json` entirely |
| `latex` | runtime | Partial | Missing `schema.md` |
| `marble` | — | Not yet built | Declared as `default_shape` in marbles vault — will auto-apply layout once shape folder exists |
| `note` | — | Not yet built | Used as `bloob-shape: note` in content files — safely falls back to `page.njk` until built |
| `page-preview` | runtime | Partial | — |
| `photo-grid` | build-time | Partial | — |
| `quotes-stack` | hybrid | Partial | Missing `schema.md` |
| `scene-nav` | hybrid | Partial | — |
| `search` | hybrid | Partial | Missing `schema.md` |
| `services` | build-time | Partial | Missing `schema.md` |
| `slideshow` | build-time | ✓ | — |
| `tags` | hybrid | Partial | Missing `schema.md` |
| `testimonials` | hybrid | Partial | — |

## The next file-scope shape to convert: rss-feed

`rss-feed` is the only other declared `file-scope` shape. It currently works because users write `layout: layouts/page.njk` explicitly in their frontmatter. Converting it to a proper shape means:

1. Add `layout.njk` to `lib/visualizers/rss-feed/` (inheriting from `base.njk`)
2. Add `"defaultLayout": "layouts/rss-feed.njk"` to its `manifest.json`
3. Add `"filescope": true` to its `manifest.json`
4. Write `schema.md`
5. Users can then drop the `layout:` line from their frontmatter

## Rule: do not convert visualizers wholesale

Convert one shape at a time, starting with shapes that are actively being used as file-scope pages. Inline-only shapes need no conversion beyond documentation gaps. Attempting to convert all shapes at once risks breaking existing content.
