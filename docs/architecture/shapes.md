# Shapes Architecture

Shapes are the unified concept for everything that renders content visually: `bloob-type`, `visualizer`, and `:::` block are all the same thing at different scopes. See `bloobhaus-notes/.../2026-05-31-BLOOB-HAUS-SHAPES-ARCHITECTURE.md` for the full conceptual model.

## Two scopes

- **Inline scope** — authored as a `:::` block inside a page body. Rendered by the visualizer's `transform()` + optional `browser.js`. No layout needed.
- **File scope** — its own `.md` file with `bloob-shape:` in frontmatter. Requires a `layout.njk` in the shape folder. Two sub-patterns exist (see below): the shape can replace the body entirely via `renderFilescope`, or it can act as a pure layout wrapper and leave the body untouched.

## Inline opener syntax

The `:::` opener line can carry settings inline, without a `:::settings` block:

```
::: foldable title="Custom label" state=open
```

**State suffix shorthand** — shapes that have a meaningful open/closed default can declare it with `+` (open) or `-` (closed) appended directly to the shape name:

```
::: foldable+     open by default
::: foldable-     closed by default
::: foldable      uses shape's own default
```

This is sugar for `state=open` / `state=closed`. The build pipeline normalizes to the verbose form before the renderer runs. Only shapes that declare a state model support this; for shapes without one, `+`/`-` is ignored (or warned on, when settings validation is implemented — see open question 4).

**Sugar-to-primitive preprocessor pattern** — some authoring shortcuts require a dedicated preprocessing step that rewrites content into standard `:::` blocks before markdown-it runs. The foldable heading shortcut (`## > Heading`) is the first example: a utility (`scripts/utils/foldable-heading-sugar.js`) scans for the pattern and rewrites matched sections as `:::foldable` blocks. This must run before `inject-container-raw.js` so the rewritten blocks get picked up by the standard data-vis-raw injection pipeline. See `docs/implementation-plans/2026-05-31 Foldable Shape Implementation Plan.md` for the full foldable spec.

## The metabolism principle

Shapes do not have constraints with rejections — they have **translation functions**.

When content that doesn't "belong" enters a shape, the shape does something with it. It doesn't refuse. A server rack landing in a garden gets flowered. A sculpture landing in a pond-of-marbles gets marbleized. Every shape has its own answer for what to do with whatever enters it — that answer is its translation function.

This is the foundational design principle behind the whole shape system. It dissolves the question "what's allowed inside this shape?" into a richer question: "what does this shape do with different kinds of things?" No violation language. The shape metabolizes its contents according to its own nature.

**In practice, every shape creator must answer:** *What does my shape do with something that isn't its native content type?*

Common strategies:
- **Render as native type** — the pond turns everything into a marble. Identity is overridden.
- **Render as closed icon** — the shape shows the foreign item as its own closed-state visual (its "calling card"), preserving the item's identity.
- **Render as plain text** — strip to text only, no special presentation.
- **Pass through** — render using the item's own shape rules (identity preserved — see Container-contents policy below).

## Container-contents policy

Every shape has a policy for how it treats the shapes inside it: **override** or **preserve**.

**Override (transformation lens):** The shape renders everything according to its own type, regardless of the contained item's original shape. A pond-of-marbles renders every contained thing as a marble. The pond is the lens; items lose their individual identity inside it.

**Preserve (place):** The shape lets each contained item render as itself. A garden lets a cactus stay a cactus, a seedling stay a seedling, an essay stay an essay. The garden is a place that holds many things without changing them.

The heuristic that emerges: shapes that are *transformation lenses* tend to override; shapes that are *places* tend to preserve. But this is per-shape policy, not a global rule — each shape decides for itself based on what it is.

This policy is part of the shape's contract and must be declared in `schema.md`. It's also the source of the placement system choice: override shapes usually use a single placement system (everything goes in the same pool); preserve shapes often need richer placement (each item may need its own position).

## Placement systems

Content placement is a property of the shape. Different shapes use different placement systems; a shape declares which one(s) it supports. Authors and AI use whatever the shape provides.

The five systems identified so far (more may emerge as shapes are built):

