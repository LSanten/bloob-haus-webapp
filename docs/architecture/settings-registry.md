# Settings & Capabilities Registry

**Purpose:** Authoritative developer reference for all settings and capabilities in Bloob Haus — both universal (all themes must implement) and theme-specific. When adding a new setting or wiring in a shared capability, document it here.

**Two kinds of entries:**
- **Settings** — frontmatter or `_bloob-settings.md` flags that control behavior (e.g. `hide_nav`)
- **Capabilities** — features built into the shared pipeline that every theme must wire in (e.g. PhotoSwipe image zoom). These are not optional — a theme that skips them is incomplete.

**User-facing settings** live in `_bloob-settings.md` in each content repo. This file is the *developer* reference: what exists, what scope it has, which themes implement it, and HOW to wire it into a new theme.

**Last Updated:** 2026-03-23

---

## Universal Settings (All Themes)

These settings work identically across every theme. They are part of the Bloob Haus theme contract.

### Per-Page Frontmatter

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `hide_nav` | bool | `false` | Hide the site navigation bar on this page |
| `hide_footer` | bool | `false` | Hide the site footer on this page |
| `body_class` | string | — | Extra CSS class(es) added to `<body>` |
| `layout` | string | layout from bloob-object or `layouts/page.njk` | Override Eleventy layout explicitly |
| `bloob-object` | string | — | Object type for this page (e.g. `project-profile`). Controls layout and graph icon. Defined in `_bloob-objects.md`. |

### Site-Wide (features: in _bloob-settings.md)

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

| Setting | Type | Default | Scope | Description |
|---------|------|---------|-------|-------------|
| `theme_settings.banner_height` | string | `normal` | Site-wide | Banner height variant (`tall`, `normal`, `short`) |
| `theme_settings.wave_color` | color | — | Site-wide | SVG wave color in footer |

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
