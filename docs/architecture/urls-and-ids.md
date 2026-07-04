# URLs & Page IDs — Canonical Contract

**Purpose:** The single authoritative spec for how a Bloob Haus page's URL and its canonical
ID are derived. Any tool that needs to reproduce a page's URL from the vault alone (the
Obsidian plugin's copy-link, comment IDs, cross-site linking) MUST follow this contract.

**Last Updated:** 2026-07-03

---

## Where URL settings are declared

All URL-affecting settings live in **one place**: the `url:` block in the vault's
`_bloob-settings.md`. This makes the vault self-describing — a plugin can compute any page's
URL without reading the webapp's `sites/*.yaml`.

```yaml
url:
  base: https://leons.bloob.haus   # full base URL (subdomain OR custom domain)
  case: preserve                   # preserve | lower
  date_prefix: keep                # keep | strip | none
  mount_path: ""                   # optional subpath, e.g. "marbles"
```

| Key | Values | Meaning |
|-----|--------|---------|
| `base` | full URL | Site origin. `https://{subdomain}.bloob.haus` or a custom domain. |
| `case` | `preserve` / `lower` | Casing of path segments. `lower` = lowercase everything (slugify); `preserve` = keep original capitals. |
| `date_prefix` | `keep` / `strip` / `none` | How a leading `YYYY-MM-DD-` on a filename is treated. `keep` = date stays in the URL; `strip` = date used for `date_created` but removed from the URL; `none` = ignored. |
| `mount_path` | string | Mount the whole site under a subpath (`/marbles/`). Empty = root. |

**Backwards-compat:** the reader still honors the legacy flat keys
(`permalink_strategy`, and the `sites/*.yaml` `permalinks` / `date_from_filename` /
`date_prefix_slugs` / `mount_path` values). The `url:` block wins when present. Mapping is in
`scripts/utils/bloob-settings-reader.js` (`mergeBloobSettings`).

## URL derivation algorithm

```
URL = base
    + (mount_path ? "/" + mount_path : "")
    + "/" + slug(each folder segment)          // folder structure → path
    + "/" + slug(filename without .md)          // the page
    + "/"                                        // trailing slash
```

- `slug()` = `case: lower` → lowercase, strip non-`[a-z0-9-]`, spaces→`-`; `case: preserve` →
  keep case, spaces→`-`, strip only URL-unsafe chars. Implemented in
  `scripts/utils/slug-strategy.js` (`getSlugFunction`). **Do not reimplement — reuse it.**
- Applied **per segment** (each folder + the filename).
- **Index files:** `folder/index.md` → `/folder/`; root `index.md` → `/`.
- **Date prefix:** with `keep`, `2026-06-24-my-post.md` → `/2026-06-24-my-post/`; with `strip`
  → `/my-post/`; with `none` the prefix is treated as part of the name.

The build implements this in `scripts/utils/file-index-builder.js` (`buildFileIndex`) and the
permalink injection in `scripts/preprocess-content.js`. Eleventy's `page.url` is the result.

## Canonical page ID

**ID = lowercased `host + path`, no scheme, no trailing slash.**

```
id = (host_of(base) + page.url).toLowerCase().replace(/\/+$/, "")
```

Implemented in `scripts/utils/page-id.js` (`derivePageId`). Examples:

| base | page.url | ID |
|------|----------|-----|
| `https://leons.bloob.haus` | `/marbles/My-Note/` | `leons.bloob.haus/marbles/my-note` |
| `https://melt.bloob.haus` | `/about-melt/` | `melt.bloob.haus/about-melt` |
| `https://buffbaby.bloob.haus` | `/` | `buffbaby.bloob.haus` |

Properties:
- **Domain-unique** — the host namespaces every subdomain, so one shared comment account
  (FastComments tenant) never collides across sites.
- **Lowercased (ID only)** — the visible URL is unchanged (preserve-case sites keep their
  casing). Lowercasing the ID prevents a comment thread from splitting over a capital-letter
  difference in how the URL was reached.
- **Human-readable, no random IDs** — it *is* the page's address.
- **Stability:** renaming/moving a note re-keys its ID (and its comments). This matches the
  existing File Identity Convention (`CLAUDE.md`). Rename-stable identity is deferred to Phase 3+.

Inspired by Obsidian's name+path referencing, but always fully-qualified (host + full path),
so it is unique by construction rather than "disambiguated only when a collision appears."

### Consuming the ID

- **In templates:** `{{ page | bloobPageId(site.url) }}` (filter in `eleventy.config.js`).
- **In `_bloob-settings.md` snippets:** the `{{ page_id }}` token (substituted by the
  `injectPageVars` filter). Also available: `{{ page_url }}` (path), `{{ page_full_url }}`
  (absolute URL, preserve-case), `{{ page_title }}`.
- **On every rendered page:** `<meta name="bloob-page-id" content="…">` in `head.njk`, so
  external tooling can read the ID without recomputing it.
- **FastComments:** set `urlId: "{{ page_id }}"` to lock a comment thread to the page.

## Deferred / related (not in this contract yet)

- **bloob↔bloob cross-site linking** — a standard for linking between Bloob sites by ID.
- **Cloudflare case-insensitive URLs** — serving an uppercase request for a lowercase page
  (avoids 404 on casing drift). Infra-side; complements the lowercased ID.
- **Obsidian plugin copy-link (#5)** — the plugin must implement this contract (read the `url:`
  block, apply `getSlugFunction`) so its copied URL matches the deployed URL.