| System | Description | Best for |
|--------|-------------|----------|
| **Flow** | Order in the markdown determines layout (grid, stack, or sequence). | Most shapes. Default assumption. |
| **Slots** | Named positions: `slot="top-shelf-left"`, `slot="north-wall"`. | Structured containers with fixed zones. |
| **Regions** | Semantic zones: `region="sunny"`, `region="deep-water"`. | Human-friendly; maps to shape's character. |
| **Coordinates** | Explicit `x/y` or `x/y/z`: `pos="120, 340"`. | Spatial canvases; precise layout; AI-friendly. |
| **Relational** | `near="the cactus"`, `between="A and B"`. | Natural-language authoring; loosely positioned. |

**Multiple authoring paths:** a shape can accept more than one placement system for the same authoring goal. A garden's primary system might be regions (human-friendly); it could also accept coordinates (AI-friendly) for precise override. Same shape, two valid paths.

**Placement is recursive:** placement only matters when a shape is in its open state. A closed shape is placement-free — it is just its icon in the parent's space. But open it and you enter its own placement universe, which can contain its own placed shapes, each of which has their own. A city contains placed house icons (closed); open a house and its rooms are placed inside; open a room and its furniture is placed. Each level is its own coordinate system. This is the scenegraph pattern from game engines, emerging naturally from the shapes architecture.

**Current default:** most shapes use flow. Slots and regions are the next-most-authorable. Coordinates and relational require more renderer work. Build flow first; introduce others as specific shapes need them.

## Composability and extraction

Any inline `:::` block can be promoted to its own file (file-scope). The system doesn't force the choice — the author decides when an inline shape earns its own life.

Open authoring patterns:
- Author inline first, promote to file-scope later when the thing grows
- Author as a file, transclude inline elsewhere via `[[wikilink]]`
- Mix both freely — the wikilink appears in the parent as the referenced shape's closed-state visual

The future Obsidian plugin may provide an "extract" gesture — possibly "give it a life of its own" — that promotes a `:::` block to its own `.md` file and replaces the original with a wikilink. The shape is the same thing at both scopes; scope is just where it lives.

## What a complete shape carries

A shape has **one core** (the saved data) and up to two faces over it: a **renderer** (read) and an
optional **builder** (write — a GUI that authors the core; see `ontology.md`).

```
lib/visualizers/[name]/
  manifest.json       required — identity, type, defaultLayout (file-scope only), authors[]
  schema.md           required — human + AI readable contract (settings, examples, builder, authors)
  index.js            renderFilescope shapes only — build-time transform() and/or renderFilescope()
  browser.js          when needed — runtime rendering from graph.json or DOM
  styles.css          when needed — scoped CSS using theme CSS tokens (see "Token-based styles.css" below)
  layout.njk          file-scope shapes only — default page layout template
  assets/             when the shape ships its own static files (icons, sprites) — copied into build
                      output like JS/CSS; NOT served from a central CDN (keeps sites self-contained)
  builder/            when the shape has a GUI author (a "shape builder") — a single self-contained,
                      file://-openable index.html that reads AND writes this shape's core format
```

First shapes to exercise the new folders: `garden` (both `assets/` and `builder/`), `scene-nav`
(`builder/`, once migrated out of `lib/magic-machines/`).

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
2. Layout from the shape registry's optional `layout` column (`_bloob-shapes.md`, or legacy `_bloob-types.md` / `_bloob-objects.md`). The forward-facing `_bloob-shapes.md` omits this column — layout is the shape's job (step 3/4 below)
3. `bloobShapeLayout` — set when shape has no `renderFilescope` (layout-only shapes: `bloob-shape: article` → `layouts/article.njk`)
4. `shapeManifestLayout` — read from `manifest.json.defaultLayout` when the shape has `renderFilescope` (e.g. `folder-preview` → `layouts/folder-index.njk`)
5. Default: `layouts/page.njk` (or `layouts/base.njk` for `index.md` files)

Steps 3 and 4 use `effectiveShape` — so both an explicitly declared shape and the site's `default_shape` can supply a layout through these steps.

**A user only needs `bloob-shape: folder-preview`** — no `layout:` required. The preprocessor reads the manifest and injects the correct layout automatically. For index.md files the preprocessor also auto-injects `folder`, `folder_display`, and `title` from the directory name when the user hasn't provided them.

