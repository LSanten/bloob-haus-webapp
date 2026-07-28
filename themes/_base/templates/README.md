# `templates/` — markdown templates the BUILD consumes

Files here are **not pages**. They are markdown templates that a build step reads, fills in, and
writes into the generated `src-*/` tree as content.

That distinction is the reason this directory exists separately from `pages/`:

| Directory | Consumed by | Becomes |
|---|---|---|
| `pages/` | Eleventy | A real page. `tags.md` publishes at `/tags/<tag>/`. |
| `templates/` | a build script | Content written into `src-*/`, then built like vault content. |

A file like `folder-index.md` **must not** live in `pages/` — Eleventy would render the template
itself and publish it at `/folder-index/`.

## Overriding

A theme overrides a template by shipping the same filename in its own `templates/` directory:

```
themes/_base/templates/folder-index.md     ← default, used by every theme
themes/melt/templates/folder-index.md      ← melt's override, wins for melt
```

Resolution is "theme first, else `_base`" — see `scripts/utils/folder-index-template.js`.

**Override-by-copy drifts.** A theme that copies a template to change one line stops inheriting
later fixes to it. Prefer CSS for appearance, and copy a template only when the shape composition
or the layout must genuinely differ.

### Keeping a theme's own folder chrome

The default `folder-index.md` declares `bloob-shape: article` + `layout: layouts/article.njk`, so a
generated folder index is structurally identical to an author-written `_index.md` — same layout,
same nested `collection`, and the collection picks up the shape width contract because it sits
inside `.article-body`.

A theme that wants its own folder chrome instead (melt's `layouts/folder-index.njk` renders an
"A MELT ROOM" label and a bubble wrapper) restores it by shipping an override that points at that
layout:

```markdown
---
bloob-shape: article
layout: layouts/folder-index.njk
permalink: /{{ slug }}/
folder: {{ slug }}
title: {{ folder_display }}
folder_display: {{ folder_display }}
---

```collection
source: folder={{ slug }}
display: cards
```
```

Note `folder-index.njk` renders the page title itself, so a template targeting it should not repeat
a heading in the body.

## Placeholders

Substituted by the build step, not by Eleventy — so the values are baked in before Eleventy ever
sees the file. Whitespace inside the braces is optional.

| Placeholder | Example |
|---|---|
| `{{ slug }}` | `projects` — the URL-safe folder slug. Always lowercase. |
| `{{ folder_display }}` | `Projects` — the human-readable folder name. |

Use `{{ slug }}`, never a raw folder name, in anything a shape resolves: `graph.json`'s `section` is
slugified, so `folder=Resources` matches nothing and renders empty *silently*.

## Why templates compose shapes

A template body should be shape fences, not markup. Hand-written markup in a generated stub is how
`folder-index` ended up hard-coding a visualizer's container div, and how `tags.njk` grew a
duplicate card renderer that later broke under per-page visualizer loading. Composing a shape means
one renderer, and styling / detection / crawlability come for free. See DECISIONS 2026-07-28.
