# Technical Debt Inventory

Tracked items with severity, impact, and target resolution phase.

> ⚠️ **This inventory is stale — treat `⬜ Open` with suspicion (last flagged 2026-07-07).**
> A lot of the items still marked `⬜ Open` have very likely been addressed already in later
> sessions; the statuses simply weren't updated as work happened. This has drifted into an
> **un-triaged running note** rather than an accurate ledger. **Before acting on any item here,
> verify against the current codebase** — don't assume `⬜ Open` means unresolved. A dedicated
> triage pass (re-check each row, mark real completions ✅, delete dead ones) is itself outstanding
> and would restore this file's value. New items added since this flag (#35–38) are current.

| # | Item | Severity | Impact | Target | Status |
|---|------|----------|--------|--------|--------|
| 1 | vercel.json still present | Low | Confusion | Next session | ✅ Done 2026-02-19 |
| 2 | 5 unused npm dependencies | Low | Confusion | Next session | ✅ Done 2026-02-19 |
| 3 | Hardcoded section collections in eleventy.config.js | Medium | Blocks multi-site | Before marbles | ✅ Done 2026-02-19 |
| 4 | Per-page visualizer activation not implemented | Medium | All viz load everywhere | Before adding more viz | ⬜ Open |
| 5 | Validation report not built | Medium | Silent broken links | Phase 2 completion | ✅ Done 2026-02-19 |
| 6 | Test coverage gaps (publish-filter, file-index-builder) | Medium | Regressions | Ongoing | ✅ Done 2026-02-19 |
| 7 | No error tracking (Sentry) | Low | Blind to prod issues | Before multi-user | ⬜ Open |
| 8 | No analytics | Low | No usage insight | When ready | ⬜ Open |
| 9 | Hugo output dirs still referenced in preprocess-content.js | Low | Dead code | Cleanup session | ⬜ Open |
| 10 | Local builds share single src/ and _site/ dir | Low | Must build sequentially | Future: per-site workspaces | ⬜ Open |
| 11 | eleventyComputed.js duplicates slug strategies inline | Low | Can't import ESM in Eleventy data files | Accept or migrate to CJS | ⬜ Open |
| 12 | Marbles: 25 broken links (MILIT-A/B, MESH-CAP-J/K/L/M, etc.) | Low | Dead links on site | Content cleanup | ⬜ Open |
| 13 | Marbles: Truncated attachment filenames with parentheses | Low | Missing images | Rename files in vault | ⬜ Open |
| 14 | Marbles: HEIC image not web-compatible (IMG_7966.heic) | Low | Missing image | Convert to JPEG/PNG | ⬜ Open |
| 15 | CI: No image optimization cache (rebuilds all images every deploy) | Medium | Slow builds | Add GH Actions cache step | ⬜ Open |
| 16 | mount_path causes doubled URLs (pathPrefix bug) | High | Blocks multi-repo "haus with rooms" architecture | Fix before Phase 3 multi-repo | ⬜ Open |
| 17 | buffbaby: image links broken site-wide | High | All images missing on live site | Investigate and fix image path/passthrough config | ⬜ Open |
| 18 | marbles: compressed/resized images not found (404) | Medium | Missing images on leons.bloob.haus for any optimized image | Debug image optimizer output path vs Eleventy passthrough | ⬜ Open |
| 19 | warm-kitchen: inline search widget + redundant mobile CSS | Low | Diverges from code-fence standard; mobile fix duplicated in main.css | Migrate warm-kitchen to index.md code-fence approach (see notes) | ⬜ Open |
| 20 | scene-nav magic machine duplicates visualizer logic | Medium | Changes to parser/renderer/browser.js must be manually mirrored in index.html | Unify by making visualizer files IIFE-compatible for direct `<script>` include, or add a build step for the magic machine | ⬜ Open |
| 21 | alter-engineers: Satoshi font loaded from Fontshare CDN | Low | External dependency; fails offline | Self-host by downloading `.ttf` files → `themes/alter-engineers/assets/fonts/`; `@font-face` in `theme.min.css` already references that path | ⬜ Open |
| 22 | alter-engineers: `theme.min.css` contains hardcoded hex colors (e.g. `#5b5dd3`) | Low | Visualizers that rely solely on `var(--accent-color)` match; any new sections built against `theme.min.css` classes may drift | Eventually extract token values from `theme.min.css` into `main.css` and rebuild; for now, keep `main.css` in sync manually | ⬜ Open |
| 23 | `publish-filter.test.js`: 2 tests fail on Windows (path separator `\` vs `/`) | Low | Tests pass on Mac/Linux CI; local Windows dev shows failures | Normalize paths in test fixtures with `path.normalize` or platform-aware assertion | ⬜ Open |
| 24 | `warm-kitchen` + `marbles-pouch`: missing color pair CSS contract | Low | `bg=` on visualizers will have no effect until themes define `--pair-bg/--pair-title/--pair-text` for `.bg-*` classes and add the apply rules | Copy pattern from `alter-engineers/main.css`; adjust token colors per theme | ⬜ Open |
| 25 | `watch-themes.js`: theme hot-reload silently fails on Windows | Low | `import.meta.url === \`file://${process.argv[1]}\`` check fails on Windows paths (backslash vs forward slash); `assemble-src.js` standalone entry never runs; reassembly does nothing; dev server must be restarted to pick up theme file changes | Fix: compare `fileURLToPath(import.meta.url)` vs `path.resolve(process.argv[1])` | ⬜ Open |
| 25 | `warm-kitchen`: missing PhotoSwipe (head.njk + scripts.njk) | Low | Image zoom silently broken on warm-kitchen sites | Copy from alter-engineers following settings-registry.md wiring guide | ⬜ Open |
| 26 | `theme.min.css` still contains `.team*` rules (dead code after image-grid migration) | Low | Duplicate rules; `styles.css` wins due to load order so no visual impact | Remove `.team*` block from `theme.min.css` once all visualizers are migrated; do it in one pass | ⬜ Open |
| 27 | Transclusion: heading-level slice `![[note#heading]]` not yet supported | Medium | `![[note#Heading]]` embeds the full page and logs a warning; heading slice silently ignored | Phase 3: slice target AST from heading to next same-or-higher heading and embed that subtree only | ⬜ Open |
| 28 | Transclusion: block-level slice `![[note#^blockid]]` not yet supported | Low | Same fallback as #27 — full page embedded | Phase 3+: pre-pass to build global `{blockId → {file, node}}` map; extract block at embed time | ⬜ Open |
| 29 | Transclusion heading bump is fixed at +1 level; no context-aware depth | Low | If embedded note appears under an h3, its h1s become h2 (should be h4). Rare in practice. | Detect parent heading depth at embed site and bump by the correct delta | ⬜ Open |
| 30 | `.transclusion-embed` / `.transclusion-placeholder` CSS only in `melt` theme | Low | Other themes render unstyled embed containers | Add styles to `marbles-pouch`, `warm-kitchen`, `alter-engineers` main.css following melt's pattern | ⬜ Open |
| 31 | `redirect-resolver.js`: `[[folder/index]]` wiki-link redirect silently returns null | Low | Extremely rare — nobody writes slash-containing wiki-links in `redirect:` frontmatter. But if they did, `pages["resources/index"]` no longer exists after the folder-slug change and the resolver returns null without trying `filenameLookup`. | Apply the same `filenameLookup[key]` fallback added to `markdown-link-resolver.js` | ⬜ Open |
| 32 | Folder-index stub generated for top-level folders that contain only attachments (no pages) | Low | `preprocess-content.js` Step 9.5 comment says "subdirectory that has pages" but the code never checks — a top-level folder holding only raw `.html`/media gets a spurious empty `/folder/` index page that lands in `collections.all` and `sitemap.xml`, publicly advertising the folder. Relevant to security-by-obscurity (see `docs/architecture/security-by-obscurity.md`). Workaround today: `_`-prefix the folder or add an `_index.md` marked `visibility: unlisted`. | Skip stub when the folder contains no buildable pages (only attachments) | ⬜ Open |
| 33 | Base theme `head.njk` loads Google Fonts from a third-party CDN on every page | Low | `themes/_base/partials/head.njk` requests `fonts.googleapis.com`/`fonts.gstatic.com` for all rendered pages, including `unlisted` ones — a Tier-B (origin-only) URL-leak vector and a general privacy/offline dependency. See `docs/architecture/security-by-obscurity.md`. | Offer a self-hosted-fonts option / per-site toggle; for sensitive client work prefer self-contained raw HTML | ⬜ Open |
| 34 | `bloob-type` / `bloob-shape` duplication + `_bloob-types.md` `layout` column | Medium | Two words for one concept (ontology says they're the same); the registry's `layout` column duplicates what the shape now owns and is clumsy for users; `default_shape` is overridden by any `bloob-type`'s registry layout (why melt's `default_shape: article` is inert). | Bloob-shapes unification plan: `docs/implementation-plans/phases/phase-2/2026-07-03_bloob-shapes-unification.md` (unify on `bloob-shape`, drop `layout` col, `fastcomments`/`showvisitorcount` as behaviors) | ⬜ Open |
| 35 | No sandboxing for untrusted **build-time** shape/machine code | High (future) | Blocks a fully open shape/machine marketplace where strangers' *build-time* renderers (`index.js`, run in our Node build job) execute safely. V1 sidesteps this via the client-side-only line + public-PR approval; but true self-service publishing of build-time code needs isolated per-tenant jobs (zero ambient credentials, no network egress). | Phase 4+ (with MCP/marketplace). Until then: enforce runtime-only (`browser.js`) for third-party shapes; keep build-time renderers approval-gated. See phase-3 doc → extensibility model. | ⬜ Open (future) |
| 36 | Canonical `schema.md` template not written | Medium | Shapes accrete inconsistent schema formats; blocks reliable AI-authoring, MCP wrapping, and marketplace consistency. Highest-leverage cheap fix (a template, not code). | Phase 2, alongside bloob-shapes-unification. Write the template + serve schemas at stable URLs (`shapes.bloob.haus/<shape>/schema.md`). Resolves shapes.md open Q3. | ⬜ Open |
| 37 | Build pipeline does not scan the vault's `_bloob-shapes/` folder | Medium | The "vault-local shapes folder (decided)" — the gateway from *creator* shapes to *user* shapes — has no pipeline support: only `lib/visualizers/` built-ins are discovered. Both authoring paths (Claude Code / webapp) depend on this. | Phase 3+: scan built-ins + `_bloob-shapes/`, local shapes win on name collision. See shapes.md open Q7 + "User-authored shapes". | ⬜ Open |
| 38 | No Terms of Service / Acceptable-Use / DSA takedown for user-hosted content | Medium (legal) | Once the platform hosts others' shapes/apps at `*.bloob.haus`, it's a hosting provider (EU **DSA** notice-and-takedown obligations; abuse/reputation risk to the apex domain). Fine at the friends/trust stage; a blocker before any public launch. *(Not legal advice — get a lawyer before public launch.)* | Before public (non-friends) launch: ToS + AUP + takedown process; CSP on user-hosted pages as the technical brake. | ⬜ Open (pre-launch) |

## Notes

### #19 — warm-kitchen: migrate to index.md code-fence search

**Context:** marbles-pouch was migrated (2026-03-01) to use `\`\`\`search\`\`\`` code fences in the content repo's `index.md`. The search visualizer's `styles.css` now handles mobile reordering (results above filters) as a standard. warm-kitchen still uses the old approach.

**What needs to change:**

1. **`themes/warm-kitchen/pages/index.njk`** — remove the inline `<div class="home-search">` block (hardcoded `new PagefindUI(...)`, inline `<script src="pagefind-ui.js">`). The homepage content should come from the content repo's `index.md` instead.

2. **`themes/warm-kitchen/assets/css/main.css`** — remove the mobile reorder block (lines ~645–659). This is now handled globally by `lib/visualizers/search/styles.css` → `src/assets/css/visualizers/search.css`.

3. **warm-kitchen content repo** — add an `index.md` with a `\`\`\`search\`\`\`` fence (and `\`\`\`tags\`\`\`` if wanted). Match the pattern from `bloob-haus-marbles/index.md`.

4. **Verify** warm-kitchen `head.njk` loads `pagefind-ui.css` in `<head>` (anti-FOUC) — check if it already does via `_base/partials/head.njk` or theme-specific head.

**No FOUC risk** — pagefind-ui.css is already in `<head>` and the visualizer CSS is auto-included. The `order` CSS is layout-only, not a flash concern.

---

## How to Use
- Add new items when you notice debt
- Mark resolved items as ✅ Done with date
- Review at start of each session (see CLAUDE.md session checklist)
