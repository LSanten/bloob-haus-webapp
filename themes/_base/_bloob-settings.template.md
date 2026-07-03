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
permalink_strategy: slugify     # slugify | preserve-case
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
| `{{ page_id }}`  | the page's filename (slug) — stable across URL changes |
| `{{ page_url }}` | the page's URL path |
| `{{ page_title }}` | the page's title  |

> ⚠️ Snippets are injected as raw HTML (you own them). A malformed paste can break a page.
> Never put a raw `<script>` in the frontmatter above — it must live in a fence here.

### GoatCounter analytics → injected in `<head>`

```goat-counter-tracking
<script data-goatcounter="https://YOURCODE.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
```

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