## How the preprocessor resolves identity

Layout is one face of a shape; **identity** (banner image, banner text, icon, display name) is the other. Both now resolve from the same forward-facing key, `bloob-shape:`. The preprocessor calls `resolveIdentityKey(frontmatter)` (`scripts/utils/bloob-objects-reader.js`), which picks the identity key in precedence order:

1. `bloob-type:` — legacy explicit identity key (wins when set)
2. `bloob-object:` — oldest legacy alias
3. `bloob-shape:` — the single forward-facing key; used as the identity fallback so a note that declares **only** `bloob-shape:` still resolves its identity from the registry (`_bloob-shapes.md`, keyed by the shape name)

The resolved name is looked up in the shape registry for banner/icon metadata. The legacy keys win when present, so a note can still render as one shape but identify as another. See `ontology.md` → "What a shape is" for why identity and rendering are two faces of one shape.

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

## Shape-named blocks — a shape may own its parsing

The `:::settings` path above assumes per-instance configuration is YAML key/values. That is the
**default, not a law.** A shape whose body syntax is not valid YAML declares a **shape-named block**
(`::: garden`) and parses it itself:

- The block is the shape's **single source of truth** — configuration *and* content in one surface.
  For full-page `chrome: none` shapes this includes identity metadata (`title`/`author`), with
  frontmatter carrying only `bloob-shape:` (see `ontology.md` → "Configuration and content are one
  surface" for the reconciliation).
- The parser lives in the shape's own `index.js`. **Only fence-boundary discovery is shared** — find
  the opener (`:::` + name), find the matching closer, depth-aware, tolerant of trailing whitespace.
  Everything inside is the shape's grammar, documented in its `schema.md` (fence-format +
  parsing-rules sections).
- **Why not force YAML:** garden's element list (`- mature-tree "Title" @240,225` + nested page
  bullets) parses as a YAML *sequence*, not the mapping consumers expect — and tab-indented children
  are illegal YAML and throw. Real shapes have real grammars.
- Parsing rule worth copying: **never hardcode a tab width.** Treat any deeper indentation (tabs or
  spaces) as nesting, so the format survives Obsidian's tab/space setting.

`garden` is the precedent (see its `schema.md`). Shapes with plain key/value knobs should keep using
`:::settings` — don't invent a grammar you don't need.

## Authoring & resolution conventions

These apply to **every shape that carries links or images** (scene-nav, garden, …), so they live
here once. Full rationale: `docs/implementation-plans/2026-07-21_scene-nav-builder-rework-and-resolution.md`.

1. **Dual link syntax, always.** A shape accepts **both** wiki `[[name]]` and markdown `[label](target)`
   for images *and* note-links. Wiki is auto-enabled and handled gracefully (many authors use only
   wiki); it carries no inline label, so the label comes from a nested `label:` attribute (or defaults).
2. **Basename-first resolution (the Obsidian model).** Refs resolve by **bare name, no folder**; a
   folder is added only to disambiguate when two files share a name. Full/relative paths stay valid.
3. **A shape resolves its own refs when the general pass can't.** If a shape's grammar uses link forms
   the general preprocessor skips (e.g. `[alt](x.png)` without the `!`, chosen so Obsidian doesn't embed
   and clutter the source), the shape resolves them itself. Raw refs are the source-of-truth; resolution
   is a **render-time projection**, never written back — so a builder can round-trip the exact grammar.
4. **Literal spaces are authored; encoding is a render concern.** Authors and builders write literal
   spaces (`Contact us.png`); parsers accept both literal spaces and `%20`. URL-encoding happens only in
   the resolved output URL.
5. **Tri-state + boolean vocabulary (all shapes).** Optional attribute: **absent → default**,
   **`false`/`off` → disable**, **`true`/`on` → enable**, **other value → override**; `false`/`off` and
   `true`/`on` accepted case-insensitively so authors don't hit syntax errors. Distinct from **bare
   flags** (`- background`, `- flipH` → true) and **keyed values** (`- at: x, y`).
6. **A write-face (builder) emits authorable, markdown-preferred output.** Whatever a builder produces
   must be something a human could have typed and that re-parses identically. It preserves the authored
   **target** granularity (full path stays full path; basename stays basename) but normalizes the
   **wrapper** to markdown `[label](target)` because that form carries the label inline.

