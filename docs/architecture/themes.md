# Theme Architecture

**Status:** Two themes (`warm-kitchen`, `marbles-pouch` in progress), contract updated
**Location:** `docs/architecture/`
**Updated:** 2026-02-28

Themes control the visual presentation of Bloob Haus sites. This document defines the contract between the build system and theme templates — what data is available, what frontmatter options must be supported, what files a theme must provide, and how themes interact with the Bloob Object system and visualizers.

---

## Theme Location

```
themes/
├── _base/                    ← Shared partials (all themes inherit)
│   └── partials/
│       ├── head.njk          ← <head> tag with meta, OG, CSS includes
│       └── backlinks.njk     ← Backlinks section
├── warm-kitchen/             ← Buffbaby's theme (recipes)
│   ├── layouts/
│   │   ├── base.njk
│   │   └── page.njk
│   ├── partials/
│   │   ├── nav.njk
│   │   ├── footer.njk
│   │   ├── scripts.njk
│   │   └── tags.njk
│   ├── pages/
│   ├── assets/
│   │   ├── css/main.css
│   │   └── objects/          ← Default object-type images for this theme
│   └── theme.yaml
├── marbles-pouch/            ← Leon's marbles theme
│   ├── layouts/
│   ├── partials/
│   │   ├── banner.njk        ← Full-width banner (object-aware)
│   │   ├── banner-modal.njk  ← "What is a [object]?" modal
│   │   ├── footer.njk
│   │   └── scripts.njk
│   ├── pages/
│   ├── assets/
│   │   ├── css/main.css
│   │   └── objects/          ← Default object-type images for this theme
│   └── theme.yaml
└── [future-theme]/
```

---

## Theme Compliance Tiers

Themes must implement Tier 1. Tiers 2 and 3 are optional but should be documented in `theme.yaml`.

### Tier 1 — Required (all themes)
| File | Purpose |
|------|---------|
| `layouts/base.njk` | HTML skeleton |
| `layouts/page.njk` | Default content page |
| `partials/footer.njk` | Site footer |
| `partials/scripts.njk` | JS includes |
| `assets/css/main.css` | Theme stylesheet with CSS custom properties |
| `theme.yaml` | Theme metadata and feature declarations |

### Tier 2 — Standard (strongly recommended)
| File | Purpose |
|------|---------|
| `partials/nav.njk` | Site navigation (omit if theme has no nav) |
| `pages/index.njk` | Homepage |
| `pages/404.njk` | Not found page |
| `pages/tags.njk` | Tag listing |
| `pages/feed.njk` | RSS feed |

### Tier 3 — Optional (theme-specific)
| File | Purpose |
|------|---------|
| `partials/banner.njk` | Full-width banner (object-aware themes) |
| `partials/banner-modal.njk` | "What is a [object]?" modal |
| `assets/objects/` | Default object-type images |

---

## `theme.yaml` — Theme Metadata and Feature Declarations

Every theme must include a `theme.yaml` file declaring its capabilities and default visualizer settings.

```yaml
name: "Marbles Pouch"
description: "A theme for sharing knowledge marbles"
author: "Leon"
version: "1.0.0"

# Features this theme supports
supports:
  banner: true              # Full-width banner on every page
  banner_modal: true        # "What is a [object]?" modal trigger
  nav: false                # No top navigation bar
  card_grid: false          # No card-grid content listing
  backlinks: true
  tags: true
  search: true
  svg_wave_footer: true     # Decorative SVG wave in footer

# Default visualizer settings for this theme
# Users can override in _bloob-settings.md
visualizer_defaults:
  latex: true               # KaTeX enabled by default for this theme
  collapsible-sections: true
  marble-preview: true
  image-zoom: true          # inherited from _base, but can be overridden

# Default object type if _bloob-objects.md is missing or page has no bloob-object
default_object: "note"
```

---

## `_bloob-objects.md` — Object Identity System

**Location:** Content repo root (alongside `_bloob-settings.md`)
**Purpose:** Maps object types to identity images, banner text, and descriptions.

Every markdown note can declare its object type via frontmatter:
```yaml
bloob-object: marble
```

If no `bloob-object` is set, the theme's `default_object` is used.

### `_bloob-objects.md` format

A table in the markdown file body — easily human-editable in Obsidian:

