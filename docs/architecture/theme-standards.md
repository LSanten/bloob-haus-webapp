# Theme Standards

Every Bloob Haus theme must implement these patterns. They are not optional. A new theme author should use this as a checklist.

---

## Design Token Contract

Every theme **must** define these CSS custom properties in its `:root`. Visualizers use only these tokens (never hardcoded values) so they automatically inherit the theme's visual identity.

```css
:root {
  /* --- Colors --- */
  --bg-color         /* page background */
  --text-color       /* primary body text */
  --text-light       /* secondary / muted text */
  --accent-color     /* primary brand color */
  --accent-dark      /* darker variant for hover/active states */
  --link-color       /* hyperlink color */
  --link-hover       /* hyperlink hover color */
  --border-color     /* dividers, card borders */
  --card-bg          /* card / surface background */
  --footer-bg        /* footer background */

  /* --- Shape --- */
  --border-radius    /* cards, modals, inputs — e.g. 0px (sharp) or 12px (rounded) */
  --border-radius-sm /* tags, pills, small elements */

  /* --- Typography --- */
  --font-body        /* body text font stack */
  --font-heading     /* heading font stack */

  /* --- Spacing --- */
  --spacing-xs       /* 0.5rem */
  --spacing-sm       /* 1rem */
  --spacing-md       /* 1.5rem */
  --spacing-lg       /* 2rem */
  --spacing-xl       /* 3rem */

  /* --- Layout --- */
  --max-width        /* content column width */
}
```

### Token usage rules

1. **Visualizers use only tokens** — no hardcoded colors, border-radii, or font stacks. Always `var(--token, fallback)` with a sensible fallback so the visualizer degrades gracefully on themes that are missing a token.
2. **Themes own their identity** — a theme's `:root` is the single source of truth for all visual decisions. Setting `--border-radius: 0px` makes every visualizer sharp-edged on that theme. Setting `--accent-color: green` propagates to all buttons, highlights, and interactive states.
3. **Fallbacks preserve existing behavior** — when retrofitting an existing visualizer, use `var(--border-radius, 8px)` so themes that don't define the token yet are unaffected.

### Section containers

Content can be wrapped in colored sections using the `:::` fenced container syntax:

```markdown
::: section bg-dark
## Our Services
Content here...
:::
```

This renders as `<section class="bg-dark">`. Every theme must define these four semantic classes using the `--section-bg` / `--section-text` local variables:

```css
section[class] {
  background: var(--section-bg, transparent);
  color: var(--section-text, inherit);
}

.bg-white  { --section-bg: #ffffff;             --section-text: var(--text-color); }
.bg-muted  { --section-bg: /* light surface */; --section-text: var(--text-color); }
.bg-dark   { --section-bg: /* dark surface */;  --section-text: #ffffff; }
.bg-accent { --section-bg: var(--accent-color); --section-text: #ffffff; }
```

Themes can add additional classes (e.g. `bg-green`, `bg-hero`) as needed. The four above are the minimum contract.

### Quick reference: theme personalities

| Token | warm-kitchen | marbles-pouch | alter-engineers (planned) |
|---|---|---|---|
| `--border-radius` | `8px` | `12px` | `0px` |
| `--border-radius-sm` | `4px` | `6px` | `0px` |
| `--accent-color` | `#d2691e` (orange) | `#914c9a` (purple) | TBD (green) |
| `--font-body` | Crimson Pro (serif) | Nunito Sans | TBD |

---

## Required CSS Patterns

### 1. Table horizontal scroll

Wide tables must scroll in-place on narrow screens without scrolling the whole page.

```css
/* THEME STANDARD: tables scroll horizontally on narrow screens */
table {
  display: block;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  width: 100%;
  border-collapse: collapse;
}
```

`display: block` is required on the `<table>` element itself for `overflow-x: auto` to work. This is the CSS-only approach for markdown-rendered tables (no JS wrapper needed).

### 2. Internal links

Internal links are marked **client-side** by `_base/assets/js/internal-links.js`, which runs on every page. It scans all `<a>` elements in the content area, checks if they point to a same-origin content page (via `graph.json`), and adds `class="internal-link"`. Cross-site links to other `*.bloob.haus` domains are also detected. Links that already carry a class (tag badges, `{.button}` links) are left alone.

**Look (since 2026-10-26): plain inline links.** They used to be inline-flex pills with a shape icon, which sat higher than the surrounding text and made their line taller. Now an internal link keeps the baseline, line height and box of any other link in the line. On hover, `_base/assets/css/base.css` draws a thin pill from `background-color` + `box-shadow` + `outline`, none of which take up space, so the text never moves. The base rules use `:where()` (no specificity), so theme and component rules always win. Guarded by `tests/internal-links.test.js` in every theme.

**Themes must:**
1. Include the script tag in `scripts.njk`, passing the icon setting through:
   ```njk
   <script src="{{ '/assets/js/internal-links.js' | url }}"{% if site.features.link_icons %} data-link-icons{% endif %}></script>
   ```
2. Set the link colour and the hover pill colours in `main.css`, and nothing that changes layout (no `display`, `padding`, `border`, `line-height` or `vertical-align` on `a.internal-link`):