## Comments — a shape behavior

Whether a page shows comments, and *where* the comment thread sits, is a **shape decision** —
not a global one. This realizes the `commentable?` behavior named in [`ontology.md`](ontology.md)
(Q1, "What is a marble?").

**Mechanism.** The reusable partial `themes/_base/partials/comments.njk` renders the site's
`fast-comments-embed` snippet (authored in `_bloob-settings.md`). A shape:

- **opts in** by including the partial in its `layout.njk`, at whatever position it wants;
- **opts out** by simply not including it.

```njk
{# article shape places the thread right after the body #}
</article>
{% include "partials/comments.njk" %}
```

Key properties:

- **Placement is the shape's choice.** The partial is position-agnostic — a shape can put
  comments at content-bottom, in a sidebar slot, above a footer, etc. A container shape could
  even place them per-region.
- **Commentable = include the partial; not commentable = omit it.** Reading shapes (`article`,
  and the default `page.njk`) include it; index/utility shapes (`folder-preview`, `rss-feed`)
  omit it. The default `page.njk` is commentable so the "undefined pile" (see ontology) gets
  comments before any shape is declared.
- **The partial self-guards** — it renders nothing unless the site has a `fast-comments-embed`
  snippet *and* the page hasn't set `comments: false`. Including it is always safe (no-op when
  the site has no comments configured).
- **Per-page override:** `comments: false` in frontmatter suppresses comments on any one page.
- **Never on embed fragments:** the embed layout does not include the partial, so `/slug/embed/`
  versions never carry comments.
- The `{{ page_id }}` token inside the snippet resolves to the canonical page ID (and honors the
  `bloob-page-id:` override) — see [`urls-and-ids.md`](urls-and-ids.md).

**How commentability resolves (the fallback chain).** A page's commentability follows the
**effective shape**, resolved in this order:

1. **Explicit `bloob-shape:`** whose layout includes (or omits) the comments partial.
2. **The vault's `default_shape`** (declared in `_bloob-settings.md`) — the fallback shape for
   any page that doesn't declare one. Its layout's choice applies.
3. **`page.njk`** — the ultimate fallback when the effective shape has no built layout (as with
   the not-yet-built `marble` / `note` / `page` / `video` shapes). It is commentable by default,
   so the "undefined pile" gets comments before any shape is built.
4. **Per-page `comments: false`** always wins — it suppresses comments on that page regardless
   of shape.

So a vault steers undefined pages by its `default_shape`, and once that shape is built its layout
(or, later, its manifest flag) decides commentability. Until then the `page.njk` fallback is
commentable, which is the desired default for the current vaults.

**Future formalization (deferred).** Per the three-tier declaration model, a shape could declare
`commentable: true/false` (and a default placement) in its `manifest.json`, read by the layout —
the natural home for this behavior, and the clean way for a vault's `default_shape` to turn
undefined-page comments on or off without touching `page.njk`. Not needed yet: every current
vault wants its default (`page.njk`) pages commentable.

## Shapes vs. callouts — the boundary

`:::` blocks and `>` callouts coexist in the same content; they serve different purposes and don't compete.

- **`:::` shapes** — substantial containers with internal structure, their own placement systems, their own translation functions, their own renderers. A pond, a garden, a foldable, a book, a research-collection.
- **`>` callouts** — small, atomic annotations that decorate prose. A side-note, a warning, a pull-quote, a tip.

**Mental test:** if the thing has internal structure worth declaring (nested items, settings, placement), it is a shape (`:::`). If it is a styled annotation sitting next to prose, it is a callout (`>`).

```
> [!note]
> This is a callout. A styled annotation. Not a shape.

::: foldable
## A section worth collapsing
Content with real internal structure. A shape.
:::
```

Ship a small baseline set of callout types — `note`, `tip`, `warning`, `quote`, `cite` — as styled elements in the base theme, not as registered shapes. If a callout type starts wanting internal structure beyond styled prose, that is the signal to promote it to a shape.

