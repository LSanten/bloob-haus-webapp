# Theme Architecture

**Status:** One theme (`warm-kitchen`), template contract defined
**Location:** `docs/architecture/`
**Updated:** 2026-02-26

Themes control the visual presentation of Bloob Haus sites. This document defines the contract between the build system and theme templates — what data is available, what frontmatter options must be supported, and what files a theme must provide.

---

## Theme Location

```
themes/
├── _base/                    ← Shared partials (all themes inherit)
│   └── partials/
│       ├── head.njk          ← <head> tag with meta, OG, CSS includes
│       └── backlinks.njk     ← Backlinks section
├── warm-kitchen/             ← Default theme
│   ├── layouts/
│   │   ├── base.njk          ← HTML skeleton (includes nav, footer)
│   │   └── page.njk          ← Content page layout
│   ├── partials/
│   │   ├── nav.njk           ← Site navigation
│   │   ├── footer.njk        ← Site footer
│   │   ├── scripts.njk       ← JS includes
│   │   └── tags.njk          ← Tag display
│   ├── pages/                ← Special pages (index, 404, feed, etc.)
│   └── assets/
│       └── css/main.css      ← Theme stylesheet
└── [future-theme]/           ← Additional themes follow same structure
```

---

## Site Data (Always Available)

These variables come from `_bloob-settings.md` in the content repo, merged with `sites/*.yaml`. Available in all templates via the `site` object.

| Variable | Type | Source | Description |
|----------|------|--------|-------------|
| `site.title` | string | `_bloob-settings.md` → `name` | Site display name |
| `site.description` | string | `_bloob-settings.md` | Site tagline/description |
| `site.url` | string | `sites/*.yaml` | Full URL (e.g., `https://buffbaby.bloob.haus`) |
| `site.author` | string | `_bloob-settings.md` | Site author name |
| `site.languageCode` | string | `_bloob-settings.md` → `language` | Language code (e.g., `en-us`) |
| `site.footer_text` | string | `_bloob-settings.md` | Custom footer message (supports HTML) |
| `site.year` | number | Generated | Current year (for copyright) |
| `site.permalinks.strategy` | string | `_bloob-settings.md` → `permalink_strategy` | `"slugify"` or `"preserve-case"` |

**Example usage in template:**
```njk
<title>{{ site.title }}</title>
<p>&copy; {{ site.year }} {{ site.author }}</p>
{% if site.footer_text %}<p>{{ site.footer_text | safe }}</p>{% endif %}
```

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

---

## Layout Options (Per-Page Frontmatter)

Themes **must** support these frontmatter options for layout control:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `hide_nav` | boolean | `false` | Hide the navigation bar |
| `hide_footer` | boolean | `false` | Hide the footer |
| `layout` | string | `layouts/page.njk` | Override the layout template |

**Example frontmatter:**
```yaml
---
title: Presentation Slide
hide_nav: true
hide_footer: true
---
```

**Implementation in `base.njk`:**
```njk
<body>
    {% if not hide_nav %}{% include "partials/nav.njk" %}{% endif %}
    <main>{{ content | safe }}</main>
    {% if not hide_footer %}{% include "partials/footer.njk" %}{% endif %}
</body>
```

---

## Collections (Available in Templates)

Eleventy collections are available for navigation and listing pages.

| Collection | Description | Example usage |
|------------|-------------|---------------|
| `collections.sections` | Top-level content folders | Nav links |
| `collections.tagList` | All unique tags | Tag cloud |
| `collections.withBacklinks` | All pages with backlinks computed | Backlinks section |
| `collections.[sectionName]` | Pages in a specific section | Section index pages |

**Example — nav links:**
```njk
{% for section in collections.sections %}
<a href="/{{ section }}/">{{ section | titleCase }}</a>
{% endfor %}
```

---

## Visualizers Data

Active visualizers are available via the `visualizers` array (from `_data/visualizers.json`).

| Property | Type | Description |
|----------|------|-------------|
| `visualizers[].name` | string | Visualizer name |
| `visualizers[].hasCss` | boolean | Whether to include CSS |
| `visualizers[].hasJs` | boolean | Whether to include JS |

**Example — include visualizer CSS:**
```njk
{% for vis in visualizers %}{% if vis.hasCss %}
<link rel="stylesheet" href="/assets/css/visualizers/{{ vis.name }}.css" />
{% endif %}{% endfor %}
```

---

## Required Files

A theme **must** provide these files:

### Layouts
| File | Purpose |
|------|---------|
| `layouts/base.njk` | HTML skeleton — includes head, nav, main, footer, scripts |
| `layouts/page.njk` | Default content page — extends base, renders content |

### Partials
| File | Purpose |
|------|---------|
| `partials/nav.njk` | Site navigation |
| `partials/footer.njk` | Site footer |
| `partials/scripts.njk` | JS includes (visualizers, etc.) |

### Pages
| File | Purpose |
|------|---------|
| `pages/index.njk` | Homepage |
| `pages/404.njk` | Not found page |
| `pages/tags.njk` | Tag listing page |
| `pages/feed.njk` | RSS/Atom feed |

### Assets
| File | Purpose |
|------|---------|
| `assets/css/main.css` | Theme stylesheet |

---

## Filters (Available in Templates)

Custom Nunjucks filters provided by the build system:

| Filter | Input | Output | Example |
|--------|-------|--------|---------|
| `dateFormat` | Date | Formatted string | `{{ date \| dateFormat }}` → "February 26, 2026" |
| `truncate` | string, length | Truncated string | `{{ description \| truncate(100) }}` |
| `head` | array, n | First n items | `{{ posts \| head(5) }}` |
| `capitalize` | string | Capitalized | `{{ "hello" \| capitalize }}` → "Hello" |
| `titleCase` | string | Title cased | `{{ "my-page" \| titleCase }}` → "My Page" |
| `filterTagList` | tags array | Filtered tags | Removes system tags like `all`, `nav` |
| `slugify` | string | URL slug | `{{ "My Tag" \| slugify }}` → "my-tag" |
| `safe` | string | Unescaped HTML | `{{ site.footer_text \| safe }}` |

---

## Creating a New Theme

1. Create folder: `themes/[theme-name]/`
2. Copy structure from `warm-kitchen/` or start fresh
3. Implement all required files (see above)
4. Support all layout options (`hide_nav`, `hide_footer`)
5. Use site data variables for dynamic content
6. Test with both `buffbaby` and `marbles` sites

**Theme selection:** Set `theme: [theme-name]` in `_bloob-settings.md` in the content repo.

---

## Future Considerations

- **Theme settings:** Allow `_bloob-settings.md` to pass theme-specific config (colors, fonts)
- **Theme inheritance:** Themes could extend `_base` more formally
- **Dark mode:** Site-wide or per-page dark mode toggle
- **Print styles:** Optimized layouts for printing recipes, notes
- **Minimal layout:** Built-in `layouts/minimal.njk` for presentations, embeds

---

## Related Documents

- [Visualizer Architecture](visualizers.md) — How visualizers integrate with templates
- [Search Architecture](search.md) — Search and tag pages
- [`_bloob-settings.md` Implementation Plan](../implementation-plans/phases/phase-2/2026-02-26_bloob-settings-file.md) — Source of truth for site config