```css
a.internal-link {
  --internal-link-hover-bg: rgba(/* accent */, 0.14);  /* pill fill */
  --internal-link-hover-ring: var(--accent-color);    /* 1px ring; transparent = none */
  color: var(--link-color);
}
a.internal-link:hover {
  color: var(--accent-dark);
}
```

**Icons are off by default.** Turn them on for a whole site with `features.link_icons: true` (in `_bloob-settings.md` or `sites/*.yaml`), or for one part of a page by wrapping it in a container with `data-link-icons`. When on, `base.css` sizes the icon to the text (`1em`, on the baseline), so it adds width but no height.

**Opt-out:** Add `data-no-pills` to any container (e.g. the connections graph, nav) to exclude its links from detection.

**How icons work:** the shape registry (`_bloob-shapes.md`, or legacy `_bloob-types.md` / `_bloob-objects.md`) declares each shape with an `image`. `generate-bloob-icons.js` (called from `assemble-src.js` Step 10) resizes each image to 24×24 PNG (transparency preserved) and writes it to `src/assets/objects/bloob-icons/[type]-icon.png`. `preprocess-content.js` stores the path on each page's graph node. `internal-links.js` reads `graph.json` and injects the icon `<img>` when adding the class, if icons are on (`features.link_icons`).

**`image` field values in `_bloob-objects.md`:**

| Value | Behaviour |
|---|---|
| `none` | No icon: link text only |
| `default` | Falls back to `/favicon.png` (the site's own favicon) |
| `![](media/file.png)` | Markdown image syntax — path is URL-decoded and resolved from `src/` |
| `[[filename.png]]` | Wiki-link — resolved to `src/media/filename.png` |
| `/assets/objects/marble.png` | Plain URL path from `src/` |

Pages with no `bloob-shape:` (or legacy `bloob-object:` / `bloob-type:`) frontmatter set get a plain pill with no icon.

### 3. Date created pill

If `date_created` is set in frontmatter, a centered pill is displayed. The format is `YYYY-MM-DD` or `YYYY-MM-DD, Custom label`.

```css
.marble-date {
  display: block;
  text-align: center;
  font-size: 0.82rem;
  color: var(--text-light);
  background: var(--card-bg, white);
  padding: 0.25em 0.8em;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.07);
  white-space: nowrap;
  width: fit-content;
  margin: 0 auto 0.75rem;
}
```

## Required Template Features

### `hide_banner: true`

The `base.njk` layout must wrap banner rendering in `{% if not hide_banner %}`. This allows any page to suppress the banner via frontmatter.

### `hide_footer: true`

Same pattern for footer.

### `hide_nav: true`

Same pattern for nav (warm-kitchen has a nav; marbles-pouch does not).

## Favicon

Favicons are generated at build time from `site.logo` (set in `_bloob-settings.md`). Two sizes are written to `src/`:

- `favicon.png` — 32×32, used as tab icon
- `apple-touch-icon.png` — 180×180, used by iOS/Safari

Generation uses `sharp` (already in dependencies) and caches via MD5 hash of the source image. The `_base/partials/head.njk` renders both links. Themes that override `head.njk` must include them.

See `scripts/generate-favicons.js` for the implementation.

## Logo in Nav

If `site.logo` is set, the nav should render an `<img>` for it. The value of `site.logo` is a resolved URL path like `/media/logo.png`, set by `assemble-src.js` from the raw wiki-link in `_bloob-settings.md`.

warm-kitchen nav uses `.site-nav__logo` with `height: 40px; width: auto`.

**Always add `class="no-zoom"` to the logo img.** The image optimizer (`optimizeImages` transform in `eleventy.config.js`) replaces any `<img src="/media/...">` with a full `<picture>` + PhotoSwipe zoom wrapper, discarding the original class and size. `no-zoom` opts the image out. This also applies to any other UI images (decorative shapes, icons) that happen to live in `/media/`.

## Build-Time Object Images

Bloob-object icons are generated at build time by `scripts/generate-bloob-icons.js`. It runs twice during a full build:
- **Step 10 in `assemble-src.js`** — handles types whose images come from theme assets (`src/assets/objects/`), which are already in place after Step 6.
- **Step 5.7 in `build-site.js`** — re-runs after preprocessing copies content-repo media to `src/media/`. This catches types like `studio-bloob-art` whose images live in `media/` and would be skipped in the first pass. The built-in mtime cache skips already-generated icons.

Each type declared in `_bloob-objects.md` with a real image (not `none` or `default`) gets a 24×24 PNG at `src/assets/objects/bloob-icons/[type]-icon.png`. Transparency is preserved via `sharp`'s PNG output with transparent `contain` padding.

Types with `image: default` are not resized — `preprocess-content.js` stores `/favicon.png` as their `bloobIcon` directly. Types with `image: none` get no icon at all.

The icon URL is stored on each page's `graph.json` node as `bloobIcon`. `internal-links.js` reads this at runtime to inject the icon into pills. The same `bloobIcon` field is available for the connections graph to use.