```markdown
---
bloob-settings: objects
---

| object_type | display_name     | image                          | banner_text                        | description                                                        |
|-------------|------------------|--------------------------------|------------------------------------|--------------------------------------------------------------------|
| marble      | Marble           | /assets/objects/marble.png     | Here is a marble for you.          | A marble is a note I want to share and shape with you.             |
| note        | Note             | /assets/objects/note.png       | Here is a note.                    | A sketch, draft, or work in progress.                              |
| letter      | Letter           | /assets/objects/letter.png     | Here is a letter for you.          | A personal letter or message.                                      |
| pouch       | Marble Pouch     | /assets/objects/pouch.png      | Here is a collection of marbles.   | A curated set of marbles on a theme.                               |
| recipe      | Recipe           | /assets/objects/recipe.png     | Here is a recipe for you.          | A recipe from the kitchen.                                         |
| bookshelf   | Bookshelf        | /assets/objects/bookshelf.png  | Here is a bookshelf.               | A collection of books or resources.                                |
```

**Image resolution order** (first match wins):
1. Path in `_bloob-objects.md` table (user override)
2. `themes/[theme]/assets/objects/[object_type].png` (theme default)
3. `themes/_base/assets/objects/[object_type].png` (system fallback)
4. No image (banner renders without image)

### How the preprocessor uses `_bloob-objects.md`

The preprocessor reads this file and makes the object registry available as `src/_data/bloobObjects.json` for templates to consume.

**In templates:**
```njk
{% set obj = bloobObjects[bloob_object] or bloobObjects[site.default_object] %}
<img src="{{ obj.image }}" alt="{{ obj.display_name }}">
<p>{{ obj.banner_text }}</p>
```

---

## Base Layer Features (All Themes)

These features are provided by `_base/` and available to all themes automatically. Themes can override but don't need to implement them.

| Feature | Implementation | Default |
|---------|---------------|---------|
| **Image zoom** | `medium-zoom` JS library (~4KB, zero deps) | **On** (opt-out via `_bloob-settings.md`: `image_zoom: false`) |
| **LaTeX** | KaTeX CDN | Off by default; theme can set `visualizer_defaults.latex: true` |
| **Backlinks** | `partials/backlinks.njk` | On when `features.backlinks: true` in site config |
| **OG meta tags** | `partials/head.njk` | Always on |

### Image zoom CSS custom property contract

Themes that want to style the zoom overlay must define:
```css
:root {
  --zoom-overlay-bg: rgba(0, 0, 0, 0.85);
  --zoom-close-color: #ffffff;
}
```
If not defined, `_base` defaults are used.

---

## Baseline Features Contract

All themes must respect these `features:` flags from `_bloob-settings.md`. A feature is **on by default** unless documented as opt-in.

| Feature key | Default | Description |
|-------------|---------|-------------|
| `features.rss` | `true` | Generate RSS feed at `/feed.xml` |
| `features.sitemap` | `true` | Generate `sitemap.xml` |
| `features.robots_txt` | `true` | Generate `robots.txt` |
| `features.search` | `true` | Pagefind search index + search bar |
| `features.backlinks` | `true` | Show backlinks section on each page |
| `features.og_images` | `true` | Open Graph meta tags for social sharing |
| `features.tags` | `true` | Tag system + tag index pages |
| `features.custom_404` | `true` | Custom 404 page |
| `features.external_links_new_tab` | `true` | Open external links in a new tab (opt-out via `false`) |
| `features.image_zoom` | `true` | Click-to-zoom images (PhotoSwipe or medium-zoom, opt-out) |

These are checked in templates via `site.features.[key]`. The `features` object is written to `src/_data/site.js` at build time by `scripts/assemble-src.js`.

---

## `theme_settings:` Namespace

`theme_settings:` in `_bloob-settings.md` holds theme-specific config that doesn't belong in the baseline `features:` contract. It is separate because different themes may support different keys.

```yaml
theme_settings:
  banner_height: tall       # marbles-pouch specific
  wave_color: "#dce8f8"     # marbles-pouch specific
```

Templates access it via `site.theme_settings.[key]`. `_bloob-settings.md` values for `theme_settings` are deep-merged on top of `sites/*.yaml` defaults by `bloob-settings-reader.js`.

**Rule:** Baseline toggles (on/off for all themes) → `features:`. Theme-specific visual/layout config → `theme_settings:`.

---

## Site Data (Always Available)

These variables come from `_bloob-settings.md` in the content repo, merged with `sites/*.yaml`. Available in all templates via the `site` object.

| Variable | Type | Source | Description |
|----------|------|--------|-------------|
| `site.title` | string | `_bloob-settings.md` → `name` | Site display name |
| `site.description` | string | `_bloob-settings.md` | Site tagline/description |
| `site.url` | string | `sites/*.yaml` | Full URL (e.g., `https://marbles.bloob.haus`) |
| `site.author` | string | `_bloob-settings.md` | Site author name (supports markdown links: `[Name](url)`) |
| `site.languageCode` | string | `_bloob-settings.md` → `language` | Language code (e.g., `en-us`) |
| `site.footer_text` | string | `_bloob-settings.md` | Custom footer message (supports HTML) |
| `site.year` | number | Generated | Current year (for copyright) |
| `site.permalinks.strategy` | string | `_bloob-settings.md` → `permalink_strategy` | `"slugify"` or `"preserve-case"` |
| `site.features` | object | Merged from settings | Feature flags object (see Baseline Features Contract) |
| `site.theme_settings` | object | Merged from settings | Theme-specific config namespace |

