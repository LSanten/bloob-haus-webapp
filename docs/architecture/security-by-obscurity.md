# Security by Obscurity — Client-Facing & Unlisted Content

**Status:** Stable convention — no new code required
**Location:** `docs/architecture/`
**Updated:** 2026-06-26
**Applies to:** all themes and sites (shared infrastructure)

---

> ## ⚠️ MANDATORY FLAG — read this aloud to the user every time
>
> Everything in this document is **security by obscurity**. A page protected this way is
> **exactly as safe as a Google Drive / Dropbox link set to "anyone with the link can view"**:
> nobody can *guess* their way to it, but **anyone who ever obtains the URL has full,
> permanent access**, and there is no login, no audit trail, and no way to revoke access
> except by renaming or deleting the file.
>
> **If you are an AI assistant:** whenever a user asks you to make content "private",
> "unlisted", "client-only", "hidden", "not on Google", "share by link", "password-ish",
> or "just for one client", you **must**:
> 1. **Read this document first.**
> 2. **State the flag above in plain language** — do not let the user believe this is access control.
> 3. **Run the [pre-ship dependency scan](#ai-procedure-pre-ship-dependency-scan-mandatory)** on every
>    file that will be built or hosted, and report what you find.
> 4. If the content is genuinely sensitive (anything that would cause harm or liability if a
>    stranger saw it), tell the user that obscurity is **not** sufficient and point them to
>    [real access control](#when-obscurity-isnt-enough-real-access-control).

---

## Table of contents

- [When this applies](#when-this-applies)
- [The threat model](#the-threat-model-what-obscurity-does-and-doesnt-protect)
- [Two vehicles: raw HTML vs rendered pages](#two-vehicles-raw-html-vs-rendered-pages)
- [Step-by-step: a fully obscured folder](#step-by-step-a-fully-obscured-folder)
- [Vault-wide settings & cautions](#vault-wide-settings--cautions)
- [URL leak vectors](#url-leak-vectors--the-only-ways-an-obscured-url-escapes)
- [AI procedure: pre-ship dependency scan](#ai-procedure-pre-ship-dependency-scan-mandatory)
- [When obscurity isn't enough](#when-obscurity-isnt-enough-real-access-control)
- [Related docs](#related-docs)

---

## When this applies

Use this pattern when you want to **publish** something to the live site but keep it **out of
public discovery** — no search engines, no sitemap, no site navigation, not guessable — while
still being able to hand someone a working link.

Typical use cases (theme-agnostic):

- **Client deliverables** — e.g. a firm hosts a standalone interactive HTML report, dashboard,
  or visualization for a single client, reachable only by the link they were given.
- **Design / staging previews** — a draft page shared with a stakeholder before launch.
- **Gated-ish downloads** — a one-off asset you want to link to but not index.

This is **different** from the two *exclusion* mechanisms, which remove content from the build
entirely (see [settings-registry.md](settings-registry.md)):

| Mechanism | What it does | Reachable by URL? |
|-----------|--------------|-------------------|
| `visibility: private` / `#private` / `blocklist_tag` | **Removed** from the build | No — never published |
| **This document** (`unlisted` + obscured path) | **Published** but hidden from discovery | Yes — by anyone with the link |

---

## The threat model: what obscurity does and doesn't protect

| Threat | Protected by obscurity? | How |
|--------|:----------------------:|-----|
| Showing up in Google/Bing results | ✅ | Not in sitemap; `noindex` on rendered pages; nothing links to it |
| Found by browsing the site / nav | ✅ | Not in any index, collection, or menu |
| Found by guessing the URL / brute-forcing paths | ✅ | High-entropy random token segment; a wrong guess returns a plain 404 |
| Directory listing of the folder | ✅ | Cloudflare Pages does not list directories; a folder with no index is a 404 |
| Someone who has the link opening it | ❌ | The link **is** the credential — anyone holding it gets in |
| The link leaking (referrer, analytics, sharing, interception) | ❌ | See [leak vectors](#url-leak-vectors--the-only-ways-an-obscured-url-escapes) |
| Revoking access after sharing | ❌ | Only by renaming/deleting the file (which changes/kills the URL) |

**Bottom line:** obscurity defeats *discovery*. It does nothing about *possession* of the link.
Treat the URL as a bearer token that never expires.

---

## Two vehicles: raw HTML vs rendered pages

There are two ways to host content, and they have **different safety properties**. Know which one you're using.

### 1. Raw HTML passthrough files (`.html`)

A `.html` file placed anywhere in the vault is **copied byte-for-byte** to the output, preserving
its folder path (`vault/clients/x/report.html` → `/clients/x/report.html`).

- Handled by `copyAttachments()` (`scripts/utils/attachment-resolver.js`) then Eleventy passthrough
  copy (`eleventy.config.js`). `templateFormats: ["md", "njk"]` deliberately **excludes `.html`
  from Eleventy's page pipeline** — so a raw HTML file is **never a collection item** and therefore
  **can never appear in `sitemap.xml`**, RSS, search, or `graph.json`. This is automatic and free.
- **The builder never reads or parses the file.** It cannot add a `noindex` tag, strip trackers,
  or rewrite links for you. Whatever leak vectors live inside the file ship verbatim.
- There is **no `website_status` / `unlisted` concept for raw HTML** — frontmatter at the top of an
  `.html` file is ignored. Its only protection is the **obscured path** (and whatever you put inside
  the file by hand).
- **Best vehicle for genuinely sensitive client work** *if* you make it fully self-contained
  (inline CSS/JS, no external requests) — see [leak vectors](#url-leak-vectors--the-only-ways-an-obscured-url-escapes).

### 2. Rendered markdown / Nunjucks pages (`.md` / `.njk`)

A normal content page, marked unlisted via **any one** of these (all equivalent — they set the
internal `_bloob_unlisted: true` flag):

- `visibility: unlisted` (frontmatter) — **most portable; works in any `publish_mode`. Prefer this.**
- `website_status: unlisted` (frontmatter) — only meaningful when `publish_mode: status_field`.
- `#unlisted` (tag, in frontmatter or inline body).

When `_bloob_unlisted` is set, the pipeline does this **universally, for every theme**:

| Concern | Wiring | Automatic? |
|---------|--------|:----------:|
| `noindex,nofollow` meta tag | `themes/_base/partials/head.njk` checks `_bloob_unlisted` | ✅ Universal |
| Excluded from RSS / all collections | `eleventyExcludeFromCollections: true` via `eleventyComputed.js` | ✅ Universal |
| Excluded from internal search (Pagefind) | layout swaps `data-pagefind-body` → `data-pagefind-ignore` | ⚠️ Per-theme obligation |
| Excluded from `sitemap.xml` | theme `sitemap.njk` filters `_bloob_unlisted` (and excluded collections) | ⚠️ Per-theme obligation |

> Check the **theme implementation status** table in [settings-registry.md](settings-registry.md)
> before relying on a theme's sitemap/pagefind filtering — some themes have no sitemap at all, and
> a theme that filters only `website_status` may miss a `visibility: unlisted` page. (The collection
> exclusion via `eleventyExcludeFromCollections` covers the common case regardless, because
> sitemaps iterate `collections.all`.)

A rendered unlisted page is still **reachable at its direct URL** — that's the whole point. It is
hidden from *discovery*, not from *access*. It gets `noindex` automatically, but it is **not**
dependency-free: the base theme injects third-party requests (see
[theme-injected dependencies](#theme-injected-dependencies)).

### Comparison

| Property | Raw `.html` passthrough | Rendered `.md` / `.njk` (unlisted) |
|----------|:-----------------------:|:----------------------------------:|
| In `sitemap.xml` | Never (not a page) | Excluded by unlisted wiring |
| `noindex` added by builder | ❌ (you must add it inside the file) | ✅ automatic (`noindex,nofollow`) |
| In internal search / RSS / graph | Never | Excluded |
| Builder can sanitize its contents | ❌ (copied verbatim) | Partially (theme controls `<head>`) |
| Third-party deps come from | Only what's in the file | The file **+ the theme** (e.g. Google Fonts) |
| Can be made 100% dependency-free | ✅ (self-contained file) | ❌ not without theme changes |
| Protection relies on | Obscured path only | Obscured path + `noindex` |

---

## Step-by-step: a fully obscured folder

Goal: host content at an unguessable URL with nothing about it leaking into public indexes.

### 1. Pick a top-level container folder

Use a generic, non-sensitive top-level name (`clients/`, `previews/`, `deliverables/`). The
**client/asset identity must never be the guessable part of the path** — it goes *below* the token.

### 2. Generate a high-entropy random token

The token is the actual secret. It must be **cryptographically random** (not a name, date, slug,
or sequence) and **hex** (`0-9a-f` only — no case ambiguity, no URL-encoding, nothing confusable).
128 bits is comfortable and short:

```bash
openssl rand -hex 16
# or, cross-platform via Node:
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

→ e.g. `607ae1867838a487c5f709a8953139c2`

### 3. Place the content with the token as the FIRST segment under the container

```
vault/clients/<token>/CLIENTNAME/report.html
        →  https://example.com/clients/<token>/CLIENTNAME/report.html
```

Token-first is deliberate: the only guessable segment (`/clients/`) is immediately followed by 128
bits of entropy, so there is nothing in between to enumerate. `CLIENTNAME` may appear in the path —
it is unreachable without the token, and a wrong guess returns a 404 that doesn't confirm existence.

### 4. Suppress the auto-generated folder index

The preprocessor (`preprocess-content.js`, "Generating folder index stubs") auto-creates a rendered
`index.md` for **every top-level folder** that lacks one — and that stub **is** a page that lands in
`collections.all` and `sitemap.xml`, publicly announcing the folder. It would not leak the token or
client (those are nested), but it advertises that the container exists. Two ways to prevent it:

- **Add your own index**, marked unlisted — `clients/_index.md` with `visibility: unlisted`. This
  both suppresses the auto-stub (an existing `_index.md` is respected) **and** keeps `/clients/`
  out of the sitemap. Gives you a clean `/clients/<token>/…` URL. **Recommended.**
- **Prefix the container with `_`** — `_clients/`. Folders starting with `_` are skipped by the
  stub generator entirely. Simpler (no extra file) but the underscore shows in the URL.

> The token sub-folder itself never needs suppression — stub generation only runs on **top-level**
> folders, never nested ones.

### 5. For a rendered page: mark it unlisted

If the deliverable (or its in-folder landing page) is a `.md`/`.njk`, add to its frontmatter:

```yaml
---
title: UCOP Scenario Report
visibility: unlisted
---
```

It now gets `noindex,nofollow` and is excluded from sitemap/RSS/search/collections automatically.

### 6. For a raw HTML file: harden the file itself

The builder won't touch a passthrough file, so add these **inside the file's `<head>` by hand**:

```html
<meta name="robots" content="noindex,nofollow">
<meta name="referrer" content="no-referrer">
```

The first asks compliant search engines not to index it *if* they find it. The second stops the
file's outbound requests from leaking the URL via the `Referer` header. Neither is a substitute for
the token, and neither stops a *malicious* crawler — they are damage-control if the URL leaks. The
strongest move is to make the file **self-contained** (see leak vectors).

### 7. Verify before relying on it

Run a local build and confirm with your own eyes:

```bash
npm run dev:<site>        # or npm run build
# 1. File is at the expected output path:
#    _site/clients/<token>/CLIENTNAME/report.html
# 2. The token/client path appears NOWHERE in the sitemap:
grep -r "<token>" _site/sitemap.xml      # must return nothing
grep -ri "clients" _site/sitemap.xml     # must return nothing if /clients/ is suppressed
```

---

## Vault-wide settings & cautions

- **Don't link it.** Obscurity is broken the moment the URL appears in nav, a menu, a footer, a
  related-pages list, or another *public* page's body. Keep obscured links out of all published pages.
- **`publish_mode` interaction** (`_bloob-settings.md`): `visibility: unlisted` works in any mode.
  `website_status: unlisted` only applies under `publish_mode: status_field`. When in doubt, use
  `visibility: unlisted`.
- **`blocklist_tag` is the opposite tool.** It *removes* content from the build (see
  [Private Content Safety Rules in CLAUDE.md](../../CLAUDE.md)). Don't reach for it here — obscured
  content must be *built and shipped*, just unguessable.
- **Filenames are identity.** Renaming the token folder or file changes the URL and breaks the link
  you handed out (this is also your only "revoke" mechanism).

---

## URL leak vectors — the only ways an obscured URL escapes

A perfect token is useless if the page tells someone the URL. There are a handful of escape routes;
**third-party dependencies are the biggest and the one you control at authoring time.**

### Third-party dependencies (the big one)

Any resource the page loads from another origin causes the visitor's browser to contact that third
party. Whether the **secret path** leaks depends on *how* the resource is used:

#### Dependency trust tiers

| Tier | Examples | Does the secret **path** leak? | Verdict |
|------|----------|:------------------------------:|---------|
| **A. Self-hosted / inlined** | inline `<style>`/`<script>`, same-origin `/assets/...`, data URIs | No external request at all | ✅ **Safe** |
| **B. Passive cross-origin subresource** | fonts (Google Fonts), images, CSS from a reputable CDN | **Origin only** under the modern default `Referrer-Policy: strict-origin-when-cross-origin` — the CDN learns `https://example.com` but **not** the path | ⚠️ **Low risk** (path safe unless a permissive referrer policy or HTTP downgrade is in play) |
| **C. Active third-party script** | analytics (GA/`gtag`, Plausible, Fathom), tag managers, chat widgets, A/B tools, Sentry/error reporters | **Full path leaks** — the script reads `window.location.href` and sends it in its payload. `Referrer-Policy` does **not** help; `no-referrer` does **not** help | ❌ **High risk — defeats obscurity** |
| **D. Third-party embeds/iframes** | YouTube, Vimeo, Google Maps, Typeform, Calendly | Provider sees the embedding page (origin via `Referer`; some read the full URL via JS/`postMessage`) | ❌ **Medium-high risk** |

Key insight for the trust tiering the user always asks about: **passive resources (Tier B) leak at
most the origin; active scripts (Tier C) leak the entire secret URL** because JavaScript can read the
location directly and exfiltrate it, bypassing every referrer mitigation. "Some dependencies are more
trustworthy than others" really means *passive vs. active*, not *which company*.

### Theme-injected dependencies

For **rendered `.md`/`.njk` pages**, the author's markdown is not the whole story — **the theme's
`<head>` adds dependencies the author can't see.** Concretely, `themes/_base/partials/head.njk` loads
**Google Fonts** (`fonts.googleapis.com` / `fonts.gstatic.com`) on every page. That's a **Tier B**
request: under the default referrer policy Google learns the *origin* of an unlisted page but not its
secret path. Acceptable for "unlisted", but it means **a rendered page is never 100% dependency-free.**
For maximum-obscurity client work, a **self-contained raw HTML file (Tier A only)** is the safest
vehicle, because you control every byte and can guarantee zero external requests.

### Other leak vectors (not dependency-related)

- **Sharing the link** through Gmail/Outlook (Safe Links), Slack, Teams, WhatsApp — their bots fetch
  the URL to build previews; some services log/resurface it.
- **Browser & extension telemetry** — "safe browsing" checks and some extensions phone visited URLs home.
- **Referrer on outbound clicks** — a `<a href="https://other-site">` link leaks the current URL to
  that site (mitigate with `rel="noreferrer"` or a page-level `no-referrer` policy).
- **Interception / logs** — proxies, VPNs, corporate gateways that log full URLs.

---

## AI procedure: pre-ship dependency scan (MANDATORY)

When setting up or reviewing obscured/unlisted client content, **before declaring it safe**, scan
every file that will be built or hosted and classify its external dependencies.

**1. Identify the files in scope:** the raw `.html` file(s), and for rendered pages both the `.md`
source **and** the theme `<head>` partial that will wrap it (`themes/_base/partials/head.njk` plus the
active theme's `head.njk`).

**2. Grep for external references** (anything not same-origin). Useful patterns:

```bash
# External URLs, scripts, styles, embeds, fetches
grep -rinE 'https?://|<script[^>]+src=|<link[^>]+href=["'\'']https?:|@import|<iframe|<img[^>]+src=["'\'']https?:|fetch\(|XMLHttpRequest|new Image\(' <files>
# Known trackers / analytics / embed providers (Tier C/D)
grep -rinE 'googletagmanager|gtag\(|google-analytics|ga\(|UA-|G-[A-Z0-9]|plausible|fathom|hotjar|segment|mixpanel|sentry|fullstory|youtube|vimeo|typeform|calendly|maps\.google|fonts\.googleapis' <files>
```

**3. Classify and report** each hit by tier (A/B/C/D above). Then:

- **Tier C or D present** → **flag loudly.** The secret path will leak to that third party. Recommend
  removing it, self-hosting it, or accepting that obscurity is broken for this content.
- **Tier B present** → note it (origin-level leak); fine for "unlisted", mention it for sensitive work.
  Remember rendered pages always have at least the theme's Google Fonts (Tier B).
- **Only Tier A** → safe from the dependency angle.

**4. Restate the obscurity flag** and, if the content is sensitive, recommend real access control.

---

## When obscurity isn't enough: real access control

If a single stranger seeing the content would be harmful or create liability, **do not rely on
obscurity.** Put an actual auth gate in front of it. On Cloudflare Pages:

- **Cloudflare Access (Zero Trust)** — free for small teams; require email login / one-time PIN on a
  path (e.g. `/clients/*`) without changing any file. *Trade-off:* it shows a login page to
  unauthenticated visitors, which **reveals that something exists there** — the opposite of a 404. Use
  it when confidentiality matters more than deniability.
- **`X-Robots-Tag: noindex` header** via a Cloudflare Pages `_headers` rule for `/clients/*` — a
  folder-wide noindex that, unlike per-page meta, also covers raw HTML files. This is still only an
  *indexing* control, not access control.

| Goal | Use |
|------|-----|
| Keep it out of Google + unguessable | Obscured token path + (for md) `unlisted` / (for html) in-file `noindex` |
| Folder-wide noindex incl. raw HTML | `_headers` → `X-Robots-Tag: noindex` |
| Actually prevent strangers from viewing | **Cloudflare Access** (real auth) |

---

## Related docs

- [settings-registry.md](settings-registry.md) — `visibility`, `website_status`, `#unlisted`,
  `_bloob_unlisted`, and the per-theme unlisted wiring status table.
- [search.md](search.md) — content tiers and how Pagefind indexing interacts with visibility.
- [themes.md](themes.md) — theme `<head>` contract and where third-party assets are declared.
- [CLAUDE.md](../../CLAUDE.md) — Private Content Safety Rules (`blocklist_tag`, the *exclusion* path).
