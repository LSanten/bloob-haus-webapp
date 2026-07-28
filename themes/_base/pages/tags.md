---
layout: layouts/article.njk
pagination:
  data: collections.tagList
  size: 1
  alias: tag
permalink: /tags/{{ tag | slugify }}/
eleventyExcludeFromCollections: true
eleventyComputed:
  title: "#{{ tag | replace('-', ' ') }}"
---

{#
  Generic tag page. Kept DELIBERATELY MINIMAL.

  A theme overrides it by dropping its own `tags.md` (or `tags.njk`) in
  `pages/` — assemble-src shadows by basename, so either extension wins. But
  override-by-copy DRIFTS: a theme that copies this file to change one heading
  stops inheriting later fixes. So prefer CSS and shape settings over copying,
  and keep this file small enough that copying is rarely tempting.

  Why `.md` and not `.njk`: a `.njk` page emits MARKUP, and every theme that
  did so grew its own duplicate card renderer — which then drifted from the
  collection shape and broke under per-page visualizer loading (see DECISIONS
  2026-07-28). A `.md` page COMPOSES SHAPES instead, so styling, detection,
  crawlability and the pure-renderer guarantees all come for free, and there is
  exactly one card renderer in the codebase.

  Why `layout:` and not `bloob-shape:` — `bloob-shape:` is resolved by
  preprocess-content.js, which processes the content VAULT. Theme pages are
  copied straight into src/ by assemble-src and never see that step, so the
  layout must be named directly.

  Why paginate `collections.tagList` rather than `collections` + a filter list:
  per-section collections are registered dynamically from top-level content
  folders, so a `collections`-based filter has to enumerate them by name — and
  every theme's list had drifted apart. Worse, adding a content folder silently
  produced a bogus /tags/<folder>/ page. `tagList` is already exactly the real
  frontmatter tags, minus reserved meta-tags.
#}

```collection
source: "tag={{ tag }}"
display: cards
```
