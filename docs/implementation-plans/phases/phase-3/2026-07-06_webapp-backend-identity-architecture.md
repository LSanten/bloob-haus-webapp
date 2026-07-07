# Webapp Backend & Identity Architecture — Phase 3 Foundation

**Status:** Design settled at the architecture level; open questions tracked below. Not yet implemented (0 backend infra as of this date).
**Created:** 2026-07-06
**Author:** Leon + Claude (brainstorming session)
**Supersedes / updates:** the "NextAuth on Cloudflare Pages" assumption in the May vision plan (see below).

**Related reading** (paths relative to the sibling notes vault `bloobhaus-notes/bloobhaus-obsidian/Bloob Haus Webapp/`):
- `Reports/2026-05-01 Engineering Review + Vision Plan With Comments from Leon.md` — the vision plan (Bet A/C sequencing, Section C architecture decisions). This doc is the "architecture lock-in" that plan asked for.
- `Research/2026-02-06 Bloob Haus Hosting Architecture.md` — the hybrid EU+CDN hosting model this design adopts.
- `2026-02-25_url-naming-and-multi-site-architecture.md` — URL/subdomain/room conventions (still valid; this doc doesn't replace it).
- `../ROADMAP.md` Phase 3.

---

## Why now

The static-site builder (Repo Mode) is mature: multi-site, themes, visualizers, shapes, Cloudflare Pages deploy. Everything so far is **build-time**: Obsidian vault → GitHub → CI → static HTML. There is **no server, no database, no user identity, no runtime auth** anywhere yet.

This document opens that new axis: the **backend + identity foundation** that every future webapp feature (Quick Mode, dashboard, private content, MCP) sits on top of. It is deliberately scoped to the *foundation*, not all of Quick Mode.

**The decision that unblocked everything:** with **zero backend infrastructure built** and a hardening privacy stance (concern about US-government access to US companies under the CLOUD Act), there is no "build on Cloudflare then migrate to Scaleway" risk to fear. We build the backend on **Scaleway (EU) from day one**. No build-then-move.

---

## The settled architecture (V1)

1. **Everything private/backend lives in Scaleway EU (Paris) from day one** — auth, database, storage, and builds all originate in France. No later migration.
2. **One Next.js app** (dashboard UI + API routes + login) running in a **Scaleway Serverless Container**. Not split into separate frontend/API services — fewest moving parts is the right choice for a solo developer at the start. (Splitting is a scale-time optimization, deferred by Rule of Three — there is no second API consumer yet; the REST/MCP split is Phase 4.)
3. **Login via [Better Auth](https://www.better-auth.com/)** with **Google** and **GitHub** providers, plus **account linking** (one user = multiple linked identities).
   - *This updates the May vision plan, which specified NextAuth.* As of 2026, Lucia is deprecated and Auth.js/NextAuth is frozen to security patches; Better Auth is the community + Auth.js-team-recommended successor. It manages its own DB schema/migrations and is framework-agnostic (auth is not chained to Next.js).
   - **No "primary provider" decision needed.** A user can sign in with Google *or* GitHub; matching accounts (by *verified* email only) link to one user row. Auto-link only on verified emails; otherwise require linking while already logged in (security).
   - **Google = general/Quick Mode users. GitHub is special** — it's not just identity but *authorization to read repos*. A Google-first user who wants Repo Mode does a separate "Connect GitHub" step granting `repo` scope. Refinement (not forced): request `repo` scope only when they connect a repo, not at login (incremental authorization), so casual signups aren't scared off.
   - **Agent-ready auth:** support **API keys / bearer tokens** (Better Auth's API-key plugin) *alongside* session cookies from day one, so non-interactive clients (MCP servers, AI agents, scripts) can authenticate — they can't do interactive browser OAuth. See "API-first & agent-ready" below.
4. **Two homes for data:**
   - **Content (marbles/notes)** → **markdown files in Scaleway Object Storage**, structured exactly like an Obsidian vault. Preserves the "your notes are just files, export anytime" value. Files scale fine — this is not a compromise we outgrow quickly.
   - **Bookkeeping (user/system data)** → **Scaleway Managed PostgreSQL**. Relational, queryable data: who owns what, which room maps to which repo, which page is public, sessions.
5. **Builds: the existing Eleventy pipeline runs as a per-room [Scaleway Serverless Job](https://www.scaleway.com/en/serverless-jobs/).** Each user's each room builds independently. Public output → Cloudflare Pages; private → Scaleway only; every build writes each page's visibility verdict into the map the Worker reads.
6. **Cloudflare Worker + Workers KV in front:** per request, look up hostname + path visibility → **public** = serve from Cloudflare edge (fast, cached); **private** = proxy to Scaleway (auth-checked, `no-store`, never cached). Both URL types look identical; privacy is invisible metadata, not folder names.
7. **Existing live sites are untouched.** studio.bloob.haus, buffbaby, leons, bloob.haus stay on Cloudflare Pages exactly as they are — no port, no downtime for paying customers. The new system is additive (new entry point, e.g. `app.bloob.haus` + per-user hauses).
8. **Prove it with a thin vertical spike first** (see below) before building breadth.
9. **API-first & agent-ready.** The dashboard talks to the backend over the same API endpoints an AI agent or MCP server would — building the webapp *is* building the API. Core operations live in a callable service layer so a future MCP server wraps them without a rewrite (see dedicated section below).

### Diagram

```
                    ┌─────────────── Cloudflare (global edge) ───────────────┐
   visitor ───────► │  Worker: read host + path → check KV visibility map    │
                    │    • public  → serve from Cloudflare Pages (fast/cached)│
                    │    • private → proxy to Scaleway (no cache)             │
                    └───────────────────────────┬────────────────────────────┘
                                                 │ (private only)
                    ┌──────────────── Scaleway EU (Paris) ───────────────────┐
                    │  • Next.js container: dashboard UI + API + Better Auth  │
                    │    (Google + GitHub OAuth, sessions)                    │
                    │  • Managed Postgres: users, rooms, domains, visibility  │
                    │  • Object Storage: user vaults + built output           │
                    │  • Serverless Jobs: the Eleventy build pipeline         │
                    └────────────────────────────────────────────────────────┘

   existing studio/buffbaby/leons/bloob.haus sites: stay on Cloudflare Pages, untouched
```

---

## Data model (V1 — intentionally small)

**PostgreSQL** holds only the ledger:

- **`users`** — id, email, name, oauth provider (google/github), created_at
- **`rooms`** — id, owner (→ users), slug (e.g. `/kitchen`), optional github_repo, label
- **`pages`** / visibility map — room, path, visibility (`public` / `private` / `unlisted`)
- **`domains`** — hostname → user (subdomains + custom domains)
- *(+ tables Better Auth creates itself for sessions/accounts/oauth tokens)*

**Object Storage** holds the actual content: markdown + media per user, laid out as a vault:

```
scaleway://bloob-vaults/{user_id}/
├── _bloob-settings.md
├── kitchen/  (a room)
│   └── recipes/challah.md
└── marbles/  (a room)
    └── cool-thing.md
```

The **preprocessor does not change** — the only difference from today is the *source* of the markdown (Object Storage instead of a cloned GitHub repo).

---

## Two build paths (name them now, sequence them apart)

Leon's "build one page on its own without updating all the infra" is really two capabilities:

1. **Per-room independence — V1.** One build job per room; editing your marbles never rebuilds anyone else's site. Achieved for free via one Serverless Job per room. A room is small (seconds to build).
2. **Per-page instant render — later (Quick Mode).** The "paste markdown → see the marble in ~2s" moment can't wait for a full Eleventy build. A separate, lighter render path (the vision plan's `/api/render`, "render without storing"). We **shape the architecture so it slots in** but do not build it in the spike.

True fine-grained "rebuild exactly one page inside a large site" incremental building is an optimization for when vaults get big — explicitly deferred.

---

## API-first & agent-ready (MCP future-proofing)

Bloob Haus should let AI models create a user's haus/notes programmatically at some point. This is nearly free *if* two structural choices are made now; it is expensive to retrofit later.

- **The dashboard's endpoints are the API.** Building the Quick Mode / dashboard UI means building the CRUD API (`POST /api/marbles`, `GET /api/visualizers`, `POST /api/render`, etc. — the vision plan's Section F-ter list). There is no separate "add an API" project.
- **DESIGN RULE: the UI never touches the database or storage directly — it only ever calls the API.** Every *action* (create, edit, publish, delete, connect) goes through an API endpoint; the dashboard is just the API's first client. This is what guarantees everything a human can do in the UI, an agent can also do via API. (Applies to actions, not pure presentation — animations/layout are UI-only.) The API existing from day one ≠ being publicly open; opening it to external keys later is a permission decision, not a build.
- **An MCP server is a thin wrapper over that API** (Phase 4 — not built now). It translates AI tool calls (`create_marble`, `list_visualizers`, `apply_visualizer`) into API calls. It needs a *stable API* + *non-interactive auth* — not special backend architecture.
- **Two cheap choices to bake in now:**
  1. **Dual auth from day one** — every protected endpoint accepts a **session cookie** (humans) *or* a **bearer token / API key** (agents). Agents can't do interactive browser OAuth. Better Auth's API-key plugin covers this.
  2. **Core logic in a service layer** — `createMarble()`, `renderMarkdown()`, etc. as plain callable functions that *both* the Next.js API routes and a future MCP server import. The AI path can then call the same functions directly (not even over HTTP).
- **Sequence:** MCP itself stays Phase 4 (vision plan F-ter). Building it before Quick Mode = building against nothing. We only make the two structural choices above now.

## Cost (realistic V1, monthly)

| Piece | Product | Cost |
|---|---|---|
| Web app + API + auth | Scaleway Serverless Container (scales toward zero when idle) | a few € |
| Database | Scaleway Managed Postgres DEV-S | €11 |
| Vault + built-output storage | Scaleway Object Storage (~€0.01/GB) | ~€1 |
| Builds | Scaleway Serverless Jobs (pay per run) | pennies |
| Public hosting + routing Worker + KV | Cloudflare (free tiers) | $0 |
| **Total** | | **~€15–20/mo** |

Notes:
- Cloudflare **bills CPU time, not wall-clock** — a Worker waiting on the Scaleway proxy fetch costs ~$0. Free tier is 100k requests/day. The proxy Worker is cheap to build *and* cheap to run.
- `username.bloob.haus` subdomains are effectively **free** — own-zone wildcard DNS + Worker routing, no per-hostname fee. Cloudflare-for-SaaS's $0.10/hostname (first 100 free) applies only to *customers' own* domains. So subdomains are cheaper/easier than the Feb doc feared (though still fine to defer to V2).

---

## The V1 spike (build this first)

One thin vertical slice through the *entire* architecture, proving the hard integration before any breadth:

> One test user → **signs in with Google** (Better Auth on Scaleway) → has **one public marble** (built, served fast from Cloudflare's edge) → and **one private marble** (Worker sees `private` → proxies to Scaleway → checks the session cookie → serves it, or shows a login screen). Same-looking URLs.

When that slice works end-to-end, the architecture is proven and future-proof; everything after is filling in volume, not inventing structure.

**Highest-risk piece to expect to debug:** the **login session surviving the proxy boundary** — the cookie Scaleway sets must round-trip through the Cloudflare Worker so a private page knows who the visitor is. Solved, documented pattern (Worker rewrites `Set-Cookie` to the client domain, forwards cookies to origin), but the piece most likely to eat a session.

---

## Out of scope for this foundation

Explicitly deferred so the first spec stays shippable:
- Quick Mode paste-to-URL UI
- The `/api/render` fast single-page render path
- Custom domains (Cloudflare for SaaS)
- ~~Wildcard subdomains (`username.bloob.haus`) — path-based URLs (`bloob.haus/{handle}/…`) for V1~~
  **↑ REVERSED 2026-07-07:** subdomain auto-provisioning is now an *early* spike milestone (see
  "Scope change" in the 2026-07-07 section). Path-based URLs are the fallback, not the V1 target.
- Billing / pricing tiers
- The killer visualizer
- MCP / REST public API

---

## Open questions (unresolved — revisit before/while implementing)

1. **Session across the proxy boundary** — the exact cookie/domain handling for Scaleway session ↔ Cloudflare Worker ↔ browser. Pattern is known; needs a real spike to confirm (SameSite, domain scoping, `Set-Cookie` rewrite).
2. **`mount_path` / multi-repo rooms (TECH-DEBT #16)** — Leon wants flexibility: a room bound to its own repo, OR one repo for the whole haus, OR a mix (a base repo plus one folder hooked to another repo). Requires link resolution across vaults, or "a vault builds into a folder structure → that folder structure maps to a URL structure and links resolve cleanly." Modular vault→folder→URL is the target. Not needed for the single-room spike; blocks the full "haus with rooms" model.
3. **Note/marble IDs** — should every note carry a stable unique ID (survives renames, prevents URL breakage)? Users could accidentally change/duplicate IDs in markdown. Ties to the File Identity Convention (currently filename-based). Open.
4. **Visibility-map sync** — mechanism for the Scaleway build to write per-page visibility into Cloudflare Workers KV (auth to KV, update timing, safe default = private).
5. **Build trigger** — how the Next app kicks off a Serverless Job (on dashboard action, on GitHub push webhook for Repo Mode, on Quick Mode save).
6. **GitHub token storage** — encrypting/storing per-user GitHub OAuth tokens (repo scope) in Postgres; refresh handling.
7. **EU-sovereignty nuance of Google/GitHub OAuth** — both are US identity providers. They only see *that* a user logged in (email + event), never content (which stays in the EU). Acceptable for V1. Future option: email/password or a European IdP for privacy-maximalist users.
8. ~~**Path-based vs subdomain for V1** — leaning path-based; revisit as an early V2 upgrade.~~
   **RESOLVED 2026-07-07:** subdomain auto-provisioning at account setup is now an *early* target
   (not V2). New open work it introduces: automated **Scaleway ↔ Cloudflare DNS/API wiring**
   (hostname + Worker route + cert issued automatically on signup). Path-based URLs remain the
   fallback. See the 2026-07-07 "Scope change" section.
9. **Custom domains** — Cloudflare for SaaS ($0.10/hostname). Deferred; architecture already supports it.
10. **`bloob.haus` homepage / root haus view** — the front door and the auto-generated "all my rooms" overview. Design-led (see vision plan Section E/F). Deferred.
11. **When to introduce the Cloudflare public layer within the spike** — decision was "full split via the spike," but the exact build order (Scaleway-serves-everything first for a day, then front it with Cloudflare?) is an implementation-sequencing call.
12. **API-key / agent auth details** — token format, scoping (per-user, per-room, read vs write), rotation/revocation, and how it coexists with Better Auth sessions. Needed for MCP later; the *capability* should exist from day one.
13. **Account-linking safety** — auto-linking Google + GitHub by verified email has a known attack surface (unverified-email spoofing). Confirm Better Auth's linking config only trusts verified emails; otherwise require explicit in-session linking.
14. **Incremental GitHub scope** — request minimal scope at login vs `repo` scope only at "Connect a repo." UX vs simplicity tradeoff; decide at implementation.

---

---

## 2026-07-07 — session refinements, scope updates & the extensibility model

A follow-up brainstorming session resolved several of the open questions above, changed one
sequencing decision, and added the **user-authored-code / marketplace** vision as an explicit
design axis. This section is the current resting point; where it conflicts with text above, this
section wins.

### Backend refinements (resolved)

- **Postgres stays Scaleway — confirmed.** Managed Postgres (DEV-S), same region as the container.
  A "serverless Postgres" (e.g. Neon) has EU regions but is a **US company**, so the CLOUD Act
  attaches to the *company's jurisdiction* — reintroducing exactly the exposure we're avoiding
  (this is open question #7 applied to the DB). Scaleway is EU-jurisdiction and co-located with the
  app (every request hits the DB for session + visibility). The €11/mo always-on cost is inherent
  to relational DBs and accepted.
- **Frontend is JavaScript/TypeScript end-to-end — confirmed.** One language across DB → API → UI,
  a shared service layer, and full reuse of the existing JS ecosystem (Eleventy, visualizers,
  shapes). **No Python in V1.** If a Python-only library is ever genuinely required, isolate it as
  its *own* Scaleway Serverless Function behind an HTTP boundary — never co-mingle a second runtime
  into the Node app.
- **"Fully serverless" clarified.** We build *container images* but run them on serverless
  primitives: the Next.js app = a **Serverless Container** (scales toward zero when idle), builds =
  **Serverless Jobs** (run then terminate), routing = **Cloudflare Worker** (bills CPU, not wait).
  **Postgres is the one always-on, non-serverless piece.** Two implications carried forward:
  (a) **cold starts are accepted for now** — watch only the private-page proxy path, the one a
  visitor waits on; (b) **statelessness is mandatory** — no in-memory state between requests
  (already satisfied: session lives in cookies + Postgres).
- **Apple OAuth deferred.** Google + GitHub cover both personas. Apple's per-app private-relay email
  breaks auto-link-by-verified-email anyway; revisit with explicit in-session linking if demanded.
- **Live render (`/api/render`) alignment — protected, not built.** The pure-function visualizer
  contract (`parser(md)→data`, `renderer(data)→html`, no DOM/FS side-effects) is what makes
  instant paste-to-render possible; it is **load-bearing and must stay sacred**. "Breaking up the
  build script" concretely means **extracting a thin render core** (visualizer parsers + markdown-it
  + theme CSS tokens → HTML fragment) out of the full-build orchestration, callable by both the
  Eleventy build and a future `/api/render`. That is the already-settled "core logic in a service
  layer" rule — a factoring, not a rewrite. Still deferred past the spike.
- **Image derived-asset caching — reserve the namespace now, build later.** Generalize the existing
  favicon hash-cache (`.favicon-hash`): content-hash each source image → derived variants (optimized
  sizes + OG image) keyed by that hash → skip `sharp` on cache hit, so a text-only edit reprocesses
  zero images. **Critical serverless constraint:** a build job's local filesystem is *ephemeral*, so
  the cache MUST live in **Object Storage** (a hash-keyed `_processed/` prefix), not on disk, to
  survive between builds. Reserve that namespace when designing the storage layout. (Tracks
  TECH-DEBT #15 for the current CI pipeline; fix #17/#18 broken-image bugs before caching output.)

### Scope change: subdomain provisioning moves EARLY (was deferred to V2)

**Decision reversed.** `username.bloob.haus` subdomain creation is now an **early spike milestone**,
automated as one of the first things that happens at account setup — not a V2 upgrade. Rationale:
the phase-3 doc already found subdomains are *cheap* (own-zone wildcard DNS + Worker routing, no
per-hostname fee), and automated fast subdomain setup is a high-value "wow" moment for onboarding.
The new work this pulls forward: **automated Scaleway ↔ Cloudflare DNS/API wiring** (the app,
on account creation, provisions the hostname + routing so the user's haus is live immediately).
Expect this to be fiddly (DNS propagation, Worker route registration, cert issuance) — prototype it
early rather than discovering it late. Path-based URLs (`bloob.haus/{handle}/…`) remain the fallback
if provisioning isn't ready, but subdomain-at-signup is now the target. *(Supersedes "Out of scope →
Wildcard subdomains" and open question #8 below.)*

### The extensibility & user-authored-code model (new design axis)

Bloob Haus is heading toward an **ecosystem**: users author their own shapes, magic machines, and
small client-side apps, and — crucially — **reuse each other's**. This aligns with the core "reuse
what already exists" value. The architecture must stay compatible with it now, even though almost
none of it is built.

**The one hard line that keeps all of this safe:**

> **User-authored code runs client-side only. Nothing user-authored runs in the build/server
> environment without explicit human review + approval.**

Hold that line and "reuse anyone's shape/app" becomes a *review + provenance* problem (tractable),
not a *sandbox untrusted server code* problem (a whole product). Client-side-only collapses the
technical blast radius — user code can't reach your infra, secrets, DB, or other users' data. What
remains is abuse/reputation/legal risk (e.g. a client-side crypto-miner steals a *visitor's* CPU and
harms your domain's reputation; a phishing page on a `*.bloob.haus` subdomain can get the apex domain
flagged), addressed by review + Terms of Service, not by sandboxing.

**Shapes** (see `docs/architecture/shapes.md` → "User-authored shapes & marketplace" for the full detail):
- **Naming, settled:** `_bloob-shapes.md` = the **registry** (table of shape → metadata; the
  `_bloob-types.md` successor). `_bloob-shapes/` = the **definitions folder** (each subfolder =
  one shape: `manifest.json`, `schema.md`, renderer JS, `styles.css`). A file and a folder coexist.
- **Two authoring paths, one structure:** editing the vault repo on-machine (Claude Code) *or*
  uploading via the webapp both produce the **identical** `_bloob-shapes/<name>/` layout; the
  backend stores it the same way in Object Storage. This is what makes shapes port cleanly between
  Repo Mode and the webapp.
- **Trust split by where the renderer runs:** build-time renderers (`index.js` — run in *your* Node
  build job) are reserved for **your own / approved** shapes. Third-party & reused shapes are
  **runtime-only** (`browser.js`, run in the visitor's browser). This lets reuse proceed safely
  before any sandboxing exists.

**Magic machines** (frontmatter automation like `scene-nav`, `ken-burns`):
- ken-burns and scene-nav are **fully client-side apps** — lower risk.
- **Approval via public GitHub pull request.** All shape/machine code stays **public and auditable**;
  Leon reviews and merges. This is the V1 trust gate (a crypto-miner or exfil attempt is obvious in a
  diff). No open self-service upload of build-time/server code.

**schema.md is the contract — write the canonical template EARLY:**
- It's the single highest-leverage cheap task for the whole ecosystem: it makes shapes
  human-consistent, AI-authorable, and MCP-wrappable. It's a *template*, not code.
- **Serve schemas at stable URLs** (e.g. `shapes.bloob.haus/<shape>/schema.md`) so AIs can crawl
  them, and expose them via the future **MCP** ("how to create a shape") — but the underlying truth
  always lives in `schema.md`, with the MCP a thin wrapper. Do this in Phase 2 alongside the
  bloob-shapes-unification plan, not Phase 3.

**Marketplace safety — good-enough-for-now ideas (documented; full hardening is a future TODO):**
1. **Provenance in the ledger** — record `author` + `approver` + shape/app `visibility` in Postgres,
   so reuse can be attributed and revoked.
2. **Public-PR approval gate** — nothing third-party is publishable to others until reviewed & merged;
   all code public.
3. **Runtime-only for third parties** — reused shapes/machines ship `browser.js` only; no untrusted
   build-time Node execution.
4. **Content Security Policy on user-hosted pages** — restrict script origins, block obvious miner
   endpoints, limit outbound connections; a CSP is the cheapest technical brake on client-side abuse.
5. **Provenance-visible reuse** — when a user reuses another's shape, keep the origin visible (credit
   + link back) so the ecosystem is legible, not anonymous copy-paste.
6. **Terms of Service / Acceptable Use + takedown** — *before any public (non-friends) launch*, add a
   ToS/AUP and a notice-and-takedown process (EU **DSA** hosting-provider obligations apply once you
   host others' content). *(Not legal advice — get a lawyer's eyes before public launch.)*

Full untrusted-code sandboxing (running third-party **build-time** renderers safely, isolated
per-tenant jobs with zero ambient credentials) is explicitly a **future TODO** (see TECH-DEBT) —
the client-side-only line means we don't need it to start.

**TouchDesigner-adjacent visuals:** TouchDesigner itself can't be hosted (proprietary desktop GPU
app, not a web runtime), but the *kind of thing* it does — realtime generative/interactive GPU
visuals — maps directly onto a shape's `browser.js` via WebGL/WebGPU/shaders/Three.js/p5.js/Hydra/
cables.gl. A "generative-visual" shape is prime *killer-visualizer* territory. No architecture change
needed; it's already supported by the runtime-shape model.

---

## Next step

Hand this to the planning step (`writing-plans`) to turn the **V1 spike** into a concrete, ordered implementation plan. Add the settled architecture decisions to `docs/implementation-plans/DECISIONS.md` (backend home = Scaleway EU; auth = Better Auth; content = markdown-in-object-storage; ledger = Postgres; routing = Cloudflare Worker + KV public/private split; one Next.js app).
