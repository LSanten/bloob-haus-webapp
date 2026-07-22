# Bloob Haus - Changelog

Development session history and completed work.

---

## Session Log

### Session 62 — July 21, 2026
**Worked on:** Scene-nav builder rework — brainstorm → spec → 3 phased plans → executed all three. Spec `docs/implementation-plans/2026-07-21_scene-nav-builder-rework-and-resolution.md`, Plan 1 `…_scene-nav-grammar-v2.1-plan.md`. Branch `scene-nav-builder-rework`. Suite 570 → 597 tests; verified via melt full build + marbles core-family per-page build + headless Chrome.

- **Grammar v2.1 (Plan 1, TDD):** per-element **`hoverGlow`/`hoverScale`** toggles (default on; parse → `data-hover-*` → `browser.js` `hoverStyles()` → serialize); **`label` tri-state** (`label: false`/`off` suppresses; value overrides; absent = alt); **`[[wiki]]` goto**; shared **`on/off/true/false`** vocabulary. `browser.js` DOM wiring guarded behind `typeof document` (unit-testable pure `hoverStyles`).
- **Image resolution (Plan 3a):** scene-nav resolves its OWN image refs (it writes `[alt](x.png)` links the general resolver skips) via the attachment index — basename-first, path-aware, verbatim fallback → root-relative encoded URLs. Fixed the melt homepage **Contact us 404** (basename ref) and made scene-navs work on subpages (**also fixed marbles core-family**, whose `../media/…` refs 404'd on its subpath). Raw refs stay in the debug blob (round-trip). `preprocess` now writes `_data/attachmentIndex.json` (generic build data for ref-carrying shapes).
- **Builder GUI rework (Plan 2):** debug-overlay side panel reworked — foldable sections (Scene/Add/Elements/Selected/Background/Export) + **hide/reopen** toggle; ported bloob-relevant controls from the deleted magic-machine GUI (glow-color **swatches** + picker, **flip H/V**, glowIntensity + x/y/scale/rotation sliders, **show-on**); new **hover-glow / hover-enlarge / show-label** toggles; **mockup image upload** (local object-URL preview + "not saved to your vault" notice; backend save deferred). Shopify UI removed (`embed-serializer.js` kept in code, silent). Export = **Copy ::: block** only.
- **Goto raw-preservation (Plan 3b):** captures each scene-nav block's PRE-resolution raw (`_rawsource` → `data-vis-raw-source`, scene-nav only, inert elsewhere) and sources the debug blob from it, so **"Copy ::: block" reproduces the exact authored `goto: [label](note.md)`** (Obsidian-clickable) while rendering/`data-value` stay resolved (marbles `data-value` verified unchanged). `parser` retains `gotoRaw`; `inject-container-raw` parameterized `{attr, onlyShape}`.
- **Docs:** shared "Authoring & resolution conventions" block in `shapes.md` (+ `visualizers.md` cross-link); schema.md v2.1 + builder notes; DECISIONS entry. `settings-registry` intentionally untouched (shape-block grammar lives in schema.md). Backend image-save for mockup upload remains the only deferred item.

### Session 61 — July 20, 2026
**Worked on:** Scene-nav shape v2 + melt site work. Spec `docs/implementation-plans/2026-07-20_scene-nav-shape-v2-and-melt-background.md`, plan `…/2026-07-20_scene-nav-v2-plan.md` (executed subagent-driven Tasks 1–6, inline 7–10).

- **Logo pipeline fixes:** `resolveLogoUrl` md-link bare filenames now glob src/ (melt logo 404 fixed); md-link labels flow to `site.logoAlt` → alt attributes in melt + warm-kitchen.
- **Melt quick wins:** text h1 hidden (logo img is the accessible h1), homepage tab/og title prefers page `title:`, `subtitle:` frontmatter for the tagline.
- **Background pipeline (universal, opt-in):** `background_image` in `_bloob-settings.md` → `scripts/generate-background.js` (1920px webp, hash-cached) → `site.backgroundImage`; melt renders fixed full-bleed layer + legibility scrim (scrim opacity = design call to revisit). Also fixed `mergeBloobSettings` dropping the key.
- **Scene-nav v2 (breaking, migrated):** `::: scene-nav` nested-bullet grammar (md-link images = alt text; `at:`, `goto:`, `background` flag, nested `mobile:` overrides); shape owns its parsing (CRLF-safe); old YAML code fence deprecated (build warns); `serializeBlock` inverse. Both legacy users migrated: marbles core-family page, melt homepage (replaces circular-nav; playlists bubble omitted — no image asset).
- **Builder consolidation:** `lib/magic-machines/scene-nav-builder/` **deleted**; `lib/visualizers/scene-nav/builder/` debug overlay (drag, side panel, mobile-layout mode) lazy-loaded on `debug: on`; exports `:::` block + Shopify embed HTML (embed reuses the shape's own renderer). Bundler rule: any `builder/index.js` → ESM `[name]-builder.js`.
- Tests 570 across 32 files. Open follow-ups in `.superpowers/sdd/progress.md` (final-review items: shared `</section>` regex nesting limit, DOMContentLoaded guard, mobile position tuning via builder).

### Session 60 — July 20, 2026
**Worked on:** Designed and wrote the **onboarding documentation** so external forkers (starting with collaborator **Odalys**) can stand up their own bloob haus. Design spec: `docs/implementation-plans/2026-07-20_onboarding-docs.md`.

**Structure — two audience buckets (deliberate separation):**
- **Bucket 1 — public onboarding** (`docs/onboarding/`): `README.md` (guided-path entry), `prepare-your-vault.md` (content-first; the "`bloob-shape:` is the only load-bearing YAML" thesis; **now the canonical home for the media convention**), `fork-deploy-and-workflow.md`. Plus annotated `sites/_template.yaml`. Travels with every fork; stranger-safe; zero collaborator specifics.
- **Bucket 2 — collaborator kit** (`docs/collaborators/`): `README.md` + three templates (`collaborating`, `field-notes`, `CLAUDE.local`). Quarantined from the public path.

**Anti-sprawl rule enforced:** onboarding docs *link into* the architecture SSOTs (`ontology.md`, `shapes.md`, `themes.md`, `settings-registry.md`, `urls-and-ids.md`) and never restate them.

**Field-log mechanism (solves "her AI, not mine"):** a *tracked* `<name>-field-notes.md` (reaches Leon via PR) driven by a *gitignored* `CLAUDE.local.md` (exists only on her clone — Leon's AI never sees it). `CLAUDE.local.md` added to `.gitignore`. `CLAUDE.local.md` verified as current/non-deprecated Claude Code "Local instructions" scope.

**SSOT fixes:** media convention given a canonical home (was homeless); documented the *real* verified media behavior (copied from anywhere; wiki `![[x]]` embeds resolve by basename only → collision risk; single-`media/`-folder recommended). Stale test counts corrected — README "195+" and CLAUDE_CONTEXT "297/16 files" → **534 across 30 files**.

**Confirmed with Leon:** melt is the starter theme handed to Odalys.

**Deploy model — B1 chosen (Leon):** Odalys builds in *her* GitHub Actions, deploys to *Leon's* Cloudflare (project `odalys`). Accepted secrets tradeoff (dedicated revocable CF token in her fork). DNS near-automatic under B1 (same-account Custom Domain auto-creates the CNAME).
- **Fork-isolation guard APPLIED** — `if: github.repository == 'LSanten/bloob-haus-webapp'` added to every job in `deploy-marbles/buffbaby/melt.yml`, `preview-buffbaby.yml`, and `rebuild-all.yml`'s deploy job. Inert in any fork (no failed-run noise); Leon's own deploys unaffected (condition true in his repo).
- **`docs/collaborators/deploy-odalys.template.yml` written** — fork-only, guarded to `odalysbest/bloob-haus-webapp` (VERIFY fork owner), documents required secrets. Leon drops it into her fork.
- Public deploy doc's "Model 2" updated to match B1 (build-in-fork + `repository_dispatch`, not a CF Deploy Hook).

**Not yet done / next:** commit whole session together (repo also has unrelated in-flight `scripts/` changes — commit will be curated, not blanket); real-session dry-run of the `CLAUDE.local.md` logging trigger in an actual forked clone; DNS click-steps once the `odalys` Pages project exists; confirm Odalys's fork owner.

### Session 59 — July 20, 2026
**Worked on:** Finished the **bloob-shapes unification** plan (`_bloob-types.md` → `_bloob-shapes.md`), now in `_completed/`. Resolves TECH-DEBT #34.

**Built / fixed (shared pipeline, TDD):**
- Reader (`bloob-objects-reader.js`) now reads `_bloob-shapes.md` (`bloob-shape` key column) with precedence over legacy `_bloob-types.md` / `_bloob-objects.md`; `layout` column optional; per-shape `fastcomments` / `showvisitorcount` parsed (7 new tests).
- `publish-filter.js` now skips **any** `_bloob-*` file (reserved system-file prefix) — also stops `_bloob-auto-tagging.md` leaking as a page (hit marbles too); `_index.md` guarded (2 new tests).
- New `themes/_base/_bloob-shapes.template.md` scaffold + cross-link from `_bloob-settings.template.md`.
- Docs reconciled — "visualizer ≡ shape", `bloob-shape` = single forward-facing identity+rendering key: `visualizers.md`, `shapes.md`, `ontology.md`, `settings-registry.md`, `themes.md`, `theme-standards.md`.
- melt is a clean reference — deleted its `_bloob-types.md` (left uncommitted in the `melt-website` repo for Leon).

**Left deferred (per original plan):** steps 3–4 — per-shape behavior *gating* (columns parsed, templates don't consume them yet). Tracked in IDEAS.md.

**Follow-ups (same session, for onboarding a Windows author):**
- **Parallelized OG image generation** — `generate-og-images.js` now processes images with bounded concurrency (new tested `scripts/utils/map-concurrent.js`) instead of one at a time; big win on cold builds. Default `min(cpus, 8)` locally, **capped at 2 in CI** (`process.env.CI`) so shared/containerized runners can't oversubscribe; override with `OG_CONCURRENCY`. Output verified byte-identical to sequential.
- **Windows cross-platform fix (TECH-DEBT #25)** — replaced the `import.meta.url === \`file://${process.argv[1]}\`` direct-run idiom (silently broke on Windows paths, killing theme hot-reload) with a tested `isMainModule()` helper (`pathToFileURL`-based) across all 13 scripts.

**Verified:** `npm test` 543 pass; marbles + buffbaby full builds render in headless Chrome; melt/marbles registry reads confirmed.

### Session 58 — July 8, 2026
**Worked on:** Wrote the Phase 3 **V1 spike implementation plan** and **started the backend build** in a new separate repo `../bloob-haus-cloud/` (kept out of this Eleventy builder — "don't mix").

**Built (in bloob-haus-cloud):** Cloudflare **Worker** routing — `decideRoute` (fail-closed: unknown `/m/*` ⇒ private) + injectable `handleRequest` (public→edge asset, private→proxy w/ cookie forwarding, `no-store`), 12 offline Vitest tests. Next.js **app** — Better Auth (Google) + session-gated `/m/[slug]`; `auth.ts` env-switches SQLite (local) ↔ Postgres (`DATABASE_URL`, prod) with no code change. **Google login proven locally.** OAuth client created under `dev.bloob@gmail.com`.

**Decided (docs committed here):** identity = free Gmail `dev.bloob@gmail.com` for Google+Scaleway (`admin@bloob.haus` = Cloudflare forward, not a Google account); Scaleway confirmed (only EU-sovereign provider w/ true scale-to-zero); billing country = where you are (sovereignty = *provider* choice, not billing address); subdomains + custom domains moved *early*; centralized auth on `auth.bloob.haus` (no wildcard OAuth redirect URIs).

**Blocked (needs Scaleway account — billing country-change ticket pending):** container deploy, the real cross-subdomain cookie proof (spike Task 1 — the crux), Postgres migration, Worker deploy, E2E.

**Verified:** builder `npm test` 514 pass; bloob-haus-cloud 12 worker tests pass + local Google login works.

### Session 57 — July 6, 2026
**Worked on:** Brainstormed + locked the Phase 3 **webapp backend & identity architecture** (design only — no code).

**Decisions reached:** backend on **Scaleway EU from day one** (privacy-first; 0 infra today ⇒ no build-then-migrate risk — Leon's central worry); **one Next.js app** (dashboard UI + API + auth) in a Scaleway Serverless Container; **Better Auth** with Google + GitHub + account linking (supersedes the May vision plan's NextAuth — Lucia deprecated, Auth.js frozen); content = **markdown files in Object Storage** (vault-shaped), ledger = **Postgres**; **Cloudflare Worker + KV** public/private split (existing sites untouched); **API-first** (UI only ever calls the API ⇒ MCP is a thin Phase-4 wrapper). V1 = thin vertical spike (Google login → 1 public + 1 private marble).

**Wrote:** `docs/implementation-plans/phases/phase-3/2026-07-06_webapp-backend-identity-architecture.md` — settled design + cost (~€15–20/mo) + 14 open questions. DECISIONS entry added. `docs/next-steps.md` created as the next-session launch point.

**Left incomplete (by design):** the detailed V1 implementation plan (write when the build starts, via writing-plans); open questions incl. mount_path #16 / multi-repo rooms, note IDs, session-across-proxy, API-key auth details.

**Verified:** `npm test` 514 pass (no code changed).

### Session 56 — July 6, 2026
**Worked on:** Cross-origin embed auto-height + font matching (so `bloob-haus-homepage` can embed a live marble that resizes itself).

**Shared pipeline:**
- `themes/_base/partials/iframe-resize.njk`: added a namespaced postMessage protocol on top of the existing same-origin resizer. A framed page now **broadcasts** its height (`{__bloobEmbed:'height',…}` on load / `ResizeObserver` / `fonts.ready`) and any page **receives** heights from trusted `*.bloob.haus` children (origin allowlist + height clamp + `contentWindow===e.source` match). Fixes subdomain↔subdomain embeds silently never resizing. Same `features.iframe_resize` flag.
- `themes/_base/layouts/embed.njk`: new `font` embed URL param (mirrors `bg`/`text`) → sets `--font-body`/`--font-heading`.
- Docs: DECISIONS entry (protocol); CLAUDE.md git-remotes section clarified per-machine (Leon's MacBook pushes `origin`→`LSanten` directly, no `upstream`).

**Verified:** single-page `dev:marbles --page=…` build → sender/receiver/font code present in generated + served embed HTML (200); 12/12 receiver logic tests (trust, spoof rejection, clamp, source match); `npm test` 514 pass. Not observed in a real browser (no headless env) — confirmed via build/serve + unit tests only.

**Consumer (separate repo, pushed):** `bloob-haus-homepage` index.html — embeds the live marble, listens for the height message, drops fixed `height=500`. Auto-height/font are inert until this platform change is built + deployed.

### Session 55 — July 3, 2026
**Worked on:** URL standardization + canonical page ID (foundation for domain-wide FastComments + future plugin/linking work).

**Problem:** URL-affecting settings were split between `_bloob-settings.md` (`permalink_strategy`) and `sites/*.yaml` (full `url`, date flags, `mount_path`), so nothing could compute a page's URL from the vault alone — the root cause of Obsidian-plugin bug #5 *and* the blocker for a domain-unique comment ID (one FastComments account is shared across all subdomains).

**Shared pipeline (upstream-eligible):**
- New `url:` block in `_bloob-settings.md` (`base`, `case`, `date_prefix`, `mount_path`) as the single source of truth. `scripts/utils/bloob-settings-reader.js` maps it onto the existing config shape (`permalinks.strategy`, `features.date_*`, `mount_path`, `site.url`); wins over legacy flat keys, which still work (non-breaking).
- New `scripts/utils/page-id.js` `derivePageId(siteUrl, pageUrl)` — canonical ID = lowercased `host + path`, no scheme/trailing slash (e.g. `leons.bloob.haus/marbles/my-note`). Domain-unique, human-readable, no random IDs. Lowercasing is ID-only (visible URLs unchanged; marbles stays preserve-case).
- `eleventy.config.js`: redefined the `{{ page_id }}` token to the canonical ID (was raw `page.fileSlug`), added `{{ page_full_url }}`, and a `bloobPageId` filter. `injectPageVars` now takes `site.url` (partials updated).
- `<meta name="bloob-page-id">` in all four theme heads so every page carries its ID for tooling.
- Docs: new authoritative `docs/architecture/urls-and-ids.md` (URL algorithm + ID derivation — the contract the plugin must match); settings-registry `url:` block + token table; `_base` template models the `url:` block.
- Tests: `page-id.test.js` (6) + `url:`-block mapping in `bloob-settings-reader.test.js`. 511 total pass.

**Vaults migrated (separate repos, files edited not committed — user pushes):** marbles (`case: preserve`, `date_prefix: keep`), melt + buffbaby (`case: lower`, `date_prefix: none`).

**Verified:** local melt build → `<meta name="bloob-page-id" content="melt.bloob.haus/about-melt">`, FastComments `urlId` resolves to the same, URLs still lowercased via `url.case`, embed versions excluded from comments.

**Follow-on (same session):**
- **`bloob-page-id:` frontmatter override** — pins a note's ID to an explicit value (computed in `lib/eleventyComputed.js`, honored by the `{{ page_id }}` token + meta tag). Primary use: move/rename a note, set its `bloob-page-id` to the *old* ID, and the FastComments thread follows — no dashboard migration. Tests in `eleventy-computed-page-id.test.js`.
- **FastComments enabled on marbles, melt, buffbaby** — snippet added to each vault's `fast-comments-embed` fence (tenant `dI13cVRENXn`, `urlId: "{{ page_id }}"`). Verified render + urlId on melt.
- **Docs:** FastComments setup + comment-migration + styling (iframe isolation → `customCSS`, optionally driven by theme tokens) documented in `urls-and-ids.md`; `bloob-page-id` added to settings-registry.
- **Comments as a shape behavior** — a shape decides *whether* and *where* comments render by including `partials/comments.njk` in its `layout.njk`. Added the include to the `article` shape layout (article pages bypass `page.njk`, so they'd otherwise be skipped); `page.njk` stays commentable as the default/fallback. Commentability resolves through explicit shape → vault `default_shape` → `page.njk` fallback → per-page `comments: false`. Documented in `shapes.md` ("Comments — a shape behavior", incl. the fallback chain). Verified by temporarily shaping a melt page as `article` (comments rendered, then reverted).

**Deferred:** Obsidian plugin copy-link fix (#5 — implement this contract in the plugin repo); bloob↔bloob linking; Cloudflare case-insensitive URLs; dynamic theme-token `customCSS` for FastComments (selectors need tuning against their docs).

### Session 54 — July 3, 2026
**Worked on:** Snippet-injection architecture — paste raw code snippets into `_bloob-settings.md`, inject site-wide. First use case: GoatCounter analytics.

**Design:** A single primitive — "inject this raw block at location X on every page" — with named fences as friendly aliases over two buckets (`head`, `bodyEnd`). GoatCounter is a plain head snippet (no special-casing); embeds record their natural `/slug/embed/` path. Chose raw fence extraction over structured frontmatter because the user authors snippets by pasting (confirmed by their `goat-counter-tracking` fence). Per-page tokens solve FastComments' filename-as-`urlId` need (matches the old Jekyll `page.file_name` behavior + File Identity Convention). Full plan: `docs/implementation-plans/phases/phase-2/2026-07-03_snippet-injection-analytics.md`.

**Shared pipeline (upstream-eligible):**
- `scripts/utils/bloob-settings-reader.js` — `parseEmbedFences()` extracts named fences from the settings **body** (empty fence = off); `EMBED_TARGETS` maps fence → `head`/`bodyEnd`. Every fence exposed as `site.embeds[name]`.
- `scripts/assemble-src.js` — writes `site.embeds` + concatenated `site.snippets.{head,bodyEnd}` into `src/_data/site.js`.
- `eleventy.config.js` — `injectPageVars` filter substitutes `{{ page_id }}` (`page.fileSlug`), `{{ page_url }}`, `{{ page_title }}`. Scoped vocabulary only — pasted HTML is never re-run through Nunjucks.
- New shared partials `themes/_base/partials/site-snippets-{head,footer}.njk`, wired into all four theme heads + base layouts.
- `themes/_base/_bloob-settings.template.md` — canonical author-facing scaffold.
- Tests: `tests/utils/bloob-settings-reader.test.js` (fence parser + target map, 8 cases).
- Docs: `settings-registry.md` (Snippets & Embeds settings + wiring guide).

**Backwards-compatible:** no fences → empty snippets → no output. Verified end-to-end against the local melt vault (real GoatCounter `<script>` lands before `</head>` on every page). Marbles/buffbaby unaffected.

**FastComments (Milestone B) — also done this session:** new `themes/_base/partials/comments.njk` renders the `fast-comments-embed` fence at content-bottom (after `</article>`) on all four themes' `page.njk`. Per-page opt-out via `comments: false`; excluded from embed versions, folder indexes, and home. `{{ page_id }}` resolves to the page slug for the FastComments `urlId` (thread locked to the file). Verified end-to-end against the local melt vault with a temporary filled fence (`urlId` → `About-MELT`, absent from `/embed/`), then the vault fence was restored to empty. No comment **backend** built — the snippet is BYO (bring-your-own FastComments/other embed).

**Deferred:** Auto-provisioning GoatCounter sites via its API → future magic-machine (see IDEAS.md). Own-backend comment system explored but not built (frictionless no-account commenting → needs Turnstile/Akismet spam pipeline; self-hosted Isso/Remark42 noted as lower-effort alternatives).

**Note:** live GoatCounter on melt requires pushing the melt vault's `_bloob-settings.md` edit (deploy build clones from GitHub).

### Session 53 — June 29, 2026
**Worked on:** Tokenize the shared `article` shape's font sizes + adopt tuned values in alter-engineers.

**Problem:** `bloob-shape: article` (`lib/visualizers/article/styles.css`) hardcoded every font
size; only width and colors were tokenized. The body inherited the standard `1rem`, which on
alter-engineers' Satoshi (tall x-height) read too large, and themes had no clean knob to tune it.

**Shared pipeline (upstream-eligible):**
- `lib/visualizers/article/styles.css` — replaced hardcoded title/subtitle/body/h1–h6 sizes and
  body `line-height` with `var(--article-*, <original value>)` tokens. **Every fallback is the
  prior value**, so any theme that sets none of the tokens renders byte-for-byte identical.
- New tokens: `--article-title-size`, `--article-subtitle-size`, `--article-body-size`,
  `--article-body-line-height`, `--article-h1-size` … `--article-h6-size`. All optional.
- Docs: `docs/architecture/themes.md` ("Article-shape sizing tokens" — optional contract +
  worked example), `docs/architecture/settings-registry.md` (token table under Universal
  Capabilities), and a new `lib/visualizers/article/DECISIONS.md` (rationale + backward-compat).

**alter-engineers (fork-only):**
- `themes/alter-engineers/assets/css/main.css` `:root` sets `--article-body-size: 0.95rem`,
  `--article-body-line-height: 1.6`, and tightened title/h1/h2/h3 caps to suit Satoshi.

**Why split:** shape + docs in one commit (cherry-pickable upstream), AE token values in a
separate commit (stays on the fork) — per the commit-hygiene rule.

### Session 52 — June 26, 2026
**Worked on:** Security-by-obscurity convention for client-facing / unlisted content — documentation + AI guardrails.

**New shared doc: `docs/architecture/security-by-obscurity.md`** (upstream-eligible). Defines how to publish content at an unguessable URL while keeping it out of all public discovery:
- **Mandatory user-facing flag:** this is security by obscurity — *as safe as a Google "anyone with the link" share, not access control.* The doc instructs any AI to state this every time.
- **Two vehicles, different safety:** raw `.html` passthrough files (never a collection item → never in sitemap; but builder never parses them, so no auto-`noindex` and no tracker stripping — obscured path is the only protection) vs. rendered `.md`/`.njk` pages (`visibility: unlisted` → universal `noindex,nofollow` + excluded from sitemap/RSS/search/collections).
- **Step-by-step:** top-level container + cryptographically-random hex token folder (token-first so the only guessable segment is followed by 128 bits of entropy); suppress the top-level folder-index auto-stub (`_`-prefix or `_index.md` marked unlisted); per-vehicle hardening; build-time verification.
- **URL leak vectors + dependency trust tiers:** A self-hosted/inlined (safe) · B passive cross-origin subresource (origin-only leak under default `Referrer-Policy`) · C active third-party script/analytics (leaks the **full** secret path via `window.location` — defeats obscurity) · D embeds. Notes the base theme's Google Fonts as a built-in Tier-B dependency on every rendered page.
- **Mandatory AI pre-ship dependency scan:** grep every file that will be hosted (incl. the theme `<head>`) for external refs, classify by tier, flag Tier C/D loudly.
- **When obscurity isn't enough:** Cloudflare Access (real auth) + `X-Robots-Tag` header for folder-wide noindex.

**Wiring (so an AI always applies it):**
- `CLAUDE.md` — added item 6 to the required-reading list, a dedicated "Client-Facing / Unlisted Content" trigger section (read the doc + state the flag + run the scan), and a Documentation-Rules routing line.
- `docs/architecture/settings-registry.md` — cross-reference note under the unlisted wiring tables.

**Tech debt logged (#32, #33):** Step 9.5 folder-index stub is generated for top-level folders that contain only attachments (spurious empty `/folder/` page in the sitemap); base theme loads Google Fonts from a third-party CDN on every page (Tier-B leak vector + offline/privacy dependency).

**No code changed** — documentation + guardrails only. Convention uses existing `visibility: unlisted` / `_bloob_unlisted` wiring.

### Session 51 — June 25, 2026
**Worked on:** Jekyll-style date-prefixed filenames — two independent opt-in behaviors.

**Problem:** Marbles notes are named `2026-06-24-title.md`. The author wants that date "picked up" into `date_created` (when frontmatter omits it) **while keeping the date in the URL**. Stripping the date from the URL is a separate capability that should exist for other vaults but stay off for now.

**Root cause found:** Eleventy *natively* strips a leading `YYYY-MM-DD-` from `fileSlug`/`filePathStem` and treats it as the page date — so the date was being dropped from the URL by Eleventy itself, regardless of our code (this is why the clean URL appeared all along, and why the live `…/language-to-describe-music/` URL had no date). The fix is to pin an explicit `permalink` for date-prefixed files so the setting actually controls the URL both ways.

**Shared pipeline (upstream-eligible), two `features.*` flags (both default off):**
- `features.date_from_filename` — a leading `YYYY-MM-DD-` supplies `date_created` when frontmatter omits one (**frontmatter always wins**); the date **stays in the URL**.
- `features.date_prefix_slugs` — strips the prefix from the URL. Independent; off everywhere for now.
- New `scripts/utils/date-prefix.js`: `stripDatePrefix(filename)` splits a strict `YYYY-MM-DD-` prefix (month 01–12, day 01–31, non-empty remainder) into `{ date, name }`.
- `file-index-builder.js`: with the `stripDatePrefix` option, slugs + filename-derived titles use the de-prefixed name (so `pageInfo.url` honors `date_prefix_slugs`); both on-disk and clean names registered in `filenameLookup` so `[[2026-06-24-x]]` and `[[x]]` resolve.
- `preprocess-content.js`: reads both flags; fills `date_created` (`date_from_filename`); for date-prefixed non-index files on an opt-in site, pins `permalink = pageInfo.url` to override Eleventy's native stripping — keeping the date (`date_from_filename`) or stripping it (`date_prefix_slugs`), and keeping the served URL identical to what internal links resolve to.
- `lib/eleventyComputed.js`: unchanged (an earlier slug-strip attempt there was a no-op because Eleventy hands it the already-stripped `filePathStem`; reverted).
- `tests/utils/date-prefix.test.js`: 6 cases.

**Site config:**
- `sites/marbles.yaml`: `features.date_from_filename: true` (date in URL + picked up as `date_created`). `date_prefix_slugs` left off.

**Docs:**
- `settings-registry.md`: rows for both flags + an explainer on Eleventy's native stripping and the permalink pin.

**Verified (full marbles build):** output path `_site/tender-fleck/2026-06-24-language-to-describe-music/` (date kept), `feed.xml`/canonical use the date URL, `date_created: 2026-06-24` set. Index builder confirms the other mode: `stripDatePrefix=true` → `/tender-fleck/my-post/`. Full suite 491 passing.

### Session 50 — June 25, 2026
**Worked on:** Date frontmatter convention — `date_lastchanged` → `date_updated`, marbles vault cleanup, universal date support

**Marbles vault migration (content repo, one-time):**
- Python script (`ruamel.yaml`) migrated 468 files: `date_lastchanged` → `date_updated` (YAML list, quotes stripped); custom comma-label text preserved into new `date_created_text` / `date_updated_text` fields (8 files); obsolete `show_date_lastchanged_updatedauto` removed. `bloob-object` left untouched (separate concern). Output matches the Obsidian plugin's convention byte-for-byte.

**Shared pipeline (upstream-eligible):**
- `eleventy.config.js` `dateFormat` filter: now accepts an array (formats most recent entry, for `date_updated`) and formats `Date` objects in UTC to avoid off-by-one in negative-offset timezones.
- `preprocess-content.js`: new `toDateOnly()` helper normalizes `date_created` / `date_updated` to plain `YYYY-MM-DD` strings before `matter.stringify`. Fixes a latent off-by-one bug (bare YAML dates were re-serialized as UTC-midnight ISO timestamps and rendered a day early). Preserves the legacy `2024-11-07, Written on` comma-label form (melt). Universal — benefits all themes.
- `tests/utils/to-date-only.test.js`: regression tests (7 cases) for the off-by-one fix and comma-label preservation.

**marbles-pouch + melt themes:**
- `layouts/page.njk` (both): render a `date_updated` pill (hidden when it matches `date_created`); custom labels via `date_created_text` / `date_updated_text`. Legacy `date_created: …, Label` comma-split removed from both themes in favor of the `*_text` convention.
- `main.css`: `.marble-date--updated` / `.page-date--updated` modifiers (lighter emphasis).

**Docs:**
- `settings-registry.md`: `date_created` + `date_updated` added as Universal; `date_created_text` / `date_updated_text` under marbles-pouch and melt.
- `README.md`: documented the `--page=<file>` single-file dev flag for fast iteration.

**melt vault:** has no date frontmatter; left as-is (the Obsidian plugin will stamp dates going forward).

### Session 49 — June 17, 2026
**Worked on:** Collection shape — Phase 2 (combined fulltext search) + AE tag/search polish

**Phase 2 — combined search (shared, upstream-eligible):**
- `browser.js`: default search mode is now **combined** — metadata filter runs synchronously (instant cards), Pagefind low-level API expands the result set when it resolves (union, never hides more than metadata alone). Stale-query guard prevents race conditions.
- `browser.js`: `search: basics` opts down to metadata-only; `search: fulltext` kept as alias for default; `search: off` removes the input.
- `render-card.js`: `data-fp-tags` attribute on each card anchor so tags are searchable in metadata mode.
- Hyphen normalization in both query and haystack — `"radiant floor"` matches `"radiant-floor"` tag.
- Source filter passed to Pagefind: `folder=projects` → `{ section: "projects" }`, `tag=X` → `{ tag: "X" }`.

**AE prerequisites (fork-only):**
- `sites/alter-engineers.yaml`: `features.search: true` (enables Pagefind `eleventy.after` hook).
- `_bloob-settings.md` in vault: `search: true` — this overrides `sites/alter-engineers.yaml`; it was the actual source of `search: false`.
- `project.njk`: `data-pagefind-body` + `data-pagefind-filter="section:projects"` on main content div; `data-pagefind-filter="tag:X"` on each tag badge.

**AE tag display polish (fork-only):**
- Tag badges on project pages: hyphens replaced with spaces (`radiant-floor` → `RADIANT FLOOR`).
- Tag page heading: `#` prefix, uppercase, hyphens replaced with spaces, "Tag" label removed.
- AE `collection.css` override: explicit theme override so collection cards look correct independently of folder-preview.
- Resources `_index.md`: removed stray `ng_type, location, sqft, services` paragraph (paste artifact).

**Commit count this session:** 9 builder commits (5 shared + 4 AE), 2 content repo commits.

**Phase 2 complete.** Implementation plan moved to `docs/implementation-plans/_completed/`.

---

### Session 48 — June 17, 2026
**Worked on:** Collection shape — Phase 1 (metadata mode, Phases 0–1 + projects index swap)

**New visualizer: `lib/visualizers/collection/`** (upstream-eligible shared infrastructure)
- `core.js` — pure `parseSource` / `filterNodes` / `sortAndLimit` / `resolvePages`. Supports sources: `folder=X`, `tag=X`, `field:KEY=VAL`, `all`. Works in both Node.js (build-time) and browser (esbuild bundle).
- `render-card.js` — pure `renderCardHtml` / `renderCardGridHtml` shared by build-time and runtime. Canonical class `fp-card__image-wrap` (fixes drift from legacy `fp-card__img-wrap` in folder-preview runtime). All images carry `class="no-pswp"` (prevents nested-anchor bug when image-optimizer wraps images in PhotoSwipe `<a>`).
- `index.js` — `transform()` for ` ```collection ``` ` code fences. Renders build-time SEO card grid from graph.json at Eleventy transform time. `renderFilescope()` emits runtime placeholder (graph.json unavailable at preprocess time).
- `browser.js` — runtime with all five display modes (cards, list, slider, bubbles, marbles). Cards display uses shared `renderCardHtml`. SEO containers get search-only wiring.
- `styles.css` — complete token-based CSS. `fp-card__image-wrap` canonical. All display modes covered.
- `schema.md` — shape contract with settings table, source syntax, display modes, placement/content policy, implementation notes.
- 52 new unit tests: manifest, index exports, core source resolution, render-card HTML output.

**AE content repo: projects `_index.md` swapped** to use `collection` code fence. Same settings as the former `folder-preview` fence; verified: 22 cards render with correct fields, canonical class names, `no-pswp` on images.

**Tags page (Phase 0)** — already shipped in Session 47; verified it uses the same `fp-card*` classes and `no-pswp`. No changes needed.

**Commit hygiene:** two commits — A (shared `lib/visualizers/collection/`) and B (AE content repo `_index.md`). A is upstream-eligible; B is fork-only.

**Not done (Phase 2 — deferred):**
- Pagefind full-text mode (low-level API + join to graph.json). Needs: `features.search: true` in `sites/alter-engineers.yaml`, `data-pagefind-body` + `data-pagefind-filter` in AE layouts. Requires browser testing — left as a separate session with Opus.

---

### Session 47 — June 16, 2026
**Worked on:** AE theme fine-tuning — project layout fixes, folder-preview subtitle, theme-specific visualizer CSS override system

**Project layout fixes (alter-engineers theme)**
- Fixed nav overlap on no-hero project pages: added `.projects-single--no-hero` modifier class in `project.njk` and `padding-top: calc(var(--nav-height) + var(--spacing-md))` CSS rule
- Added `padding-top` offset to `.page-article` for the same reason
- Added `date_started` field displayed as "PROJECT STARTED" row in the project metadata `<dl>` using the `dateFormat` filter
- Removed READ MORE truncation: overrode `theme.min.css` mobile height limit with `height: auto !important; overflow: visible !important;` and hid `.projects-single__read-more` button
- Bumped H2 size inside project body: `.projects-single__text h2 { font-size: 2rem; font-weight: 800; }`

**folder-preview visualizer — subtitle support**
- Added `.fp-card__subtitle` baseline styles to `lib/visualizers/folder-preview/styles.css`
- Changed `.fp-card__title` to a `<span>` (label role) in both `index.js` (build-time) and `browser.js` (runtime)
- Both paths now render `<p class="fp-card__subtitle">` from `node.subtitle` (already in graph.json from `## heading` extraction)

**Theme-specific visualizer CSS override system (new pipeline feature)**
- Added Step 6.5 to `scripts/assemble-src.js`: auto-scans `themes/[name]/assets/css/visualizers/*.css`, copies to `src-*/assets/css/theme-visualizers/`, writes name list to `src-*/_data/themeVisualizerCss.json`
- Added cleanup of those directories in `cleanGeneratedFiles()`
- Updated `themes/_base/partials/head.njk` to loop `themeVisualizerCss` and emit `<link>` tags after shared visualizer CSS
- Created `themes/alter-engineers/assets/css/visualizers/folder-preview.css` — AE overrides making title orange and subtitle larger
- Moved `.fp-card__title` color rule out of AE `main.css` (was misplaced there) into the new override file

**Documentation**
- Added "Theme-specific visualizer CSS overrides" section to `docs/architecture/visualizers.md` with pipeline flow, authoring rules, and example
- Added `assets/css/visualizers/` row to Tier 3 in `docs/architecture/themes.md`, plus "Theme-specific visualizer overrides" cross-reference section
- Added two DECISIONS.md entries (2026-06-16): theme CSS override pattern and `fp-card__subtitle`

---

### Session 46 — June 5, 2026
**Worked on:** Shapes architecture deep-dive — philosophical exploration and open question documentation

**Shapes architecture open questions documented**
- Pulled upstream changes (article shape, shape_settings mechanism, AE theme tokens)
- Held a philosophical exploration of shapes: painting-vs-frame metaphor, chrome as a declared dimension, three-tier declaration model (shape-level / instance-level / page-level)
- Added `## Open architectural questions` section to `docs/architecture/shapes.md` — 7 questions:
  1. Chrome vocabulary (what can a shape declare about its frame?)
  2. Three-tier declaration model (who owns what across manifest/settings/frontmatter)
  3. `schema.md` canonical template (not yet written — highest leverage doc to write next)
  4. Settings contract (freeform vs. enumerated validation)
  5. Closed-state rendering (deferred, but needs a home in the contract)
  6. Lineage / shape inheritance (deferred)
  7. Making shapes easy for others to create (creator checklist, reference shapes, vault-local shapes folder)

---

### Session 45 — June 5, 2026
**Worked on:** Upstream merge, `article` shape (new layout-only pattern), `shape_settings` mechanism, AE theme tokens + nav offset

**Upstream merge (LSanten → altron-alters fork)**
- Pulled 8 upstream commits; resolved conflict in `preprocess-content.js` via `git checkout --theirs` (no AE-specific changes in that file)
- Post-merge: `npm run dev:alter-engineers` broke — `Cannot find package 'markdown-it-footnote'`; upstream added the import but not the install. Fix: `npm install markdown-it-footnote`

**`article` shape — first layout-only shape (`lib/visualizers/article/`)**
- New shape type: **layout-only** — no `index.js`, no `renderFilescope`, just `manifest.json` + `layout.njk` + `styles.css`
- `layout.njk`: melt-theme-inspired, renders title/subtitle/author/byline/date, `bloob_object` type badge, hidden slug spans for pagefind, share bar toggle via `shape_settings`
- `styles.css`: fully token-based, works out of the box in any theme; covers header, body typography, share bar — ~190 lines
- Deleted `themes/alter-engineers/layouts/article.njk` — shape's `layout.njk` is now the sole source
- `manifest.json` type: `"layout"` (new type, distinguishes from renderFilescope shapes)

**`shape_settings` mechanism (completes the `:::settings` flow)**
- `preprocess-content.js` now writes `shape_settings` to `outputFrontmatter` when `bloob-shape` is declared and the `:::settings` block is non-empty
- Layout templates access via `{{ shape_settings.key }}` — keeps shape-internal config separate from page metadata
- First use: `article` shape's share bar toggle (`share_bar: false` to opt out; default is ON)

**AE theme tokens and nav offset**
- Overhauled `themes/alter-engineers/assets/css/main.css` `:root` — organized into named sections (Brand, Shape, Typography, Spacing, Layout), added `--accent-dark`, `--text-light`, `--color-mint`, `--color-orange`, `--nav-height: 3rem`, `--article-width: 820px`
- Added `.article-page { padding-top: calc(var(--nav-height) + var(--spacing-lg)); }` to offset fixed nav bar
- Updated `themes/_base/partials/share-bar.njk` querySelector to include `.article-body` (was missing, heading anchor links weren't attaching)

**Documentation (this session)**
- `docs/architecture/shapes.md`: added Layout-only shapes checklist, `shape_settings` mechanism, token-based `styles.css` pattern, `_base` partials note, updated shape status table
- `docs/implementation-plans/DECISIONS.md`: added 4 new entries — layout-only shapes, `shape_settings` output path, `manifest.defaultLayout` asymmetry, token-based CSS pattern

---

### Session 44 — June 5, 2026
**Worked on:** Citations rendering, base-wide link improvements, shape fallback fix

**Citations / footnotes (`lib/visualizers/citations/`)**
- Added `markdown-it-footnote` package and registered it in `eleventy.config.js` — Pandoc-style `[^label]` / `[^label]: text` footnotes now render as linked superscripts + reference section at bottom of page
- New `citations` visualizer (CSS-only, no JS) — styles the generated HTML using existing CSS tokens; auto-included on all pages via the visualizer manifest. No new CSS tokens required.

**Universal base stylesheet (`themes/_base/assets/css/base.css`)**
- Created `themes/_base/assets/css/base.css` as the permanent home for styles that apply across all themes, independent of any feature or visualizer
- All 4 theme `head.njk` files updated to load `base.css` before `main.css` (theme styles can override as needed)
- First rule: `overflow-wrap: break-word` on `a` — prevents long URLs from busting page width

**Auto-linking bare URLs**
- Enabled `markdown-it` `linkify: true` in `eleventy.config.js` — plain `https://` URLs in content become `<a>` tags automatically, no markdown link syntax required

**Shape fallback fix (build was broken)**
- `METHODOLOGY-CULTURAL-P-VALUE.md` had `bloob-shape: note` — since no `lib/visualizers/note/` folder exists, the preprocessor was setting `layout: layouts/note.njk` (which doesn't exist), crashing the build
- Fixed preprocessor: only treat `bloob-shape` as a layout-shape when the visualizer folder exists; unknown names now log a warning and fall through to `page.njk`
- `lib/visualizers/note/` is a future shape — when it exists it will bring its own `layout.njk` and the content files with `bloob-shape: note` will pick it up automatically

---

### Session 43 — May 31, 2026
**Worked on:** Shapes architecture foundations + first file-scope shape (RSS feed)

**Shapes architecture — new conventions (not yet fully implemented — foundational slice only)**
- Aligned on new terminology from `2026-05-31-BLOOB-HAUS-SHAPES-ARCHITECTURE.md`: `bloob-type` / `visualizer` / `:::` block are all the same concept — a **shape**. `bloob-shape:` is the new frontmatter key; `visualizer` remains the code-level word.
- A shape at file scope means the *entire page body* is rendered by the shape's renderer — not just a block inside a page.
- `::: settings` block at the top of the body is the standard way for file-scope shapes to declare per-instance configuration (keeps config visible in Obsidian, avoids nested YAML in frontmatter).

**New infrastructure**
- `scripts/utils/extract-settings-block.js` — parses `::: settings ... :::` from a markdown body, returns `{ settings, body }`. Pre-quotes unquoted markdown link values `[text](url)` before handing to `js-yaml` (YAML treats `[` as inline sequence opener — silent bug without this fix).
- `preprocess-content.js` — two new steps:
  - **6e.3**: if `bloob-shape:` is in frontmatter, extract `::: settings` block and remove it from body *before* `injectContainerRaw` runs
  - **6e.6**: dispatch to the named shape's `renderFilescope(settings, body)` — replaces the entire page body with returned HTML. Shape module lives at `lib/visualizers/[name]/index.js`, same discovery path as existing visualizers.

**New shape: `rss-feed`** (`lib/visualizers/rss-feed/`)
- First file-scope shape. Activated by `bloob-shape: rss-feed` in frontmatter.
- Fetches podcast RSS at build time (Node.js `fetch` — no CORS, no browser dependency).
- Parses episodes via targeted regex: handles CDATA, `<itunes:*>` namespace, `<enclosure>` for audio URLs.
- Platform links (Spotify, Apple Podcasts, etc.) declared as flat YAML keys — `spotify: url`, `apple: url`. Auto-labels using known platform map. Supports both plain URLs and `[text](url)` markdown link syntax as values.
- Episode numbers only render when the `<itunes:episode>` value is numeric (feeds using `full`/`trailer` type values are suppressed).
- 31 tests covering parser, renderer, platform extraction, URL parsing, HTML escaping, fallback URLs.
- Live content file: `bloob-haus-marbles/ESJP/podcast.md`

**Embed system — designed, not yet built**
- Decision: every `.md` file gets a `/[slug]/embed/` URL automatically (not just shape pages). Chromeless layout, no nav/header. Implementation: one `src/embed-pages.njk` Eleventy pagination template + `layouts/embed.njk`. Deferred to next session.

---

### Session 42 — May 28, 2026
**Worked on:** AE fork setup, Cloudflare Pages deploy pipeline, pipeline bug fixes

**Fork setup (`altron-alters/bloob-haus-webapp`)**
- Forked `LSanten/bloob-haus-webapp` → `altron-alters/bloob-haus-webapp`; rewired local remotes (`origin` = fork, `upstream` = personal)
- Added `.gitattributes` with `merge=ours` on `.github/workflows/**` — prevents upstream merges from overwriting AE-only deploy workflow
- Removed non-AE workflows from fork; added `deploy-alter-engineers.yml` (mirrors `deploy-buffbaby` pattern)
- Updated `sites/alter-engineers.yaml`: content repo → `altron-alters/website-content`, branch → `master`

**Pipeline bug fixes**
- `eleventy.config.js`: set `templateFormats: ["md", "njk"]` — HTML vault attachments (e.g. chart embeds) were being processed as Eleventy pages and appearing as empty cards in folder-preview
- `publish-filter.js`: normalize `.md` extension in `excludeFiles` comparison — `"README.md"` in yaml wasn't matching because filter stripped `.md` before comparing
- `attachment-resolver.js`: auto-compress PNG/JPG over 20 MiB using sharp during copy (vault source never touched); skip non-compressible files over 25 MiB with warning; return `skipped` in result

**Tests**
- Added 3 new `copyAttachments` tests: auto-compress path, non-compressible skip, under-threshold copy-as-is

---

### Session 41 — May 23, 2026
**Worked on:** MELT image placement, GIF→MP4 pipeline, photo-grid video support

**Image placement (melt-website)**
- Mapped all 43 images from the original `an-evening-with-melt` HTML article into the correct Obsidian vault files using `photo-grid` blocks
- Placed images in `an-evening-with-melt.md`, `what-is-melt.md`, `what-happens-at-melt.md`, and `contact-us.md`
- Used mixed-row layouts (`layout: 1,2`, `layout: 1,3,1`, `layout: 2,1`) matching original HTML composition
- Copied all 43 media files into `melt-website/media/`

**GIF→MP4 build pipeline** (`scripts/optimize-gifs.js`)
- New build step (5.8) converts `.gif` files to `.mp4` at build time using `ffmpeg-static` (npm-bundled binary — no system install, works in CI and webapp)
- Converted `.gif` files are deleted from `srcDir` after conversion — keeps all files under Cloudflare Pages' 25MB per-file hard limit
- Conversion is skipped if `.mp4` already exists (cache for dev rebuilds)
- Opt-out via `media: convert_gif_to_mp4: false` in `_bloob-settings.md`
- Added to `build-site.js` (Step 5.8) and `dev-local.js`

**photo-grid: video item support**
- `renderer.js`: GIF srcs (when conversion is enabled) render as `<video autoplay loop muted playsinline>` with a play overlay div
- `styles.css`: video item styles, play overlay (hidden by default, shown only with `.is-paused`), "Play all animations" button
- `browser.js` (new — first browser.js for photo-grid): attempts autoplay; only adds `.is-paused` on `NotAllowedError` (iOS Low Power Mode), not on `AbortError` or other races — prevents false play overlays on desktop
- "Play all animations" button injected before the first paused grid when any video is blocked

**PhotoSwipe video lightbox** (`themes/_base/partials/photoswipe-scripts.njk`)
- `contentLoad` event renders a `<video controls autoplay loop muted=false>` in the lightbox for `data-pswp-type="video"` items — user gets unmuted full-screen video when clicking a playing animation
- Second `addFilter` sets video slide dimensions to viewport size (16:9)

**Documentation**
- `media.convert_gif_to_mp4` setting documented in `docs/architecture/settings-registry.md` (new "Media Processing" key table)
- Setting row added to media tables in `bloob-haus-marbles/_bloob-settings.md`, `content-source/_bloob-settings.md`, and `melt-website/_bloob-settings.md`

---

### Session 40 — May 20, 2026
**Worked on:** Transclusion indicator setting (universal), melt heading hierarchy

- Added `transclusion_indicators` as a universal per-page frontmatter setting and `features.transclusion_indicators` as a site-wide default in `_bloob-settings.md`; when `false`, `![[embeds]]` render seamlessly inline with no wrapper div — no CSS needed, works on all themes
- Set `transclusion_indicators: false` on `melt-website/articles/an-evening-with-melt.md` so its three embedded sections flow without visual borders
- Melt theme h2/h3 heading hierarchy: h2 enlarged to 2.2rem / weight 700; h3 set to 1.4rem + `--color-accent-2` (soft lavender) for visible distinction
- Documented both settings in `docs/architecture/settings-registry.md` under Universal Settings

---

### Session 39 — May 20, 2026
**Worked on:** `photo-grid` visualizer (new), PhotoSwipe extracted to shared base

**photo-grid visualizer**
- New `lib/visualizers/photo-grid/` — `:::` container visualizer for image/GIF grids
- Supports `cols: N` (uniform auto-flow) and `layout: 1,3,1` (explicit mixed-row layouts)
- Config lines (`key: value`) and image lines (`![[...]]`) coexist freely — no separator needed
- `ratio: 3/4 / 4/3 / 1/1 / crop` for uniform cell cropping; omit for natural heights
- `gap` and `padding` (horizontal inset to make grids narrower than prose)
- Columns preserved on mobile — no single-column collapse
- Images wrapped in `pswp-gallery__item` anchors for automatic PhotoSwipe integration
- `schema.md` (author docs) + `README.md` (design research + decisions) included

**PhotoSwipe extracted to `_base/`**
- `themes/_base/partials/photoswipe-head.njk` and `photoswipe-scripts.njk` — new shared partials
- Fixes: natural-dimension filter (no squished images), `initialZoomLevel` capped at 1 (no upscaling for low-res images), hover zoom-in overlay icon (magnifier + plus SVG) on all `pswp-gallery__item` anchors
- `image_zoom` enabled in `themes/melt/theme.yaml`
- marbles-pouch and melt both now use `{% include %}` instead of inline duplication
- `docs/architecture/themes.md` updated with how-to for new themes

### Session 38 - May 20, 2026
**Worked on:** Search visualizer overhaul (melt), folder slug indexing, link resolution regression fix

**Search visualizer — melt theme (major rewrite)**
- Enabled `features.search: true` in `sites/melt.yaml`; `head.njk` now conditionally loads `pagefind-ui.css`
- Sticky input bar: wrapped Pagefind's input + clear button in `div.sv-input-wrapper` via `requestAnimationFrame` after mount — sticky so the bar stays visible while results scroll. Must NOT be called from MutationObserver: moving a focused element causes focus loss (requires double-click to re-focus)
- Preview modal now uses `<iframe>` instead of fetch+innerHTML — visualizer content (JS-rendered) now works inside previews
- Black-frame flash fix: `backdrop-filter` + `will-change: backdrop-filter` pre-allocates the GPU compositing layer so the first open doesn't stall
- Pagefind WASM pre-warm: silent `import("/pagefind/pagefind.js")` 800ms after mount, calling `preload()` or `init()` to JIT-compile the WASM engine before the user types — prevents ~100–200ms stall on first search
- Loupe icon hides when typing; clear button correctly positioned inside `sv-input-wrapper`; empty thumbnails hidden; result message spacing fixed
- Translations include quoted search terms (`"[SEARCH_TERM]"` in result counts)
- `show_id`, `show_actions`, `show_tags`, `placeholder` visualizer settings all wired and working

**ID pills — folder slug indexing**
- Folder index files (`resources/index.md`) now get `slug = parent folder name` ("resources") instead of "index", and `fullSlug = slugifiedFolder` ("resources") instead of "folder/index"
- `is_folder: true` injected into frontmatter by `preprocess-content.js` for all index files
- Hidden body span changed from `{{ slug }} {{ slug_spaced }}` to `ID: {{ slug }}/` (folder) or `ID: {{ slug }}` (normal page) — makes the slug searchable AND styled as a recognisable pill when it appears in excerpts
- `slug_spaced` kept as a separate second hidden span — Pagefind tokenises "contact-us" as one unit so "contact us" (two-word query) requires both tokens to exist separately
- `browser.js`: `processExcerptId()` wraps `ID: slug` matches in `.sv-id-pill` with a styled `ID` label badge; `injectIdLine()` reads canonical ID from excerpt text (captures trailing `/` for folders) before falling back to href; ID pill appears at bottom of each result card
- `.sv-id-pill` and `.sv-id-pill-label` styles added to `search/styles.css`

**Link resolution regression fix**
- Changing `fullSlug` from `"resources/index"` → `"resources"` broke `markdown-link-resolver.js`, which was looking up `index.pages["resources/index"]` directly (bypassing `filenameLookup`) in its fast-path full-path lookup
- `file-index-builder.js`: also registers `filenameLookup["resources/index"] = "resources"` for every folder index file (backward-compat alias)
- `markdown-link-resolver.js`: when `pages[key]` misses on a full-path lookup, now falls back to `filenameLookup[key]` → `pages[fullSlug]` so `[index](resources/index.md)` resolves to `/resources/` correctly
- Root cause: circular-nav links written as `[label](folder/index.md)` were resolving to the last-processed index file's URL (whichever `filenameLookup["index"]` was overwritten by last)

---

### Session 37 - May 19, 2026
**Worked on:** Attachment pipeline vault-structure refactor, favicon fix, image optimizer bypass, subtitle extraction

**Attachment pipeline: vault structure preserved end-to-end**
- Previously all attachments were flattened into `src/media/` regardless of where they lived in the vault. Now `copyAttachments` mirrors the vault's directory structure: `vault/projects/diagram.html` → `src/projects/diagram.html` → `/projects/diagram.html`
- `buildAttachmentIndex` (`scripts/utils/file-index-builder.js`) rewritten to return `{ byBasename, byVaultPath }` dual map. `byVaultPath` enables path-aware resolution; `byBasename` keeps the fallback for wiki-links that have no path info
- `resolveAttachments` (`scripts/utils/attachment-resolver.js`) extended with Pattern 3: resolves `src=` on `<img>`, `<video>`, `<audio>`, `<source>`, `<embed>`, `<iframe>` tags in raw HTML. Path-aware resolution via `sourceVaultPath` resolves Obsidian-relative `../` paths to correct root-relative URLs
- `preprocess-content.js` Step 5 cleanup changed from `fs.remove(staticDir/media)` to per-extension glob across `staticDir` (preserves image optimizer cache, OG images, theme assets, and generated favicons)
- `eleventy.config.js` passthrough rules extended: `src/**/*.{jpg,...}` and `src/**/*.html` now copied at vault-relative paths; backlinks filter updated to skip attachment URLs; image optimizer regex generalized beyond `/media/`
- `generate-og-images.js` and `generate-favicons.js` updated to search the whole `src/` tree for source images (not just `src/media/`)
- 36 new tests for `resolveAttachments` (all three syntax patterns, path-aware resolution, vault path matching); 8 new tests for `buildAttachmentIndex`

**User-authored HTML `<img>` tags bypass image optimizer**
- When Pattern 3 resolves an `<img src="...">` tag (relative path → root-relative URL), it injects `class="no-optimize"` — existing `no-optimize` mechanism in the optimizer preserves all inline attributes (style, width, etc.) and skips PhotoSwipe wrapping

**Subtitle extraction from H2**
- `title-deduplicator.js` now returns `{ content, subtitle }` instead of a string. If an H2 immediately follows the stripped H1 (no blank line), it is extracted as `subtitle` and exposed in frontmatter
- All four page.njk templates render `{% if subtitle %}<p class="page-subtitle">{{ subtitle }}</p>{% endif %}` below the `<h1>`

**Favicon bug fix: stale hash cache**
- Root cause: `src-leons/.favicon-hash` existed (from a build that deleted `favicon.png` during cleanup) but `favicon.png` was gone. `generate-favicons.js` compared hashes, found a match, and returned early without checking if the output files actually existed
- Fix: hash cache check now also verifies `favicon.png` and `apple-touch-icon.png` exist on disk before skipping
- Also: `favicon.png` and `apple-touch-icon.png` added to the Step 5 cleanup ignore list so they survive across builds
- Deleted stale `src-leons/.favicon-hash` so the next dev build regenerated correctly

**Logo URL resolution: wiki-link hardcode removed**
- `assemble-src.js` `resolveLogoUrl` was hardcoding `/media/${filename}` for `[[wiki-link]]` logo/favicon values — wrong if the logo file lives outside `media/`
- Now async: globs the already-preprocessed `src-*/` tree to find the file at its real vault path. Falls back to `/media/` with a warning if not found
- Safe because assemble always runs after preprocess has copied vault files into `src-*/`

---

### Session 36 - May 18, 2026
**Worked on:** URL slug defaults, filename sanitization, copy-link-button plugin, plugin plan docs

**URL slug strategy: preserve-case now the default for all new vaults**
- `scripts/preprocess-content.js` — sanitizes filenames when writing to `src/`: spaces replaced with hyphens per path segment. `coffee tutorials.md` → `coffee-tutorials.md` on disk → Eleventy generates `/marbles/coffee-tutorials/`
- Default slug strategy changed from `"slugify"` (lowercase) → `"preserve-case"` (case kept, spaces→hyphens) in `build-site.js`, `dev-local.js`, `assemble-src.js`
- `sites/marbles.yaml` and `sites/melt.yaml` — explicitly set `permalinks: strategy: preserve-case`
- `sites/buffbaby.yaml` — explicitly pinned to `permalinks: strategy: slugify` (preserves existing lowercase URL behavior)
- Pipeline is consistent: file-index-builder computes URLs from original filename (spaces→hyphens via slug strategy); eleventyComputed.js reads the sanitized filename from disk and applies same strategy — both arrive at the same URL

**Obsidian copy-link-button plugin** (`bloob-haus-marbles/.obsidian/plugins/copy-link-button/`)
- Fixed base URL: `leonsanten.info/marbles/` → `leons.bloob.haus/`
- Now uses `file.path` (vault-relative) instead of `file.basename` — all subfolders (`marbles/`, `say-hello-to/`, `tender-fleck/`) work correctly
- Applies same spaces→hyphens transformation as the build pipeline

**Plugin implementation plan** (`docs/implementation-plans/phases/obsidian-plugin/2026-05-01_plugin-v1.md`)
- Added "How Bloob Haus URLs Are Constructed" section: URL formula, key facts (case preserved, spaces→hyphens, no other transform), where `site.url` lives in the codebase, and three options for how a plugin reads it (plugin setting vs `_bloob-settings.md` vs GitHub API)

---

### Session 35 - May 17, 2026
**Worked on:** MELT page layout features, transclusion expansion, H1 deduplication

**Transclusion expansion** (`![[note]]` inline embed)
- `scripts/utils/transclusion-handler.js` — resolves target pages from `fileIndex`, embeds content inline inside `.transclusion-embed`; bumps all ATX headings down one level (H1→H2, H2→H3, etc.); cycle detection via visited set to break A→B→A loops; heading/block specifier stripped before resolution with full-page fallback
- `scripts/utils/file-index-builder.js` — adds `rawBody` to each page entry; `resolveLink` returns `fullSlug` alongside `url`
- `scripts/preprocess-content.js` — passes `fileIndex` and `sourceFile` to transclusion handler
- `themes/melt/` — `.transclusion-embed` and `.transclusion-placeholder` styles in `main.css`
- 17 new tests covering: expansion, heading bump, cycle detection, specifier fallback, not-found fallback
- `docs/TECH-DEBT.md` items 27–30: heading slice, block slice, context-aware depth, missing CSS on other themes

**H1 deduplication fix**
- When a markdown file opens with `# Title` matching the page title, the preprocessor strips the heading to prevent double `<h1>` rendering in the built site
- `scripts/utils/title-deduplicator.js` — extracted utility with 19 unit tests (exact match, case-insensitivity, inline markdown stripping, anchor ID syntax, H2+ untouched, mid-doc H1 untouched)

**MELT page layout**
- `themes/melt/partials/share-bar.njk` — Web Share API button (mobile native sheet), copy-link button (clipboard fallback), heading anchor icons on h2/h3/h4
- `themes/melt/layouts/page.njk` — share bar in header under author/byline; `date_created` pill from frontmatter
- `docs/architecture/settings-registry.md` — `date_created` documented for both marbles-pouch and melt themes

**Fixes**
- `themes/melt/assets/css/main.css` — first/last-child margin reset inside `.transclusion-embed` removes extra spacing at top/bottom of embed blocks
- `themes/melt/partials/share-bar.njk` — heading anchor icon swapped to checkmark on copy

---

### Session 34 - May 16, 2026
**Worked on:** MELT visualizer polish, Deploy CI, folder-preview marbles layout

**circular-nav visualizer polish**
- Bubbles 1.4× larger; CTA gradient: deep saturated violet core with warm pink-purple glow; gradients driven by CSS vars so `:hover` rules work alongside JS
- `lib/visualizers/circular-nav/index.js` — parses `key: value` settings from `:::circular-nav` block
- `lib/visualizers/circular-nav/browser.js` — `orbit_radius`, center/orbit size, hue, text size, text wrap width all configurable; `debug: on` shows live sliders + copy-YAML panel
- Soft radial gradient blobs (no hard edges, no mask), 35% larger bubbles, more vibrant violet colors

**folder-preview: marbles layout**
- `lib/visualizers/folder-preview/browser.js` — `renderMarbles()`: draggable marble spheres with float animation, circle collision detection, light-source rotation
- Hover/drop glitch fixed: float frozen on hover enter, re-phased on hover leave and drag release for seamless resumption
- `themes/melt/assets/marble.png` added

**CI**
- `.github/workflows/deploy-melt.yml` — Deploy Melt GitHub Actions workflow

**Chore**
- `package.json` `dev:melt` reverted to local `../melt-website` content path

---

### Session 33 - May 14, 2026
**Worked on:** MELT client site — new theme, content, and two new visualizers

**New site: MELT (Massage Exchange and Learning Together) — Whitney & Vicki**
- `sites/melt.yaml` — site config pointing to `LSanten/melt-website`
- `themes/melt/` — full theme skeleton: `base.njk`, `home.njk`, `page.njk`, `folder-index.njk`, partials (head, nav, footer, scripts), 404, CSS
- CSS: fixed-attachment purple-mauve gradient, Caveat (headings) + Quicksand (body) Google Fonts, breadcrumb nav with circle-dot home button, mobile responsive
- 14 content files with realistic placeholder copy in `../melt-website/` (resources folder: 9 essays/guides, playlists, what-is-melt, contact, host-your-own-melt)
- Dev command: `node scripts/dev-local.js --site=melt --content=../melt-website`

**New visualizer: `circular-nav`** (`lib/visualizers/circular-nav/`)
- Parses `:::circular-nav` blocks; renders animated flower of orbiting bubbles around a center CTA
- `index.js` — build-time transform: decodes `data-vis-raw`, parses `[label](url) - name` lines + `center:` line, emits `<div class="circular-nav-visualizer" data-circular-nav='…'>`
- `browser.js` — positions N bubbles via trig (sin/cos orbit), staggered float animation, scales to fit viewport on mobile
- `styles.css` — dark indigo orbit bubbles, rose CTA bubble, radial-gradient fade (no hard edges), `cnav-float` keyframes

**Adapted visualizer: `folder-preview`** — new `layout: bubbles` mode
- `browser.js` — `renderBubbles()` renders pages as light blue-lavender glassmorphism bubbles, staggered two-column scatter layout, varies size organically
- `styles.css` — `.fp-bubbles`, `.fp-bubble`, `.fp-bubble__type`, `.fp-bubble__title`

**Infrastructure fix: `inject-container-raw.js`**
- Changed `/^:::\s+\S/` → `/^:::\s*\S/` — `:::name` (no space) now correctly gets `data-vis-raw` injected, matching how `markdownItContainer` already accepted it. This was a genuine bug blocking any new `:::` visualizer.

**Infrastructure addition: `content_type` in graph.json**
- `preprocess-content.js` — passes `frontmatter.type` as `content_type` to `perPageLinks`
- `graph-builder.js` — spreads `content_type` onto graph nodes
- `folder-preview/browser.js` bubbles now display `content_type` as the small label (e.g. "essay", "guide", "notes")

**Docs**
- `docs/architecture/melt-handoff.md` — full design spec: page inventory, both visualizer specs (circular-nav parser format, bubble visual spec), content repo structure, frontmatter conventions, done/pending table

**Pending (next session)**
- Marbles regression check for `inject-container-raw.js` change (build started but not confirmed)
- Whitney's real logo asset
- Deploy to melt.bloob.haus

### Session 32 - April 28, 2026
**Worked on:** AE launch polish — quotes-stack rename, redirect support, attachment scan fix, bug fixes

- **Rename:** `lib/visualizers/musings/` → `lib/visualizers/quotes-stack/`; trigger changes from `musings` to `quotes-stack`; all rendered HTML/IDs unchanged (theme.min.js still targets `#musings-swiper`)
- **Fix:** `quotes-stack/browser.js` adds `mousewheel.releaseOnEdges: true` when `loop: false` — scroll now escapes the carousel at boundaries instead of trapping the user
- **Fix:** `folder-preview/browser.js` — removed `.swiper-button-prev/.next` from nav elements; Swiper's bundled CSS was positioning them relative to body, causing chevrons to float at the viewport edges
- **Feature:** Redirect support (universal) — new `scripts/utils/redirect-resolver.js` resolves bare URLs, `[[wiki-links]]`, and `[text](url)` from `redirect:` frontmatter; propagated to graph.json and emitted as `<meta http-equiv="refresh">` in `themes/_base/partials/head.njk`; `folder-preview` cards use `node.redirect` as `href` with `target="_blank"`
- **Fix:** Attachment resolution now scans the entire vault instead of only `attachmentFolder` — mirrors Obsidian's own behaviour
- **Fix:** Solutions body text weight (`font-weight: 400` on `.image-text__text-container > p`)
- **Fix:** Nav logo reads `site.logo` from config with fallback to hardcoded SVG path
- **Tooling:** `dev:alter-engineers` now points to live ACE Drive content vault
- **Docs:** Sprint plan at `docs/implementation-plans/phases/ae-launch/2026-04-28_ae-launch-sprint.md`

### Session 31 - April 25, 2026
**Worked on:** ken-burns-zoom-builder video export fix, bounce export, dev tooling (magic machine server + single-page build filter)

- **Fix:** Self-hosted `mp4-muxer` v5.1.3 in `app/vendor/mp4-muxer.mjs` — CDN dynamic import (`unpkg` UMD, `esm.sh`) silently returned undefined exports; local file fixes it across all deployment contexts
- **Fix:** `eleventy.config.js` passthrough now copies entire `app/` directory (not just `index.html`) so vendor/ subdirectories are included in builds
- **Fix:** `bundle-visualizers.js` now creates `_data/` output directory before writing `visualizers.json` (was crashing on fresh bundle targets)
- **Feature:** Bounce export renders a full ping-pong video (2× duration): 0→1 forward, 1→0 reverse; seamlessly loopable
- **Feature:** Export filename now derived from image name: `ken-burns-animation-{slug}.mp4`
- **Feature:** `features.magic_machines` flag in `sites/*.yaml` — disabled on `alter-engineers`, enabled on `marbles`
- **Fix:** `sites/marbles.yaml` URL corrected from `marbles.bloob.haus` → `leons.bloob.haus` (was causing wrong og:url in page metadata)
- **Tooling:** `npm run dev:magic-machine <name>` — lightweight static server for GUI magic machine dev; no Eleventy, no content repo; bundles visualizer assets once (~3s) then serves on port 8090
- **Tooling:** `--page=<path>` flag for `dev:*` commands — filters preprocessing to one file for fast visualizer testing
- **Tooling:** `scripts/test-ken-burns-export.js` — Playwright headless test; injects image, triggers export, reads debug log; run against local server or deployed URL

### Session 30 - April 21, 2026
**Worked on:** folder-preview slider-cards, musings infinite_scroll, color pair `orange` token + `--pair-label`, image-text image overflow fix, CONTENT_DIR env var bug fix

**`lib/visualizers/musings/` — hybrid type, infinite_scroll: false**
- Changed manifest type `build-time` → `hybrid` (browser.js now exists)
- New `browser.js`: when `data-no-loop="true"` is set on `#musings-swiper`, destroys the theme.min.js Swiper instance and reinits with `loop: false` — all other config identical. "infinite_scroll: false means stop at the last card, not remove Swiper."
- Renderer always outputs Swiper HTML (removed the static-stack branch that caused sections to bleed through theme.min.css's fixed-height `.musings__container-desktop`). `data-no-loop` attribute is the only difference when `infinite_scroll: false`.
- Added `<div id="mycursor"></div>` as first child of `<section class="musings">` (required by theme.min.js cursor behavior)

**`lib/visualizers/folder-preview/` — slider-cards style**
- `browser.js` rewritten: new `renderSliderCards()` branch injects articles top section + Swiper HTML, initializes Swiper matching theme.min.js config (`slidesPerView: 1.6, loop: pages.length > 1, speed: 500`). Nav buttons use `.articles__next-button` / `.articles__prev-button`.
- Filter excludes folder root (`/folder/`) and `/index/` suffix pages so the index page doesn't appear as an article card.
- `index.js` (build-time transform): slider-cards branch now imports `resolveBg()` and applies `bg=` / `color=` to the section element — CSS custom properties cascade to runtime-injected browser.js content automatically.
- Homepage `folder=` setting works: when `settings.folder` is present it is used directly (URL-based detection only fires as fallback, which fails on `/`).

**Color pair system — `orange` token + `--pair-label`**
- New `bg-orange` token added to alter-engineers `main.css` (`--pair-bg: #e08a37`, warm orange; `--pair-title: #ffffff`, `--pair-text: #ffffff`)
- New `--pair-label` CSS custom property added to every bg token: teal (`#b6fad1`) on dark/orange/accent backgrounds, purple on light (white/muted/green). Used by `.label { color: var(--pair-label, var(--accent-color)) }` so the ARTICLES label inherits correctly inside an orange folder-preview section.

**`themes/alter-engineers/assets/css/main.css` — layout fixes**
- `.team, .team h1, .team h3, .team p`: color via `var(--accent-color)` (was hardcoded)
- `.heading-and-paragraph` accent: `var(--accent-color)` (was hardcoded `#5b5dd3`)
- `.articles { overflow-x: hidden }` + `.articles .articles__repeater { margin: 1.5rem 0 0 0 !important }` — overrides theme.min.css 9.3125rem margin that pushed content out of section
- `.articles .articles__image`: `width: 100%; height: 14rem; object-fit: cover`

**`lib/visualizers/image-text/styles.css` — image overflow fix**
- Removed `width: 100%` from desktop `.image-text__image` rule (was overriding theme.min.css's explicit `width: 33.375rem`). Image now stays within its column as designed. Mobile rule (`width: 100%; max-height: 60vw`) unchanged.

**`scripts/dev-local.js` + `scripts/build-site.js` — CONTENT_DIR env var**
- Both scripts now set `process.env.CONTENT_DIR = contentDir` after resolving the content path
- `eleventy.config.js` passes `{ contentDir: process.env.CONTENT_DIR }` to `loadSiteConfig()` so `_bloob-settings.md` is found regardless of the `--content=` argument. Previously the config loader defaulted to `content-source/`, breaking on non-default content repos.

---

### Session 29 - March 23, 2026
**Worked on:** color pair system, footer link, git push both repos

- **Color pair CSS architecture:** `.bg-*` classes now declare `--pair-bg / --pair-title / --pair-text` CSS custom properties with a single universal apply block — background, body text, and heading cascade all driven by the same three vars
- **`resolveBg()` shared utility** (`lib/visualizers/_utils/bg-color.js`): `heading-and-paragraph` and `services` renderers now import it instead of hand-building the class string; supports named tokens (`bg=dark`) and hex inline styles (`bg=#1a1a1a color=#fff`)
- **Footer:** "Built with Bloob Haus" now links to https://bloob.haus/
- **Docs:** color pair contract documented as Tier 1 in `themes.md`; full token table + fence syntax guide added to `settings-registry.md`
- **Both repos pushed** to GitHub

---

### Session 28 - March 23, 2026
**Worked on:** project page polish, hero/body image split, settings registry

**Image handling for project pages**
- New `extractHeroImages` / `stripHeroImages` filters in `eleventy.config.js`: position-aware — only operate on images that appear BEFORE the first `<h1>` in the rendered content. Images after the title stay in the body as normal PhotoSwipe-linked inline images.
- `project.njk` updated to use these filters. Hero Swiper gets only pre-title images; body images render at 30% width, left-aligned, block-level.

**`project.njk` changes**
- `hide_more_projects: true` frontmatter hides the "More Projects" carousel
- Hero Swiper autoplay: 3-second interval initialized via `window.load` (fires after theme.min.js Swiper init)

**`themes/alter-engineers/assets/css/main.css`**
- `.projects-single__text p`: 0.65rem font size (paragraphs only; headings styled separately)
- `.projects-single__text img/picture`: 30% width, block-level, left-aligned
- `.projects-single__project-detail`: ~60% less vertical padding/margin
- `.articles.more-projects`: 80% less bottom padding

**`docs/architecture/settings-registry.md` — NEW FILE**
- Developer-facing reference for all settings: universal (all themes) and per-theme
- Separates per-page frontmatter settings from site-wide `features:` settings
- Documents alter-engineers `hide_more_projects`, marbles-pouch `theme_settings.*`
- Includes instructions for adding new settings

---

### Session 27 - March 23, 2026
**Worked on:** project profile layout (proper Eleventy approach), no-pswp image flag, musings `infinite_scroll` setting

**`themes/alter-engineers/layouts/project.njk` — rebuilt with proper Eleventy build-time approach**
- Full `.projects-single` structure: hero Swiper, main content, metadata grid, "More Projects" Swiper — all rendered at build time, no JS DOM manipulation
- Four new Nunjucks filters added to `eleventy.config.js` (general utility, all sites):
  - `extractFirstH1` / `stripFirstH1` — extract or remove the first `<h1>` from rendered HTML
  - `extractImages` / `stripImages` — extract array of `<img>` strings or strip them from content
- Hero Swiper: images from `extractImages`, tagged with `no-pswp` class (see below)
- Title: `extractFirstH1` + `replace("<h1", '<h1 class="projects-single__title"')` at build time
- Body: `stripFirstH1 | stripImages` — description text only
- "More Projects": `collections.projects` (per-section Eleventy collection) at build time; `project.data.image` + `project.data.title` from preprocessed frontmatter
- CSS added to `main.css`: `.projects-single__image-container picture/img` fill rules (theme.min.css targets the old `.projects-single__image` class which doesn't apply to our generated `<picture>` elements)

**`eleventy.config.js` — `no-pswp` image optimization flag**
- Add `class="no-pswp"` to any `<img>` to get full-size WebP+PNG optimization WITHOUT the PhotoSwipe `<a>` wrapper — for images inside Swipers or other carousels

**`lib/visualizers/musings/` — `infinite_scroll` setting**
- `parser.js`: added `infinite_scroll: false` support in Format B (object). Returns `infiniteScroll: boolean` in parsed result.
- `renderer.js`: when `infiniteScroll === false`, renders desktop container as `.musings__container-desktop--static` plain div (no `id="musings-swiper"`, no `swiper` class) — `theme.min.js` does not initialize it; cards displayed as static stack

---

### Session 26 - March 23, 2026
**Worked on:** card-preview + musings visualizers, OG image pipeline fix, title markdown stripping

**New visualizers**
- `card-preview` — build-time `:::` container; reads `[[wiki-links]]` from `data-vis-raw`, enriches from `graph.json` at build time, renders `.projects` card grid; `limit=N show_more=true` hides extras with `no-visible hidden` (toggled by `theme.min.js`); no `browser.js` needed
- `musings` — build-time code fence; YAML input (flat array or `{limit, quotes}` object); dual layout: mobile card stack + desktop vertical Swiper; colors: red/white/green; `no-active hidden` extras toggled by `theme.min.js`

**Bug fixes (shared infrastructure)**
- `scripts/utils/file-index-builder.js`: strip inline markdown from extracted titles (`**bold**`, `*italic*`, `` `code` ``, `[link](url)`) — raw `**` was appearing in `<title>` tags, graph.json, nav, and card titles across all sites
- `scripts/dev-local.js`: add `generateOgImages()` call gated by `config.features?.og_images` — dev pipeline was missing this step, causing broken card images (graph.json had `/og/...` paths but files were never generated)
- `sites/alter-engineers.yaml`: added `og_images: true` to features

**Content activated**
- `alter-website-content/index.md`: card-preview (projects, 4 visible + show more) + musings (3 visible + show more) sections activated

---

### Session 25 - March 23, 2026
**Worked on:** `data-vis-raw` pipeline implementation + testimonials visualizer

**Core architecture: `data-vis-raw` pipeline (fully implemented)**
- Created `scripts/utils/inject-container-raw.js` — scans processed markdown for `:::` blocks, extracts inner content, base64-encodes it, injects `_raw="<base64>"` onto each opener's info string before markdown-it runs
- Updated `preprocess-content.js` to call `injectContainerRaw()` after link resolution (step 6e.5)
- Updated `markdownItContainer` renderer in `eleventy.config.js` to extract `_raw` from parsed settings, delete it from `data-vis-settings`, and emit as separate `data-vis-raw` attribute on `<section>`
- This enables `parser.js` files to always receive raw markdown — same code works in Eleventy, browser preview, and future Obsidian plugin

**`image-grid` visualizer refactored**
- Rewrote `index.js` to use `data-vis-raw` instead of parsing rendered HTML (`<tbody>/<tr>`)
- Created `parser.js` (pure: pipe table markdown → `[{src, alt, name, role}]`) — handles both `![[wikilink]]` and resolved `![alt](/media/...)` syntax
- Separated `renderer.js` (pure: data + settings → `.team` HTML)

**`testimonials` visualizer (new hybrid)**
- `parser.js` — pure: blockquote markdown → `[{quote, name, role}]`; `~ name:` / `~ role:` lines as metadata
- `renderer.js` — pure: data + settings → Swiper carousel HTML; `parseSlideTime()` handles `3s`, `500ms`, bare `3000`; bakes `data-slide-time` onto container
- `index.js` — build-time transform using `data-vis-raw` + `data-vis-settings`
- `browser.js` — destroys `theme.min.js` Swiper instance, re-initializes with full config including autoplay from `data-slide-time`
- `manifest.json` + `schema.md` — hybrid type, container activation

**`alter-website-content/index.md`**
- Activated testimonials section (removed `%% %%` wrapper)
- Syntax: `::: testimonials time=3s` with two blockquote slides

**Documentation**
- Updated `docs/architecture/visualizers.md` — container visualizer status, `inject-container-raw.js`, `browser.js` ownership convention, settings flow, current implementation inventory
- Updated `docs/implementation-plans/DECISIONS.md` — four 2026-03-23 decisions added

---

### Session 24 - March 19, 2026
**Worked on:** First content-driven sections on the alter-engineers homepage

- Built `image-grid` visualizer (`lib/visualizers/image-grid/`) — `:::image-grid` table in `index.md` → styled `.team` section. First `:::` container visualizer.
- Created `hero.njk` partial — reads hero fields from frontmatter; inline JS offsets first content section below the fixed-position hero
- `homepage.njk` now content-driven: hero partial + `{{ content | safe }}`; unimplemented sections are `{# 🔲 TODO #}` comments; `homepage-legacy.njk` kept as reference
- `markdownItContainer` updated to parse `key=value` settings → `data-vis-settings` JSON; added `| md` / `| mdinline` Nunjucks filters
- Fixed brand color (`--accent-color: #5b5dd3`) and font — theme uses **Satoshi**, loaded via Fontshare CDN (font files were missing from repo)
- Added CSS Token Standard to `docs/architecture/visualizers.md`
- Team photos copied to `alter-website-content/media/people/`
- **Next:** `card-preview` visualizer (projects section)

---

### Session 23 - March 19, 2026
**Worked on:** Design token contract — `--border-radius` + theme-standards formalization

**Theme architecture**
- Added `--border-radius` and `--border-radius-sm` to both existing themes: marbles-pouch (12px/6px), warm-kitchen (8px/4px)
- Formalized the full design token contract in `docs/architecture/theme-standards.md`: colors, shape, typography, spacing, layout — with usage rules and a per-theme reference table
- Rule: visualizers must use `var(--token, fallback)` exclusively — no hardcoded colors, radii, or font stacks. Themes own their visual identity; visualizers inherit it automatically.
- Motivated by alter-engineers site planning (0px sharp edges) — setting `--border-radius: 0px` in a theme will propagate to all visualizers with zero per-theme CSS overrides needed

**Alter Engineers site planning** (content repo, not webapp)
- Created `alter-website-content/index.md` with real content extracted from the live WordPress site snapshot: hero text, all 7 projects (wiki-link order), about/solutions sections, 17 services, 1 testimonial, 5 team members, 4 musings quotes, articles section
- Created `alter-website-content/_bloob-settings.md` — minimal config for a public site (no private content filtering, search off, backlinks off)
- Defined visualizer code-fence API for: `projects-preview`, `slideshow` (dual-row partners), `testimonials`, `team-grid`, `musings`, `folder-preview`
- Key decision: `folder-preview` is the keystone visualizer — handles projects, articles, and resources sections from a single implementation; supports curated wiki-link order or auto-from-folder

---

### Session 22 - March 18, 2026
**Worked on:** Banner image fix, search/tags polish, footer search, tag cloud shuffle, image cache, single line breaks, embed sizing, folder index pages

**Bug fixes**
- Banner image pixelated when `image: default` in `_bloob-objects.md` — was resolving to `/favicon.png` (tiny icon); now resolves to `null` so `banner.njk` falls back to the full-res `marble.png` (`preprocess-content.js`)
- Wave hairline gap between banner and page body on some screens — fixed with `margin-bottom: -1px` on `.site-banner__wave-container`

**Search bar**
- Tags (filter panel) now hidden by default in all search widgets; results always render above filters (was mobile-only)
- New `show_tags: true` code-fence option reveals the filter panel per widget
- Removed `openFilters: ["tag"]` default from visualizer (`lib/visualizers/search/browser.js`)
- `footer_searchbar` setting now wired through `bloob-settings-reader.js` → `assemble-src.js` → `site.footer_searchbar`

**Footer redesign** (`themes/marbles-pouch/partials/footer.njk`)
- Centered column layout: tagline → search toggle → nav links
- Search icon button lazily mounts a Pagefind widget on first click (no JS cost until opened)
- Shares all Pagefind CSS theming with inline search widget

**Tag cloud** (`lib/visualizers/tags/browser.js`)
- Fisher-Yates shuffle after limiting so large tags are scattered, not front-loaded
- Random `translateY` drift (±6px) per tag for organic floating appearance
- `justify-content: center` on cloud container

**Pill links** (`main.css`)
- Background and border now transparent at rest; pill shape only appears on hover

**Embed responsive sizing** (`main.css`)
- `iframe`, `video`, `embed` inside `.marble-content` get `max-width: 100%` — prevents horizontal overflow on mobile

**Single line break rendering** (`eleventy.config.js`)
- `mdLib.set({ breaks: true })` is now the default — single `\n` renders as `<br>`, matching Obsidian behavior
- Opt out per-site with `features: { soft_breaks: false }` in `_bloob-settings.md`

**Image build cache** (`eleventy.config.js`)
- Optimized images now written to `src/media/optimized/` (persists across builds) instead of `_site/media/optimized/` (cleaned on every production build)
- All three image paths (no-lightbox, no-zoom, main lightbox) check cache first; only run sharp if file is missing
- Subsequent builds: passthrough copies cache → `_site/`, transforms skip sharp entirely
- No config change needed — `src/media/` is already gitignored and passthrough-copied

**Folder index pages** (new feature)
- `preprocess-content.js` Step 9.5: auto-generates `index.md` stub for any top-level content subfolder that doesn't have one
- Stub uses `templateEngineOverride: njk,md` + `{{ folder_display }}` heading + ` ```folder-preview ``` ` code fence
- New `folder-preview` visualizer (`lib/visualizers/folder-preview/`): client-side, reads `graph.json`, filters by `node.section`, renders linked list; supports `sort` and `limit` settings
- User override: add `index.md` to any vault folder — Step 6 processes it normally, Step 9.5 skips stub generation
- User template saved at `themes/marbles-pouch/_templates/folder-index.md`

---

### Session 21 - March 16, 2026
**Worked on:** scene-nav edge fade — replaced SVG/radial-gradient mask with CSS linear-gradient approach; confirmed working on iOS Safari, desktop, and Shopify embeds

**Bug: background image not fading in Shopify embed**
- Previous approach used `radial-gradient(ellipse at center, black X%, transparent 100%)` — broke in luminance mask mode (black = invisible)
- Fixed `black` → `white` in gradient (white = fully visible in both luminance and alpha mask modes)
- Discovered a deeper issue: `mask-image` on an element with `overflow:hidden` silently fails on WebKit (iOS Safari) — introduced `bgWrap` pattern: a wrapper div with `mask-image` (no overflow), containing `bgClip` (overflow:hidden, no mask)
- Radial-gradient approach made the whole center visible and faded out toward edges — wrong visual; user wanted only a tight edge fade (30–100px)

**New approach: two intersected linear gradients**
- Proof-of-concept tested directly in Shopify dev environment
- `mask-image: linear-gradient(to right, ...), linear-gradient(to bottom, ...)` combined with `mask-composite: intersect` / `-webkit-mask-composite: destination-in`
- Fades only the edges (pixel-width, not percentage of radius) — confirmed working on desktop and iOS Safari
- `edgeFadePx` config key replaces `fadeStop`; mapping: `edgeFade * 100` → pixels (e.g. slider at 0.3 → 30px)

**scene-nav-builder (`app/index.html`)**
- `EMBED_RENDER_FN`: replaced radial-gradient bgWrap with linear-gradient + mask-composite approach
- `generateEmbed()`: `fadeStop` removed, `edgeFadePx` introduced in both single-layout and two-layout configs
- Canvas preview (`renderCanvas`): replaced SVG Gaussian blur mask with same CSS linear-gradient mask so preview matches embed output exactly
- Fixed JS crash: `fadeStop` was still referenced as undeclared variable in two-layout config after renaming, breaking the Embed HTML tab

**scene-nav visualizer (`lib/visualizers/scene-nav/renderer.js`)**
- `buildContainer()`: replaced SVG `<feGaussianBlur>` mask with same CSS linear-gradient mask approach
- Removed inline SVG element from HTML output entirely
- Test updated: `scene-nav.test.js` now asserts `mask-image`, `linear-gradient`, `mask-composite:intersect` instead of SVG attributes
- All 27 tests pass

---

### Session 20 - March 5, 2026
**Worked on:** Favicon delivery fix, private content safety, dev/prod pipeline unification

**Favicon pipeline fixes:**
- `generate-favicons.js`: fixed `resolveLogoPath` — wiki-link syntax `[[icon.png]]` now correctly resolves to `src/media/icon.png` (Obsidian attachments are copied there); was resolving to `src/icon.png` (wrong)
- `assemble-src.js`: added `generateFavicons({ config })` call as Step 9, so favicons are generated during both dev and prod builds (was only called in `build-site.js` before)
- `eleventy.config.js` passthrough copy for `favicon.png` / `apple-touch-icon.png` now always finds its source

**Private content safety fix (critical):**
- Bug: `dev:marbles` / `dev:buffbaby` npm scripts ran `preprocess-content.js` directly without setting `BLOCKLIST_TAG` env var, causing filter to use default `"not-for-public"` instead of vault's `"private-marble-keep-from-public"` — private marbles were visible in local dev
- Fix: `preprocess-content.js` now loads site config itself (reads `_bloob-settings.md`) and passes `publishMode`, `blocklistTag`, `excludeFiles` directly to `filterPublishableFiles` — no env var dependency
- Safety: `publish-filter.js` now strips leading `#` from `blocklistTag` — `blocklist_tag: "#private-marble-keep-from-public"` and `blocklist_tag: "private-marble-keep-from-public"` work identically

**Dev/prod pipeline unification:**
- `dev:marbles` and `dev:buffbaby` npm scripts now call `dev-local.js` instead of manually chaining raw scripts — same orchestration as prod
- `dev-local.js` updated: correct step order (preprocess → assemble, so attachments exist for favicon gen), passes `contentDir` to `assembleSrc`, runs Eleventy + theme watcher concurrently
- Eliminated the fragile manual script chain that caused both bugs above

---

### Session 19 - March 4, 2026
**Worked on:** Theme standards — layout fixes, internal link pills, date pill, favicon pipeline, logo in nav

**marbles-pouch layout fixes:**
- Tables: `display:block` + `overflow-x:auto` so wide tables scroll in-place on mobile without scrolling the whole page (now a documented theme standard)
- Banner mobile: restored 110px bottom padding (breakpoint was wiping it, causing 90px wave to overlap "What is a marble?" button)
- Banner description text: increased `margin-bottom` from `xs` to `md` for more breathing room
- Byline: `author` frontmatter is now the full replacement text (no auto "Yours," prefix prepended); `site.author` fallback still uses "Yours, {name}"

**Internal link pills (both themes):**
- `wiki-link-resolver.js`: resolved wiki-links now output `<a class="internal-link">` HTML instead of markdown `[text](url)`
- If the target page has a `bloob-object` type registered in `_bloob-objects.md`, its image is embedded inline as a 16×16 `<img class="internal-link__icon">`
- Pages without a registered image get a pill but no icon (no broken-image fallback)
- `bloobObjectsRegistry` passed from `preprocess-content.js` to resolver
- `resolveLinkTarget()` now returns `slug` alongside `url` for frontmatter lookup
- CSS pill styles added to both `marbles-pouch` and `warm-kitchen`
- Regression tests updated (195/195 pass)

**Date created pill (marbles-pouch):**
- `date_created` frontmatter renders as a centered pill above page content
- Format: `date_created: 2024-11-07` or `date_created: 2024-11-07, Visual created on`
- Default label "Started on" when no comma label given
- `dateFormat` filter fixed: YYYY-MM-DD strings now parsed as local noon (avoids off-by-one timezone issue)

**Favicon generation (build pipeline):**
- New `scripts/generate-favicons.js`: uses `sharp` to generate `favicon.png` (32×32) and `apple-touch-icon.png` (180×180) from site logo; caches via MD5 hash of source image
- Wired into `build-site.js` as Step 5.6 (after preprocessing copies attachments to `src/media/`)
- `_base/partials/head.njk`: added `<link rel="apple-touch-icon">` link
- `bloob-settings-reader.js`: now passes `logo` and `favicon` fields through the merge
- `assemble-src.js`: resolves `[[wiki-link]]` logo syntax → `/media/filename` URL in generated `site.js`; `site.logo` is now available in all templates

**Logo in warm-kitchen nav:**
- `nav.njk`: shows `<img class="site-nav__logo">` when `site.logo` is set; falls back to `site.title` text
- CSS: `max-height: 36px`

**Theme standards doc:**
- `docs/architecture/theme-standards.md`: checklist for all themes (table scroll, internal link pills, date pill, favicon, logo)

### Session 18 - March 3, 2026
**Worked on:** Scene Nav Builder — major GUI upgrades (rotation, multi-bg, aspect ratio, hover controls, image prefix, import)

**Scene Nav Builder (`lib/magic-machines/scene-nav-builder/app/index.html`):**

**Rotation:**
- Per-element rotation slider (−180° to 180°) in properties panel
- Rotation serialized in code fence (`rotation:`) and embed config
- In edit mode, hover always preserves set rotation for accurate positioning
- `resetRotationOnHover` checkbox (default ON): in preview mode + embed code, hover snaps element upright; turn OFF to keep tilt on hover
- Fixed embed hover: removed ineffective CSS `:hover` transform rule (was overridden by inline style); now JS-driven per-element, correctly applying `rotate() scale(1.06)` compound transform

**Multiple backgrounds:**
- `S.backgrounds[]` array replaces single `S.background` — upload multiple PNGs at once
- Each background layer: draggable, selectable, independently scalable (10–200%) and positionable (X/Y offset sliders)
- Selected background gets dashed outline; click canvas background → deselect
- Code fence outputs `backgrounds:` array; single full-width background collapses to shorthand `background:` key

**Aspect ratio presets:**
- `[16:9] [4:3] [3:2] [1:1] [9:16]` buttons; updates canvas `aspect-ratio` CSS live

**Canvas background colors:**
- Separate color pickers for Edit, Preview, and Export modes
- Export supports "transparent" toggle (omits `background:` from embed HTML)

**Image path prefix:**
- Prefix input field (e.g. `../media/studio-bloob/`) prepended to all filenames in code fence output as Obsidian-style `![](prefix+filename.png)` syntax
- Embed HTML output uses the prefix as a plain path (no `![]()` wrapper)
- Leave blank → plain filenames (previous behavior)

**Import from code fence:**
- Paste a `\`\`\`scene-nav\`\`\`` code fence into the Import tab → click "Apply Settings"
- Parser strips Obsidian `![]()` image syntax automatically
- Matches by basename — so `![](../media/studio-bloob/dragonfly.png)` matches uploaded `dragonfly.png`
- Auto-detects and sets the prefix from the pasted paths
- Applies: x, y, scale, rotation, label, glow color/intensity, action, value, resetRotationOnHover

**Copy feedback:**
- Copy button turns green with "✓ Copied!" for 1.8s after copying embed or markdown

**Contrast improvements:**
- Bumped dark gray text colors throughout UI for better legibility against near-black background

**Architecture docs (`docs/architecture/magic-machines.md`):**
- Type taxonomy table (gui / ai / script)
- GUI Magic Machines section documenting scene-nav-builder conventions
- Pairing convention: `scene-nav-builder` produces `\`\`\`scene-nav\`\`\`` → read by `scene-nav` visualizer
- Updated folder structure and related documents

**Files changed:**
- `lib/magic-machines/scene-nav-builder/app/index.html` (all builder changes)
- `lib/visualizers/scene-nav/parser.js`, `renderer.js`, `browser.js`, `styles.css`
- `docs/architecture/magic-machines.md`

---

### Session 17 - February 28, 2026
**Worked on:** Vault index.md homepage, search visualizer, external links, tags visualizer, marbles-pouch polish

**Vault index.md as homepage:**
- `assemble-src.js`: skip theme `index.njk` when vault has `index.md` at root (prevents permalink collision)
- `preprocess-content.js`: auto-inject `permalink`, `layout`, `eleventyExcludeFromCollections`, `templateEngineOverride` for any `index.md` (root or subfolder) — zero frontmatter needed from authors
- `preprocess-content.js`: don't override `layout` if author already set it; guard against Jekyll-style layout values (`default`, `page`, `post`) that break Eleventy — only preserve `layouts/` paths
- `build-site.js`: pass `contentDir` to `assembleSrc` for vault index detection
- New `search-widget.njk` partial for reusable search widget in vault markdown files

**Byline system (marbles-pouch banner):**
- `byline` frontmatter: write the full byline yourself (overrides "Yours,") — supports `[text](url)` links + `\n` line breaks
- `author` frontmatter still works for name-only override
- New `nl2br` filter in `eleventy.config.js`

**Search visualizer (new — `lib/visualizers/search/`):**
- Code fence ` ```search``` ` mounts PagefindUI with warm-kitchen-style defaults (`resetStyles: false`, `showImages: true`, `showSubResults: true`, `openFilters: ['tag']`)
- `placeholder` shorthand supported in YAML settings
- `pagefind-ui.css` loaded in `head.njk` (both themes) when `features.search != false`
- Pagefind CSS variables (`--pagefind-ui-*`) added to both themes' `:root`
- `browser.js` loads `pagefind-ui.js` dynamically — only on pages with a search widget

**External links:**
- `features/theme_settings` wired through `site.js` (were always `undefined` in templates before)
- `bloob-settings-reader.js`: deep merge for `theme_settings`
- `external_links_new_tab` feature flag added to `scripts.njk` in both themes; defaults to **on** (opt-out)
- `docs/architecture/themes.md`: baseline features contract table, `theme_settings` namespace docs

**Tags visualizer (new — `lib/visualizers/tags/`):**
- Code fence ` ```tags sort: count``` ` renders a tag cloud sorted by usage; weight 1–5 font scaling
- Fetches `/tagIndex.json` at runtime; `tagIndex.json` added as Eleventy passthrough copy
- Settings: `style` (cloud/list), `sort` (count/alpha), `limit`, `show_count`
- CSS in marbles-pouch `main.css`: pill-shaped tags, hover → accent color

**Search UI polish (marbles-pouch):**
- Removed borders/boxes from Pagefind Clear button and filter panel
- Added 3rem bottom margin to `.search-visualizer`

**Recent Marbles:**
- Removed date display — deferred to future date visualization work

**Docs:**
- `docs/architecture/visualizers.md`: dev workflow note — run `node scripts/bundle-visualizers.js` manually after adding a visualizer in dev
- `docs/architecture/themes.md`: search CSS contract, `index.md` implemented status
- `CLAUDE.md`: session checklist reminder to update vault settings tables

**Files changed (10 commits):**
- `lib/visualizers/search/` (new: index.js, browser.js, manifest.json)
- `lib/visualizers/tags/` (new: index.js, browser.js, manifest.json)
- `eleventy.config.js` (nl2br filter, tagIndex.json passthrough)
- `scripts/assemble-src.js` (vault index.md skip, subfolder index skip, --content-dir flag)
- `scripts/preprocess-content.js` (auto-frontmatter for index.md, layout guard)
- `scripts/build-site.js` (pass contentDir to assembleSrc)
- `scripts/utils/bloob-settings-reader.js` (theme_settings deep merge)
- `themes/marbles-pouch/assets/css/main.css` (Pagefind overrides, tags CSS)
- `themes/marbles-pouch/partials/banner.njk` (byline system)
- `themes/marbles-pouch/partials/search-widget.njk` (new)
- `themes/marbles-pouch/partials/scripts.njk` (external_links_new_tab)
- `themes/warm-kitchen/partials/scripts.njk` (external_links_new_tab)
- `themes/_base/partials/head.njk` + `themes/marbles-pouch/partials/head.njk` (pagefind-ui.css)
- `bloob-haus-marbles/index.md` (tags fence, date removed)
- `docs/architecture/themes.md`, `docs/architecture/visualizers.md`, `CLAUDE.md`

---

### Session 16 - February 27, 2026
**Worked on:** Marbles deployment, pathPrefix debugging, fridge magnets layout feature

**Marbles Deployment:**
- Deployed marbles site to `leons.bloob.haus` via Cloudflare Pages
- Created `deploy-marbles.yml` GitHub Actions workflow
- Discovered and documented pathPrefix + mount_path doubled-URL bug

**Key Discovery — pathPrefix Bug:**
- Eleventy's `| url` filter prepends pathPrefix to all URLs
- When content outputs to a subdirectory (e.g., `_site/marbles/`), using `pathPrefix: "/marbles/"` causes doubled paths: `/marbles/marbles/...`
- **Temporary workaround:** Use folder structure within single repo
- **Needs proper fix for Phase 3:** Multi-repo "haus with rooms" architecture requires working mount_path (each room = separate repo mounted at subpath)
- Documented in `docs/implementation-plans/DECISIONS.md` with options for proper fix

**Fridge Magnets Visualizer:**
- Added position-aware input parsing: `[text](x,y)` format stores coordinates
- Added "Copy Layout" button to export current magnet positions
- Restored positions on re-render if coordinates present in input

**Files changed:**
- `.github/workflows/deploy-marbles.yml` (new)
- `lib/visualizers/fridge-magnets/browser.js`
- `scripts/build-site.js` (pagefind mount_path handling)
- `docs/implementation-plans/DECISIONS.md`
- `docs/implementation-plans/phases/phase-3/2026-02-25_url-naming-and-multi-site-architecture.md`
- `docs/TECH-DEBT.md`

---

### Session 15 - February 26, 2026
**Worked on:** `_bloob-settings.md` as source of truth for site configuration

**Core Change:**
- **`_bloob-settings.md` now drives site config** — the markdown file in each content repo (e.g., `buffbaby/_bloob-settings.md`) is the source of truth for site-level settings like name, description, author, footer_text, theme, features, visualizers, etc.
- **`sites/*.yaml` trimmed to infra-only** — yaml files now contain only webapp-specific settings: `site.url`, `content.repo`, `content.branch`. Everything else comes from the vault's `_bloob-settings.md`.

**Implementation:**
- Created `scripts/utils/bloob-settings-reader.js` — parses `_bloob-settings.md` frontmatter
- Updated `scripts/utils/config-loader.js` — merges bloob settings with yaml config
- Reordered build steps in `scripts/build-site.js` — clone content BEFORE loading full config
- Updated `scripts/dev-local.js` — passes contentDir to config loader
- Updated tests in `tests/build/config-loader.test.js` — tests for bloob-settings parsing and merging

**Breaking Changes:**
- `sites/*.yaml` no longer contains `name`, `description`, `author`, `footer_text`, `theme`, `features`, `visualizers`, `media`, `permalinks` — these must be in `_bloob-settings.md`

**Tests:**
- 195 tests passing (4 new tests for bloob-settings reader/merger)

**Files changed:** 6 files
- `scripts/utils/bloob-settings-reader.js` (new)
- `scripts/utils/config-loader.js`
- `scripts/build-site.js`
- `scripts/dev-local.js`
- `sites/buffbaby.yaml`
- `sites/marbles.yaml`
- `tests/build/config-loader.test.js`
- `docs/implementation-plans/phases/phase-2/2026-02-26_bloob-settings-file.md`

---

### Session 14 - February 19, 2026
**Worked on:** Engineering review implementation, marbles site launch, multi-site build isolation

**Infrastructure Cleanup (from engineering review):**
- Deleted `vercel.json` (migrated to Cloudflare Pages)
- Removed 5 unused npm dependencies (remark-wiki-link, execa, unified, remark-parse, remark-stringify)
- Created `CLAUDE.md` (auto-read development guide) and `docs/TECH-DEBT.md`

**New Features:**
- Configurable URL slug strategy per site: "slugify" (lowercase, buffbaby) and "preserve-case" (keep casing, marbles) via `permalinks.strategy` in sites/*.yaml
- Centralized `scripts/utils/slug-strategy.js` replacing 7 scattered slugify implementations
- Dynamic section collections in `eleventy.config.js` — auto-discovers sections from URL structure
- Dev workflow: `npm run dev` with `concurrently` (theme watcher + Eleventy serve)
- Image optimization caching in `.cache/eleventy-img/` (persists across builds)
- Validation report: broken link collection during preprocessing with `--strict` CI flag
- Per-file `exclude_files` list in site YAML config (e.g., exclude `ALL.md` from marbles)
- Reserved directory filtering: `media`, `assets`, `tags`, `pagefind`, `og`, `search` excluded from section discovery

**Multi-Site Build Isolation:**
- Content subfolder support: `content.path` in YAML config points to subfolder within a repo
- Branch support: `content.branch` specifies which branch to clone
- Repo-switch detection: `clone-content.js` detects if wrong repo is in `content-source/` and re-clones
- Preprocessor now cleans all `.md` files and `media/` from `src/` before writing new content (prevents cross-site contamination on local builds)

**Marbles Site:**
- Created `sites/marbles.yaml` — preserve-case URLs, `#private-marble-keep-from-public` blocklist tag, content from `LSanten/LSanten.github.io:_mms-md`
- Successfully built: 419 pages indexed, ~35s build time
- Verified: no recipe content bleeding, no `ALL` page, no `media` in nav

**Tests:**
- Added 44 new tests: publish-filter (12), file-index-builder (16), slug-strategy (16)
- Total: 14 files, 191 tests, all passing

**Documentation:**
- Updated DECISIONS.md with 10 new decisions
- Updated CLAUDE_CONTEXT.md with current status
- Updated TECH-DEBT.md with resolved items
- Updated IDEAS.md with future improvements

**Files changed:** 20+ files across scripts/, sites/, tests/, docs/, eleventy.config.js, package.json

---

### Session 13 - February 18, 2026
**Worked on:** Graph hover tooltip with OG image preview; OG filename encoding fix

**Graph Hover Tooltip:**
- Added `makeTooltip()` function in `lib/visualizers/graph/browser.js`
  - Creates a `position:fixed` div appended to `document.body` (not inside the canvas container)
  - Follows the mouse via `mousemove` listener on the canvas element using `e.clientX/Y` — zero coordinate math, works perfectly with `position:fixed`
  - Shows a small card (150px wide) above the cursor with: OG preview image (if available) + page title
  - `position:fixed` + `clientX/Y` avoids the coordinate-space mismatch that made `graph2ScreenCoords()` + `position:absolute` fail (`graph2ScreenCoords` returns viewport coords, not element-relative coords)
- Applied tooltip to both inline graph and full-graph modal
- Disabled force-graph's native label tooltip: `nodeLabel(() => "")`
- `nodeCanvasObjectMode(() => "after")` kept as always-after for click detection
- `tooltip.attach(canvas)` called via `setTimeout(..., 100)` after graph initialization so the canvas element exists

**OG Image Filename Encoding Fix:**
- Root cause: filenames on disk used raw characters (`@`, spaces) but the pipeline was writing encoded names (e.g. `%40`, `%20`) then URL-encoding them again — double-encoding
- **Rule established:** disk filenames always use raw characters; URL `src`/`href` attributes always use `encodeURIComponent`
- `scripts/preprocess-content.js` — `decodeURIComponent` on the raw markdown image path (normalizes any already-encoded chars), then `encodeURIComponent` on the base name before storing as `/og/{encoded}-og.{ext}` in frontmatter
- `scripts/generate-og-images.js` — reads the frontmatter `image` URL, `decodeURIComponent`s the base name back to raw, writes disk file with raw name (e.g. `cleanshot_2026-01-10-at-22-11-06@2x-og.png`)
- This is the single normalization point — all downstream consumers (templates, graph.json) use the URL as-is; disk operations decode first

**graph.json image field:**
- `scripts/utils/graph-builder.js` — page nodes now include `image: "/og/..."` when the page has an OG image
- `scripts/preprocess-content.js` — sets `perPageLinks[url].image` alongside the frontmatter image field
- Graph tooltip uses `node.image` to display the preview

**Files changed:**
- `lib/visualizers/graph/browser.js` — hover tooltip (mouse-following card with image + title)
- `scripts/preprocess-content.js` — image field in perPageLinks, encode/decode fix
- `scripts/utils/graph-builder.js` — image field on page nodes
- `scripts/generate-og-images.js` — disk files written with raw filenames

---

### Session 12 - February 18, 2026
**Worked on:** Phase 2 — graph.json linking API + graph visualizer

**graph.json Linking API (Step 1):**
- Created `scripts/utils/graph-builder.js` — pure `buildGraph(perPageLinks)` function
  - Input: per-page map of `{ title, outgoing: [url] }` collected during preprocessing
  - Output: `{ nodes: [{ id, title, section }], links: [{ source, target }] }` — D3 / force-graph compatible
  - URL as node ID (no numeric indirection), section derived from URL path (`/recipes/chai/` → `"recipes"`)
  - Heading anchors stripped from link targets, self-links and unknown targets filtered, duplicates deduplicated
- Modified `preprocess-content.js` to collect resolved outgoing links per page during step 6f (from both wiki-link and markdown-link resolver output)
- New step 7: builds graph data and writes `src/graph.json` → served at `/graph.json`
- Added `eleventy.config.js` passthrough copy for `src/graph.json`
- `graph.json` is **always generated** regardless of whether the graph visualizer is active

**Note on backlinks vs graph.json — they're complementary, not redundant:**
| | Backlinks | graph.json |
|---|---|---|
| Direction | Incoming only | Bidirectional (outgoing + incoming) |
| Format | Eleventy data (not a public file) | Served JSON endpoint at `/graph.json` |
| Source | Reads processed markdown from disk at Eleventy build time | Built from link resolver results during preprocessing |
| Purpose | Static "pages that link here" list on each page | Site-wide data API for visualization and future tools |
| Scope | Per-page | Entire site at once |

**Graph Visualizer (Step 2):**
- Created `lib/visualizers/graph/` — hybrid visualizer (build-time transform + runtime browser)
- `manifest.json` — type: hybrid, settings schema, TODO note for right/left positioning
- `index.js` — build-time transform: detects ` ```graph ` code fences in rendered HTML, parses YAML settings, replaces with `<div class="graph-visualizer" data-graph-position="inline" data-graph-settings='...'>` container
- `browser.js` — runtime:
  - Loads `force-graph` (MIT, vasturiano) from jsDelivr CDN at runtime (avoids ~300KB bundle)
  - Fetches `/graph.json` and `/graph-settings.json` (shared, cached fetch promises)
  - BFS local graph filtering to N-depth neighborhood of current page
  - Renders interactive canvas graph with node labels, click-to-navigate
  - Full-graph modal (all pages) via "Full graph" button, Escape/overlay-click to close
  - Colors inherit from warm-kitchen CSS variables (`--accent-color`, `--border-color`, etc.) with optional hex overrides
- `styles.css` — graph header, canvas, full-graph modal; uses CSS variables for theme matching
- `graph.test.js` — 15 co-located tests (manifest, exports, transform behavior)

**Settings system (lowest to highest priority):**
1. Manifest defaults (`only_if_linked: true`, `depth: 2`, `show_full_graph: true`)
2. `.bloob/graph.yaml` in content vault → preprocessor reads + writes `src/graph-settings.json` → served at `/graph-settings.json`
3. Per-page frontmatter: `graph: { depth: 3 }`
4. Inline code fence: ` ```graph\ndepth: 1\n``` ` (also positions graph at that location)

**Wired into build:**
- `themes/warm-kitchen/layouts/page.njk` — graph container at bottom of every page, passes `data-current-page` and frontmatter settings; conditional on graph visualizer being bundled
- `sites/buffbaby.yaml` — added `graph` to visualizers list
- `eleventy.config.js` — passthrough copies for both `graph.json` and `graph-settings.json`

**Test suite:** 11 files, 137 tests (was 104 → 122 → 137)

---

### Session 11 - February 17, 2026
**Worked on:** Cloudflare Pages + GitHub Actions migration

**GitHub Actions CI/CD:**
- Created `.github/workflows/deploy-buffbaby.yml` — single-site deploy workflow
  - Triggers: push to main (paths-ignore docs), `repository_dispatch` from content repo, manual
  - Steps: checkout → Node 20 → npm ci → npm test (104 tests) → build:buffbaby → deploy to Cloudflare Pages via wrangler
- Created `.github/workflows/rebuild-all.yml` — matrix-based rebuild of all sites
  - Auto-discovers sites from `sites/*.yaml` using `jq`
  - Triggers on changes to themes/, scripts/, lib/, eleventy.config.js, package.json
  - Runs tests once, then builds/deploys each site in parallel (`fail-fast: false`)
- Created `.github/workflows/trigger-build.yml` in **buffbaby** content repo
  - Pushes to buffbaby → `repository_dispatch` → triggers `deploy-buffbaby` in builder repo
  - Full chain verified: content push → build → test → deploy (1m 25s)

**Cloudflare Pages Setup:**
- Created Cloudflare account and added `bloob.haus` domain
- Created `buffbaby` Cloudflare Pages project (Direct Upload mode)
- Site deployed and accessible at `buffbaby-f5k.pages.dev`
- Added custom domain `buffbaby.bloob.haus` in Cloudflare Pages

**DNS Migration (Porkbun → Cloudflare):**
- Changed nameservers from Porkbun to Cloudflare (`dimitris.ns.cloudflare.com`, `kara.ns.cloudflare.com`)
- Added CNAME record: `buffbaby` → `buffbaby-f5k.pages.dev` (proxied)
- DNS propagated and verified: `buffbaby.bloob.haus` serving from Cloudflare with SSL (HTTP 200, `cf-ray` header confirmed)

**GitHub Secrets Configured:**
- `CONTENT_REPO_TOKEN` — GitHub PAT for cloning private content repos
- `CLOUDFLARE_API_TOKEN` — Cloudflare API token with Pages edit permissions
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account identifier
- `BUILDER_REPO_TOKEN` — added to buffbaby repo for repository_dispatch

**Remaining cleanup:**
- Decommission Vercel (remove vercel.json, delete project) — no rush, traffic already on Cloudflare

---

### Session 10 - February 17, 2026
**Worked on:** Test suite implementation (Phase 1 + 1.5)

**Test Infrastructure:**
- Installed Vitest as test framework (native ESM support, zero config)
- Created `vitest.config.js` with dual glob patterns: `tests/**/*.test.js` (central) + `lib/**/*.test.js` (co-located)
- Created `tests/helpers/mock-index.js` — shared factories for mock file/attachment indexes
- Added `npm test` and `npm run test:watch` scripts to `package.json`

**Phase 1 — Pure Function Unit Tests (5 files, 62 tests):**
- `tests/utils/comment-stripper.test.js` — 11 tests (Obsidian %% %%, HTML comments, whitespace collapse)
- `tests/utils/attachment-resolver.test.js` — 14 tests (URL decoding, wiki-style images, case-insensitive lookup, the %20 bug case)
- `tests/utils/wiki-link-resolver.test.js` — 11 tests (title/filename/normalized lookup, headings, broken links, transclusion skip)
- `tests/utils/markdown-link-resolver.test.js` — 9 tests (folder stripping, URL decoding, heading anchors, external URLs untouched)
- `tests/utils/transclusion-handler.test.js` — 17 tests (page embeds, all 10 media extensions excluded, multiple transclusions)

**Phase 1.5 — Templatizer & Co-located Visualizer Tests (4 files, 42 tests):**
- `tests/build/config-loader.test.js` — 12 tests (YAML loading, CLI arg/env var priority, schema shape, error handling)
- `tests/build/assemble-src.test.js` — 10 tests (theme structure validation, site.js generation contract, module exports)
- `lib/visualizers/checkbox-tracker/checkbox-tracker.test.js` — 10 tests (co-located: manifest, exports, no-op transform)
- `lib/visualizers/page-preview/page-preview.test.js` — 10 tests (co-located: manifest, exports, no-op transform)

**Architecture Decisions:**
- Co-located tests: modular packages (visualizers, future machines) carry their own `.test.js` files
- Central tests: pipeline utilities and build orchestration tested in `tests/`
- Vitest auto-discovers both via glob patterns

**Updated test suite plan** with Phase 1.5, co-located architecture, test template for new visualizers, activation config reference table.

**Results:** 9 test files, 104 tests, all passing in ~700ms.

---

### Session 9 - February 16, 2026
**Worked on:** Templatize the builder for multi-site support

**Templatized Builder Architecture:**
- Extracted all theme files from `src/` into `themes/warm-kitchen/` (layouts, partials, pages, CSS)
- Created `themes/_base/` for shared partials (`head.njk`, `backlinks.njk`) used across all themes
- `src/` is now entirely generated at build time (gitignored) — never edit files in `src/` directly
- Theme partials override base partials when they share the same name

**Config-Driven Builds:**
- Created `sites/buffbaby.yaml` — all site configuration in one YAML file (name, content repo, theme, features, media settings, publish mode)
- Created `scripts/utils/config-loader.js` — shared YAML config loader used by assemble, build, and eleventy
- Created `scripts/assemble-src.js` — assembles `src/` from theme + base files + generates `site.js` from config
- Updated `scripts/build-site.js` — config-driven orchestration with `--site=` flag (defaults to `buffbaby`)
- Updated `eleventy.config.js` — reads site config, conditionally enables backlinks and image optimization
- Environment variables simplified: only `GITHUB_TOKEN` required as env var; everything else in YAML config

**Package Updates:**
- Added `js-yaml` dependency for YAML config parsing
- Updated `package.json` scripts: `build`, `build:buffbaby`, `dev`, `dev:buffbaby`, `assemble`

**Multi-Site Architecture:**
- Adding a new site (e.g., marbles) requires only:
  1. Create `themes/spatial-garden/` with layouts, partials, pages, CSS
  2. Create `sites/marbles.yaml` pointing to theme + content repo
  3. Run `SITE_NAME=marbles npm run build`
- Zero changes needed to buffbaby's theme or config

**Build Verified:**
- `npm run build` produces identical output to pre-refactor build
- 109 pages written, 67 indexed by Pagefind, 14.19s build time

---

### Session 8 - February 13, 2026
**Worked on:** Homepage redesign, search UX, recipe ordering fix

**Homepage Redesign:**
- Replaced "Recent Recipes" + "Resources" layout with search-first design
- Pagefind search bar now centered prominently below header
- Full tag cloud ("Browse by Tag") displayed below search bar
- Recent Recipes list at the bottom of the page

**Search UX (Mobile):**
- Fixed mobile Pagefind layout: search results now appear above tag filters on phone
- Root cause: conflicting `flex-direction: column-reverse` with explicit `order` values were canceling out
- Fixed to `flex-direction: column` with `order: 1` (results) and `order: 2` (filters)

**Recipe Ordering Fix (Git Dates):**
- Root cause: `clone-content.js` used `git clone --depth 1` (shallow clone), so `git log` returned no per-file dates
- Without dates, Eleventy fell back to filesystem creation time (identical for all files on fresh deploy)
- Fix: full clone instead of shallow — all 64 files now get correct git dates
- Added auto-unshallow: existing shallow repos detected and unshallowed with `git fetch --unshallow`
- Added `gitDatesFound` / `gitDatesMissing` counters to preprocessing summary for visibility

**Build Target Cleanup:**
- Changed default `BUILD_TARGET` from `"hugo"` to `"eleventy"` in `preprocess-content.js` and `build-site.js`
- Hugo is no longer used; prevents accidental writes to a `hugo/` folder

---

### Session 7 - February 8-9, 2026
**Worked on:** Tag system, Pagefind search, page-preview visualizer, bug fixes

**Tag System & Pagefind Search:**
- Created `scripts/utils/tag-extractor.js` — extracts and normalizes tags from frontmatter and inline content
- Added tag collections and `tagList` collection to `eleventy.config.js`
- Created tag index page (`/tags/`) with weighted tag cloud
- Created per-tag pages (`/tags/<tag>/`) listing all tagged content
- Created `src/_includes/partials/tags.njk` for tag badges on content pages
- Integrated Pagefind search with `src/search.njk` — full-text search with tag filters
- Added Pagefind build step to Eleventy build pipeline
- Tag filtering ignores provenance tags (internal metadata)

**Search UX Polish:**
- Search icon added to navigation bar
- Thumbnails shown in search results via `data-pagefind-meta="image"` on pages
- Empty filters hidden, tag filters collapsed by default
- Filter label renamed for clarity
- Mobile layout: tag filters moved below search results

**Page Preview Modal:**
- Built recipe preview modal — hover/click to preview page content without navigating
- Rebuilt as hover button with extended interaction area
- Fixed search result image display with `!important` overrides for Pagefind's scoped styles
- Modularized as `lib/visualizers/page-preview/` visualizer package (manifest, browser.js, styles.css)

**Visualizer Auto-Discovery Improvements:**
- `bundle-visualizers.js` now auto-generates CSS and JS include paths
- `head.njk` and `scripts.njk` updated to loop over discovered visualizers instead of hardcoded paths

**Bug Fixes:**
- Duplicate image bug: OG images moved from `/media/og/` to `/og/` to avoid being re-optimized by image transform
- Image optimizer now skips `/media/` subdirectories (only processes top-level `/media/` images)

**Documentation:**
- Restructured `docs/implementation-plans/phases/` into `phase-2/` and `phase-3/` subdirs
- Created `docs/architecture/search.md` — search, tags, and Pagefind architecture doc
- Created tag system and search implementation plan (`2026-02-08`)
- Created multi-index search architecture doc for Phase 3
- Moved completed tag/search plan to `_completed/`
- Source attribution line commented out pending better recipe provenance design
- Added reserved root folder validation to IDEAS
- Added duplicate image fix to DECISIONS log

---

### Session 6 - February 7, 2026
**Worked on:** Image processing improvements, OG preview images for chat sharing

**PNG Preservation:**
- Changed Eleventy image transform to detect source format: PNG sources output WebP + PNG (not JPEG), preserving full gradient alpha transparency
- JPEG sources continue as WebP + JPEG (unchanged behavior)
- GIFs skip the transform entirely — served untouched to preserve animation

**OG Preview Images for Chat Sharing:**
- Added `extractFirstImage()` utility to `attachment-resolver.js` — extracts first image reference from processed markdown
- Preprocessor now sets `image` frontmatter field on pages with images, pointing to `/media/og/{name}-og.{format}`
- Created `scripts/generate-og-images.js` — dedicated OG preview generator:
  - Generates 1200w-wide previews optimized for social sharing
  - PNG sources produce PNG previews (preserves transparency), JPEG sources produce JPEG previews
  - GIFs copied as-is to preserve animation
  - Iterative quality/dimension reduction to stay under 300KB (WhatsApp-compatible)
  - File hash tracking (`.og-tracking.json`) skips unchanged images on subsequent builds
  - Orphan cleanup for removed pages
- Wired into build pipeline as Step 2.5 (between preprocessing and Eleventy build)

**Head Meta Tag Improvements:**
- Added `og:image:width` and `og:image:type` meta tags (supports JPEG, PNG, GIF)
- Added `og:site_name` meta tag
- Added `<link rel="canonical">` for SEO

**EXIF Orientation Fix:**
- Fixed OG preview images that appeared rotated — `generate-og-images.js` now applies EXIF orientation correction

**Dependencies:**
- Added `sharp` as explicit dependency (was only transitive via eleventy-img)

**Build Stats:**
- 11 OG preview images generated, all under 300KB
- Second build skips all 11 (caching works)
- PNG images now correctly output as WebP + PNG in `_site/media/optimized/`

---

### Session 5 - February 5, 2026
**Worked on:** Hugo → Eleventy migration (M0-M7), site enhancements (RSS, sitemap, image optimization)

**Migration M0: Preparation**
- Created `src/` directory structure for Eleventy
- Created `lib/visualizers/checkbox-tracker/` modular visualizer package
- Installed Eleventy 3.x and esbuild as dev dependencies
- Updated `.gitignore` for generated section dirs, `_site/`, `src/media/`
- Added npm scripts (`build:eleventy`, `dev:eleventy`)
- Created `.eleventyignore` with `node_modules/`

**Migration M1: Eleventy Foundation**
- Created `eleventy.config.js` (ESM, `export default async function`)
- `setUseGitIgnore(false)` — required because generated content dirs are gitignored
- Created `src/_data/site.js` (title, description, URL, author)
- Created `src/_data/eleventyComputed.js` — slugified permalinks for both folder paths and filenames
- Ported all templates from Hugo Go templates to Nunjucks: `base.njk`, `page.njk`, `list.njk`
- Ported all partials: `head.njk`, `nav.njk`, `footer.njk`, `scripts.njk`
- Copied CSS + JS assets to `src/assets/`
- Added filters: `dateFormat`, `truncate`, `head`, `capitalize`, `titleCase`

**Migration M2: Preprocessing Integration**
- Modified `preprocess-content.js` with `BUILD_TARGET` support (lazy getter for ESM timing)
- Modified `build-site.js` with `--target=` flag (hugo or eleventy)
- Eleventy target adds `layout: layouts/page.njk` to frontmatter
- Verified: 67 pages, 22 media, 0 broken links

**Migration M3: Template Parity**
- Set up section collections in `eleventy.config.js` (`recipes`, `notes`, `resources`, `listsOfFavorites`)
- Auto-detect sections collection (mirrors Hugo's `.Site.Sections`)
- Created homepage `src/index.njk` with recent recipes and resources
- Created section index pages (`src/recipes/index.njk`, etc.)
- `titleCase` filter handles hyphen-to-space conversion for slugified section names in nav

**Migration M4: Visualizer Architecture**
- Created modular visualizer package: `lib/visualizers/checkbox-tracker/` with `index.js`, `browser.js`, `styles.css`, `manifest.json`
- `index.js` exports `{ type, name, transform }` — module contract for all visualizers
- Created `scripts/bundle-visualizers.js` — auto-discovers visualizer folders, bundles with esbuild
- esbuild bundles `browser.js` → IIFE in `src/assets/js/visualizers/`, copies `styles.css` → `src/assets/css/visualizers/`
- `eleventy.config.js` auto-loads visualizers and registers `addTransform` for build-time types
- Runtime visualizers (like checkbox-tracker) pass through unchanged; build-time visualizers modify HTML
- Added `markdown-it-task-lists` plugin for `- [ ]` checkbox rendering (markdown parser layer)
- Fixed CSS/JS selectors for `<label>`-wrapped checkboxes from task-lists plugin

**Migration M5: Backlinks**
- Implemented `addCollection("withBacklinks")` — reads markdown source files, extracts internal links via regex
- Two-pass algorithm: first builds link map, then computes backlinks per page
- Created `src/_includes/partials/backlinks.njk` with styled backlink list
- Added backlinks CSS to `main.css` (pill-style links)

**Migration M6: Deployment**
- Full build test: 72 pages, 22 media, 26 assets copied, 0 broken links
- Updated `vercel.json`: `buildCommand` → `npm run build:eleventy`, `outputDirectory` → `_site`
- Pushed all migration commits (9 total) to origin/main
- Verified production deployment on buffbaby.bloob.haus

**Migration M7: Cleanup**
- Archived Hugo version to `archive/hugo-version` branch
- Removed `hugo/` folder and all Hugo templates, CSS, JS, static media
- Uninstalled `hugo-bin` dependency
- Cleaned up `package.json` scripts (removed Hugo-specific scripts, simplified `build` and `dev`)
- Cleaned up `.gitignore` (removed Hugo paths) and `vercel.json`
- Updated `docs/CLAUDE_CONTEXT.md` and `docs/implementation-plans/ROADMAP.md`
- Created `README.md` with project overview, quick start, and docs links

**Site Enhancements (post-migration):**
- **RSS feed** (`/feed.xml`) — Atom feed with 20 most recent recipes, full content, using `@11ty/eleventy-plugin-rss`
- **Sitemap** (`/sitemap.xml`) — all pages with lastmod dates
- **robots.txt** — allows all crawlers, references sitemap
- **Custom 404 page** — styled error page with link back to homepage
- **Image optimization** — `@11ty/eleventy-img` via `addTransform`, generates WebP + JPEG at 600w/1200w, `<picture>` elements with `loading="lazy"` and `decoding="async"`. Reduces 48MB of raw iPhone photos to ~6MB optimized.

**Key Technical Decisions:**
- `BUILD_TARGET` env var uses lazy getter (not module-level const) due to ESM import timing
- Visualizer parsers run in preprocessor (raw markdown), not `addTransform` (HTML)
- `addTransform` kept as secondary hook for post-render HTML modifications
- Image optimization runs as `addTransform` on rendered HTML — no changes needed to preprocessor or markdown content
- Backlinks read source files from disk (stable API, not Eleventy internals)

**Build Stats:**
- 77 files written (72 pages + feed.xml + sitemap.xml + robots.txt + 404.html + optimized image variants)
- Build time: ~11s (up from ~5s due to image processing)
- 10 commits pushed to origin/main

---

### Session 4 - February 3, 2026
**Worked on:** Recipe cleanup (buffbaby vault), Magic Machines architecture, documentation reorganization

**Recipe Cleanup (buffbaby vault):**
- Added missing `# titles` to 2 files (gf pancakes, Tuna Rools)
- Converted `**bold**` section headers to `##` headers (4 files)
- Deleted emoji section markers (👉🏻)
- Converted 74 files from bullets/numbered lists to checkboxes (`- [ ]`)
- Fixed YAML frontmatter that was accidentally converted
- Standardized recipe formatting across ~80 recipe files

**Magic Machines Architecture:**
- Introduced "Magic Machines" concept - AI-powered content transformation tools
- Designed as "write" counterpart to Visualizers ("read" tools)
- Created modular manifest format (JSON with prompts, settings, I/O)
- Designed flat YAML frontmatter for status tracking (`mm_<machine-name>: date`)
- Flat structure chosen for Obsidian Properties compatibility

**Recipe Scaling System Plan:**
- Researched Cooklang markup language for recipes
- Designed Cooklang-inspired syntax: `@ingredient{qty%unit}`
- Planned hybrid visualizer (build-time parser + runtime scaler)
- Documented scaling UI and servings metadata approach

**Documentation Reorganization:**
- Created `docs/implementation-plans/` folder
- Moved all implementation plans and roadmaps to new location
- Established naming conventions:
  - `bloob-haus-*.md` for roadmaps/phase plans
  - `YYYY-MM-DD_*.md` for feature-specific plans
- Updated CLAUDE_CONTEXT.md with new conventions
- Created `2026-02-03_recipe-scaling-and-magic-machines.md`

---

### Session 3 - February 2, 2026
**Worked on:** Interactive checkboxes, visualizer architecture, documentation

**Checkbox Tracker Visualizer:**
- Created modular visualizer folder structure (`hugo/assets/js/visualizers/`, `css/visualizers/`)
- Implemented checkbox-tracker.js with localStorage persistence
- Floating reset button appears only when boxes are checked
- 60-second undo window after reset ("Undo clearing")
- Checkbox states persist across page reloads and visits

**Documentation & Planning:**
- Documented visualizer architecture in future-features-roadmap.md
- Defined build-time vs runtime visualizers
- Defined activation methods (frontmatter, folder config, auto-detect, global)
- Chose Approach A (build-time resolution) over Approach B (runtime resolution)
- Updated CLAUDE_CONTEXT.md and TODO.md
- Created Phase 2 implementation plan skeleton

**Other Changes:**
- Renamed site from "Buff Baby Bakery" to "Buff Baby Kitchen"
- Reduced checkbox spacing
- Updated search-index.json spec (added image field)

---

### Session 2 - January 30, 2026
**Worked on:** Tasks 2-17 (Full implementation and deployment)

**Preprocessing Pipeline (Tasks 2-10):**
- Content clone script with GitHub PAT authentication
- Obsidian config reader (attachment folder detection)
- Dual-mode publish filter (allowlist/blocklist)
- File index builder with folder-based URLs
- Wiki-link resolver ([[links]])
- Markdown link resolver ([text](file.md))
- Attachment resolver (images copied to /media/)
- Transclusion placeholder handler
- Comment stripper (Obsidian %% %% and HTML <!-- -->)
- Git date extractor (last modified dates for sorting)
- Full preprocessing orchestration

**Hugo Site (Tasks 11-12):**
- Complete template system (baseof, single, list, index)
- Warm color theme with Google Fonts
- Responsive design
- Clickable recipe cards showing full content
- Auto-detected navigation for all sections
- First heading underlined on recipe pages
- Open Graph meta tags for social sharing

**Build & Deploy (Tasks 13-17):**
- Full build script orchestration
- Local testing with dev server
- Vercel deployment with environment variables
- Custom domain setup (buffbaby.bloob.haus)
- Auto-rebuild webhook on content changes

**Key Features Added Beyond Original Plan:**
- Comment stripping for privacy (`%% notes %%` removed)
- Git-based date extraction for "Recent Recipes" sorting
- Clickable recipe cards (whole card is link, not just title)
- Auto-detection of all top-level sections in nav
- Support for h1, h2, AND h3 first headings
- Bold/italic formatting preserved in titles
- YouTube embed support (HTML passthrough)

**Test Results:**
- 59 recipes published
- 21 recipes kept private (#not-for-public tag)
- All links resolved correctly
- All images working
- Comments stripped successfully
- Auto-deployment working

---

### Session 1 - January 29, 2026
**Worked on:** Project Setup (Task 1)

**Completed:**
- Initialized npm project with ES modules
- Installed all dependencies (223 packages)
- Hugo v0.152.2 verified working
- Created folder structure
- Set up GitHub repository

---

## Quick Reference

| Session | Date | Summary |
|---------|------|---------|
| 1 | Jan 29, 2026 | Project setup |
| 2 | Jan 30, 2026 | Full implementation & deployment - site goes LIVE |
| 3 | Feb 2, 2026 | Checkbox visualizer, modular structure, site rename |
| 4 | Feb 3, 2026 | Recipe cleanup, Magic Machines architecture, docs reorganization |
| 5 | Feb 5, 2026 | Hugo → Eleventy migration (M0-M7), RSS, sitemap, image optimization |
| 6 | Feb 7, 2026 | PNG preservation, OG preview images, GIF support, EXIF fix, SEO meta tags |
| 7 | Feb 8-9, 2026 | Tag system, Pagefind search, page-preview visualizer, image bug fixes |
| 8 | Feb 13, 2026 | Homepage redesign (search-first), recipe ordering fix, build target cleanup |
| 9 | Feb 16, 2026 | Templatize builder: multi-site architecture, config-driven builds |
| 10 | Feb 17, 2026 | Test suite: Vitest, 104 tests (Phase 1 + 1.5), co-located architecture |
| 11 | Feb 17, 2026 | Cloudflare Pages + GitHub Actions migration, DNS to Cloudflare |
| 12 | Feb 18, 2026 | graph.json API + graph visualizer (force-directed, local + global modal) |
| 13 | Feb 18, 2026 | Graph hover tooltip with OG image preview; OG filename encoding fix |
| 14 | Feb 19, 2026 | Engineering review implementation, marbles site, multi-site isolation |
| 19 | Mar 4, 2026 | Theme standards, internal link pills, date pill, favicon pipeline, logo in nav |
| 20 | Mar 5, 2026 | Favicon delivery fix, private content safety, dev/prod pipeline unification |
| 36 | May 18, 2026 | URL slug defaults, filename sanitization, copy-link-button plugin |
| 37 | May 19, 2026 | Attachment pipeline vault-structure refactor, favicon fix, subtitle extraction |
| 38 | May 20, 2026 | Search visualizer overhaul (melt), folder slug ID pills, link resolution regression fix |
| 39 | May 20, 2026 | photo-grid visualizer, PhotoSwipe extracted to shared base |
| 40 | May 20, 2026 | Transclusion indicator setting, melt heading hierarchy |
| 41 | May 23, 2026 | MELT image placement, GIF→MP4 pipeline, photo-grid video support |

---

## Milestones

| Date | Milestone |
|------|-----------|
| Jan 30, 2026 | 🎉 **buffbaby.bloob.haus goes LIVE** (Hugo) |
| Feb 2, 2026 | Interactive checkboxes added |
| Feb 3, 2026 | Documentation restructured, architecture documented |
| Feb 5, 2026 | 🎉 **Hugo → Eleventy migration complete** (M0-M7) |
| Feb 5, 2026 | RSS feed, sitemap, robots.txt, 404 page, image optimization added |
| Feb 7, 2026 | PNG transparency preserved, OG preview images for chat sharing, EXIF fix, canonical URLs |
| Feb 8-9, 2026 | Tag system, Pagefind search, page-preview visualizer, duplicate image bug fixes |
| Feb 13, 2026 | Search-first homepage, recipe ordering fixed (full git history), Hugo defaults removed |
| Feb 16, 2026 | Templatized builder: themes/, sites/*.yaml, config-driven builds, src/ fully generated |
| Feb 17, 2026 | Test suite foundation: 9 files, 104 tests, co-located visualizer tests, Vitest |
| Feb 17, 2026 | GitHub Actions CI/CD + Cloudflare Pages hosting live, DNS migrated to Cloudflare |
| Feb 18, 2026 | graph.json API + graph visualizer: force-directed, local neighborhood + full-graph modal |
| Feb 18, 2026 | Graph hover tooltip with OG preview image; OG filename encoding unified (raw on disk, encoded in URLs) |
| Feb 19, 2026 | Engineering review implemented: cleanup, slug strategies, marbles site built, multi-site build isolation, 191 tests |
