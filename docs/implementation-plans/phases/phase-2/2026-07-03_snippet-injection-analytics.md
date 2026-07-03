# Snippet Injection & Analytics — Implementation Plan

**Status:** Approved — building GoatCounter + generic header/footer snippets first  
**Created:** 2026-07-03  
**Location:** `docs/implementation-plans/phases/phase-2/`  
**Scope:** Shared pipeline (bloob-haus-wide). Backwards-compatible — no snippets means no output.

---

## Goal

Let a site owner paste raw code snippets into `_bloob-settings.md` (in their content vault)
and have them injected into the right place on **every page** of their site, with no code
changes. First use case: **GoatCounter** analytics. Same mechanism later powers
**FastComments**, custom `<head>` tags, chat widgets, and arbitrary embeds.

Design principle: one primitive — "inject this raw block at location X on every page" —
with friendly named aliases over two universal buckets (`head`, `bodyEnd`).

---

## Context

### How snippets are authored today

`_bloob-settings.md` already carries placeholder fenced code blocks (see
`../melt-website/_bloob-settings.md`):

````markdown
```fast-comments-embed

```

```goat-counter-tracking
<script data-goatcounter="https://melt.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
```
````

The user pastes the **raw snippet** into the fence. An empty fence = feature off.
A filled fence = feature on. No extra flags needed — "present means enabled."

### Reference: Shopify + old Jekyll integrations

- **Shopify** (`bloobhaus-notes/studio-bloob-shop-dev/layout/theme.liquid:299`) injects
  the GoatCounter `<script>` in `<head>`, async. We do the same.
- **Old Jekyll** (`LSanten.github.io/_layouts/default.html:825-835`) used FastComments with
  `tenantId` + `urlId: "{{ page.file_name }}"` — the comment thread is keyed to the
  **filename**, not the URL. This matches Bloob's File Identity Convention and is the reason
  we need a per-page token substitution mechanism (see below).

### Current pipeline flow

`_bloob-settings.md` → `scripts/utils/bloob-settings-reader.js` (frontmatter only today) →
`mergeBloobSettings()` → config → `generateSiteData()` in `scripts/assemble-src.js` writes
`src/_data/site.js` → theme templates read `site.*`.

Each theme has its own `head.njk` (`themes/_base/partials/head.njk`,
`themes/melt/partials/head.njk`) but they already share `_base` partials via
`{% include "partials/photoswipe-head.njk" %}` — so a shared `_base` partial included in each
head is the established injection pattern.

---

## Architecture

### 1. Fence → location mapping

Every fence becomes a variable `site.embeds['<fence-name>']`. A few named fences are
auto-injected at known locations; anything else is just available to templates.

| Fence name              | Auto-injected at        | Purpose                        |
|-------------------------|-------------------------|--------------------------------|
| `header-snippet`        | `<head>`                | generic head injection         |
| `goat-counter-tracking` | `<head>`                | analytics (alias for head)     |
| `footer-snippet`        | before `</body>`        | generic body-end injection     |
| `embed-endofbody`       | before `</body>`        | generic body-end injection     |
| `fast-comments-embed`   | page layout, content-bottom | comments (needs placement) |
| `embed-*` (anything)    | not auto-injected       | `{{ site.embeds['embed-x'] | safe }}` anywhere |

`site.snippets = { head, bodyEnd }` is the concatenation of the head-target and
bodyEnd-target fences, for the two shared partials to render in one shot.

### 2. Per-page variable tokens

Snippets live once but render per-page, so they support a small documented token set,
substituted by one custom Eleventy filter (`injectPageVars`). **Only these tokens are
substituted** — we do NOT run pasted HTML back through Nunjucks (a stray `{{`/`{%` would
crash the build).

| Token            | Resolves to        | Eleventy source |
|------------------|--------------------|-----------------|
| `{{ page_id }}`  | page filename/slug | `page.fileSlug` |
| `{{ page_url }}` | page path          | `page.url`      |
| `{{ page_title }}` | page title       | `title`         |

