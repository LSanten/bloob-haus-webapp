# Settings Registry

**Purpose:** Authoritative developer reference for all settings in Bloob Haus — both universal (all themes) and theme-specific. When adding a new setting to any theme, document it here.

**User-facing settings** live in `_bloob-settings.md` in each content repo. This file is the *developer* reference: what exists, what scope it has, and which themes implement it.

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
| `features.image_zoom` | `true` | PhotoSwipe click-to-zoom |

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

## Adding a New Setting

1. Implement it in the relevant layout/partial
2. Add a row to this file under the correct theme (or Universal if it applies to all)
3. If it's a site-wide setting, also update `_bloob-settings.md` in the affected content repos
4. Note in `CHANGELOG.md`

**Rule of thumb:** If you find yourself writing `{% if site.theme_settings.X %}` or `{% if X %}` in a layout and it's theme-specific, it belongs in the per-theme table above.
