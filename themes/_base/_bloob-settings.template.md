---
# ─────────────────────────────────────────────────────────────────────────────
# Canonical _bloob-settings.md scaffold. Copy this into a content vault's root as
# `_bloob-settings.md` and edit the properties below in Obsidian.
# This file is a REFERENCE — it is not copied into any build.
# Full, authoritative list of every setting: docs/architecture/settings-registry.md
# ─────────────────────────────────────────────────────────────────────────────
subdomain: example              # → example.bloob.haus
repo: LSanten/example-vault
name: Example Site
description: one-line site description
author: your name
language: en-us
theme: marbles-pouch            # marbles-pouch | melt | warm-kitchen | alter-engineers
default_shape: note             # fallback shape for pages with no bloob-shape: — governs their
                                # layout AND commentability. Falls through to page.njk (commentable)
                                # until the named shape is built. Optional; see docs/architecture/shapes.md
                                # Per-shape banners/identity: add a _bloob-shapes.md to this vault
                                # (scaffold: themes/_base/_bloob-shapes.template.md). Optional.
url:                            # how URLs are built — see docs/architecture/urls-and-ids.md
  base: https://example.bloob.haus
  case: lower                   # lower (lowercase) | preserve (keep capitals)
  date_prefix: none             # keep | strip | none
  mount_path: ""                # optional subpath, e.g. "marbles"
publish_mode: blocklist         # blocklist | allowlist
blocklist_tag: private
visualizers: []
features:
  rss: true
  sitemap: true
  robots_txt: true
  search: true
  og_images: true
  tags: true
show_visitor_count: false       # show a per-page view count. Needs BOTH this AND the
                                # "Allow using the visitor counter" setting inside your
                                # GoatCounter site settings, which also defaults to OFF —
                                # without it the counter endpoint answers 403 and nothing
                                # is shown. Requires the goat-counter-tracking fence below
                                # (the site code is read from it). Override per note with
                                # `visitor_count: true` / `false` in that note's frontmatter.
logo: "[[logo.png]]"
favicon: "[[favicon.png]]"
---

# Example Site Settings

Edit the properties above in Obsidian to change publishing behavior.
Don't rename or move this file.

## Snippets & embeds

Paste raw HTML/JS snippets into the fenced blocks below. Each block is injected on
**every page** at a fixed location. An **empty block is ignored** — that is how you turn
a snippet off. See `docs/architecture/settings-registry.md` and the implementation plan
`docs/implementation-plans/phases/phase-2/2026-07-03_snippet-injection-analytics.md`.

**Per-page tokens** available inside any snippet (substituted at render time):

| Token            | Becomes             |
|------------------|---------------------|
| `{{ page_id }}`  | canonical page ID — lowercased host + path (domain-unique; use for FastComments `urlId`) |
| `{{ page_url }}` | the page's URL path |
| `{{ page_full_url }}` | the page's absolute URL |
| `{{ page_title }}` | the page's title  |

> ⚠️ Snippets are injected as raw HTML (you own them). A malformed paste can break a page.
> Never put a raw `<script>` in the frontmatter above — it must live in a fence here.

### GoatCounter analytics → injected in `<head>`

Sign up at [goatcounter.com](https://www.goatcounter.com/), pick a site code, and paste
the snippet it gives you. Replace `YOURCODE` if you copy the line below by hand.

```goat-counter-tracking
<script data-goatcounter="https://YOURCODE.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
```

**To show visitor counts on your pages**, two switches must both be on:

1. `show_visitor_count: true` in the frontmatter above.
2. **"Allow using the visitor counter"** in GoatCounter → *Settings* → *Site settings*.
   This defaults to **off**. Until you turn it on, GoatCounter answers the count request
   with `403 Need to enable the 'allow using the visitor counter' setting` and the site
   shows nothing — no error, just no number.

The count is fetched as JSON and rendered in your own theme's styling, so there is no
GoatCounter badge or branding. Hide it on one note with `visitor_count: false` in that
note's frontmatter; show it on one note with `visitor_count: true`.

### FastComments → placed at the bottom of each page's content

`urlId: "{{ page_id }}"` locks the comment thread to the filename. Omit `urlId` to key by URL.

```fast-comments-embed
<div id="fastcomments-widget"></div>
<script src="https://cdn.fastcomments.com/js/embed-v2.min.js"></script>
<script>
  FastCommentsUI(document.getElementById('fastcomments-widget'), {
    tenantId: "YOUR_TENANT_ID",
    urlId: "{{ page_id }}"
  });
</script>
```

### Generic buckets (put anything here)

```header-snippet

```

```footer-snippet

```