---

## Page Data (Per-Page)

These variables come from each page's frontmatter or are computed by Eleventy.

| Variable | Type | Source | Description |
|----------|------|--------|-------------|
| `title` | string | Frontmatter or filename | Page title |
| `description` | string | Frontmatter | Page description (for meta tags) |
| `date` | Date | Frontmatter or git history | Last modified date |
| `tags` | array | Frontmatter + inline tags | Page tags |
| `image` | string | Extracted from content | OG preview image path |
| `page.url` | string | Computed | Page URL path |
| `content` | string | Rendered | Rendered page content (HTML) |
| `bloob_object` | string | Frontmatter `bloob-object:` | Object type (marble, note, letter, pouch…) |

---

## Layout Options (Per-Page Frontmatter)

Themes **must** support these frontmatter options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `hide_nav` | boolean | `false` | Hide the navigation bar |
| `hide_footer` | boolean | `false` | Hide the footer |
| `hide_banner` | boolean | `false` | Hide the banner (if theme has one) |
| `layout` | string | `layouts/page.njk` | Override the layout template |

---

## Collections (Available in Templates)

| Collection | Description | Example usage |
|------------|-------------|---------------|
| `collections.sections` | Top-level content folders | Nav links |
| `collections.tagList` | All unique tags | Tag cloud |
| `collections.withBacklinks` | All pages with backlinks computed | Backlinks section |
| `collections.[sectionName]` | Pages in a specific section | Section index pages |

---

## Bloob Objects Data (Available in Templates)

The processed object registry from `_bloob-objects.md`:

```njk
{# Get current page's object definition #}
{% set obj = bloobObjects[bloob_object] or bloobObjects["note"] %}

{# Use in banner #}
<img src="{{ obj.image }}" alt="{{ obj.display_name }}">
<h4>{{ obj.banner_text }}</h4>

{# Use in modal #}
<p>{{ obj.description }}</p>
```

---

## Visualizers Data

Active visualizers are available via the `visualizers` array (from `_data/visualizers.json`).

| Property | Type | Description |
|----------|------|-------------|
| `visualizers[].name` | string | Visualizer name |
| `visualizers[].hasCss` | boolean | Whether to include CSS |
| `visualizers[].hasJs` | boolean | Whether to include JS |

Themes should include visualizer assets in `partials/scripts.njk`:
```njk
{% for vis in visualizers %}
  {% if vis.hasCss %}<link rel="stylesheet" href="/assets/css/visualizers/{{ vis.name }}.css" />{% endif %}
{% endfor %}
{% for vis in visualizers %}
  {% if vis.hasJs %}<script src="/assets/js/visualizers/{{ vis.name }}.js" defer></script>{% endif %}
{% endfor %}
```

### Visualizer CSS Contract

Visualizers must use CSS custom properties for all colors and spacing, never hardcode theme-specific values. Themes define the variables; visualizers consume them.

**Required CSS variables themes must define** (for visualizers to inherit correctly):
```css
:root {
  /* Core palette — visualizers use these */
  --bg-color: ...;
  --text-color: ...;
  --text-light: ...;
  --accent-color: ...;
  --accent-dark: ...;
  --link-color: ...;
  --border-color: ...;
  --card-bg: ...;

  /* Typography */
  --font-body: ...;
  --font-heading: ...;

  /* Spacing */
  --spacing-xs: ...;
  --spacing-sm: ...;
  --spacing-md: ...;
  --spacing-lg: ...;
  --spacing-xl: ...;
}
```

---

## Collapsible Sections Visualizer

**Syntax in markdown (author-facing):**
```markdown
## > This section is collapsed by default

Content inside collapsed section.

## ^ This section is expanded by default

Content inside expanded section.
```

Both `>` (collapsed) and `^` (expanded) markers are converted by the preprocessor to `<details>`/`<summary>` HTML — the native browser standard for collapsibles. This means:
- No JavaScript required for basic open/close
- Themes can style with CSS only
- Works in Obsidian's HTML preview mode

Themes can style collapsibles via:
```css
details { ... }
details summary { ... }
details[open] { ... }
```

---

## Marble Preview Visualizer

**Syntax in markdown (author-facing):**
```markdown
[preview - Title](FILENAME.md)
[preview:sentences=3 - Title](FILENAME.md)
```

