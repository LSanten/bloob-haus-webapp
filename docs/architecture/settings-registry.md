# Settings & Capabilities Registry

**Purpose:** Authoritative developer reference for all settings and capabilities in Bloob Haus — both universal (all themes must implement) and theme-specific. When adding a new setting or wiring in a shared capability, document it here.

**Two kinds of entries:**
- **Settings** — frontmatter or `_bloob-settings.md` flags that control behavior (e.g. `hide_nav`)
- **Capabilities** — features built into the shared pipeline that every theme must wire in (e.g. PhotoSwipe image zoom). These are not optional — a theme that skips them is incomplete.

**User-facing settings** live in `_bloob-settings.md` in each content repo. This file is the *developer* reference: what exists, what scope it has, which themes implement it, and HOW to wire it into a new theme.

**Last Updated:** 2026-04-21

---

## Universal Settings (All Themes)

These settings work identically across every theme. They are part of the Bloob Haus theme contract.

### Per-Page Frontmatter

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `hide_nav` | bool | `false` | Hide the site navigation bar on this page |
| `hide_footer` | bool | `false` | Hide the site footer on this page |
| `body_class` | string | — | Extra CSS class(es) added to `<body>` |
| `layout` | string | layout from `bloob-type` or `layouts/page.njk` | Override Eleventy layout explicitly (rarely needed — prefer `bloob-type`) |
| `bloob-type` | string | — | Content type for this page (e.g. `note`, `guide`). Controls layout, graph icon, and banner display. Defined in `_bloob-types.md`. Alias: `bloob-object` (legacy). |
| `description` | string | — | Page-level SEO description for `<meta name="description">` and OG tags. Falls back to `site.description` when absent. Only set when the page deserves a distinct description. |
| `author` | string | — | Attribution name rendered as "By [author]" below the page title. |
| `website_status` | string | `public` (when absent) | Publish visibility for this page. One of `draft` / `unlisted` / `archived` / `public`. Only active when `publish_mode: status_field` is set in `_bloob-settings.md`. See status matrix below. |
| `transclusion_indicators` | bool | `true` (or site-wide default) | When `false`, `![[embeds]]` are inlined seamlessly with no wrapper div. When `true`, embeds are wrapped in `<div class="transclusion-embed">` so themes can add a visual indicator. Overrides `features.transclusion_indicators` from `_bloob-settings.md`. |

#### Optional display fields (not in standard YAML, no UI prompt)

| Field | Description |
|-------|-------------|
| `byline` | Freeform attribution string displayed as-is below the title — use when you need full control over the attribution line (e.g. "In collaboration with X and Y"). Takes precedence over `author` if both are set. No "By" prefix is added. |

#### Preprocessor-injected fields (set automatically — do not set in content files)

| Field | Type | Set by | Description |
|-------|------|--------|-------------|
| `is_folder` | bool | `preprocess-content.js` | `true` on folder index files (`resources/index.md`). Used by `page.njk` to emit a trailing `/` on the `ID:` body search span so search results show `resources/` not `resources`. |
| `slug` | string | `preprocess-content.js` | URL slug derived from filename. For folder index files, set to the parent folder name (not "index"). |
| `slug_spaced` | string | `preprocess-content.js` | Space-separated version of the slug (e.g. `"contact us"` for `contact-us`). Emitted as a separate hidden span so multi-word queries like "contact us" still match the slug. |

#### `website_status` — Status Matrix

Requires `publish_mode: status_field` in `_bloob-settings.md`. Field absent = `public`.

| Value | Built | Direct URL | Google-indexable | `sitemap.xml` | Internal search | Card/folder previews | `graph.json` |
|-------|-------|------------|-----------------|---------------|-----------------|---------------------|--------------|
| `draft` | No | No | — | No | No | No | No |
| `unlisted` | Yes | Yes | No (`noindex`) | No | No | No | No |
| `archived` | Yes | Yes | Yes | Yes | No | No | Yes (with field) |
| `public` | Yes | Yes | Yes | Yes | Yes | Yes | Yes |

