# Next Steps

Quick launch point for the next session. Full history in `docs/CHANGELOG.md`.

**Last updated:** 2026-07-07

---

## Immediate Next Steps

1. **Read the Phase 3 architecture doc first** — `docs/implementation-plans/phases/phase-3/2026-07-06_webapp-backend-identity-architecture.md`. Settled backend/identity design + the **2026-07-07 refinements section** (Postgres confirmed on Scaleway, JS-only/no-Python, subdomain provisioning moved EARLY, the extensibility & user-authored-code model). This is the resting point; start here.
2. **Turn the V1 spike into a detailed implementation plan** (use the `writing-plans` skill). The spike: one test user → **Google login** (Better Auth on Scaleway) → **1 public marble** (Cloudflare edge) + **1 private marble** (Worker → Scaleway, auth-gated). **Now also fold in early subdomain auto-provisioning** (Scaleway↔Cloudflare DNS/API wiring at signup). This is where the step-by-step backend build finally gets written.
3. **Groundwork that unblocks the spike** — create a Scaleway account; resolve the open questions that actually block the first slice: session-across-proxy cookie handling, the build trigger, visibility-map → Cloudflare KV sync (open questions #1, #4, #5), and the **Scaleway↔Cloudflare subdomain provisioning** wiring (now an early milestone).
4. **Cheap high-leverage Phase-2 task, do it soon:** write the canonical **`schema.md` template** and plan serving schemas at stable URLs for AI/MCP (TECH-DEBT #36) — unblocks the whole shapes ecosystem before shapes accrete inconsistent formats.

## What's Done

- **Phase 3 refinements + extensibility model — documented** (2026-07-07). Resolved: Postgres stays Scaleway, JS-only/no-Python, "fully serverless" clarified, Apple OAuth deferred, `/api/render` alignment protected. **Reversed:** subdomain auto-provisioning now an *early* spike milestone. **New design axis:** user-authored shapes/machines/apps — `_bloob-shapes.md` (registry) vs `_bloob-shapes/` (definitions), client-side-only trust line, public-PR approval, schema.md-as-contract. See phase-3 doc → "2026-07-07 refinements", shapes.md → "User-authored shapes", DECISIONS 2026-07-07, TECH-DEBT #35–38, IDEAS. **Still no code** — design only.
- **Phase 3 backend & identity architecture — designed & documented** (2026-07-06). Backend on Scaleway EU from day one; one Next.js app; Better Auth (Google + GitHub + account linking); markdown-in-object-storage + Postgres ledger; Cloudflare Worker public/private split (existing sites untouched); API-first so a future MCP server is a thin wrapper. See the phase-3 doc + DECISIONS 2026-07-06. **No code yet** — this was design only.
- (Session 56) Cross-origin embed auto-height + `font` param.
- (Session 55) URL / canonical page-ID standardization + FastComments on marbles/melt/buffbaby.

## Not started / still open

- Detailed V1 implementation plan (step 2 above), now including early subdomain provisioning.
- Canonical `schema.md` template + AI/MCP-accessible schema URLs (TECH-DEBT #36) — Phase 2, high-leverage.
- Bloob-shapes unification (`_bloob-types.md` → `_bloob-shapes.md`) — separate phase-2 plan, still pending.
- Vault-local `_bloob-shapes/` folder pipeline scanning (TECH-DEBT #37) — the creator→user shapes gateway.
- Marketplace safety hardening / build-time-code sandboxing (TECH-DEBT #35) + pre-launch ToS/DSA (TECH-DEBT #38) — future.
- Standing Phase-3 open questions: mount_path #16 / multi-repo rooms, note IDs, API-key auth details, custom domains, `bloob.haus` homepage.
