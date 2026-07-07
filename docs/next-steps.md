# Next Steps

Quick launch point for the next session. Full history in `docs/CHANGELOG.md`.

**Last updated:** 2026-07-06

---

## Immediate Next Steps

1. **Read the Phase 3 architecture doc first** — `docs/implementation-plans/phases/phase-3/2026-07-06_webapp-backend-identity-architecture.md`. It holds the settled backend/identity design + 14 open questions. This is the resting point; start here.
2. **Turn the V1 spike into a detailed implementation plan** (use the `writing-plans` skill). The spike: one test user → **Google login** (Better Auth on Scaleway) → **1 public marble** (Cloudflare edge) + **1 private marble** (Worker → Scaleway, auth-gated). This is where the step-by-step backend build finally gets written — deliberately deferred until build time.
3. **Groundwork that unblocks the spike** — create a Scaleway account; resolve the open questions that actually block the first slice: session-across-proxy cookie handling, the build trigger, and visibility-map → Cloudflare KV sync (open questions #1, #4, #5 in the phase-3 doc).

## What's Done

- **Phase 3 backend & identity architecture — designed & documented** (2026-07-06). Backend on Scaleway EU from day one; one Next.js app; Better Auth (Google + GitHub + account linking); markdown-in-object-storage + Postgres ledger; Cloudflare Worker public/private split (existing sites untouched); API-first so a future MCP server is a thin wrapper. See the phase-3 doc + DECISIONS 2026-07-06. **No code yet** — this was design only.
- (Session 56) Cross-origin embed auto-height + `font` param.
- (Session 55) URL / canonical page-ID standardization + FastComments on marbles/melt/buffbaby.

## Not started / still open

- Detailed V1 implementation plan (step 2 above).
- Bloob-shapes unification (`_bloob-types.md` → `_bloob-shapes.md`) — separate phase-2 plan, still pending.
- Standing Phase-3 open questions: mount_path #16 / multi-repo rooms, note IDs, API-key auth details, custom domains, subdomains-vs-paths, `bloob.haus` homepage.