**Theme wiring required (per-theme, not automatic):**
- `partials/head.njk` — add `<meta name="robots" content="noindex">` when `website_status == "unlisted"`
- `layouts/base.njk` (or equivalent) — add `data-pagefind-ignore` on main content wrapper when `website_status` is `unlisted` or `archived`
- `pages/sitemap.njk` — filter out `website_status == "unlisted"` entries

**Theme implementation status:**
| Theme | noindex | pagefind-ignore | sitemap filter |
|-------|---------|-----------------|----------------|
| `alter-engineers` | ✓ | ✓ | ✓ |
| `marbles-pouch` | — | — | — |
| `warm-kitchen` | — | — | — |

### Site-Wide (top-level keys in `_bloob-settings.md`)

#### Logo & Favicon

| Key | Type | Description |
|-----|------|-------------|
| `logo` | string | Site logo — used in nav and as favicon source if `favicon` is not set |
| `favicon` | string | Favicon source image — takes priority over `logo` for favicon generation. Generates `favicon.png` (64×64) and `apple-touch-icon.png` (310×310) |

Both fields accept the same value formats:
- `"[[filename.png]]"` — wiki-link (resolves to `/media/filename.png`)
- `"[](media/filename.png)"` or `"[label](path/to/file.png)"` — markdown link (path kept as-is, prefixed with `/` if relative)
- `"plain/path.png"` — plain path (passed through unchanged)

#### Publish Mode

| Key | Values | Description |
|-----|--------|-------------|
| `publish_mode` | `blocklist` (default) / `allowlist` / `status_field` | How the pipeline decides which files to build |
| `blocklist_tag` | tag string | Used when `publish_mode: blocklist`. Files tagged with this are excluded. |
| `status_field` | field name (default `website_status`) | Used when `publish_mode: status_field`. Which frontmatter field to read. |

Documented in full in `docs/architecture/themes.md` → "Baseline Features Contract". Quick reference:

| Key | Default | Description |
|-----|---------|-------------|
| `features.backlinks` | `true` | Backlinks section on each page |
| `features.search` | `true` | Pagefind search |
| `features.rss` | `true` | RSS feed |
| `features.sitemap` | `true` | sitemap.xml |
| `features.og_images` | `true` | OG preview image generation |
| `features.tags` | `true` | Tag system |
| `features.image_zoom` | `true` | PhotoSwipe click-to-zoom (see wiring guide below) |
| `features.magic_machines` | `true` | Serve magic machine GUI tools at `/magic-machine/*`; disable for client/professional sites |
| `features.transclusion_indicators` | `true` | Site-wide default for transclusion indicator display. When `false`, all `![[embeds]]` across the site are inlined seamlessly. Override per-page with `transclusion_indicators:` frontmatter. |

#### Media Processing

| Key | Default | Description |
|-----|---------|-------------|
| `media.convert_gif_to_mp4` | `true` | Auto-convert GIF files to MP4 at build time. GIFs are removed from the deployed output; photo-grid renders them as `<video autoplay loop muted playsinline>`. Videos play in the PhotoSwipe lightbox when clicked. On iOS Low Power Mode where autoplay is blocked, a ▶ play overlay appears; a "Play all animations" button is injected if any videos are paused. Set to `false` to keep GIFs rendered as `<img>` tags. |

---

## Universal Capabilities — Theme Wiring Guide

These are shared pipeline features that every theme **must** wire in. The pipeline generates the correct HTML (e.g. `<a class="pswp-gallery__item">` wrappers on images) but the theme controls whether the client-side library loads. A theme that omits these will silently produce non-functional output.

### `features.image_zoom` — PhotoSwipe click-to-zoom

The image optimizer (`eleventy.config.js`) automatically wraps `/media/` images in `<a class="pswp-gallery__item" data-pswp-*="...">`. The theme must load the PhotoSwipe library to activate them.

**Every theme's `partials/head.njk` must include:**
```njk
{% if site.features.image_zoom != false %}
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/photoswipe@5.4.4/dist/photoswipe.css" />
{% endif %}
```

