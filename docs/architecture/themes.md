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
│       ├── head.njk              ← <head> tag with meta, OG, CSS includes
│       ├── backlinks.njk         ← Backlinks section
│       ├── photoswipe-head.njk   ← PhotoSwipe CSS link (include in theme head.njk)
│       └── photoswipe-scripts.njk← PhotoSwipe JS init (include in theme scripts.njk)
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
| `assets/css/main.css` | Theme stylesheet — **must declare the visualizer token contract** (see below) |
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
| `assets/css/visualizers/` | Per-visualizer CSS overrides (see "Theme-specific visualizer overrides" below) |

---

## CSS Token Contract — Required in Every Theme's `main.css`

**Every theme must declare these CSS custom property names in `:root`.** All shared visualizers (`checkbox-tracker`, `page-preview`, `graph`, `search`, `testimonials`, etc.) read these exact names. If a theme uses different names internally, add aliases — do not rename the contract tokens.

```css
:root {
  /* === Bloob Haus visualizer token contract ===
     Copy this block into every new theme's main.css.
     Set values to match your theme palette.
     If your theme uses different internal names (e.g. --color-accent),
     alias them: --accent-color: var(--color-accent); */

  --accent-color: #914c9a;        /* Primary brand color — links, highlights, CTAs */
  --accent-dark: #6b2d73;         /* Hover / active variant */
  --bg-color: #dce8f8;            /* Default page background */
  --text-color: #333333;          /* Body text — designed for the PAGE background */
  --text-light: #666666;          /* Secondary / muted text */
  --surface-text-color: #333333;  /* Text on LIGHT surfaces: modals, cards, popovers.
                                     Must be dark enough for contrast on rgba(255,255,255,0.82).
                                     Dark-background themes must set this separately from --text-color
                                     (e.g. melt sets --text-color: #fff but --surface-text-color: #1a0838). */
  --border-color: rgba(0,0,0,0.1);/* Subtle borders */
  --card-bg: #ffffff;             /* Card / panel background */
  --font-body: sans-serif;        /* Body typeface */
  --font-heading: sans-serif;     /* Heading typeface */

  /* Pagefind search UI — required if search is enabled */
  --pagefind-ui-primary: var(--accent-color);
  --pagefind-ui-text: var(--text-color);
  --pagefind-ui-background: var(--card-bg);
  --pagefind-ui-border: var(--border-color);
  --pagefind-ui-tag: var(--bg-color);
  --pagefind-ui-font: var(--font-body);
}
```

**Why this matters:** Visualizer `styles.css` files only use `var(--accent-color)` etc. — they never hardcode hex values. If the theme doesn't declare these names, every visualizer silently falls back to its hardcoded defaults (warm-kitchen's brownish palette), which looks wrong on any other theme.

**Melt note:** Melt uses `--color-*` naming internally. The contract tokens are declared as aliases in its `:root`:
```css
--accent-color: var(--color-accent);
--bg-color: var(--color-bg);
/* etc. */
```
This is the right pattern when a theme has its own internal naming convention.

**Reference:** The full rationale and load order is in `docs/architecture/visualizers.md` under "CSS Token Standard".

### Article-shape sizing tokens (optional — fall back to sane defaults)

The shared `article` shape (`lib/visualizers/article/styles.css`, used by any page with
`bloob-shape: article`) reads its **font sizes and body leading from tokens**, each with a
built-in fallback. A theme that sets none of them gets the shared defaults below and looks
fine. But because typefaces differ in apparent size (a face with a tall x-height — e.g.
Satoshi — reads larger than its nominal `1rem`), **a new theme should review these and set
the ones that need tuning to suit its body font.** They are optional, not required: omit a
token and the shape uses its fallback.

```css
:root {
  /* Article shape — sizing (optional; shown values are the shared fallbacks) */
  --article-title-size:       clamp(1.75rem, 4vw, 2.6rem); /* header title */
  --article-subtitle-size:    clamp(1rem, 2vw, 1.15rem);   /* header subtitle */
  --article-body-size:        1rem;                        /* base reading size (p, li, quotes) */
  --article-body-line-height: 1.7;                         /* leading for p (li fallback is 1.65) */
  --article-h1-size:          clamp(1.55rem, 3.5vw, 2rem); /* in-body headings ↓ */
  --article-h2-size:          clamp(1.25rem, 3vw, 1.65rem);
  --article-h3-size:          1.2rem;
  --article-h4-size:          1rem;
  --article-h5-size:          0.9rem;
  --article-h6-size:          0.82rem;
}
```