**One observation worth noting:** Obsidian's foldable callouts (`[!note]+` / `[!note]-`) already do the closed/open state move at annotation scale. The `+`/`-` suffix convention in the shape architecture is a direct echo of something Obsidian users already know.

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

**CSS cascade rule — no shorthand properties for theme-overridable values:**
Shape CSS must not use shorthand properties (e.g., `padding: ...`) for any value a theme might need to override individually. Split them into named individual properties with token fallbacks. Without this, a theme's `:root` override of `--article-padding-top` won't apply if the shape's shorthand sets all four padding sides in one declaration — cascade order makes the shorthand win.

```css
/* wrong — shorthand blocks per-property theme overrides */
.article-page {
  padding: var(--article-padding-top, 2.5rem) var(--spacing-md, 1.5rem);
}

/* correct — each property is independently overridable */
.article-page {
  padding-top: var(--article-padding-top, var(--spacing-lg, 2.5rem));
  padding-bottom: var(--spacing-lg, 2.5rem);
  padding-left: var(--spacing-md, 1.5rem);
  padding-right: var(--spacing-md, 1.5rem);
}
```

Similarly, any color that a theme might want to vary per-use should be its own named token with a generic fallback — e.g., `--article-title-color` falling back to `--text-color`. Don't hard-code a single token where a shape-specific override slot is useful.

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

| Shape | Type | Complete? | Builder | Gaps |
|-------|------|-----------|---------|------|
| `article` | layout-only | ✓ | — | First layout-only shape; reference implementation |
| `collection` | hybrid | Partial | — | Phase 1 (metadata mode) shipped: cards, list, slider, bubbles, marbles display modes. Phase 2 (Pagefind full-text) deferred — needs browser testing. No `layout.njk` yet (file-scope use emits runtime placeholder only). |
| `folder-preview` | hybrid + file-scope | ✓ | — | — |
| `foldable` | inline (build-time + runtime) | Not yet built | — | Plan written: `docs/implementation-plans/2026-05-31 Foldable Shape Implementation Plan.md` |
| `garden` | hybrid + file-scope | In progress | ✓ `builder/` | External creator's shape (Odalys Benitez), converted in its own repo — `schema.md` done; renderer + builder in progress. Plan: `bloob-haus-cloud/docs/implementation-plans/2026-07-13_garden-shape-and-builder.md` |
| `rss-feed` | file-scope | Partial | — | Missing `layout.njk`, `schema.md`, `styles.css` |
| `card-preview` | build-time | Partial | — | Missing `schema.md` |
| `checkbox-tracker` | runtime | Partial | — | — |
| `citations` | runtime (CSS-only) | ✓ | — | — |
| `circular-nav` | hybrid | Partial | (in-page `debug: on` mode) | Missing `schema.md` |
| `fridge-magnets` | hybrid | Partial | — | Missing `schema.md` |
| `graph` | hybrid | Partial | — | Missing `schema.md` |
| `heading-and-paragraph` | build-time | Partial | — | Missing `schema.md` |
| `image-grid` | build-time | Partial | — | Missing `schema.md` |
| `image-text` | build-time | ✓ | — | — |
| `ken-burns-zoom` | unknown | Incomplete | planned (its builder is still filed in `lib/magic-machines/` — reclassified in docs, not moved) | Missing `manifest.json` entirely |
| `latex` | runtime | Partial | — | Missing `schema.md` |
| `marble` | — | Not yet built | — | Declared as `default_shape` in marbles vault — will auto-apply layout once shape folder exists |
| `note` | — | Not yet built | — | Used as `bloob-shape: note` in content files — safely falls back to `page.njk` until built |
| `page-preview` | runtime | Partial | — | — |
| `photo-grid` | build-time | Partial | — | — |
| `quotes-stack` | hybrid | Partial | — | Missing `schema.md` |
| `scene-nav` | hybrid | ✓ | ✓ `builder/` (debug-mode overlay; `:::` block + Shopify embed exports; magic machine deleted 2026-07-20) | v2 nested-bullet grammar; code fence deprecated |
| `search` | hybrid | Partial | — | Missing `schema.md` |
| `services` | build-time | Partial | — | Missing `schema.md` |
| `slideshow` | build-time | ✓ | — | — |
| `tags` | hybrid | Partial | — | Missing `schema.md` |
| `testimonials` | hybrid | Partial | — | — |

