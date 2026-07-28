# Next Steps

**This is the one file to read at the start of a session.** It is a set of *pointers* into the
implementation plans, not a task tracker — **there is nothing here to check off.** The plans hold
the actual work; this holds the links and says which ones currently matter. If an item is done, it
gets deleted from here, not ticked.

Everything else is reference you consult on demand: `docs/CHANGELOG.md` for history,
`docs/TECH-DEBT.md` when choosing what to work on, `docs/implementation-plans/ROADMAP.md` for the
long arc.

**Last updated:** 2026-07-28 (S69)

---

## Immediate Next Steps

**`.md` page templates — pattern established 2026-07-28, tags + folder-index migrated.** Builder-owned page templates are `.md` files that compose shapes, overridden per theme by basename (`pages/`) or filename (`templates/`). See DECISIONS 2026-07-28. Remaining:

1. **Folder indexes for folders that DO have an author `_index.md`** are untouched by all of this, by design. Only the fallback was templated. No action unless that changes.

**Shape architecture — decisions/work queued (see CHANGELOG S67):**
2. **Make `collection`'s `folder=` matching case-insensitive** — `graph.json`'s `section` is slugified, so `folder=Resources` renders empty *silently*. The generated template now passes `slugifyPath()` output so it can't hit this, but a hand-authored fence still can. **This trap has bitten three times.**
3. **Same layout fallback everywhere except the theme-owned root homepage** (`dir === "."`). Root must stay `base.njk` or marbles' homepage gets a narrow column and an `<h1>index</h1>`.
4. **DECIDE: CSS containment mechanism** — cascade layers vs `@scope` donut, **explainer + recommendation written up** in `docs/superpowers/specs/2026-07-27-collection-pure-renderer-design.md` → "OPEN follow-on decision" (covers what a cascade layer is, the unlayered-wins trap, and the `@scope` donut). Recommendation is `@scope` + a shared `.bloob-shape-root` marker. Currently convention + `tests/shape-nesting.test.js`.
5. **Retrofit shapes to the pure-renderer standard** (TECH-DEBT #40) — `folder-preview` first; it's collection's twin and the source of the `fp-*` collisions.

**Local thread — melt.** The scene-nav builder is **done**: every bug in the next-round plan was
verified fixed by Leon in a real browser on 2026-07-28 (rotation persist, marquee select, group
move/resize/rotate, the F2 overlay controls). Plan archived to
`docs/implementation-plans/_completed/2026-07-22_melt-builder-next-round.md`; TECH-DEBT #39 closed.
Undo/redo was deferred by choice → `IDEAS.md`, along with the h3 `#f1dbff` colour, the light/dark
toggle, and the mobile `aspectRatio 9/16` decision.
6. **Melt dev — open, no plan file yet.** Next melt work starts from a fresh brainstorm.

**Cloud backend thread (Phase 3):**
7. **Unblock Scaleway** — the billing **country-change (→ US)** ticket is pending with Scaleway support. Once cleared, provision Managed Postgres (DEV-S, `fr-par`), Container Registry, and a KV namespace. Everything below waits on this.
8. **Deploy + prove the crux** — follow the V1 spike plan (`docs/implementation-plans/phases/phase-3/2026-07-08_v1-spike-implementation-plan.md`) from **Task 1**: deploy the `bloob-haus-cloud` app to a Scaleway container (`auth.bloob.haus`), then prove the **cross-subdomain session cookie across the Cloudflare↔Scaleway boundary** — the highest-risk piece. Then Worker deploy + seed KV + E2E.
9. **Switch DB to Postgres** — set `DATABASE_URL` on the container (`auth.ts` auto-switches from local SQLite; no code change) and run the Better Auth migration against Scaleway Postgres.
10. **Cheap high-leverage Phase-2 task, still open:** the canonical `schema.md` template + AI/MCP schema URLs (TECH-DEBT #36).

## What's Done

- **melt breadcrumbs + one canonical URL/title derivation; S68 merged from the AE fork** (2026-07-28, S69). Breadcrumb rule: **every crumb shows that page's own title** — the folder crumb resolves the folder-index page (new `lookupPage` filter) instead of prettifying a URL slug, which cannot work on a `case: lower` site. `smart-title-case.js` replaced **five** divergent prettify-a-name copies and now runs on the *original* filename, so acronyms survive (`come-to-MELT.md` → "Come to MELT"). `slugifyPath()` became THE folder-path → URL-path derivation, fixing folder-index permalinks that bypassed the slug strategy entirely (`/Resources/` vs `/resources/` — invisible on macOS, broken on Linux CI); verified against a clean HEAD worktree that **no live URL moved**. Merged PR #3 (9 AE commits) and closed its "verify on melt + marbles" item by restoring both themes' folder chrome via `templates/folder-index.md` — measured against production first: 8 live pages would otherwise have lost their chrome and entered search. Obsidian plugin **1.2.0** released: copy-link reads the vault's `_bloob-settings.md` `url:` block (556 pages, 0 mismatches vs the builder). New debt **#44**. Suite 751 → **808**. See CHANGELOG S69 + DECISIONS 2026-07-28.
- **melt consolidated onto the shared `article` shape** (2026-07-27, S67). Root cause of the odd Resources page: `bloob-shape: page` resolves to nothing (no `lib/visualizers/page/`), so layout fell to the step-5 default — `page.njk` for pages but **`base.njk` for index files**, which has no column and renders no title, while the preprocessor had already stripped the H1 expecting it to be re-rendered. Fixed by upgrading `article` with four generic features (**`date_updated`**, `banner_text`, show/hide date settings, **media embeds incl. responsive YouTube**) + a pure `date-field.js` supporting both date conventions, then migrating all 15 melt pages. `/about-melt/` measured **identical** before/after. Also: nested-shape styling collision fixed (`.article-body a` was underlining marbles), melt `page.njk` reduced to an alias, 22 dead `.page-*` rules removed, `settings-registry.md` brought fully current, share bar → glassmorphism. **CLAUDE.md now mandates the SHAPE TRINITY** (ontology + shapes + visualizers, always) and `shapes.md` gained presentation-containment + a corrected fallback section. Suite 723.
- **SEO decoupled from the visualization + per-page visualizer loading** (2026-07-27, S67). Adopted the **pure-renderer standard** (`parser`/`resolve`/`renderer` pure; `browser.js` behavior-only) and refactored `collection` onto it — all five display modes now ship crawlable build-time HTML (melt Resources went 0 → 3 crawlable links), file-scope included. Search surfaces share a `--sv-*` token contract (melt + marbles-pouch `!important` overrides removed, pixel-identical). Shipped **per-page visualizer loading** behind `features.per_page_visualizers` (TECH-DEBT #4 closed): melt −610 CSS/−448 JS, marbles −17,640/−12,771; 24 assets/page → 11–13. `scripts/audit-visualizer-detection.js` is the mandatory gate before enabling on a new site. Resolved #41 for the collection side. Suite 637 → 692. See CHANGELOG S67 + `docs/architecture/visualizers.md`.
- **Scene-nav shape + builder v2 — built, on unmerged branch** (2026-07-21/22, S62–S63). Grammar v2.1 (`hoverGlow`/`hoverScale`/`label:false`, `[[wiki]]` goto, `on/off/true/false` vocab); scene-nav resolves its own image refs (fixed melt Contact-us 404 + marbles subpath images); goto raw-preservation (round-trips `[label](note.md)`); reworked debug builder (icon-first entry, foldable panel, on-canvas resize/rotate handles, marquee + Cmd/Shift multi-select, group transform + relative bulk-edit, editable numbers, mobile fields + inheritance standard). Shared "Authoring & resolution conventions" in `shapes.md`. **Branch `scene-nav-builder-rework` — unpushed; 2 drag bugs + real-browser test outstanding (TECH-DEBT #39, next-round plan).**
- **Bloob-shapes unification — DONE** (2026-07-20, Session 59). Reader reads `_bloob-shapes.md` (`bloob-shape` column) ahead of legacy `_bloob-types.md`/`_bloob-objects.md`; `publish-filter.js` excludes any `_bloob-*` file; docs reconciled (`bloob-shape:` = single forward-facing identity+rendering key); melt is a clean reference; `_base` scaffold added. Resolves TECH-DEBT #34. Deferred: per-shape behavior *gating* (steps 3–4 → IDEAS). Plan in `_completed/`.
- **Phase 3 V1 spike — plan written + backend build STARTED** (2026-07-08, Session 58). New **separate repo `../bloob-haus-cloud/`**: Cloudflare Worker routing (12 offline tests) + Next.js Better Auth **Google login proven locally** (SQLite); OAuth client + identity settled (`dev.bloob@gmail.com`); Scaleway confirmed (only EU provider w/ true scale-to-zero). **Cloud deploy blocked on the Scaleway account.** See the spike plan + CHANGELOG 58.
- **Phase 3 refinements + extensibility model — documented** (2026-07-07). Postgres confirmed on Scaleway, JS-only/no-Python, Apple deferred; subdomain provisioning + custom domains moved *early*; user-authored shapes/machines/apps — `_bloob-shapes.md` (registry) vs `_bloob-shapes/` (definitions), client-side-only trust line, public-PR approval, schema.md-as-contract. See phase-3 doc "2026-07-07 refinements", DECISIONS, TECH-DEBT #35–38.
- **Phase 3 backend & identity architecture — designed** (2026-07-06). Scaleway EU; one Next.js app; Better Auth; markdown-in-object-storage + Postgres ledger; Cloudflare Worker public/private split; API-first.
- (Session 56) Cross-origin embed auto-height + `font` param.

## Not started / still open

- **Retrofit remaining content-generating shapes to the pure-renderer standard** (TECH-DEBT #40) — `folder-preview`, `circular-nav`, `fridge-magnets`, `tags`, `graph` build markup in `browser.js`, so crawlers see nothing and the future playground can't render them. Convert each when next touched; don't retrofit speculatively.
- **#41 reverse direction unverified** — whether `folder-preview` depends on anything in `collection.css`. AE is the likeliest site to expose it (uses both shapes); extend `tests/css-independence.test.js` when folder-preview is retrofitted.
- **Per-page visualizer loading is OFF for alter-engineers only.** buffbaby was enabled 2026-07-28 (S68) — audit clean (7/7 signatures safe across 193 pages), pages went to 9–12 assets, `checkbox-tracker` verified present on every page that renders a checkbox via its `detect.always`. AE still needs `node scripts/audit-visualizer-detection.js --src=src-alter-engineers` on the work machine before flipping.
- Canonical `schema.md` template + AI/MCP schema URLs (TECH-DEBT #36) — Phase 2, high-leverage.
- Vault-local `_bloob-shapes/` folder pipeline scanning (TECH-DEBT #37).
- Marketplace safety hardening / build-time-code sandboxing (TECH-DEBT #35) + pre-launch ToS/DSA (TECH-DEBT #38) — future.
- Standing Phase-3 open questions: mount_path #16 / multi-repo rooms, note IDs, API-key auth details, `bloob.haus` homepage.
- **SEO discoverability for public sites (future)** — right now a new subdomain (e.g. `leons.bloob.haus`) has no inbound links anywhere Google crawls, so it never gets discovered/indexed even though `sitemap`/`robots_txt` are already generated per-site via `_bloob-settings.md`. **Before starting:** review this repo's current `_bloob-settings.md` sitemap/robots/`visibility` (unlisted/private) mechanism *and* `bloob-haus-cloud`'s Phase-3 KV-based public/private routing for `/m/[slug]` — two possibly-overlapping visibility systems that need reconciling, not two competing ones.
  - **Important constraint: "public" (URL accessible) ≠ "SEO-discoverable" (listed + actively pushed to Google) — these must stay two separate toggles, not one.** The existing per-page `visibility: unlisted` frontmatter already proves users want this distinction (URL works, but hidden from RSS/search/Google) — some users will want their site/page reachable but NOT searchable. Whatever ships (directory listing, auto-submit) needs its own explicit opt-in per user/site, defaulting to *off* (or inheriting the page's existing `unlisted`/`private` semantics), not "public site" auto-implying "submit to Google."
  - Two pieces once that's settled:
    1. A directory/index page on `bloob.haus` itself linking out to *opted-in* public user subdomains, so Googlebot has a crawl path in — could double as the `bloob.haus` homepage item above.
    2. Investigate auto-submitting a user's URL to Google (Search Console / Indexing API) the moment they opt in to SEO discovery, instead of waiting on passive crawl discovery. A domain-level Search Console verification (DNS TXT record at the `bloob.haus` apex, same mechanic as DMARC) would cover all current/future subdomains under one verification rather than per-user setup.
- Spike deploy gotcha to watch: `better-sqlite3` is imported in `auth.ts`; in the Next standalone Docker image ensure it loads (glibc base e.g. `node:20-slim`, or lazy-load it) even though prod uses Postgres.
