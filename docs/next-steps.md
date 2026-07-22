# Next Steps

Quick launch point for the next session. Full history in `docs/CHANGELOG.md`.

**Last updated:** 2026-07-22

---

## Immediate Next Steps

**Active local thread — scene-nav builder (branch `scene-nav-builder-rework`, unpushed):**
0. **Finish + merge the scene-nav builder.** v2 is built (grammar, ref resolution, icon-first GUI, on-canvas handles, multi-select, mobile fields) but has two known drag bugs and no real-browser test. Fix per `docs/implementation-plans/2026-07-22_melt-builder-next-round.md` (rotation-persist hover gate, marquee overlay rewrite via `frontend-design` skill, add undo/redo, real-browser pass), then decide merge to `main`. See TECH-DEBT #39.

**Cloud backend thread (Phase 3):**
1. **Unblock Scaleway** — the billing **country-change (→ US)** ticket is pending with Scaleway support. Once cleared, provision Managed Postgres (DEV-S, `fr-par`), Container Registry, and a KV namespace. Everything below waits on this.
2. **Deploy + prove the crux** — follow the V1 spike plan (`docs/implementation-plans/phases/phase-3/2026-07-08_v1-spike-implementation-plan.md`) from **Task 1**: deploy the `bloob-haus-cloud` app to a Scaleway container (`auth.bloob.haus`), then prove the **cross-subdomain session cookie across the Cloudflare↔Scaleway boundary** — the highest-risk piece. Then Worker deploy + seed KV + E2E.
3. **Switch DB to Postgres** — set `DATABASE_URL` on the container (`auth.ts` auto-switches from local SQLite; no code change) and run the Better Auth migration against Scaleway Postgres.
4. **Cheap high-leverage Phase-2 task, still open:** the canonical `schema.md` template + AI/MCP schema URLs (TECH-DEBT #36).

## What's Done

- **Scene-nav shape + builder v2 — built, on unmerged branch** (2026-07-21/22, S62–S63). Grammar v2.1 (`hoverGlow`/`hoverScale`/`label:false`, `[[wiki]]` goto, `on/off/true/false` vocab); scene-nav resolves its own image refs (fixed melt Contact-us 404 + marbles subpath images); goto raw-preservation (round-trips `[label](note.md)`); reworked debug builder (icon-first entry, foldable panel, on-canvas resize/rotate handles, marquee + Cmd/Shift multi-select, group transform + relative bulk-edit, editable numbers, mobile fields + inheritance standard). Shared "Authoring & resolution conventions" in `shapes.md`. **Branch `scene-nav-builder-rework` — unpushed; 2 drag bugs + real-browser test outstanding (TECH-DEBT #39, next-round plan).**
- **Bloob-shapes unification — DONE** (2026-07-20, Session 59). Reader reads `_bloob-shapes.md` (`bloob-shape` column) ahead of legacy `_bloob-types.md`/`_bloob-objects.md`; `publish-filter.js` excludes any `_bloob-*` file; docs reconciled (`bloob-shape:` = single forward-facing identity+rendering key); melt is a clean reference; `_base` scaffold added. Resolves TECH-DEBT #34. Deferred: per-shape behavior *gating* (steps 3–4 → IDEAS). Plan in `_completed/`.
- **Phase 3 V1 spike — plan written + backend build STARTED** (2026-07-08, Session 58). New **separate repo `../bloob-haus-cloud/`**: Cloudflare Worker routing (12 offline tests) + Next.js Better Auth **Google login proven locally** (SQLite); OAuth client + identity settled (`dev.bloob@gmail.com`); Scaleway confirmed (only EU provider w/ true scale-to-zero). **Cloud deploy blocked on the Scaleway account.** See the spike plan + CHANGELOG 58.
- **Phase 3 refinements + extensibility model — documented** (2026-07-07). Postgres confirmed on Scaleway, JS-only/no-Python, Apple deferred; subdomain provisioning + custom domains moved *early*; user-authored shapes/machines/apps — `_bloob-shapes.md` (registry) vs `_bloob-shapes/` (definitions), client-side-only trust line, public-PR approval, schema.md-as-contract. See phase-3 doc "2026-07-07 refinements", DECISIONS, TECH-DEBT #35–38.
- **Phase 3 backend & identity architecture — designed** (2026-07-06). Scaleway EU; one Next.js app; Better Auth; markdown-in-object-storage + Postgres ledger; Cloudflare Worker public/private split; API-first.
- (Session 56) Cross-origin embed auto-height + `font` param.

## Not started / still open

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