## The next file-scope shape to convert: rss-feed

`rss-feed` is the only other declared `file-scope` shape. It currently works because users write `layout: layouts/page.njk` explicitly in their frontmatter. Converting it to a proper shape means:

1. Add `layout.njk` to `lib/visualizers/rss-feed/` (inheriting from `base.njk`)
2. Add `"defaultLayout": "layouts/rss-feed.njk"` to its `manifest.json`
3. Add `"filescope": true` to its `manifest.json`
4. Write `schema.md`
5. Users can then drop the `layout:` line from their frontmatter

## Rule: do not convert visualizers wholesale

Convert one shape at a time, starting with shapes that are actively being used as file-scope pages. Inline-only shapes need no conversion beyond documentation gaps. Attempting to convert all shapes at once risks breaking existing content.

---

## User-authored shapes & the marketplace (2026-07-07 — direction settled, mostly not built)

The long-term goal: **anyone (human or AI) can create a shape, test it, publish it, and any other
user can reuse a shape already published on the internet.** This aligns with the core "reuse what
already exists" value and turns a top-down taxonomy into a bottom-up ecology (see the conceptual doc
`bloobhaus-notes/.../2026-05-31-BLOOB-HAUS-SHAPES-ARCHITECTURE.md` → "The vault-local shapes folder
(decided)" and "autopoiesis"). Direction is settled; almost none of it is built. This section records
what to hold true *now* so the future stays cheap. Backend implications live in the Phase-3 doc
(`docs/implementation-plans/phases/phase-3/2026-07-06_webapp-backend-identity-architecture.md` →
"The extensibility & user-authored-code model").

### Naming — settled

Two distinct things, deliberately given coexisting names (a file and a folder can share a stem):

| Name | Kind | Holds |
|------|------|-------|
| `_bloob-shapes.md` | file (registry) | Table mapping `bloob-shape` → metadata (display_name, image, banner_text, description, `fastcomments`, `showvisitorcount`). The `_bloob-types.md` successor — see the bloob-shapes-unification plan. |
| `_bloob-shapes/` | folder (definitions) | One subfolder per shape: `manifest.json`, `schema.md`, renderer JS (`browser.js` / `index.js`), optional `styles.css`, optional `assets/` (shape-shipped static files), optional `builder/` (a self-contained GUI author), optional examples. The vault-local shapes folder. |

*(The conceptual doc calls the folder `/bloob-haus-shapes/`; we standardize on `_bloob-shapes/` to
match the `_bloob-*` system-file convention.)*

### Two authoring paths, one identical structure

A user can create/edit a shape **either** by editing the vault repo on-machine (Claude Code, or hand)
**or** by declaring/uploading it through the webapp UI. Both paths produce the **identical**
`_bloob-shapes/<name>/` layout, and the backend stores it the same way in Object Storage. This
sameness is what lets a shape port cleanly between Repo Mode and the webapp, and lets a shape be a
"folder you can zip, share, fork." **The build pipeline must scan both built-in shapes
(`lib/visualizers/`) and the vault's `_bloob-shapes/` folder** (local shapes win on name collision).
That pipeline scanning is not yet implemented — see open question #7 below and TECH-DEBT.

### The safety model — one hard line

> **User-authored shape code runs client-side only. Build-time renderers (Node, run in *our* build
> job) are reserved for shapes we authored or explicitly approved. Third-party & reused shapes are
> runtime-only (`browser.js`).**

- **Why the split:** `index.js` `transform()` / `renderFilescope()` run in the build job (your
  server). Untrusted build-time code there is the dangerous "run a stranger's server code" class.
  `browser.js` runs in the *visitor's* browser — same trust model as any website's own JS.
- **The one residual risk of reuse:** a shape authored by user A running on user B's site is
  XSS-as-a-service. Mitigate with the approval gate + CSP on hosted pages, and keep reuse
  provenance-visible.
- **Approval gate (V1):** shapes/magic-machines are published via **public GitHub pull request** —
  all code is public and auditable, Leon reviews & merges. A miner or exfil attempt is obvious in a
  diff. No open self-service upload of build-time/server code.