**Every theme's `partials/scripts.njk` must include:**
```njk
{# Image zoom — PhotoSwipe 5, on by default (opt-out via features.image_zoom: false) #}
{# CSS is loaded in head.njk. JS uses ES modules (no build step needed). #}
{% if site.features.image_zoom != false %}
<script type="module">
  import PhotoSwipeLightbox from 'https://cdn.jsdelivr.net/npm/photoswipe@5.4.4/dist/photoswipe-lightbox.esm.js';
  const lightbox = new PhotoSwipeLightbox({
    gallery: 'article',           // scope to <article> wrapping page content
    children: 'a.pswp-gallery__item',
    pswpModule: () => import('https://cdn.jsdelivr.net/npm/photoswipe@5.4.4/dist/photoswipe.esm.js'),
    wheelToZoom: true,
    bgOpacity: 0.88,
  });
  {# Custom button: open original full-resolution image in new tab #}
  lightbox.on('uiRegister', function () {
    lightbox.pswp.ui.registerElement({
      name: 'open-original', title: 'Open full resolution image',
      order: 9, isButton: true,
      html: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
      onClick: (event, el, pswp) => {
        const original = pswp.currSlide.data.element?.dataset?.original;
        if (original) window.open(original, '_blank');
      }
    });
  });
  lightbox.init();
</script>
{% endif %}
```

**Theme implementation status:**
| Theme | head.njk | scripts.njk |
|-------|----------|-------------|
| `marbles-pouch` | ✓ | ✓ |
| `alter-engineers` | ✓ | ✓ |
| `warm-kitchen` | ✗ missing | ✗ missing |

### `bg=` / `color=` — Section Color Pairs

Any `:::` visualizer fence that accepts a `bg=` parameter uses the shared **color pair system** (`lib/visualizers/_utils/bg-color.js`). This system maps a background token or hex value to a coordinated background + text + heading color set.

**Named tokens** → resolved to a `.bg-*` CSS class. The class sets four CSS custom properties defined in the theme's `main.css`:

| Token | Background | `--pair-title` | `--pair-text` | `--pair-label` |
|-------|-----------|----------------|---------------|----------------|
| `white` | `#ffffff` | `--text-color` | `--text-color` | `--accent-color` (purple) |
| `muted` | `#f5f5f5` | `--text-color` | `--text-color` | `--accent-color` (purple) |
| `green` | `#b6fad1` | `--accent-color` | `--accent-color` | `--accent-color` (purple) |
| `dark` | `#1a1a1a` | `#ffffff` | `#ffffff` | `#b6fad1` (teal) |
| `accent` | `--accent-color` | `#ffffff` | `#ffffff` | `#b6fad1` (teal) |
| `orange` | `#e08a37` | `#ffffff` | `#ffffff` | `#b6fad1` (teal) |

**`--pair-label`** is used by `.label { color: var(--pair-label, var(--accent-color)) }` so section labels (e.g. "ARTICLES", "OUR PARTNERS") automatically pick the right contrast color for the background without per-section overrides.

**Custom hex** → emits `style="background:#…;color:#…;--pair-title:#…;--pair-text:#…"` inline, bypassing the class system. The same CSS variable names are used so heading/text cascade works identically.

**Fence syntax examples:**
```
::: heading-and-paragraph bg=green          → named token, .bg-green class
::: services bg=dark                        → named token, .bg-dark class
::: heading-and-paragraph bg=#1a1a1a        → hex bg only (text inherits)
::: heading-and-paragraph bg=#1a1a1a color=#ffffff  → full custom pair
```

**How `resolveBg()` works (for renderer authors):**
```js
import { resolveBg } from "../_utils/bg-color.js";
const { extraClass, style } = resolveBg(settings);
const styleAttr = style ? ` style="${style}"` : "";
return `<section class="my-section${extraClass}"${styleAttr}>...</section>`;
```

**Theme contract:** Every theme must define `--pair-bg`, `--pair-title`, `--pair-text` for each `.bg-*` token class and apply them universally (see `themes.md` → Color Pair Contract). The apply rules look like:
```css
.bg-white, .bg-muted, .bg-green, .bg-dark, .bg-accent {
  background: var(--pair-bg) !important;
  color: var(--pair-text);
}
.bg-white h1, .bg-white h2, ... { color: var(--pair-title); }
```

**Visualizers that support `bg=` / `color=`:**
| Visualizer | bg= | color= |
|-----------|-----|--------|
| `heading-and-paragraph` | ✓ | ✓ |
| `services` | ✓ | ✓ |
| `image-text` | ✓ | ✓ |
| `slideshow` | ✓ | ✓ |
| `folder-preview` (slider-cards only) | ✓ | ✓ |