The preprocessor converts this to a preview card HTML block that the `marble-preview` visualizer renders. The card inherits all theme CSS custom properties automatically.

**Preview card uses these theme variables:**
- `--card-bg`, `--border-color`, `--accent-color`, `--text-color`, `--font-body`

---

## Theme-Provided Default Images

Themes can ship default images for the Bloob Object identity system. These are placed in `themes/[name]/assets/objects/` and assembled into `src/assets/objects/` at build time (by `scripts/assemble-src.js`).

**Why this exists:** `_bloob-objects.md` in the vault stores a table of object types with optional image paths. If a user hasn't customized an image (or the field is set to `"default"`), the banner.njk template falls through to the theme's default:

```
Image resolution order:
1. Path in _bloob-objects.md table (explicit user image)
2. "default" or absent → falls through to:
3. /assets/objects/[object_type].png  ← theme provides this
4. No image (banner renders without image)
```

**Rule:** `banner.njk` treats `objData.image == "default"` the same as unset — it falls through to `/assets/objects/[type].png`. This means users can set `image: default` in the table to explicitly use the theme default, or just leave the column empty.

**Implication for theme authors:** A theme that uses the Bloob Object system should provide a PNG for each object type it declares. At minimum, a `marble.png` fallback is expected for the marbles-pouch theme. Images are assembled to `src/assets/objects/` during the build, then passthrough-copied to `_site/assets/objects/`.

**Adding custom images to the vault:** Users can override theme defaults by placing images anywhere in their vault media folder and pointing to them in `_bloob-objects.md`:

```markdown
| marble | Marble | /media/my-custom-marble.png | Here is a marble | ... |
```

---

## Search and Tags as Inline Visualizers

Search and tag cloud widgets can be embedded inline in any markdown page using the standard code fence visualizer syntax — the same pattern as `graph`, `checkbox-tracker`, etc.

**Planned syntax:**

````markdown
```search
placeholder: Search my marbles...
```

```tags
style: cloud
show_count: true
```
````

**How it works (same as graph visualizer):**

1. **Build-time (`index.js`):** Replaces the code fence with a `<div class="search-visualizer" data-search-settings='...'>` (or `tags-visualizer`)
2. **Runtime (`browser.js`):** Mounts the Pagefind UI or tag cloud into the div

**Key design consideration for search:** Pagefind's UI scripts (`/pagefind/pagefind-ui.js`, `/pagefind/pagefind-ui.css`) are generated at build time and must be loaded on the page. The search visualizer's `browser.js` can dynamically inject these script/link tags if they're not already present (detect by checking `window.PagefindUI`).

**Key design consideration for tags:** Tag data is already available as `/tagIndex.json` (generated at build time). The tags visualizer's `browser.js` fetches this and renders the cloud client-side.

**No existing standard yet** — this is the planned approach. The first implementation will establish the pattern. When implemented, `index.njk` should be refactored to use these code fences instead of its current inline HTML.

---

## Creating a New Theme

1. Create folder: `themes/[theme-name]/`
2. Implement all Tier 1 required files
3. Define all required CSS custom properties in `main.css`
4. Create `theme.yaml` with feature declarations and visualizer defaults
5. Add `assets/objects/` with identity images for the object types your theme supports (at minimum: the default object type)
6. Test with a site: `SITE_NAME=my-site npm run build`

**Theme selection:** Set `theme: [theme-name]` in `_bloob-settings.md` in the content repo.

---

## Future Considerations

- **Vault `index.md` as homepage** — if vault root has `index.md`, use its content as homepage body. Theme's `index.njk` checks for this and renders it; search/tags shortcodes let users embed widgets inline. See `IDEAS.md` for full design.
- **Homepage config standard** — currently homepages are hardcoded per theme; a future `_bloob-homepage.md` or frontmatter convention could standardize this
- **Per-page banner override** — `banner_image:` frontmatter to use a custom image for that page's banner
- **Pouch visualizer** — when `bloob-object: pouch`, render outgoing links as a visual marble grid (Phase 4+)
- **Bookshelf visualizer** — when `bloob-object: bookshelf`, render linked notes as books on a shelf (Phase 4+)
- **Dark mode** — site-wide or per-page toggle
- **Theme inheritance** — themes formally extend `_base` with overrides
- **Theme-specific `_bloob-settings.md` fields** — ✅ implemented via `theme_settings:` namespace; themes can declare supported keys in `theme.yaml`

---

## Related Documents

- [Visualizer Architecture](visualizers.md) — How visualizers integrate with templates
- [Search Architecture](search.md) — Search and tag pages
- [Marbles Pouch Theme Plan](../implementation-plans/phases/phase-2/2026-02-28_marbles-pouch-theme.md) — Implementation plan for the marbles theme
