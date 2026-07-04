# Settings & Capabilities Registry

**Purpose:** Authoritative developer reference for all settings and capabilities in Bloob Haus — both universal (all themes must implement) and theme-specific. When adding a new setting or wiring in a shared capability, document it here.

**Two kinds of entries:**
- **Settings** — frontmatter or `_bloob-settings.md` flags that control behavior (e.g. `hide_nav`)
- **Capabilities** — features built into the shared pipeline that every theme must wire in (e.g. PhotoSwipe image zoom). These are not optional — a theme that skips them is incomplete.

**User-facing settings** live in `_bloob-settings.md` in each content repo. This file is the *developer* reference: what exists, what scope it has, which themes implement it, and HOW to wire it into a new theme.

**Last Updated:** 2026-07-03

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
| `bloob-shape` | string | — | Rendering shape for this page. Routes the entire page body through the named shape's `renderFilescope()` renderer in `lib/visualizers/[name]/index.js`. Separate from `bloob-type:` — a file can have both. Shape config goes in a `::: settings` block in the body (not in frontmatter). See `docs/architecture/visualizers.md` — File-scope Shapes section. |
| `description` | string | — | Page-level SEO description for `<meta name="description">` and OG tags. Falls back to `site.description` when absent. Only set when the page deserves a distinct description. |
| `author` | string | — | Attribution name rendered as "By [author]" below the page title. |
| `date_created` | string | — | Creation date (`YYYY-MM-DD`). Available to every theme via the data cascade; rendered as a pill only where a theme wires it up. Written by the bloob-haus Obsidian plugin. |
| `date_updated` | list of strings | — | Chronological list of significant-edit dates (`YYYY-MM-DD`). Appended by the Obsidian plugin. Available to every theme; the shared `dateFormat` filter accepts the array and formats the most recent entry (`{{ date_updated \| dateFormat }}`). Rendered only where a theme opts in. |
| `visibility` | string | — | Per-page visibility shorthand. `private` = excluded from build entirely. `unlisted` = built but hidden from all indexes (RSS, search, sitemap, noindex). Works in any `publish_mode`. Sets `_bloob_unlisted: true` internally. |
| `website_status` | string | depends on `publish_by_default` | Used when `publish_mode: status_field`. `draft` = excluded from build. `unlisted` = built, hidden from all indexes. `archived` = built, Google-indexable, hidden from listings. `public` = fully published. Absent field = excluded if `publish_by_default: false`, treated as public if `true` (default). |
| `transclusion_indicators` | bool | `true` (or site-wide default) | When `false`, `![[embeds]]` are inlined seamlessly with no wrapper div. When `true`, embeds are wrapped in `<div class="transclusion-embed">` so themes can add a visual indicator. Overrides `features.transclusion_indicators` from `_bloob-settings.md`. |
| `comments` | bool | `true` | When `false`, suppresses the comment embed (`fast-comments-embed` fence) on this page. No effect unless the site has a `fast-comments-embed` snippet. |
| `bloob-page-id` | string | derived from URL | Override the canonical page ID (lowercased). Primary use: after moving/renaming a note, set this to its **old** ID so the FastComments thread stays attached. See `docs/architecture/urls-and-ids.md`. |

#### Optional display fields (not in standard YAML, no UI prompt)

| Field | Description |
|-------|-------------|
| `byline` | Freeform attribution string displayed as-is below the title — use when you need full control over the attribution line (e.g. "In collaboration with X and Y"). Takes precedence over `author` if both are set. No "By" prefix is added. |

#### Tag-based visibility (no frontmatter key required)

These tags are reserved and always handled by the pipeline, regardless of `publish_mode`:

| Tag | Effect |
|-----|--------|
| `#private` | File removed from build entirely — same as `visibility: private` |
| `#unlisted` | File built but hidden from all indexes — same as `visibility: unlisted` |

Tags can be in frontmatter (`tags: [private]`) or inline in the body (`#private`).

#### Preprocessor-injected fields (set automatically — do not set in content files)