- **Provenance:** the webapp ledger records `author` + `approver` + `visibility` per shape so reuse
  is attributable and revocable.

Full untrusted-**build-time**-code sandboxing (isolated per-tenant jobs, zero ambient credentials) is
a **future TODO**, not needed while the client-side-only line holds.

**Builders sit on the safe side of this line.** A shape builder is client-side — it runs in the
author's browser, same trust model as `browser.js`. The one new surface: a builder that **saves to a
vault** makes authenticated network calls (the draft-to-vault promotion flow). That auth is the
platform's, invoked by the user's *own* session — not third-party code gaining credentials — but it is
why a reused/third-party builder must call only the platform's own save API, never arbitrary endpoints
(enforce with CSP on the builder page).

### `schema.md` is the contract — write the canonical template EARLY

This is the highest-leverage cheap task for the whole ecosystem (it's a template, not code) and it
resolves open question #3 below. It makes shapes human-consistent, AI-authorable, and MCP-wrappable.

- Every shape's `schema.md` follows one template (candidate sections in open question #3).
- **Serve schemas at stable URLs** (e.g. `shapes.bloob.haus/<shape>/schema.md`) so AIs can crawl
  them; expose "how to create a shape" via the **future MCP** — but the truth lives in `schema.md`,
  MCP is a thin wrapper.
- Do this in Phase 2 alongside the bloob-shapes-unification plan, before 20 shapes accrete
  inconsistent schemas.

---

## Open architectural questions (living section — refine as we learn)

These are unresolved by design. Work through them one at a time as shapes are built and real usage makes the right answers clearer. Last touched: 2026-06-05.

### 1. Chrome — what can a shape declare about its frame?

A shape is the painting. The site chrome (nav, footer, site header) is the frame. The painting should have an opinion about its frame — but the theme (the gallery) is ultimately sovereign over what frames it stocks.

**The gap:** shapes currently have no vocabulary for expressing a chrome preference. They either extend `base.njk` (full chrome) or would extend some hypothetical `bare.njk` (no chrome) — an implicit decision, not an explicit one.

**Candidate vocabulary:**
- `chrome: full` — standard nav + footer (default for most shapes)
- `chrome: minimal` — nav only, no footer
- `chrome: none` — bare HTML, no site UI (landing page, immersive canvas)
- `chrome: theme` — whatever the theme defaults to (equivalent to not declaring it)

**Open questions to settle:**
- Where does the chrome preference live? In `manifest.json` as the shape's default, overridable per-page via `:::settings` or frontmatter?
- Is `chrome:` a frontmatter key (page-level decision) or a settings-block key (shape-behavior decision)? Argument for frontmatter: it affects page structure, not just shape rendering. Argument for settings: it's shape-internal configuration.
- When the shape requests `chrome: none` but the theme doesn't support it, what's the fallback? Silent fall-through to full chrome?
- Is "chrome" even the right word user-facing, or is it too jargony?

**First real exercise:** `garden` declares `chrome: none` (a full-bleed, self-contained canvas).
Expect this shape to settle the mechanism.

---

### 2. The three-tier declaration model — who owns what?

There are (or should be) three distinct tiers where shape configuration lives:

| Tier | Where | What it holds | Who sets it |
|------|-------|---------------|-------------|
| Shape-level | `manifest.json` + `schema.md` | Identity, type, chrome preference, content policy, placement system, token deps | Shape creator (you or AI) |
| Instance-level | `:::settings` block | Per-page tuning of shape behavior | Content author |
| Page-level | YAML frontmatter | Stable identity metadata: title, date, tags, author, `bloob-shape:` | Content author |

**The conflict question:** when all three tiers disagree on the same key (e.g., shape default is `chrome: minimal`, page sets `chrome: full`, theme doesn't support `chrome: minimal`), who wins? Current intuition: theme is the final arbiter of what chrome exists; the page's explicit declaration beats the shape's default; unsupported chrome modes silently fall back.

**Open question:** does instance-level (`:::settings`) always beat shape-level default? Or can a shape mark certain settings as non-overridable?

---

### 3. schema.md — canonical template not yet written

Every shape's `schema.md` is the human- and AI-readable contract. For AI to reliably generate valid content for a shape, all `schema.md` files need to follow the same template. Right now they're missing for most shapes, and no canonical template has been written.

**Candidate sections for the template:**
```
## What this shape is
## What goes inside (allowable native contents)
## Settings (table: key / type / default / description)
## Fence format / grammar (shapes with non-trivial body syntax: what each line means)
## Parsing rules (how the shape parses its block — see "Shape-named blocks" above)
## Chrome preference (and override behavior)
## Content policy (override identity vs. preserve identity for contained shapes)
## Placement system (which system, vocabulary, defaults)
## Examples (complete .md file mockups)
## Translation behavior (what happens to non-native content)
## Closed-state visual (how this shape looks as an icon when referenced from elsewhere)
## Builder (does this shape have a GUI author? where it lives, what core it reads/writes)
## Authors (creator name(s) + URL — an array; renders in the shape catalog)
## Assets (static files the shape ships, if any)
```

**Open question:** write the canonical template before building the next shape, or extract it from the first three complete shapes retroactively? Argument for writing it now: prevents inconsistency across 20 shapes. Argument for retroactively: real usage reveals what the template actually needs.

The **fence-grammar** and **parsing-rules** sections were proven necessary by `garden` — the first
shape whose block is not YAML. They were the two things that shape spent the most design effort on,
and the template had no home for either. Garden's `schema.md` is the reference implementation of both.

---

### 4. The settings contract — freeform or enumerated?

Currently `:::settings` is freeform YAML — any key is accepted, invalid keys are silently ignored. This is permissive but produces no feedback when authors make typos or use unsupported keys.

**Open question:** should `schema.md` enumerate all valid settings keys so that invalid ones can be warned on at build time? This would require the preprocessor to validate `shape_settings` against the shape's declared schema. Benefit: better author feedback. Cost: preprocessor needs to load and parse every shape's schema during build — performance and complexity concern.

**Current position:** freeform is fine for now. Revisit when invalid-key mistakes become a real pain point.

---

### 5. Closed-state rendering — deferred, but needs a home in the contract

The conceptual architecture says every shape has two states: open (the full page when visited directly) and closed (the iconified form when referenced via `[[wikilink]]` from another page). Almost all technical work has gone into open-state rendering. Closed state is currently handled by one thing: the wikilink pill (`<a class="internal-link">`).

**The gap:** `manifest.json` and `schema.md` have no fields for closed-state renderer. Nothing in the shape contract says what the shape's closed-state visual looks like. The shape table above only covers open-state completeness.

**Open question:** should closed-state be part of the shape contract now (so shape creators think about it from the start), or deferred until wikilink embedding is built properly? 

**Tentative position:** add a `closed-state visual` section to `schema.md` template now (even if it just says "TBD — uses default wikilink pill"), so the question doesn't get forgotten. Don't implement any renderer yet.

---

### 6. Lineage / shape inheritance — deferred

The conceptual doc mentions shapes can declare what shape they were forked from (`lineage:` in the contract). That's powerful: a `pond-of-marbles` could inherit marble rendering logic without copying it. But this is not in the current technical model at all.

**Current position:** deferred until there are enough shapes built that inheritance would actually reduce duplication. Don't design the mechanism until you have two or three concrete pairs of shapes that would benefit from it.

---

### 7. Making shapes easy for others to create

The longer-term goal is that anyone (human or AI) can create a shape by following a clear pattern. The things that need to exist for that to be true:

- [ ] Canonical `schema.md` template (see question 3)
- [ ] A "shape creator checklist" that covers all three types (inline, layout-only, file-scope) in one place — currently the checklists are scattered
- [ ] At least one complete reference shape per type: `article` (layout-only ✓), need one for inline-only, need one for file-scope
- [ ] `schema.md` filled in for those reference shapes so there's something to imitate
- [ ] Clear documentation of what CSS tokens a shape can safely use (partially done in "Token-based styles.css" above)
- [ ] Documented: how a vault-local shape in `/bloob-haus-shapes/` gets picked up by the build pipeline (not yet implemented — see conceptual doc)

The vault-local shapes folder (defined in the conceptual doc) is the gateway to shapes becoming a community thing. Nothing in the current build pipeline supports scanning a vault's shape folder yet. That's the missing technical piece between "creator" shapes and "user" shapes.