---

## Visualizer Settings

Settings that apply to specific visualizers regardless of theme.

### `quotes-stack` code fence

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `limit` | int | `null` (show all) | Max cards visible before "MORE MUSINGS" button |
| `infinite_scroll` | bool | `true` | When `false`, Swiper stops at the last card instead of looping. Swiper is always rendered; this only controls `loop`. |
| `quotes[].quote` | string | — | Quote text |
| `quotes[].name` | string | — | Speaker name |
| `quotes[].date` | string | — | Display date |
| `quotes[].color` | string | — | Card color variant (`red`, `white`, `green`) |

### `folder-preview` code fence

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `folder` | string | (from URL path) | Folder name to list pages from. Required on homepage (URL-based detection fails on `/`). |
| `sort` | string | `alpha` | Sort order: `alpha`, `reverse-alpha`, `recent` |
| `limit` | int | `∞` | Max number of pages to show |
| `style` | string | `list` | Layout: `list` (default) or `slider-cards` (Swiper carousel) |
| `title` | string | `ARTICLES` | Section label shown above slider-cards |
| `id` | string | `articles` | HTML `id` on the section element (slider-cards only) |
| `bg` | token/hex | — | Background color for slider-cards section. Supports named tokens and hex. (slider-cards only) |
| `color` | hex | — | Foreground color override (hex). Used with `bg=hex`. (slider-cards only) |

---

## Theme-Specific Settings

### alter-engineers

Settings that only exist in the `alter-engineers` theme. They have no effect on other themes.

#### Per-Page Frontmatter

| Setting | Type | Default | Scope | Description |
|---------|------|---------|-------|-------------|
| `hide_more_projects` | bool | `false` | `layouts/project.njk` only | Hide the "More Projects" Swiper carousel at the bottom of project pages |

#### Notes

- `hide_nav` and `hide_footer` are universal (defined above) and fully implemented in `themes/alter-engineers/layouts/base.njk`
- Bloob-object `project-profile` maps to `layouts/project.njk` via `_bloob-objects.md` in the content repo

---

## warm-kitchen

No theme-specific page-level settings beyond the universal contract.

---

## marbles-pouch

#### Per-Page Frontmatter

| Setting | Type | Default | Scope | Description |
|---------|------|---------|-------|-------------|
| `date_created` | string | — | `layouts/page.njk` | Creation date pill shown above content. Format: `YYYY-MM-DD` or `YYYY-MM-DD, Custom label`. Label defaults to "Started on". |

#### Site-Wide

| Setting | Type | Default | Scope | Description |
|---------|------|---------|-------|-------------|
| `theme_settings.banner_height` | string | `normal` | Site-wide | Banner height variant (`tall`, `normal`, `short`) |
| `theme_settings.wave_color` | color | — | Site-wide | SVG wave color in footer |

---

## melt

#### Per-Page Frontmatter

| Setting | Type | Default | Scope | Description |
|---------|------|---------|-------|-------------|
| `date_created` | string | — | `layouts/page.njk` | Creation date pill shown in page header. Format: `YYYY-MM-DD` or `YYYY-MM-DD, Custom label`. Label defaults to "Written on". |

---

## Adding a New Setting or Capability

**New setting (page-level or site-wide):**
1. Implement it in the relevant layout/partial
2. Add a row under the correct theme section (or Universal if it applies to all)
3. If site-wide, also update `_bloob-settings.md` in the affected content repos
4. Note in `CHANGELOG.md`

**New universal capability (pipeline generates output, theme activates it):**
1. Add the pipeline-side generation to `eleventy.config.js`
2. Add the wiring snippet to this file under "Universal Capabilities"
3. Implement in ALL existing themes, updating the status table
4. Note in `CHANGELOG.md`

**Rule of thumb:**
- `{% if site.theme_settings.X %}` or `{% if X %}` in a layout and it's theme-specific → per-theme table
- Pipeline generates HTML structure but needs a JS/CSS library to work → Universal Capabilities section
- Works automatically with no client-side code → Universal Settings table