| Field | Type | Set by | Description |
|-------|------|--------|-------------|
| `_bloob_unlisted` | bool | `preprocess-content.js` | `true` when the page has `visibility: unlisted`, `website_status: unlisted`, or the `#unlisted` tag. Read by `eleventyComputed.js`, layouts, and `head.njk` — do not set manually. |
| `is_folder` | bool | `preprocess-content.js` | `true` on folder index files (`resources/index.md`). Used by `page.njk` to emit a trailing `/` on the `ID:` body search span so search results show `resources/` not `resources`. |
| `slug` | string | `preprocess-content.js` | URL slug derived from filename. For folder index files, set to the parent folder name (not "index"). |
| `slug_spaced` | string | `preprocess-content.js` | Space-separated version of the slug (e.g. `"contact us"` for `contact-us`). Emitted as a separate hidden span so multi-word queries like "contact us" still match the slug. |

#### Visibility — Status Matrix

`_bloob_unlisted: true` is set by the pipeline whenever any of these are present: `visibility: unlisted`, `website_status: unlisted`, or tag `#unlisted`. `draft` exclusion still requires `publish_mode: status_field`.

| Declaration | Built | Direct URL | Google-indexable | RSS | Internal search (pagefind) | Collections (tags, recents) | `graph.json` |
|---|---|---|---|---|---|---|---|
| `visibility: private` or `#private` | No | No | — | No | No | No | No |
| `website_status: draft` (status_field mode only) | No | No | — | No | No | No | No |
| `visibility: unlisted` / `#unlisted` / `website_status: unlisted` | Yes | Yes | No (`noindex`) | No | No | No | No |
| `website_status: archived` | Yes | Yes | Yes | Yes | No | No | Yes |
| `public` (default) | Yes | Yes | Yes | Yes | Yes | Yes | Yes |

**Unlisted wiring — what's automatic vs per-theme:**
| Concern | Mechanism | Automatic? |
|---------|-----------|------------|
| Excluded from RSS | `eleventyExcludeFromCollections: true` via `eleventyComputed.js` | ✓ Universal |
| `noindex` meta | `_base/partials/head.njk` checks `_bloob_unlisted` | ✓ Universal |
| Excluded from pagefind | Layout must check `_bloob_unlisted` and swap `data-pagefind-body` → `data-pagefind-ignore` | Per-theme obligation |
| Excluded from sitemap | `pages/sitemap.njk` must filter `_bloob_unlisted` entries | Per-theme obligation |

**Theme implementation status:**
| Theme | noindex | pagefind-ignore | sitemap filter |
|-------|---------|-----------------|----------------|
| `alter-engineers` | ✓ | ✓ | ✓ |
| `marbles-pouch` | ✓ | ✓ | — (no sitemap) |
| `warm-kitchen` | ✓ | ✓ | — |
| `melt` | ✓ | ✓ | — |

> **Hosting unlisted/client-facing content at an unguessable URL** (security by obscurity, raw HTML
> passthrough files, third-party-dependency leak vectors): see
> [security-by-obscurity.md](security-by-obscurity.md). Note that `unlisted` only protects rendered
> `.md`/`.njk` pages — raw `.html` files are passthrough-copied and rely on the obscured path alone.

### Site-Wide (top-level keys in `_bloob-settings.md`)

#### URL Contract (`url:` block)

The single source of truth for how URLs are built. Consolidates settings that were previously
split between `_bloob-settings.md` and `sites/*.yaml`. Full spec: **`docs/architecture/urls-and-ids.md`**.

```yaml
url:
  base: https://leons.bloob.haus   # subdomain or custom domain
  case: preserve                   # preserve | lower
  date_prefix: keep                # keep | strip | none
  mount_path: ""                   # optional subpath, e.g. "marbles"
```

| Key | Values | Maps to | Description |
|-----|--------|---------|-------------|
| `url.base` | full URL | `site.url` | Site origin. |
| `url.case` | `preserve` / `lower` | `permalinks.strategy` | `lower`→slugify (lowercase), `preserve`→preserve-case. |
| `url.date_prefix` | `keep` / `strip` / `none` | `features.date_from_filename` + `date_prefix_slugs` | Leading `YYYY-MM-DD-` handling: keep in URL / strip from URL / ignore. |
| `url.mount_path` | string | `mount_path` | Mount site under a subpath. Empty = root. |

Legacy flat keys (`permalink_strategy`, and `sites/*.yaml` values) still work; the `url:` block
wins when present. The derived **canonical page ID** = lowercased `host + path` — used as the
FastComments `urlId` and exposed as `<meta name="bloob-page-id">`. See the contract doc.

