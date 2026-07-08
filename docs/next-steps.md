# Next Steps

Quick launch point for the next session. Full history in `docs/CHANGELOG.md`.

**Last updated:** 2026-07-08

---

## Immediate Next Steps

1. **Unblock Scaleway** — the billing **country-change (→ US)** ticket is pending with Scaleway support. Once cleared, provision Managed Postgres (DEV-S, `fr-par`), Container Registry, and a KV namespace. Everything below waits on this.
2. **Deploy + prove the crux** — follow the V1 spike plan (`docs/implementation-plans/phases/phase-3/2026-07-08_v1-spike-implementation-plan.md`) from **Task 1**: deploy the `bloob-haus-cloud` app to a Scaleway container (`auth.bloob.haus`), then prove the **cross-subdomain session cookie across the Cloudflare↔Scaleway boundary** — the highest-risk piece. Then Worker deploy + seed KV + E2E.
3. **Switch DB to Postgres** — set `DATABASE_URL` on the container (`auth.ts` auto-switches from local SQLite; no code change) and run the Better Auth migration against Scaleway Postgres.
4. **Cheap high-leverage Phase-2 task, still open:** the canonical `schema.md` template + AI/MCP schema URLs (TECH-DEBT #36).

## What's Done

- **Phase 3 V1 spike — plan written + backend build STARTED** (2026-07-08, Session 58). New **separate repo `../bloob-haus-cloud/`**: Cloudflare Worker routing (12 offline tests) + Next.js Better Auth **Google login proven locally** (SQLite); OAuth client + identity settled (`dev.bloob@gmail.com`); Scaleway confirmed (only EU provider w/ true scale-to-zero). **Cloud deploy blocked on the Scaleway account.** See the spike plan + CHANGELOG 58.
- **Phase 3 refinements + extensibility model — documented** (2026-07-07). Postgres confirmed on Scaleway, JS-only/no-Python, Apple deferred; subdomain provisioning + custom domains moved *early*; user-authored shapes/machines/apps — `_bloob-shapes.md` (registry) vs `_bloob-shapes/` (definitions), client-side-only trust line, public-PR approval, schema.md-as-contract. See phase-3 doc "2026-07-07 refinements", DECISIONS, TECH-DEBT #35–38.
- **Phase 3 backend & identity architecture — designed** (2026-07-06). Scaleway EU; one Next.js app; Better Auth; markdown-in-object-storage + Postgres ledger; Cloudflare Worker public/private split; API-first.
- (Session 56) Cross-origin embed auto-height + `font` param.

## Not started / still open

- Canonical `schema.md` template + AI/MCP schema URLs (TECH-DEBT #36) — Phase 2, high-leverage.
- Bloob-shapes unification (`_bloob-types.md` → `_bloob-shapes.md`) — separate phase-2 plan.
- Vault-local `_bloob-shapes/` folder pipeline scanning (TECH-DEBT #37).
- Marketplace safety hardening / build-time-code sandboxing (TECH-DEBT #35) + pre-launch ToS/DSA (TECH-DEBT #38) — future.
- Standing Phase-3 open questions: mount_path #16 / multi-repo rooms, note IDs, API-key auth details, `bloob.haus` homepage.
- Spike deploy gotcha to watch: `better-sqlite3` is imported in `auth.ts`; in the Next standalone Docker image ensure it loads (glibc base e.g. `node:20-slim`, or lazy-load it) even though prod uses Postgres.