Title/subtitle *colors* are tuned separately via `--article-title-color` /
`--article-subtitle-color` (default to `--text-color`). `alter-engineers` is the reference
implementation — see its `main.css` `:root` for a worked example (it nudges `--article-body-size`
down to `0.95rem` and tightens leading to `1.6` to compensate for Satoshi's x-height).

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
| **Image zoom** | PhotoSwipe 5 via `_base/partials/photoswipe-*.njk` — include both partials in your theme (see below) | **On** (opt-out via `image_zoom: false` in `theme.yaml` or site yaml) |
| **LaTeX** | KaTeX CDN | Off by default; theme can set `visualizer_defaults.latex: true` |
| **Backlinks** | `partials/backlinks.njk` | On when `features.backlinks: true` in site config |
| **OG meta tags** | `partials/head.njk` | Always on |

### Search bar CSS contract

Themes load `/pagefind/pagefind-ui.css` in `head.njk` when `features.search != false`. Theme styling uses CSS custom properties in `main.css`:

```css
:root {
  --pagefind-ui-primary: ...;     /* accent color */
  --pagefind-ui-text: ...;        /* result text */
  --pagefind-ui-background: ...;  /* widget background */
  --pagefind-ui-border: ...;      /* input border */
  --pagefind-ui-tag: ...;         /* tag chip background */
  --pagefind-ui-font: ...;        /* font family */
}
```

Additional overrides can target `.pagefind-ui__*` class selectors. The search visualizer uses `resetStyles: false` so Pagefind's built-in styles apply and CSS variables work. The `browser.js` never touches CSS — that's the theme's job.

### Image zoom (PhotoSwipe) — how to include in a new theme

Two base partials provide the full PhotoSwipe 5 lightbox. Include both in your theme:

**In `partials/head.njk`** (inside `<head>`, after theme CSS):
```njk
{% include "partials/photoswipe-head.njk" %}
```

**In `partials/scripts.njk`** (at the bottom, after visualizer scripts):
```njk
{% include "partials/photoswipe-scripts.njk" %}
```

That's it. The partials are gated on `{% if site.features.image_zoom != false %}` — set `image_zoom: false` in `theme.yaml` or the site's yaml to disable.

**What the shared partial does:**
- Loads PhotoSwipe 5 CSS + JS from CDN (no build step)
- Activates on any `<a class="pswp-gallery__item">` inside `<article>`
- Reads natural image dimensions from the thumbnail already in the DOM (so the renderer doesn't need to know dimensions at build time)
- Caps zoom at 100% natural size — low-res images are never upscaled
- Adds an "open full resolution" button to the lightbox toolbar

**To make an image open in the lightbox:** wrap it in `<a class="pswp-gallery__item" href="/path/to/image.jpg">`. The `photo-grid` visualizer does this automatically. For regular markdown images, wrap manually or use a custom renderer.

**To opt an image out:** add `class="no-zoom"` to the `<a>` tag.

### Color Pair Contract (Tier 1 — required)

Every theme's `main.css` must define `bg-*` color pair classes with four CSS custom properties per token. This is the theme's **design token source of truth** — the equivalent of a brand spec in code.

```css
/* Each token declares four color roles: */
.bg-[token] {
  --pair-bg:    /* section background */;
  --pair-title: /* h1–h4 heading color */;
  --pair-text:  /* body text (p, li) color */;
  --pair-label: /* small label (.label class) — teal on dark, accent on light */;
}
```

**Why four roles, not three:** Labels (section markers like "OUR SOLUTIONS", "MUSINGS") are visually distinct from headings. On dark/orange backgrounds, headings stay white but labels use the brand teal `#b6fad1` for hierarchy. Collapsing label into title would lose this distinction.

**Fallback:** `.label { color: var(--pair-label, var(--accent-color)); }` — when no bg token is active (default white page), labels fall back to the brand accent color automatically.

**Usage in visualizer renderers:** `resolveBg(settings)` returns the `bg-*` class; the four custom properties cascade to all child elements. No hardcoded colors in visualizer CSS.

**Usage in markdown:**
```
::: image-text bg=orange   → sets all four --pair-* vars for that section
::: heading-and-paragraph  → no bg, falls back to defaults
```

### `.button` CSS class contract (Tier 1 — required)

Every theme **must** define a `.button` class in its `main.css`. This is the universal CTA button style, applied in markdown via `markdown-it-attrs`:

```markdown
[CONTACT US](#footer){.button}
[READ MORE](/projects){.button}
```

Which renders as:
```html
<a href="#footer" class="button">CONTACT US</a>
```

In Obsidian, `{.button}` is ignored — the link renders normally. In Eleventy, `markdown-it-attrs` applies the class at build time.

**Contract:** `.button` must be defined in every theme's `main.css`. The visual treatment is theme-specific. Authors can extend with additional classes: `{.button .button-outline}`, `{.button .button-sm}`, etc.

**Minimum required definition:**
```css
.button {
  display: inline-block;
  padding: 0.5rem 1.25rem;
  font-weight: 700;
  text-transform: uppercase;
  text-decoration: none;
  /* brand colors — theme's choice */
  color: var(--accent-color);
  border: 2px solid var(--accent-color);
  transition: all 0.2s ease;
}
.button:hover {
  background: var(--accent-color);
  color: #ffffff;
}
```

**alter-engineers** theme: mint/teal background (`#b6fad1`) with purple text, sliding to purple background on hover (matches original site `image-text__contact-us` style).

**warm-kitchen / marbles-pouch** themes: add `.button` definitions to their `main.css` following this contract when needed.

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

### Theme-specific visualizer overrides

A theme can ship per-visualizer CSS files that load **after** the shared visualizer stylesheets. Place them in:

```
themes/[theme-name]/assets/css/visualizers/[visualizer-name].css
```

`assemble-src.js` Step 6.5 auto-discovers these files and copies them to `src-*/assets/css/theme-visualizers/`. `head.njk` emits their `<link>` tags after the shared visualizer CSS so specificity-equal rules override correctly.

Use this for theme personality on top of shared components — e.g., making `.fp-card__title` orange in the AE theme while keeping the shared layout in `lib/visualizers/folder-preview/styles.css`. Keep overrides minimal: only properties that differ from the shared baseline.

Full details in [visualizers.md → Theme-specific visualizer CSS overrides](visualizers.md).

### Visualizer CSS Contract

Visualizers must use CSS custom properties for all colors and spacing, never hardcode theme-specific values. Themes define the variables; visualizers consume them.

**Two tiers of tokens:**

**Tier 1 — Universal CSS variables (required).** Every visualizer uses these. Omitting one breaks affected visualizers.

```css
:root {
  --accent-color: ...;   /* primary brand color */
  --accent-dark: ...;    /* darker hover/active variant */
  --bg-color: ...;       /* default page background */
  --text-color: ...;     /* body text */
  --text-light: ...;     /* secondary/muted text */
  --border-color: ...;   /* subtle borders */
  --card-bg: ...;        /* card/panel backgrounds */
  --font-body: ...;
  --font-heading: ...;
  --spacing-xs … --spacing-xl: ...;
}
```

**Tier 2 — Theme-specific accent colors (optional).** Used for internal element styling (e.g. a name pill, icon tint). Visualizers reference these with a fallback so they degrade gracefully if undefined.

```css
:root {
  --color-mint: ...;    /* soft brand tint — e.g. testimonials name pill text */
  --color-orange: ...; /* bold brand color — e.g. testimonials name pill bg */
}
```

---

### Semantic Color Pair Contract (Tier 1 — Required)

Visualizer **default backgrounds** use semantic pair names so they work across any theme. Visualizers never reference theme-specific color names (`green`, `orange`).

Every theme **must** define these six semantic `.bg-*` classes:

| Class | Role | AE value |
|---|---|---|
| `.bg-light` | Soft, brand-tinted section background | `#b6fad1` (mint) |
| `.bg-featured` | Bold / hero section background | `#e0643d` (orange) |
| `.bg-dark` | Dark background | `#1a1a1a` |
| `.bg-accent` | Brand primary color as background | `var(--accent-color)` |
| `.bg-muted` | Neutral off-white | `#f5f5f5` |
| `.bg-default` | Plain white | `#ffffff` |

Each class sets four CSS custom properties:
```css
.bg-light {
  --pair-bg:    ...;  /* section background */
  --pair-title: ...;  /* h1–h4 heading color */
  --pair-text:  ...;  /* body text color */
  --pair-label: ...;  /* .label marker color */
}
```

Themes may add any **named pairs** beyond these (`bg-green`, `bg-orange`, `bg-teal`) for author use in `bg=` fences — but visualizer defaults only ever reference the six semantic names.

**How visualizers declare a default background:**

```js
// renderer.js — visualizer says "I want a light background by default"
const { extraClass, style } = resolveBg(settings, "light");
// author can override: ::: testimonials bg=dark
```

This means:
- The visualizer never hardcodes a color value
- Authors can override the default with `bg=` on the `:::` fence
- A new theme just defines `.bg-light` / `.bg-featured` with its own brand colors

---

### Color Pair Contract (Tier 1 — Required)

Every theme must implement the **color pair system** for section background tokens. Visualizers use `resolveBg()` from `lib/visualizers/_utils/bg-color.js` which emits either a `.bg-*` class (named token) or inline `style=` (hex). The theme's CSS must handle both paths.

**Required: define `--pair-bg`, `--pair-title`, `--pair-text` per token, then apply universally.**

Minimum implementation for any theme's `main.css`:

```css
/* 1. Define pairs per token */
.bg-white  { --pair-bg: #ffffff;             --pair-title: var(--text-color);   --pair-text: var(--text-color); }
.bg-muted  { --pair-bg: #f5f5f5;             --pair-title: var(--text-color);   --pair-text: var(--text-color); }
.bg-green  { --pair-bg: #b6fad1;             --pair-title: var(--accent-color); --pair-text: var(--accent-color); }
.bg-dark   { --pair-bg: #1a1a1a;             --pair-title: #ffffff;             --pair-text: #ffffff; }
.bg-accent { --pair-bg: var(--accent-color); --pair-title: #ffffff;             --pair-text: #ffffff; }

/* 2. Apply universally */
.bg-white, .bg-muted, .bg-green, .bg-dark, .bg-accent {
  background: var(--pair-bg) !important;
  color: var(--pair-text);
}
.bg-white h1, .bg-white h2, .bg-white h3, .bg-white h4,
.bg-muted  h1, .bg-muted  h2, .bg-muted  h3, .bg-muted  h4,
.bg-green  h1, .bg-green  h2, .bg-green  h3, .bg-green  h4,
.bg-dark   h1, .bg-dark   h2, .bg-dark   h3, .bg-dark   h4,
.bg-accent h1, .bg-accent h2, .bg-accent h3, .bg-accent h4 {
  color: var(--pair-title);
}
```

**For hex inline styles** (when user writes `bg=#1a1a1a color=#ffffff`): `resolveBg()` emits `style="background:#1a1a1a;color:#fff;--pair-title:#fff;--pair-text:#fff"`. The heading cascade rule `h1 { color: var(--pair-title) }` should be globally defined so it works inside inline-styled sections too:

```css
/* Global fallback — headings inherit --pair-title if set */
h1, h2, h3, h4 {
  color: var(--pair-title, var(--text-color));
}
```

**Theme implementation status:**
| Theme | `.bg-*` pairs | apply rules | global h cascade |
|-------|--------------|-------------|------------------|
| `alter-engineers` | ✓ | ✓ | (inherits from theme.min.css) |
| `marbles-pouch` | ✗ not yet | ✗ | ✗ |
| `warm-kitchen` | ✗ not yet | ✗ | ✗ |

See `docs/architecture/settings-registry.md` → "bg= / color= — Section Color Pairs" for full usage docs and fence syntax.

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
6. Add PhotoSwipe includes to your theme partials (see "Image zoom" under Base Layer Features above)
7. Test with a site: `SITE_NAME=my-site npm run build`

**Theme selection:** Set `theme: [theme-name]` in `_bloob-settings.md` in the content repo.

### Section pages: content always wins

Themes can ship default section index pages (e.g. `pages/sections/recipes/index.njk`) to give folder listing pages a nice layout out of the box. But if the content vault provides its own `index.md` for that folder, **content wins** — the theme's `index.njk` is automatically removed after preprocessing.

This is handled by a cleanup pass in `build-site.js` (between preprocess and OG image generation): any `src/[folder]/index.njk` that has a corresponding `src/[folder]/index.md` is deleted. The same cleanup is not yet in `dev-local.js` — if you hit a `DuplicatePermalinkOutputError` in dev, that's why.

**Implication for theme authors:** Do not put critical logic (visualizer fences, data fetching) inside section `index.njk` files. If a user provides their own index, your section page silently disappears. Section pages are default fallbacks only — treat them as optional decoration, not load-bearing structure.

**Which themes are affected:** Only warm-kitchen has section pages today (`notes/`, `recipes/`, `resources/`, `lists-of-favorites/`). marbles-pouch and alter-engineers have no section pages so they never encounter this.

---

## Future Considerations

- **Vault `index.md` as homepage** — ✅ implemented. Root and subfolder `index.md` files override the theme's index template. Preprocessor auto-injects all required Eleventy frontmatter (no YAML needed from the user). Use ` ```search ``` ` code fence to embed search. A `folder-contents` code fence (to replace the Nunjucks for loop) is deferred to later — see `IDEAS.md`.
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