#### Logo & Favicon

| Key | Type | Description |
|-----|------|-------------|
| `logo` | string | Site logo — used in nav and as favicon source if `favicon` is not set |
| `favicon` | string | Favicon source image — takes priority over `logo` for favicon generation. Generates `favicon.png` (64×64) and `apple-touch-icon.png` (310×310) |

Both fields accept the same value formats:
- `"[[filename.png]]"` — wiki-link (resolves to `/media/filename.png`)
- `"[](media/filename.png)"` or `"[label](path/to/file.png)"` — markdown link (path kept as-is, prefixed with `/` if relative)
- `"plain/path.png"` — plain path (passed through unchanged)

#### Shapes

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `default_shape` | string | — | Fallback shape for pages with no `bloob-shape:` in frontmatter. Governs their **layout** and, through it, their **commentability** (see `docs/architecture/shapes.md` → "Comments — a shape behavior"). Only influences layout selection — body rendering (`renderFilescope`) never fires from the default. If the named shape has no `lib/visualizers/[name]/` folder yet, it silently falls through to `page.njk` (which is commentable). This lets you declare a future shape name without breaking the build. Optional — an undeclared page is a valid "undefined pile" state. Example: `default_shape: marble`. |

**How to wire in a new theme:** No theme-level changes needed. Layout selection is handled entirely by the preprocessor — it reads the shape's `manifest.json.defaultLayout`, copies the shape's `layout.njk` into `src/_includes/layouts/`, and injects the `layout:` key into each page's frontmatter automatically.

#### Publish Mode

| Key | Values | Description |
|-----|--------|-------------|
| `publish_mode` | `blocklist` (default) / `allowlist` / `status_field` | How the pipeline decides which files to build |
| `blocklist_tag` | tag string | Used when `publish_mode: blocklist`. Files tagged with this are excluded. |
| `status_field` | field name (default `website_status`) | Used when `publish_mode: status_field`. Which frontmatter field to read. |
| `publish_by_default` | bool (default `true`) | Used when `publish_mode: status_field`. When `false`, files with no `website_status` field are excluded from the build (private-by-default). When `true` (default), absent field = treated as public, preserving backwards-compatible behaviour. |

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
| `features.date_from_filename` | `false` | Jekyll-style date-prefixed filenames. When `true`, a leading `YYYY-MM-DD-` on a filename supplies `date_created` when frontmatter omits one (frontmatter always wins), and the prefix **stays in the URL** (`/2026-06-24-my-post/`). Set in `sites/*.yaml`. Enabled for marbles. |
| `features.date_prefix_slugs` | `false` | When `true`, strip the leading `YYYY-MM-DD-` from the URL (`2026-06-24-my-post.md` → `/my-post/`). Combine with `date_from_filename` to also pick up the date. Set in `sites/*.yaml`. Off for now. |

> **Why both flags exist / how the URL is controlled:** Eleventy *natively* strips a leading `YYYY-MM-DD-` from `fileSlug`/`filePathStem` and treats it as the page date — so by default the date is dropped from the URL no matter what. When either flag is set, `preprocess-content.js` pins an explicit `permalink` (the index's computed URL) on date-prefixed, non-index files, which overrides Eleventy's native stripping: `date_from_filename` (without `date_prefix_slugs`) keeps the date in the URL; `date_prefix_slugs` strips it intentionally. This also guarantees the served URL matches what internal links resolve to.

#### Graph Extra Fields

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `graph.extra_fields` | map | `{}` | Per-`bloob-object` map of frontmatter field names to include in `graph.json` nodes. Used by `folder-preview` SEO mode to display and filter per-page metadata. The special key `tags` maps to the page's extracted tag array. Example in `sites/[site].yaml`: `graph: { extra_fields: { project-profile: [building_type, location, sqft, tags] } }`. Fields not listed here are never written to `graph.json` (keeps the file lean for sites that don't need them). |

#### Media Processing

| Key | Default | Description |
|-----|---------|-------------|
| `media.convert_gif_to_mp4` | `true` | Auto-convert GIF files to MP4 at build time. GIFs are removed from the deployed output; photo-grid renders them as `<video autoplay loop muted playsinline>`. Videos play in the PhotoSwipe lightbox when clicked. On iOS Low Power Mode where autoplay is blocked, a ▶ play overlay appears; a "Play all animations" button is injected if any videos are paused. Set to `false` to keep GIFs rendered as `<img>` tags. |

