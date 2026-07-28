# Bloob Haus Roadmap

**What this is:** the long arc — what the phases are and roughly what each contains. Read it once
for orientation.

**What this is NOT:** a tracker. There is deliberately no "current focus" section and no task
checklists here, because that's what rotted the previous version — it sat five months out of date
claiming the AE Launch Sprint was active. Those jobs belong elsewhere:

| Question | File |
|---|---|
| **What am I working on right now?** | [`docs/next-steps.md`](../next-steps.md) |
| What happened already? | [`docs/CHANGELOG.md`](../CHANGELOG.md) |
| What's broken / might be broken? | [`docs/TECH-DEBT.md`](../TECH-DEBT.md) |
| Detailed plan for one piece of work | `phases/<phase-N>/` and this directory |
| Why did we choose X over Y? | [`DECISIONS.md`](DECISIONS.md) |
| Unprioritized ideas | [`IDEAS.md`](IDEAS.md) |

This file only changes when a **phase** starts or ends — a few times a year, not per session.

---

## Phases

| Phase | Focus | Status |
|-------|-------|--------|
| Phase 1 | Recipe site (buffbaby.bloob.haus) | ✅ Complete |
| Migration | Hugo → Eleventy | ✅ Complete |
| Phase 2 | Enhanced linking + API foundation (`graph.json`, graph visualizer, backlinks, RSS, sitemap, image optimization) | ✅ Complete |
| Phase 2.5 | Tags, full-text search (Pagefind), page preview | ✅ Complete |
| AE Launch | Alter Engineers site | ✅ Complete |
| **Shapes** | The shape system as the core abstraction — `bloob-shape` identity, the pure-renderer standard, per-page asset loading, user-authored shapes | 🔧 **Active** |
| Phase 3 | Backend, identity, multi-user. **Lives in a sibling repo: `../bloob-haus-cloud`** | 🔧 Started (V1 spike) |
| Phase 4 | Interactive visualizers + magic machines | ⏳ Future |
| Phase 5+ | Advanced features | 💡 Ideas |

---

## Phase 3 — Backend & multi-user

Built in the separate `../bloob-haus-cloud` repo, not here ("don't mix"). Design settled 2026-07-06;
V1 spike started 2026-07-08.

Scaleway EU from day one · one Next.js app (dashboard + API + auth) · Better Auth with Google +
GitHub · content as markdown in Object Storage · ledger in Postgres · Cloudflare Worker + KV for
the public/private split · API-first so MCP is a thin Phase-4 wrapper.

Then: Quick Mode (paste markdown → hosted URL), user accounts, per-user subdomains
(`username.bloob.haus`), pricing tiers.

**Architecture doc:** `phases/phase-3/2026-07-06_webapp-backend-identity-architecture.md`

---

## Phase 4 — Interactive visualizers & magic machines

Stacked notes (Andy Matuschak style columns) · timeline visualizer · recipe scaling with Cooklang
([plan](phases/phase-2/2026-02-03_recipe-scaling.md)) · local magic-machine runner · recipe unit
extractor.

Link previews and graph visualization were originally planned here and shipped early, as the
`page-preview` and `graph` shapes.

---

## Phase 5+ — Advanced

**Access control:** site-wide password · per-page access · private/time-limited links.
(Today's answer is the obscured-path convention — see `docs/architecture/security-by-obscurity.md`
— which is *not* access control.)

**Content:** full transclusion · mobile publishing · comments · version history.

**Platform:** custom domains for users · multi-editor collaboration · AI features (user-provided
API key) · external data sources · export (PDF, image, standalone HTML).

---

## IndieWeb protocols

| Protocol | Purpose | Phase |
|----------|---------|-------|
| Microformats2 | Semantic markup | ✅ Done |
| Open Graph | Social previews | ✅ Done |
| RSS/Atom | Feed subscription | ✅ Done |
| IndieAuth | Domain-based identity | Phase 3 |
| Webmention | Cross-site notifications | Phase 4 |
| Micropub | Standard posting API | Phase 5 |

---

## Hosting evolution

1. ~~Single Vercel project~~ — replaced
2. **Current:** GitHub Actions (CI/CD) + Cloudflare Pages (hosting/CDN) + Cloudflare DNS
3. **Next:** hybrid EU + CDN — Scaleway (builds, private content, DB) + Cloudflare Pages (public content)
4. **Future:** evaluate on scale and cost