FastComments example: `urlId: "{{ page_id }}"` → resolves to the page's slug, locking the
comment thread to the file (matches Jekyll behavior). Omit `urlId` → FastComments falls back
to the URL ("doesn't always need an ID").

### 3. Injection points

- `themes/_base/partials/site-snippets-head.njk` → `{{ site.snippets.head | injectPageVars(page) | safe }}`,
  included at the end of each theme's `head.njk`.
- `themes/_base/partials/site-snippets-footer.njk` → `{{ site.snippets.bodyEnd | injectPageVars(page) | safe }}`,
  included before `</body>` in each theme's base layout.
- FastComments content-bottom placement deferred with the FastComments milestone.

---

## Implementation steps

### Milestone A — GoatCounter + generic head/footer snippets (this session)

1. **`scripts/utils/bloob-settings-reader.js`** — parse body code-fences.
   - gray-matter already returns `.content`; add a fenced-block parser (regex over
     ` ```<name>\n...\n``` `), collect `{ [name]: rawContent.trim() }`, **skip empty**.
   - Return under a new key (e.g. `bloobSettings._embeds`), so frontmatter parsing is
     untouched. Backwards-compatible: no fences → empty map.
2. **`scripts/utils/bloob-settings-reader.js` / `mergeBloobSettings()`** — carry `_embeds`
   through into the merged config (e.g. `merged.embeds`).
3. **`scripts/assemble-src.js` / `generateSiteData()`** — write `site.embeds` map and derived
   `site.snippets = { head, bodyEnd }` into `src/_data/site.js`.
4. **`eleventy.config.js`** — add `injectPageVars(str, page)` filter (token replacement).
5. **Partials** — add `themes/_base/partials/site-snippets-head.njk` and
   `site-snippets-footer.njk`; include head partial in `themes/_base/partials/head.njk` and
   `themes/melt/partials/head.njk`; include footer partial before `</body>` in each theme's
   base layout.
6. **Canonical template** — add a documented `_bloob-settings.md` scaffold under
   `themes/_base/` (or `templates/`) with all settings + snippet fences explained inline.
7. **Tests** — unit test the fence parser (empty vs filled, multiple fences, malformed) in
   `tests/`; unit test `injectPageVars`.
8. **Verify** — build the melt vault; confirm the GoatCounter `<script>` appears in `<head>`
   on every page and does NOT appear for marbles/buffbaby (no fences).

### Milestone B — FastComments (fast follow, same plumbing)

- `partials/comments.njk` rendering `site.embeds['fast-comments-embed'] | injectPageVars(page)`
  at content-bottom in the page layout.
- Per-page `comments: false` opt-out.
- Optional structured convenience: provide only `tenantId`, Bloob generates the widget with
  `urlId: {{ page_id }}` prefilled.

### Milestone C (deferred) — arbitrary placement

- `embed-*` fences are already exposed as `site.embeds[...]`. When a real need appears,
  document dropping `{{ site.embeds['embed-x'] | safe }}` into a theme template. No new code.

---

## Backwards-compatibility / Multi-Site check

- No fences in a vault → `site.embeds` empty → partials render nothing. marbles + buffbaby
  unaffected.
- Only the reader gains body parsing; frontmatter path unchanged.
- New partials are additive; existing themes without the include are unaffected until wired.

## Safety notes

- Raw HTML injection is intentional and trusted (single-owner settings file). `| safe` is
  correct; a bad paste can break a page — documented in the template.
- Never place raw `<script>` in frontmatter (breaks gray-matter). Snippets live in the body.
- Token substitution is scoped to a known vocabulary — not full template eval.

## Commit hygiene

All files here are shared infrastructure (`scripts/**`, `eleventy.config.js`, `tests/**`,
`themes/_base/**`) — one shared commit, cherry-pick-eligible upstream. The melt vault edit
lives in the separate content repo.