#### Snippets & Embeds (raw code fences in the `_bloob-settings.md` **body**)

Raw HTML/JS snippets are pasted as **named fenced code blocks in the body** of `_bloob-settings.md` (never in frontmatter — a raw `<script>` would break the YAML). Parsed by `parseEmbedFences()` in `scripts/utils/bloob-settings-reader.js`. **An empty fence is ignored** — that is how a user turns a snippet off ("present means on"). Every fence is exposed to templates as `site.embeds['<name>']`; fences in `EMBED_TARGETS` are additionally concatenated into `site.snippets.{head,bodyEnd}` and auto-injected.

| Fence name | Injected at | Notes |
|-----------|-------------|-------|
| `header-snippet` | `<head>` | Generic head injection (meta tags, `<link>`, verification tags) |
| `goat-counter-tracking` | `<head>` | GoatCounter analytics — user pastes their own `<script data-goatcounter=…>`. Fires on every page including `/slug/embed/` versions (recorded under their natural `/…/embed/` path). |
| `footer-snippet` | before `</body>` | Generic end-of-body injection |
| `embed-endofbody` | before `</body>` | Generic end-of-body injection |
| `fast-comments-embed` | content-bottom of `page.njk` (via `partials/comments.njk`) | Comment embed (e.g. FastComments). Rendered after `</article>` on content pages only — not on embed versions, folder indexes, or home. Opt out per-page with `comments: false`. Use `{{ page_id }}` for the comment thread key (FastComments `urlId`). |
| `embed-*` (any name) | *(not auto-injected)* | Available as `{{ site.embeds['embed-x'] \| safe }}` for manual placement anywhere in a theme. |

**Per-page tokens** (substituted inside any snippet by the `injectPageVars` filter — a fixed vocabulary, *not* full template eval):

| Token | Resolves to | Source |
|-------|-------------|--------|
| `{{ page_id }}` | canonical page ID — lowercased `host + path` (domain-unique; see `docs/architecture/urls-and-ids.md`) | `derivePageId(site.url, page.url)` |
| `{{ page_url }}` | page URL path | `page.url` |
| `{{ page_full_url }}` | absolute page URL (preserve-case) | `site.url + page.url` |
| `{{ page_title }}` | page title | `title` |

Canonical author-facing scaffold: `themes/_base/_bloob-settings.template.md`. Design: `docs/implementation-plans/phases/phase-2/2026-07-03_snippet-injection-analytics.md`.

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

### Snippet injection — `site.snippets` / `site.embeds`

Raw snippets pasted into `_bloob-settings.md` fences (see "Snippets & Embeds" above) are injected via two shared `_base` partials. A theme wires them by including each partial once.

**Every theme's `partials/head.njk` must include (just before `</head>`):**
```njk
{% include "partials/site-snippets-head.njk" %}
```

**Every theme's `layouts/base.njk` must include (just before `</body>`):**
```njk
{% include "partials/site-snippets-footer.njk" %}
```

**Every theme's `layouts/page.njk` must include (just after `</article>`, for the `fast-comments-embed` fence):**
```njk
{% include "partials/comments.njk" %}
```

All three partials no-op when no fences are present, so wiring them is always safe. The embed layout (`themes/_base/layouts/embed.njk`) includes the shared `head.njk` (so embed versions inherit head snippets) but not `comments.njk` (so embed versions never show comments).

**Theme implementation status:**
| Theme | head include | footer include | comments include |
|-------|--------------|----------------|------------------|
| `warm-kitchen` (`_base` head) | ✓ | ✓ | ✓ |
| `marbles-pouch` | ✓ | ✓ | ✓ |
| `melt` | ✓ | ✓ | ✓ |
| `alter-engineers` | ✓ | ✓ | ✓ |

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

### Article-shape sizing tokens (`bloob-shape: article`)

The shared `article` shape (`lib/visualizers/article/styles.css`) reads its font sizes and
body leading from CSS tokens, **each with a built-in fallback**. They are **optional** — a
theme that sets none renders with the shared defaults — but a theme should tune them to suit
its body typeface (faces with a tall x-height read larger than their nominal size).

