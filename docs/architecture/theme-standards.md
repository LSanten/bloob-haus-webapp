# Theme Standards

Every Bloob Haus theme must implement these patterns. They are not optional. A new theme author should use this as a checklist.

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

### 2. Internal link pills

All resolved internal (vault) links are wrapped with `class="internal-link"` by the preprocessor. Themes must style these as compact pills. Object-type images (if available) appear inline as 16×16 icons.

```css
a.internal-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25em;
  padding: 0.1em 0.6em 0.1em 0.35em;
  background: rgba(/* accent */, 0.06);
  border: 1px solid var(--border-color);
  border-radius: 999px;
  font-size: 0.93em;
  color: var(--link-color);
  text-decoration: none;
  vertical-align: baseline;
  line-height: 1.4;
  transition: background 0.15s, border-color 0.15s;
}
a.internal-link:hover {
  background: rgba(/* accent */, 0.12);
  border-color: var(--accent-color);
  text-decoration: none;
}
.internal-link__icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
  border-radius: 0;
  flex-shrink: 0;
}
```

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

warm-kitchen nav uses `.site-nav__logo` with `max-height: 36px`.

## Build-Time Object Images

The `bloobObjectsRegistry` is passed to `resolveWikiLinks()` during preprocessing. When an internal link resolves, the target page's `bloob-object` frontmatter type is looked up and its registered image (if any) is embedded as an `<img class="internal-link__icon">` inside the `<a>`.

Pages with no `bloob-object` get a pill without an icon. This is intentional — no fallback "broken image" icon.
