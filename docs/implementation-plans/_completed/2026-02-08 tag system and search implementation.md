# Implementation Plan: Tag System & Search Bar

**Purpose:** Step-by-step implementation plan for tags and site search on Bloob Haus  
**Created:** February 8, 2026  
**Status:** ✅ IMPLEMENTED  
**Phase:** 2.5 (between Enhanced Linking and Interactive Features)  
**Estimated effort:** 5–9 hours total  
**Depends on:** Eleventy migration (complete), preprocessing pipeline (complete)  
**Completed:** February 9, 2026

---

## Summary of Decisions

These decisions were made during the research and review process on February 8, 2026.

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Search engine | **Pagefind** (not FlexSearch/Lunr.js) | Zero maintenance, chunked on-demand loading, built-in tag filtering, scales to 10k+ pages, platform-agnostic |
| Tag page generation | **Eleventy native pagination** (not Digital Garden's approach) | DG has no tag pages at all — just search triggers. Dedicated tag pages improve SEO, work without JS, provide browsable navigation |
| Tag extraction location | **Preprocessor** (`scripts/utils/`) | Already handles content transformation and privacy filtering. Inline `#tags` require content parsing before Eleventy sees files |
| Tag data storage | **Both** JSON file + Eleventy collections | `tagIndex.json` for tag cloud/index page, Eleventy collections for tag page pagination |
| Pagefind integration method | **CLI in `package.json`** (Option B) | Consistent with existing chained build steps. Cleaner separation — Eleventy doesn't need to know about search indexing. Scales for any vault from any user |
| Search keyboard shortcut | **`Cmd+F` / `Ctrl+F`** (primary), **`Cmd+O`** (secondary) | `Cmd+F` is universal search instinct, `Cmd+O` is Obsidian-native. NOT `Cmd+K` (that's paste-link) |
| Tag disambiguation | **Hierarchical tags** (`#topic/subtopic`) | Handles 90% of cases, already native in Obsidian. Tag extractor module is designed to be extended later for richer tag metadata |
| Platform | **Platform-agnostic** | Pagefind is a Rust binary via npm — works on Vercel, Scaleway, Cloudflare, local dev. No vendor lock-in |
| Privacy model | **Tags aren't private/public — pages are** | A tag appears in the public index if at least one public page has it. Private pages with the same tag simply don't exist in the build output |
| Future multi-index search | **Documented separately** | See [Multi-Index Search Architecture](2026-02-08_multi-index-search-architecture.md). Not needed until Phase 3 (auth + webapp) |

---

## Architecture Overview

### Data Flow

```
Obsidian Vault (notes with #inline-tags and frontmatter tags)
  → GitHub Repository (private, cloned at build time)
    → publish-filter.js (removes Tier 3 undisclosed content)
      → tag-extractor.js (extracts + normalizes tags from published pages)
        → preprocess-content.js (writes tags to frontmatter, builds tagIndex.json)
          → Eleventy (generates tag pages via pagination, renders tag badges)
            → _site/ (static HTML with data-pagefind-* attributes)
              → Pagefind CLI (indexes HTML, generates chunked search index)
                → _site/pagefind/ (search index files served statically)
```

### Privacy Guarantee

Tags are NOT inherently public or private. Privacy is determined by **pages**, not tags:

1. `publish-filter.js` removes unpublished pages entirely — their tags never enter the pipeline
2. Tag extraction runs **only** on pages that survive the publish filter
3. The system tag `not-for-public` is stripped from any published page's tag list (defense in depth)
4. If tag X exists on both a public and a private page, only the public page appears on the `/tags/x/` page
5. If tag Y exists **only** on private pages, tag Y never appears anywhere in the built site
6. Pagefind only indexes rendered HTML in `_site/` — if a page wasn't built, it can't appear in search

---

## Implementation Steps

### Step 1: Tag Extractor Module (1–2 hours)

**Create:** `scripts/utils/tag-extractor.js`

This module is intentionally **modular and extensible** — it's a standalone utility with no Eleventy dependencies, making it easy to enhance later with richer tag metadata, aliases, or disambiguation features.

```js
// scripts/utils/tag-extractor.js

/**
 * Regex for inline Obsidian-style tags.
 * Matches #tag, #multi-word-tag, #nested/tag, #recipe/dessert/chocolate
 * Must start with a letter (avoids matching #123 hex colors, headings, etc.)
 * Preceded by whitespace or start of line (avoids matching inside URLs)
 */
const INLINE_TAG_REGEX = /(?:^|\s)#([a-zA-Z][\w/-]*)/g;

/**
 * System tags that are used for publishing logic, not content taxonomy.
 * These are stripped from the public tag list.
 * Extend this set as new system tags are introduced.
 */
const SYSTEM_TAGS = new Set([
  'not-for-public',  // blocklist publishing tag
  'gardenEntry',     // Digital Garden convention (if ever used)
  'all',             // Eleventy reserved collection name
  'nav',             // Eleventy reserved collection name
]);

/**
 * Extract tags from a page's frontmatter and markdown content.
 * 
 * Handles:
 * - Frontmatter `tags` as array: `tags: [recipe, vegan]`
 * - Frontmatter `tags` as string: `tags: recipe`
 * - Inline #tags in markdown body: `This is a #recipe for #vegan cake`
 * - Nested/hierarchical tags: `#recipe/dessert/chocolate`
 * 
 * @param {Object} frontmatter - Parsed YAML frontmatter object
 * @param {string} content - Raw markdown body (after frontmatter)
 * @returns {string[]} Normalized, deduplicated, sorted array of tags
 */
export function extractTags(frontmatter, content) {
  let tags = [];

  // 1. Frontmatter tags (array or single string)
  if (Array.isArray(frontmatter.tags)) {
    tags = [...frontmatter.tags];
  } else if (typeof frontmatter.tags === 'string') {
    tags = [frontmatter.tags];
  }

  // 2. Inline #tags from content body
  let match;
  while ((match = INLINE_TAG_REGEX.exec(content)) !== null) {
    tags.push(match[1]);
  }

  // 3. Normalize: lowercase, trim, deduplicate, filter system tags
  const normalized = [...new Set(
    tags
      .map(t => t.toLowerCase().trim())
      .filter(t => t.length > 0 && !SYSTEM_TAGS.has(t))
  )].sort();

  return normalized;
}

/**
 * Build a global tag index from all published pages.
 * Used to generate tagIndex.json for the tag cloud and tag index page.
 * 
 * @param {Object[]} allPages - Array of page objects with { title, url, tags, excerpt }
 * @returns {Object} Tag index: { tagName: { count, pages: [{ title, url, excerpt }] } }
 */
export function buildTagIndex(allPages) {
  const tagIndex = {};

  for (const page of allPages) {
    if (!page.tags) continue;

    for (const tag of page.tags) {
      if (!tagIndex[tag]) {
        tagIndex[tag] = { count: 0, pages: [] };
      }
      tagIndex[tag].count++;
      tagIndex[tag].pages.push({
        title: page.title,
        url: page.url,
        excerpt: page.excerpt || '',
      });
    }
  }

  // Sort by count descending
  return Object.fromEntries(
    Object.entries(tagIndex).sort((a, b) => b[1].count - a[1].count)
  );
}
```

**Wire into `preprocess-content.js`:**

After publish filtering and before writing output files, add tag extraction to the processing loop. Then write `tagIndex.json` after all files are processed.

```js
// In the file processing loop (Step 6), after comment stripping:
import { extractTags, buildTagIndex } from './utils/tag-extractor.js';

// Inside the per-file loop:
const pageTags = extractTags(frontmatter, processedContent);

// Add to output frontmatter:
const outputFrontmatter = {
  ...frontmatter,
  title: pageInfo?.title || frontmatter.title || path.basename(file.relativePath, '.md'),
  slug: pageInfo?.slug,
  tags: pageTags,  // ← ADD THIS
};

// Strip 'not-for-public' from tags on published pages (defense in depth)
if (outputFrontmatter.tags) {
  outputFrontmatter.tags = outputFrontmatter.tags.filter(t => t !== 'not-for-public');
}
```

After the file processing loop completes:

```js
// Step 7: Build global tag index
console.log('\n--- Step 7: Building tag index ---');
const allPageData = published.map(file => ({
  title: /* title from frontmatter or filename */,
  url: /* computed permalink */,
  tags: /* tags extracted during processing */,
  excerpt: /* first paragraph or description */,
}));

const tagIndex = buildTagIndex(allPageData);
const tagIndexPath = path.join(outputDir, '_data', 'tagIndex.json');
await fs.ensureDir(path.dirname(tagIndexPath));
await fs.writeJson(tagIndexPath, tagIndex, { spaces: 2 });
console.log(`[tags] Wrote ${Object.keys(tagIndex).length} tags to tagIndex.json`);
```

**Test cases:**

| Input | Expected |
|-------|----------|
| Frontmatter `tags: [recipe, vegan]` | `['recipe', 'vegan']` |
| Frontmatter `tags: recipe` (string) | `['recipe']` |
| Inline `#dessert` in body | `['dessert']` |
| Both frontmatter and inline | Merged, deduplicated |
| `#recipe/dessert/chocolate` (nested) | `['recipe/dessert/chocolate']` |
| `#not-for-public` in body | Filtered out (system tag) |
| `#CamelCase` tag | `['camelcase']` (lowercased) |
| `#123invalid` (starts with number) | Not matched (regex requires letter start) |
| Duplicate tags | Deduplicated |
| No tags anywhere | `[]` (empty array) |

---

### Step 2: Eleventy Tag Collections & Tag Pages (2–3 hours)

#### 2a. Add tag filter and collection to `eleventy.config.js`

```js
// In eleventy.config.js, add to the existing config function:

// Filter out system/reserved tags from display
function filterTagList(tags) {
  return (tags || []).filter(tag =>
    !['all', 'nav', 'posts', 'not-for-public'].includes(tag)
  );
}
eleventyConfig.addFilter('filterTagList', filterTagList);

// Collection of all unique tags (for pagination)
eleventyConfig.addCollection('tagList', (collection) => {
  const tagSet = new Set();
  collection.getAll().forEach(item => {
    (item.data.tags || []).forEach(tag => tagSet.add(tag));
  });
  return filterTagList([...tagSet]).sort();
});
```

#### 2b. Create tag page template: `src/tags.njk`

This uses Eleventy's pagination feature to auto-generate a page for every tag.

```html
---
layout: layouts/base.njk
pagination:
  data: collections
  size: 1
  alias: tag
  filter:
    - all
    - nav
    - posts
    - tagList
    - not-for-public
permalink: /tags/{{ tag | slugify }}/
eleventyComputed:
  title: "Tagged: {{ tag }}"
---
<h1>Notes tagged "{{ tag }}"</h1>

<ul class="tag-page-list">
{% set taglist = collections[tag] %}
{% for post in taglist | reverse %}
  <li>
    <a href="{{ post.url }}">{{ post.data.title }}</a>
    {% if post.data.description %}
      <p class="excerpt">{{ post.data.description }}</p>
    {% endif %}
  </li>
{% endfor %}
</ul>

<p><a href="/tags/">← All tags</a></p>
```

#### 2c. Create tag index page: `src/tags-index.njk`

```html
---
layout: layouts/base.njk
title: All Tags
permalink: /tags/
---
<h1>All Tags</h1>

<ul class="tag-cloud">
{% for tag in collections.tagList %}
  {% set tagCount = collections[tag].length %}
  <li>
    <a href="/tags/{{ tag | slugify }}/"
       class="tag-badge"
       style="--tag-weight: {{ tagCount }}">
      {{ tag }} <span class="tag-count">({{ tagCount }})</span>
    </a>
  </li>
{% endfor %}
</ul>
```

#### 2d. Add tag display to page layout: `src/_includes/partials/tags.njk`

```html
{% if tags %}
<div class="tag-list">
  {% for tag in tags | filterTagList %}
    <a href="/tags/{{ tag | slugify }}/" class="tag-badge">{{ tag }}</a>
  {% endfor %}
</div>
{% endif %}
```

Include in `src/_includes/layouts/page.njk` after the title:

```html
<h1>{{ title }}</h1>
{% include "partials/tags.njk" %}
```

---

### Step 3: Pagefind Integration (1–2 hours)

#### 3a. Install Pagefind

```bash
npm install -D pagefind
```

#### 3b. Add to build pipeline in `package.json`

```json
{
  "scripts": {
    "build": "node scripts/bundle-viz.js && node scripts/clone-content.js && node scripts/preprocess-content.js && npx @11ty/eleventy && npx pagefind --site _site",
    "build:search": "npx pagefind --site _site"
  }
}
```

`build:search` is a convenience script for re-indexing without a full rebuild (useful during development).

**How this works:** `npm run build` runs five commands in sequence, chained with `&&` (each only runs if the previous succeeded):

1. `node scripts/bundle-viz.js` — Bundle visualizer JS
2. `node scripts/clone-content.js` — Clone content repo from GitHub
3. `node scripts/preprocess-content.js` — Filter, transform, extract tags
4. `npx @11ty/eleventy` — Build static HTML site
5. `npx pagefind --site _site` — Index the HTML for search

This is platform-agnostic — works on Vercel, Scaleway, Cloudflare, local dev. Pagefind is a Rust binary distributed via npm with prebuilt binaries for Linux/macOS/Windows.

#### 3c. Add Pagefind data attributes to templates

In `src/_includes/layouts/page.njk`, add `data-pagefind-body` to scope what gets indexed, and `data-pagefind-filter="tag"` to make tags filterable:

```html
<article data-pagefind-body>
  <h1 data-pagefind-meta="title">{{ title }}</h1>

  {% if tags %}
  <div class="tag-list" data-pagefind-ignore>
    {% for tag in tags | filterTagList %}
      <a href="/tags/{{ tag | slugify }}/"
         class="tag-badge"
         data-pagefind-filter="tag">{{ tag }}</a>
    {% endfor %}
  </div>
  {% endif %}

  {{ content | safe }}
</article>
```

**What these attributes do** (they are standard HTML `data-` attributes, invisible to users, zero runtime cost):

| Attribute | Purpose | When it matters |
|-----------|---------|----------------|
| `data-pagefind-body` | "Only index content inside this element" (excludes nav, footer, sidebar) | Build time only |
| `data-pagefind-meta="title"` | "Use this text as the 'title' field in search results" | Build time only |
| `data-pagefind-filter="tag"` | "Register this text as a filterable 'tag' value" | Build time only |
| `data-pagefind-ignore` | "Don't include this element's text in the search index" (prevents tag text from appearing as content matches) | Build time only |

These attributes are **annotations for the Pagefind indexer**, similar to how `<meta>` tags are annotations for Google. The browser ignores any `data-` attribute it doesn't recognize. They add no weight to page load or rendering.

#### 3d. Create search page: `src/search.njk`

```html
---
layout: layouts/base.njk
title: Search
permalink: /search/
eleventyExcludeFromCollections: true
---
<div data-pagefind-ignore>
  <h1>Search</h1>
  <link href="/pagefind/pagefind-ui.css" rel="stylesheet">
  <script src="/pagefind/pagefind-ui.js"></script>
  <div id="search"></div>
  <script>
    window.addEventListener('DOMContentLoaded', () => {
      new PagefindUI({
        element: '#search',
        showSubResults: true,
        showImages: false,
        openFilters: ['tag'],
        translations: {
          placeholder: 'Search notes...',
          zero_results: 'No results for "[SEARCH_TERM]"'
        }
      });
    });
  </script>
</div>
```

#### 3e. Add search link to navigation

In `src/_includes/partials/nav.njk`, add a search link:

```html
<a href="/search/">Search</a>
```

---

### Step 4: Tag UI Polish (1–2 hours)

#### 4a. Tag badge CSS

Add to your main stylesheet:

```css
/* Tag badges */
.tag-badge {
  display: inline-block;
  padding: 0.2em 0.6em;
  margin: 0.15em;
  font-size: 0.85em;
  border-radius: 1em;
  background: var(--color-tag-bg, #f0e6d3);
  color: var(--color-tag-text, #5a4a3a);
  text-decoration: none;
  transition: background 0.15s ease;
}

.tag-badge:hover {
  background: var(--color-tag-hover, #e0d0b8);
}

.tag-count {
  font-size: 0.8em;
  opacity: 0.7;
}

/* Tag cloud — size tags by weight */
.tag-cloud {
  list-style: none;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em;
}

.tag-cloud .tag-badge {
  font-size: calc(0.8em + var(--tag-weight, 1) * 0.1em);
}

/* Tag page list */
.tag-page-list {
  list-style: none;
  padding: 0;
}

.tag-page-list li {
  margin-bottom: 1em;
  padding-bottom: 1em;
  border-bottom: 1px solid var(--color-border, #e0d0b8);
}

.tag-page-list .excerpt {
  margin-top: 0.3em;
  font-size: 0.9em;
  opacity: 0.8;
}
```

#### 4b. Pagefind UI theming

```css
/* Match Pagefind UI to site theme */
.pagefind-ui {
  --pagefind-ui-scale: 1;
  --pagefind-ui-primary: var(--color-accent);
  --pagefind-ui-text: var(--color-text);
  --pagefind-ui-background: var(--color-bg);
  --pagefind-ui-border: var(--color-border);
  --pagefind-ui-tag: var(--color-tag-bg);
  --pagefind-ui-border-radius: 8px;
  --pagefind-ui-font: var(--font-body);
}
```

---

### Step 5: Search UI Customization (optional, 2–4 hours)

This step is optional — the default Pagefind UI from Step 3 is fully functional. This step adds polish if desired.

#### 5a. Keyboard shortcuts

Add to `src/assets/js/search.js` (or inline in `scripts.njk`):

```js
// Search keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Cmd+F / Ctrl+F — open site search
  if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
    e.preventDefault();
    window.location.href = '/search/';
    // Or if using a modal: openSearchModal();
  }

  // Cmd+O / Ctrl+O — Obsidian-style "open note"
  if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
    e.preventDefault();
    window.location.href = '/search/';
  }
});
```

**Note on `Cmd+F` override:** This intercepts the browser's native find-in-page. Consider adding a hint in the search UI: "Looking for text on this page? Press Escape, then Cmd+G" — or only intercept `Cmd+F` when not already on the search page.

#### 5b. Custom search modal (alternative to dedicated search page)

If a modal overlay is preferred over a dedicated `/search/` page, use Pagefind's JavaScript API directly:

```js
// Custom search with Pagefind JS API
const pagefind = await import('/pagefind/pagefind.js');

async function search(query, tagFilter = null) {
  const options = {};
  if (tagFilter) {
    options.filters = { tag: { any: [tagFilter] } };
  }

  const results = await pagefind.search(query, options);

  // Load full result data for top 10
  const loaded = await Promise.all(
    results.results.slice(0, 10).map(r => r.data())
  );

  return loaded.map(r => ({
    title: r.meta.title,
    url: r.url,
    excerpt: r.excerpt,
    tags: r.filters?.tag || [],
  }));
}
```

---

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `scripts/utils/tag-extractor.js` | CREATE | Extract and normalize tags from frontmatter + inline content |
| `scripts/preprocess-content.js` | MODIFY | Wire in tag extraction, write `tagIndex.json` |
| `eleventy.config.js` | MODIFY | Add `filterTagList` filter and `tagList` collection |
| `src/tags.njk` | CREATE | Auto-generate individual tag pages via pagination |
| `src/tags-index.njk` | CREATE | Tag index page at `/tags/` |
| `src/_includes/partials/tags.njk` | CREATE | Tag badge partial for page layouts |
| `src/_includes/layouts/page.njk` | MODIFY | Include tag partial, add Pagefind data attributes |
| `src/search.njk` | CREATE | Search page with Pagefind UI |
| `src/_includes/partials/nav.njk` | MODIFY | Add search link |
| `src/assets/css/` (main stylesheet) | MODIFY | Tag badge and Pagefind UI styles |
| `package.json` | MODIFY | Add `pagefind` dev dependency, append to build script |

---

## Verification Checklist

After implementation, verify:

- [x] Tags extracted from frontmatter arrays
- [x] Tags extracted from frontmatter strings
- [x] Inline `#tags` extracted from markdown body
- [x] Nested tags (`#recipe/dessert`) preserved correctly
- [x] System tags (`not-for-public`, `all`, `nav`) filtered out
- [x] `tagIndex.json` generated in `src/_data/`
- [x] Tag index page at `/tags/` lists all tags with counts
- [x] Individual tag pages at `/tags/[tag-name]/` list correct pages
- [x] Tags from excluded/private pages NEVER appear in tag index
- [x] Tags from excluded/private pages NEVER appear in search results
- [x] Tag that exists only on private pages does NOT appear anywhere
- [x] Clickable tag badges on page headers link to tag pages
- [x] Search page at `/search/` works with Pagefind UI
- [x] Search results include page titles and excerpts
- [x] Tag filter in search UI works (filter by tag)
- [x] `npm run build` completes with Pagefind step
- [x] Build works on Vercel (auto-deploy)
- [x] Tags are modular — `tag-extractor.js` can be enhanced independently

---

## Future Enhancements (not in scope now)

These are documented for future reference. The current implementation is designed to not block any of them.

| Enhancement | Effort | Depends on |
|-------------|--------|------------|
| Hierarchical tag browsing (`/tags/recipe/` shows all sub-tags) | 2–3 hrs | Tag extractor enhancement |
| Tag descriptions / definitions (`_data/tag-definitions.json`) | 1–2 hrs | Nothing |
| Tag aliases (multiple names → same tag) | 1–2 hrs | Tag extractor enhancement |
| RSS feed per tag (`/tags/recipe/feed.xml`) | 1 hr | Eleventy RSS plugin config |
| Tag cloud visualization (interactive SVG/canvas) | 3–5 hrs | Tag data |
| "Related by tag" section on pages | 2–3 hrs | Tag index data |
| Multi-index search for private content | See [separate doc](2026-02-08_multi-index-search-architecture.md) | Auth system (Phase 3) |
| Custom search modal with `Cmd+F` override | 2–4 hrs | Basic Pagefind working |
| Search analytics for site owners | 3–5 hrs | Webapp API |

---

## Related Documents

- [Search Architecture](../../../architecture/search.md) — How search and tags work across phases
- [Multi-Index Search Architecture](../../phase-3/2026-02-08%20multi%20index%20search%20architecture.md) — Future privacy tiers and cross-room search
- [Phase 2 Plan](phase-2-linking-api.md) — Enhanced linking features (Pagefind replaces custom search-index.json)
- [ROADMAP.md](../../ROADMAP.md) — Overall project roadmap
- [DECISIONS.md](../../DECISIONS.md) — Decision log (add Pagefind decision)
- [Visualizer Architecture](../../../architecture/visualizers.md) — Could tags become a visualizer?

---

*This plan is ready to implement. Start with Step 1 (tag extractor), which is foundational for everything else.*