| Token | Default (fallback) | Controls |
|-------|--------------------|----------|
| `--article-title-size` | `clamp(1.75rem, 4vw, 2.6rem)` | Header title |
| `--article-subtitle-size` | `clamp(1rem, 2vw, 1.15rem)` | Header subtitle |
| `--article-body-size` | `1rem` | Base reading size (p, li, blockquote) |
| `--article-body-line-height` | `1.7` (p) / `1.65` (li) | Body leading |
| `--article-h1-size` | `clamp(1.55rem, 3.5vw, 2rem)` | In-body `# h1` |
| `--article-h2-size` | `clamp(1.25rem, 3vw, 1.65rem)` | In-body `## h2` |
| `--article-h3-size` | `1.2rem` | In-body `### h3` |
| `--article-h4-size` | `1rem` | In-body `#### h4` |
| `--article-h5-size` | `0.9rem` | In-body `##### h5` |
| `--article-h6-size` | `0.82rem` | In-body `###### h6` |

**Theme contract:** optional. Set in the theme's `main.css` `:root`. Full guidance and a worked
example (alter-engineers) are in `themes.md` → "Article-shape sizing tokens".

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
| `folder` | string | (from URL path) | Folder name to list pages from. Required on homepage and required when `seo: true`. |
| `seo` | bool | `false` | When `true`, renders all cards as static HTML at build time (SEO-indexable). browser.js attaches text search on top. Falls back to runtime render if graph.json is unavailable. |
| `show_fields` | string / list | — | Comma-separated or YAML list of frontmatter fields to display on each card (e.g. `building_type, location, sqft`). Fields must be configured in `graph.extra_fields` in `sites/[site].yaml`. `seo: true` only. |
| `sort` | string | `alpha` | Sort order: `alpha`, `reverse-alpha`, `recent` |
| `limit` | int | `∞` | Max number of pages to show |
| `style` | string | `list` | Layout: `list` (default) or `slider-cards` (Swiper carousel). Only applies when `seo: false`. |
| `title` | string | `ARTICLES` | Section label shown above slider-cards |
| `id` | string | `articles` | HTML `id` on the section element (slider-cards only) |
| `bg` | token/hex | — | Background color for slider-cards section. Supports named tokens and hex. (slider-cards only) |
| `color` | hex | — | Foreground color override (hex). Used with `bg=hex`. (slider-cards only) |

**SEO mode — how it works:**
- `index.js` reads `graph.json` at build time, filters nodes by `folder`, and renders `.fp-card` elements with `data-fp-[field]` attributes for each configured `show_fields` value.
- The rendered HTML includes a `<input class="fp-search-input">` and `<div class="fp-filter-placeholder">` (filter chips are a planned future addition).
- `browser.js` detects `seo: true` containers, skips the graph.json fetch, and attaches a text search handler to the already-rendered cards.
- For `show_fields` to include data, the relevant frontmatter keys must be listed in `graph.extra_fields.[bloob-object]` in `sites/[site].yaml` so they are written into `graph.json` nodes during preprocessing.

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
| `date_created` | string | — | `layouts/page.njk` | Creation date pill shown above content. Format: `YYYY-MM-DD`. Label comes from `date_created_text`, else defaults to "Started on". |
| `date_created_text` | string | `Started on` | `layouts/page.njk` | Custom label for the creation-date pill. |
| `date_updated` | list of strings | — | `layouts/page.njk` | Renders an "updated" pill from the most recent entry. Hidden when the latest update matches `date_created`. See universal `date_updated`. |
| `date_updated_text` | string | `Updated on` | `layouts/page.njk` | Custom label for the updated-date pill. |

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
| `date_created` | string | — | `layouts/page.njk` | Creation date pill shown in page header. Format: `YYYY-MM-DD`. Label comes from `date_created_text`, else defaults to "Written on". |
| `date_created_text` | string | `Written on` | `layouts/page.njk` | Custom label for the creation-date pill. |
| `date_updated` | list of strings | — | `layouts/page.njk` | Renders an "updated" pill from the most recent entry. Hidden when the latest update matches `date_created`. See universal `date_updated`. |
| `date_updated_text` | string | `Updated on` | `layouts/page.njk` | Custom label for the updated-date pill. |

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
