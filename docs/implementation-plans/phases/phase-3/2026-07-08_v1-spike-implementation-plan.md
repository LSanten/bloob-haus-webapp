# V1 Spike Implementation Plan — Auth + Public/Private Marble Across the Cloudflare↔Scaleway Boundary

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the entire phase-3 architecture with one thin vertical slice: a test user signs in with Google, sees one public marble served fast from Cloudflare's edge, and one private marble that the Cloudflare Worker proxies to a Scaleway origin which checks the session cookie — with both marbles at same-looking URLs.

**Architecture:** A Next.js app on a **Scaleway Serverless Container** (`auth.bloob.haus`) runs Better Auth (Google) and serves session-gated private content, backed by **Scaleway Managed Postgres**. A **Cloudflare Worker** (`spike.bloob.haus`) reads a **Workers KV** visibility map per request: `public` → serve a static asset from the edge; `private` → proxy to the Scaleway origin forwarding the cookie. The session cookie is scoped to the parent domain `.bloob.haus` so it round-trips from `auth.` through the Worker at `spike.` to the origin. Production hosts stay untouched.

**Tech Stack:** Next.js (App Router, TypeScript), Better Auth (`better-auth` + `pg`), Scaleway (Serverless Container, Container Registry, Managed Postgres DEV-S, region `fr-par`), Cloudflare (Workers, Workers KV, Wrangler), Vitest + `@cloudflare/vitest-pool-workers` for Worker unit tests, Docker.

**Prerequisite reading:** `docs/implementation-plans/phases/phase-3/2026-07-06_webapp-backend-identity-architecture.md` — especially the V1 spike section, "Subdomains + OAuth", and open questions #1 (session across proxy), #4 (visibility→KV), #5 (build trigger). This plan is the concrete build of that spike.

> **Progress (2026-07-08, Session 58) — build STARTED in `../bloob-haus-cloud/`:**
> ✅ **Done offline:** Worker `decideRoute` + `handleRequest` (12 tests); Next.js app with Better Auth Google login + gated `/m/[slug]` (**proven locally on SQLite**); Google OAuth client created (`dev.bloob@gmail.com`).
> ✅ **Unblocked (same day):** the Scaleway billing-country ticket was bypassed, not resolved — a *new* Scaleway account under the same `dev.bloob@gmail.com` identity was created with country = US set correctly at signup, payment attached. Old (Germany) account abandoned. See DECISIONS.md 2026-07-08 and `../bloob-haus-cloud/NOTES-infra.md`.
> ⏳ **Next up:** Task 0 Steps 2, 4–6 (CLI installs/login, Postgres instance, Container Registry namespace, Cloudflare KV namespace + `BETTER_AUTH_SECRET`), then Task 1 — the cookie-boundary proof (the crux).
> Local dev uses SQLite; prod switches to Postgres via `DATABASE_URL` — no code change. **Deploy gotcha to watch:** `auth.ts` imports `better-sqlite3`, so the Next standalone Docker image must load it (use a glibc base e.g. `node:20-slim`, or lazy-load it) even though prod uses Postgres.

## Global Constraints

- **Runtime:** Node.js 20+. TypeScript throughout. Cross-platform (macOS dev) — no inline `VAR=value cmd` env syntax; pass env via `.env` files or the container/Worker config.
- **Code location:** a **separate project** at `../bloob-haus-cloud/` (sibling to this Eleventy repo). Never mix backend code into the Eleventy builder — this plan's file paths are relative to `../bloob-haus-cloud/` unless stated otherwise. Initialize it as its own git repo.
- **EU region:** all Scaleway resources in `fr-par` (Paris). No US region.
- **Hosts:** origin/login = `auth.bloob.haus` (Scaleway container); spike routing = `spike.bloob.haus` (Cloudflare Worker). **Never touch** `bloob.haus`, `leons.bloob.haus`, `buffbaby.bloob.haus`, `studio.bloob.haus` (live).
- **Session cookie:** `Domain=.bloob.haus; Secure; HttpOnly; SameSite=Lax`. This exact scoping is what makes the cookie round-trip; do not change it without re-verifying Task 1.
- **Owner identity:** the Google Cloud project + Scaleway account are owned by `dev.bloob@gmail.com` (the dedicated dev Google account, per DECISIONS 2026-07-07), never a personal account.
- **Auth:** Better Auth, Google provider only (GitHub deferred). Login is centralized on `auth.bloob.haus` — Google's redirect URIs are exact, no wildcards.
- **Spike simplifications (faithful, documented):** (a) **no Object Storage** — the public marble is a static asset in the Worker, the private marble is inline HTML in an origin route; (b) **KV visibility seeded manually** via `wrangler` (build→KV sync is open question #4, deferred); (c) **safe default = private** — any `/m/*` path not explicitly `public` in KV is treated private (fail closed).
- **Verification style:** this is infrastructure work. Where there is pure logic (the Worker's route decision) use test-first Vitest. Everywhere else, each task defines an **expected observable** (a `curl`/browser result) *before* making it true, then verifies with the exact command.

---

## Secrets & Credential Hygiene (operational security — READ before Task 0 generates any secret)

> **Why this is binding, not optional.** The moment Task 0 runs, real credentials exist: a Google client secret, a Postgres password, a Scaleway secret key, a Better Auth signing secret. Soon after, **real people's accounts (emails, session tokens) live behind them.** A single leaked secret lets an attacker impersonate the app, read the whole database, or run up the cloud bill. Treat this section as binding as the Global Constraints above. This is also a teaching section — the "how" is spelled out on purpose so the owner can be a responsible custodian.

### The secret inventory — every sensitive value in this project

| Secret | What it unlocks if leaked | Where it must live | How to rotate |
|---|---|---|---|
| **Google OAuth client secret** | Sign in *as* your app | `app/.env.local` (dev) → Scaleway **secret** env var (prod) | Google Cloud Console → regenerate client secret |
| **`BETTER_AUTH_SECRET`** | Forge or read *any* user's session cookie | `app/.env.local` (dev) → Scaleway **secret** env var (prod) | `openssl rand -base64 32` → redeploy (logs everyone out) |
| **`DATABASE_URL`** (holds the Postgres password) | Full read/write of **all user data** | `app/.env.local` (dev) → Scaleway **secret** env var (prod) | `scw rdb` change password → update the URL everywhere |
| **Scaleway API key** (access + secret) | Create/destroy/bill *all* cloud resources | `~/.config/scw/config.yaml` on disk (see below) | IAM → API Keys → revoke + regenerate |
| **Cloudflare token** (from `wrangler login`) | Edit DNS, deploy Workers, read KV | `~/.config/.wrangler/…` on disk | Cloudflare dashboard → roll token / re-login |

### Five rules that prevent ~99% of leaks

1. **Never in git.** Secrets live only in gitignored files (`.env*`, `worker/.dev.vars`) or the cloud's own secret store — never in tracked files, never in `wrangler.toml` `[vars]`, never in a Dockerfile, never in `NOTES-infra.md` (placeholders only). Verify *before every commit* (see scanner below).
2. **Never in a logged command.** Don't paste a secret as a Bash argument in this chat, and don't type it where it lands in shell history. (zsh history dodge: prefix the command with a space, with `setopt HIST_IGNORE_SPACE` set.)
3. **Never baked into an image.** Docker images get pushed to a registry and cached forever. Secrets are injected at **runtime** via Scaleway `secret-environment-variables.*` (encrypted) — never `environment-variables.*` (plaintext, visible in the console) and never `COPY .env` into the image.
4. **Least privilege.** The *running app* gets the minimum: a **non-superuser** Postgres role scoped to its one database, and a scoped token — not your org-admin key. Your personal admin keys are for provisioning by hand, not for the deployed app.
5. **Assume-leaked drill.** If a secret ever touches a screenshot, a chat, a public repo, or a pasted log — **rotate it, don't rationalize.** Rotation is cheap; a live leaked key is not.

### Dev vs. prod must use different secrets
- The dev DB (SQLite / a throwaway Postgres) and prod DB use **different** credentials, so a leaked dev secret can never open prod. `app/.env.local` is dev-only; prod secrets are set directly on the Cloudflare/Scaleway side and never leave it.

### Where these CLIs just stashed credentials on THIS laptop (know your attack surface)
- `~/.config/scw/config.yaml` — **your Scaleway secret key, in PLAINTEXT.** Anything that reads this file owns your cloud account and bill. Lock it: `chmod 600 ~/.config/scw/config.yaml`.
- `~/.config/.wrangler/…` — Cloudflare OAuth token (revocable; better than a raw key, still sensitive).
- `~/.docker/config.json` (once Docker is installed) — registry creds, base64-encoded = **not** encrypted.
- `app/.env.local`, `worker/.dev.vars` — your local secret files. Confirm each is gitignored (`git check-ignore <file>` must print the path).

### Keep the laptop itself safe (secrets are only as safe as the disk under them)
- [ ] **FileVault ON** — full-disk encryption. Without it, a lost/stolen laptop hands over every file above in cleartext. (System Settings → Privacy & Security → FileVault.)
- [ ] **Require password on wake + a short auto-lock.**
- [ ] **A password manager as the source of truth** (1Password / Bitwarden): store the master copy of each secret there; the on-disk files are just working copies you can rotate away.
- [ ] **A leak scanner in the loop** — `brew install gitleaks`, then run `gitleaks detect` before pushing (or wire it as a pre-commit hook) so a secret can't slip into a commit unnoticed.
- [ ] **Don't paste secrets into LLM chats — including this assistant.** It only ever needs the non-secret IDs/endpoints.

### When real people use the app (production posture — revisit before the first real user)
- You now hold **PII** (users' emails, session tokens) in Postgres. Keep it **Scaleway Managed** (encryption at rest + backups handled) — don't roll your own DB.
- **Give the app a scoped DB role, not the superuser** — only the privileges Better Auth needs on its one database.
- **Rotating `BETTER_AUTH_SECRET` is your kill-switch** — it invalidates every session and forces re-login if you suspect compromise.
- **Graduate off raw env vars as it grows:** a real secret manager (Scaleway Secret Manager, or Doppler/Infisical) adds rotation, audit logs, and access control. Not needed for the spike — noted for when the app is real.
- **Have a leak runbook:** (1) rotate the leaked key, (2) redeploy, (3) check access logs for misuse, (4) if sessions may be exposed, rotate `BETTER_AUTH_SECRET` to force everyone to re-login.

---

## File Structure

```
../bloob-haus-cloud/
├── app/                         # Next.js app → Scaleway Serverless Container (auth.bloob.haus)
│   ├── package.json
│   ├── next.config.mjs          # output: "standalone" for Docker
│   ├── Dockerfile
│   ├── .env.local               # local secrets (gitignored)
│   ├── src/lib/auth.ts          # Better Auth server config (Google + pg + .bloob.haus cookie)
│   ├── src/lib/auth-client.ts   # Better Auth browser client
│   ├── src/app/api/auth/[...all]/route.ts   # Better Auth handler mount
│   ├── src/app/login/page.tsx   # "Sign in with Google" button
│   ├── src/app/m/[slug]/route.ts# private-marble origin: session-gated HTML or 302 to /login
│   └── src/app/health/route.ts  # liveness probe
└── worker/                      # Cloudflare Worker (spike.bloob.haus)
    ├── package.json
    ├── wrangler.toml            # KV binding, ASSETS binding, route, ORIGIN var
    ├── vitest.config.ts
    ├── src/router.ts            # decideRoute() — pure, unit-tested routing logic
    ├── src/index.ts             # fetch handler: KV lookup → public assets / private proxy
    ├── test/router.test.ts      # Vitest tests for decideRoute
    └── public/m/public-marble/index.html   # the public marble (edge static asset)
```

---

### Task 0: Provision external services & credentials

**Files:**
- Create: `../bloob-haus-cloud/.gitkeep` (initialize the project repo)
- Create: `../bloob-haus-cloud/NOTES-infra.md` (record all generated IDs/endpoints as you go)

**Interfaces:**
- Produces: `DATABASE_URL` (Postgres), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET`, a Cloudflare **KV namespace id**, a Scaleway **Container Registry endpoint**, and DNS control of `bloob.haus`. Every later task consumes these.

This task is external setup (accounts/dashboards/CLI). Fold it in fully — nothing downstream works without it. Record every generated value in `NOTES-infra.md`.

- [ ] **Step 1: Initialize the separate project repo**

```bash
mkdir -p ../bloob-haus-cloud && cd ../bloob-haus-cloud
git init
printf "node_modules/\n.env*\n.wrangler/\n.next/\n" > .gitignore
touch .gitkeep NOTES-infra.md
git add -A && git commit -m "chore: init bloob-haus-cloud spike project"
```

- [ ] **Step 2: Install the CLIs**

```bash
npm install -g wrangler
brew install scaleway/scaleway-cli/scw   # or: see https://github.com/scaleway/scaleway-cli
wrangler login          # opens browser → authorize the Cloudflare account holding bloob.haus
scw init                # paste Scaleway access key + secret key (create at console.scaleway.com)
```
Expected: `wrangler whoami` prints the account/email that owns the `bloob.haus` zone; `scw account project list` lists a project in `fr-par`.

- [ ] **Step 3: Create the Google OAuth client**

In Google Cloud Console **signed in as `dev.bloob@gmail.com`**:
1. Create a project "Bloob Haus".
2. APIs & Services → OAuth consent screen → External → app name "Bloob Haus", support email `dev.bloob@gmail.com`, save (keep in "Testing" mode; add `dev.bloob@gmail.com` as a test user).
3. Credentials → Create Credentials → OAuth client ID → Web application.
4. Authorized redirect URI (exact): `https://auth.bloob.haus/api/auth/callback/google`
5. Copy the **Client ID** and **Client secret** into `NOTES-infra.md`.

Expected: you have `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

- [ ] **Step 4: Create the Scaleway Managed Postgres (DEV-S, fr-par)**

```bash
scw rdb instance create name=bloob-spike-db engine=PostgreSQL-15 \
  node-type=DB-DEV-S is-ha-cluster=false region=fr-par \
  user-name=bloob password=$(openssl rand -base64 24) --wait
scw rdb instance list region=fr-par   # note the instance id + endpoint host:port
```
Then create a database and capture the connection string:
```bash
scw rdb database create instance-id=<INSTANCE_ID> name=bloobspike region=fr-par
```
Record `DATABASE_URL=postgres://bloob:<password>@<endpoint-host>:<port>/bloobspike?sslmode=require` in `NOTES-infra.md`.
Expected: `scw rdb instance list` shows status `ready`.

- [ ] **Step 5: Create the Scaleway Container Registry namespace**

```bash
scw registry namespace create name=bloob-spike region=fr-par
scw registry namespace list region=fr-par   # note the Endpoint, e.g. rg.fr-par.scw.cloud/bloob-spike
docker login rg.fr-par.scw.cloud -u nologin -p $(scw registry get-login-password 2>/dev/null || echo "<use a Scaleway API secret key as the password>")
```
Record the registry endpoint in `NOTES-infra.md`.
Expected: `docker login` succeeds.

- [ ] **Step 6: Create the Cloudflare KV namespace + generate the auth secret**

```bash
cd ../bloob-haus-cloud
wrangler kv namespace create VISIBILITY    # prints the namespace id → record it
openssl rand -base64 32                     # → BETTER_AUTH_SECRET, record it
```
Expected: a KV namespace id string; a 32-byte base64 secret.

- [ ] **Step 7: Commit the infra notes (secrets redacted)**

```bash
# Ensure NOTES-infra.md secrets are placeholders in git, real values only local if you prefer.
git add NOTES-infra.md .gitignore
git commit -m "docs: record spike infra endpoints (secrets redacted)"
```

---

### Task 1: De-risk — prove a cookie round-trips through a throwaway Worker→container proxy

**Files:**
- Create (throwaway): `../bloob-haus-cloud/_spike-origin/server.js`, `../bloob-haus-cloud/_spike-origin/Dockerfile`
- Create (throwaway): `../bloob-haus-cloud/_spike-worker/wrangler.toml`, `../bloob-haus-cloud/_spike-worker/src/index.ts`

**Interfaces:**
- Produces: a proven pattern — a `Domain=.bloob.haus` cookie set at `auth.bloob.haus` is sent by the browser/curl to `spike.bloob.haus`, forwarded by the Worker to the origin, and read there. This de-risks open question #1 before Better Auth exists. These files are deleted in Task 2/5.

This is the highest-risk integration; prove it in isolation first with the smallest possible origin and Worker.

- [ ] **Step 1: Write the throwaway origin (sets + echoes a parent-domain cookie)**

`_spike-origin/server.js`:
```js
const http = require("http");
http.createServer((req, res) => {
  if (req.url === "/set") {
    res.setHeader("Set-Cookie", "spike=hello; Domain=.bloob.haus; Path=/; Secure; HttpOnly; SameSite=Lax");
    res.end("cookie set");
  } else if (req.url === "/whoami") {
    res.end("origin sees cookie header: " + (req.headers.cookie || "<none>"));
  } else if (req.url === "/health") {
    res.end("ok");
  } else {
    res.statusCode = 404; res.end("not found");
  }
}).listen(3000, () => console.log("spike origin on :3000"));
```
`_spike-origin/Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY server.js .
EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 2: Build, push, and deploy the throwaway origin to Scaleway; map `auth.bloob.haus`**

```bash
cd ../bloob-haus-cloud/_spike-origin
docker build -t rg.fr-par.scw.cloud/bloob-spike/spike-origin:1 .
docker push rg.fr-par.scw.cloud/bloob-spike/spike-origin:1
scw container namespace create name=bloob-spike region=fr-par        # note namespace id
scw container container create name=spike-origin namespace-id=<NS_ID> \
  registry-image=rg.fr-par.scw.cloud/bloob-spike/spike-origin:1 \
  port=3000 min-scale=0 max-scale=1 region=fr-par --wait
scw container container list region=fr-par                            # note the container DomainName (…fnc.fr-par.scw.cloud)
scw container domain create container-id=<CONTAINER_ID> hostname=auth.bloob.haus region=fr-par
```
Then in Cloudflare DNS for `bloob.haus`: add `CNAME auth → <container DomainName>`, **DNS-only (grey cloud)** so Scaleway terminates TLS for its custom domain.
Expected: `curl https://auth.bloob.haus/health` → `ok` (after DNS propagation + Scaleway cert issuance).

- [ ] **Step 3: Write the throwaway Worker (proxies `/whoami` to the origin, forwarding cookies)**

`_spike-worker/src/index.ts`:
```ts
export interface Env { ORIGIN: string }
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    // new Request(url, request) copies headers including Cookie → forwarded to origin
    return fetch(new Request(env.ORIGIN + url.pathname, request));
  },
};
```
`_spike-worker/wrangler.toml`:
```toml
name = "spike-proxy"
main = "src/index.ts"
compatibility_date = "2026-07-01"
[vars]
ORIGIN = "https://auth.bloob.haus"
[[routes]]
pattern = "spike.bloob.haus/*"
zone_name = "bloob.haus"
```
In Cloudflare DNS: add a **proxied (orange cloud)** record for `spike` so the Worker route attaches: `AAAA spike 100:: (Proxied)`.

- [ ] **Step 4: Define the expected observable, then deploy**

Expected after deploy: setting the cookie at `auth.` and then calling `spike./whoami` with that cookie shows the origin receiving it — proving the round-trip.

```bash
cd ../bloob-haus-cloud/_spike-worker
npm create cloudflare@latest -- --existing-script   # or: npm i -D wrangler && npx wrangler deploy
npx wrangler deploy
```

- [ ] **Step 5: Verify the cookie crosses the boundary**

```bash
# 1) get the cookie from the origin domain
curl -sS -c cookies.txt https://auth.bloob.haus/set
# 2) send it to the SPIKE domain (Worker) and confirm the origin behind the Worker sees it
curl -sS -b cookies.txt https://spike.bloob.haus/whoami
```
Expected: the second command prints `origin sees cookie header: spike=hello`.
**If it does not** (empty cookie), stop and debug SameSite/Domain/Secure here — this is the crux; do not proceed until it round-trips.

- [ ] **Step 6: Commit the proof (keep throwaway dirs for now)**

```bash
cd ../bloob-haus-cloud
git add _spike-origin _spike-worker
git commit -m "spike: prove .bloob.haus cookie round-trips through Worker proxy (oq#1)"
```

---

### Task 2: Real Next.js app skeleton on Scaleway (replaces the throwaway origin)

**Files:**
- Create: `../bloob-haus-cloud/app/` (Next.js scaffold)
- Create: `../bloob-haus-cloud/app/next.config.mjs`, `../bloob-haus-cloud/app/Dockerfile`
- Create: `../bloob-haus-cloud/app/src/app/health/route.ts`

**Interfaces:**
- Produces: the deployed container at `auth.bloob.haus` now serving the Next.js app; `GET /health` → `ok`. Consumes Task 0's registry + container namespace and Task 1's `auth.bloob.haus` domain mapping.

- [ ] **Step 1: Scaffold the app**

```bash
cd ../bloob-haus-cloud
npx create-next-app@latest app --ts --app --src-dir --no-tailwind --no-eslint --import-alias "@/*"
```

- [ ] **Step 2: Configure standalone output + health route**

`app/next.config.mjs`:
```js
/** @type {import('next').NextConfig} */
export default { output: "standalone" };
```
`app/src/app/health/route.ts`:
```ts
export function GET() {
  return new Response("ok", { headers: { "content-type": "text/plain" } });
}
```

- [ ] **Step 3: Write the Dockerfile**

`app/Dockerfile`:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 4: Define the expected observable, build, push, redeploy the container to this image**

Expected: `curl https://auth.bloob.haus/health` → `ok`, now served by Next.js (not the throwaway).

```bash
cd ../bloob-haus-cloud/app
docker build -t rg.fr-par.scw.cloud/bloob-spike/app:1 .
docker push rg.fr-par.scw.cloud/bloob-spike/app:1
scw container container update <CONTAINER_ID> \
  registry-image=rg.fr-par.scw.cloud/bloob-spike/app:1 port=3000 region=fr-par --wait
```

- [ ] **Step 5: Verify**

```bash
curl -sS https://auth.bloob.haus/health
```
Expected: `ok`.

- [ ] **Step 6: Commit**

```bash
cd ../bloob-haus-cloud
git add app && git rm -r _spike-origin
git commit -m "feat(app): Next.js skeleton on Scaleway container serving /health"
```

---

### Task 3: Better Auth + Google login + Postgres (session cookie on `.bloob.haus`)

**Files:**
- Create: `../bloob-haus-cloud/app/src/lib/auth.ts`, `../bloob-haus-cloud/app/src/lib/auth-client.ts`
- Create: `../bloob-haus-cloud/app/src/app/api/auth/[...all]/route.ts`
- Create: `../bloob-haus-cloud/app/src/app/login/page.tsx`
- Create: `../bloob-haus-cloud/app/.env.local`

**Interfaces:**
- Consumes: `DATABASE_URL`, `GOOGLE_CLIENT_ID/SECRET`, `BETTER_AUTH_SECRET` (Task 0).
- Produces: `auth` (server instance exporting `auth.api.getSession({ headers })`), a working Google login at `auth.bloob.haus/login`, and a session cookie `Domain=.bloob.haus`. Task 4 consumes `auth`.

- [ ] **Step 1: Install Better Auth + pg**

```bash
cd ../bloob-haus-cloud/app
npm install better-auth pg
npm install -D @types/pg
```

- [ ] **Step 2: Write the Better Auth server config**

`app/src/lib/auth.ts`:
```ts
import { betterAuth } from "better-auth";
import { Pool } from "pg";

export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  baseURL: process.env.BETTER_AUTH_URL,          // https://auth.bloob.haus
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: ["https://auth.bloob.haus", "https://spike.bloob.haus"],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  advanced: {
    // THE crux: parent-domain cookie so it reaches spike.bloob.haus (see Global Constraints)
    crossSubDomainCookies: { enabled: true, domain: ".bloob.haus" },
    defaultCookieAttributes: { sameSite: "lax", secure: true },
  },
});
```

- [ ] **Step 3: Mount the handler + client + login page**

`app/src/app/api/auth/[...all]/route.ts`:
```ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
export const { GET, POST } = toNextJsHandler(auth);
```
`app/src/lib/auth-client.ts`:
```ts
import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient({ baseURL: "https://auth.bloob.haus" });
```
`app/src/app/login/page.tsx`:
```tsx
"use client";
import { authClient } from "@/lib/auth-client";
export default function Login() {
  return (
    <main style={{ fontFamily: "system-ui", padding: 40 }}>
      <h1>Bloob Haus — sign in</h1>
      <button
        onClick={() =>
          authClient.signIn.social({
            provider: "google",
            callbackURL: "https://spike.bloob.haus/m/private-marble",
          })
        }
      >
        Sign in with Google
      </button>
    </main>
  );
}
```

- [ ] **Step 4: Create the auth schema in Postgres**

`app/.env.local` (local, gitignored):
```
DATABASE_URL=postgres://bloob:<password>@<endpoint-host>:<port>/bloobspike?sslmode=require
BETTER_AUTH_URL=https://auth.bloob.haus
BETTER_AUTH_SECRET=<from Task 0 step 6>
GOOGLE_CLIENT_ID=<from Task 0 step 3>
GOOGLE_CLIENT_SECRET=<from Task 0 step 3>
```
Run Better Auth's migration to create its tables:
```bash
npx @better-auth/cli migrate --y
```
Expected: output lists created tables (`user`, `session`, `account`, `verification`). Verify:
```bash
psql "$DATABASE_URL" -c "\dt"
```
Expected: the Better Auth tables are listed.

- [ ] **Step 5: Set the container's runtime env, rebuild, redeploy**

Expected observable: visiting `https://auth.bloob.haus/login` and clicking the button completes Google login and lands on the private-marble URL (which 404s until Task 4 — that's fine; the session cookie is what we verify here).

```bash
cd ../bloob-haus-cloud/app
docker build -t rg.fr-par.scw.cloud/bloob-spike/app:2 .
docker push rg.fr-par.scw.cloud/bloob-spike/app:2
scw container container update <CONTAINER_ID> \
  registry-image=rg.fr-par.scw.cloud/bloob-spike/app:2 region=fr-par \
  environment-variables.BETTER_AUTH_URL=https://auth.bloob.haus \
  environment-variables.GOOGLE_CLIENT_ID=<id> \
  secret-environment-variables.DATABASE_URL=<url> \
  secret-environment-variables.BETTER_AUTH_SECRET=<secret> \
  secret-environment-variables.GOOGLE_CLIENT_SECRET=<secret> --wait
```

- [ ] **Step 6: Verify login + cookie domain**

In a browser: open `https://auth.bloob.haus/login` → click "Sign in with Google" → complete consent. Then in DevTools → Application → Cookies, confirm the Better Auth session cookie shows **Domain = `.bloob.haus`**, `Secure`, `HttpOnly`, `SameSite=Lax`.
Expected: the cookie exists with `Domain=.bloob.haus`. (This is the single most important verification in the plan.)

- [ ] **Step 7: Commit**

```bash
cd ../bloob-haus-cloud
git add app && git commit -m "feat(auth): Better Auth Google login + Postgres, .bloob.haus session cookie"
```

---

### Task 4: Private-marble origin route (session-gated)

**Files:**
- Create: `../bloob-haus-cloud/app/src/app/m/[slug]/route.ts`

**Interfaces:**
- Consumes: `auth` from `@/lib/auth` (Task 3).
- Produces: `GET /m/:slug` on the origin — returns private HTML when the forwarded cookie is a valid session, else 302 to `/login`. Task 5's Worker proxies private paths here.

- [ ] **Step 1: Write the gated origin route**

`app/src/app/m/[slug]/route.ts`:
```ts
import { auth } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return Response.redirect("https://auth.bloob.haus/login", 302);
  }
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Private marble</title></head>
<body style="font-family:system-ui;padding:40px">
<h1>🔒 Private marble: ${slug}</h1>
<p>Hello ${session.user.email} — only signed-in you can see this.</p>
</body></html>`;
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
```

- [ ] **Step 2: Define expected observable, rebuild, redeploy**

Expected: with a valid session cookie, `GET https://auth.bloob.haus/m/private-marble` returns the private HTML; without it, a 302 to `/login`.

```bash
cd ../bloob-haus-cloud/app
docker build -t rg.fr-par.scw.cloud/bloob-spike/app:3 .
docker push rg.fr-par.scw.cloud/bloob-spike/app:3
scw container container update <CONTAINER_ID> registry-image=rg.fr-par.scw.cloud/bloob-spike/app:3 region=fr-par --wait
```

- [ ] **Step 3: Verify gated behavior directly on the origin**

```bash
# unauthenticated → redirect to login
curl -sS -o /dev/null -w "%{http_code} %{redirect_url}\n" https://auth.bloob.haus/m/private-marble
# authenticated (reuse the browser session cookie value; export it as $SID first)
curl -sS -b "better-auth.session_token=$SID" https://auth.bloob.haus/m/private-marble
```
Expected: first prints `302 https://auth.bloob.haus/login`; second prints the `🔒 Private marble` HTML with your email.

- [ ] **Step 4: Commit**

```bash
cd ../bloob-haus-cloud
git add app && git commit -m "feat(app): session-gated /m/[slug] private-marble origin route"
```

---

### Task 5: The routing Worker (decideRoute TDD + KV + public assets + private proxy)

**Files:**
- Create: `../bloob-haus-cloud/worker/src/router.ts`
- Create: `../bloob-haus-cloud/worker/test/router.test.ts`
- Create: `../bloob-haus-cloud/worker/src/index.ts`
- Create: `../bloob-haus-cloud/worker/wrangler.toml`, `../bloob-haus-cloud/worker/vitest.config.ts`, `../bloob-haus-cloud/worker/package.json`
- Create: `../bloob-haus-cloud/worker/public/m/public-marble/index.html`

**Interfaces:**
- Consumes: KV namespace id (Task 0), `auth.bloob.haus` origin (Tasks 2–4).
- Produces: the deployed Worker at `spike.bloob.haus` routing `public`→edge asset, `private`→proxied origin. `decideRoute(path, visibility)` is the tested core.

- [ ] **Step 1: Scaffold the Worker project + test tooling**

```bash
cd ../bloob-haus-cloud
mkdir -p worker/src worker/test worker/public/m/public-marble
cd worker && npm init -y
npm install -D wrangler vitest @cloudflare/vitest-pool-workers typescript
```
`worker/vitest.config.ts`:
```ts
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";
export default defineWorkersConfig({
  test: { poolOptions: { workers: { wrangler: { configPath: "./wrangler.toml" } } } },
});
```

- [ ] **Step 2: Write the failing test for `decideRoute`**

`worker/test/router.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { decideRoute } from "../src/router";

describe("decideRoute", () => {
  it("routes an explicit public marble to public", () => {
    expect(decideRoute("/m/public-marble", "public")).toEqual({ kind: "public" });
  });
  it("routes an explicit private marble to private", () => {
    expect(decideRoute("/m/private-marble", "private")).toEqual({ kind: "private" });
  });
  it("fails closed: unknown /m/ path with no KV entry is private", () => {
    expect(decideRoute("/m/mystery", null)).toEqual({ kind: "private" });
  });
  it("passes through non-marble paths", () => {
    expect(decideRoute("/favicon.ico", null)).toEqual({ kind: "passthrough" });
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd ../bloob-haus-cloud/worker && npx vitest run`
Expected: FAIL — `Cannot find module '../src/router'` / `decideRoute is not a function`.

- [ ] **Step 4: Implement `decideRoute` (minimal)**

`worker/src/router.ts`:
```ts
export type RouteDecision = { kind: "public" } | { kind: "private" } | { kind: "passthrough" };

// visibility: the value stored in KV for this exact path, or null if absent.
// Fail closed: any /m/* path not explicitly "public" is treated as private.
export function decideRoute(path: string, visibility: string | null): RouteDecision {
  if (!path.startsWith("/m/")) return { kind: "passthrough" };
  if (visibility === "public") return { kind: "public" };
  return { kind: "private" };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd ../bloob-haus-cloud/worker && npx vitest run`
Expected: PASS (4 passed).

- [ ] **Step 6: Write the fetch handler, config, and the public marble asset**

`worker/src/index.ts`:
```ts
import { decideRoute } from "./router";

export interface Env {
  VISIBILITY: KVNamespace;
  ASSETS: Fetcher;
  ORIGIN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const visibility = await env.VISIBILITY.get(url.pathname);
    const decision = decideRoute(url.pathname, visibility);

    if (decision.kind === "public") {
      return env.ASSETS.fetch(request); // Cloudflare edge, cacheable
    }
    if (decision.kind === "private") {
      // proxy to Scaleway, forwarding cookies (new Request copies headers); never cache
      const proxied = await fetch(new Request(env.ORIGIN + url.pathname + url.search, request));
      const out = new Response(proxied.body, proxied);
      out.headers.set("cache-control", "no-store");
      return out;
    }
    return new Response("Not found", { status: 404 });
  },
};
```
`worker/wrangler.toml`:
```toml
name = "bloob-spike-worker"
main = "src/index.ts"
compatibility_date = "2026-07-01"

[vars]
ORIGIN = "https://auth.bloob.haus"

[assets]
directory = "./public"
binding = "ASSETS"

[[kv_namespaces]]
binding = "VISIBILITY"
id = "<KV_NAMESPACE_ID from Task 0>"

[[routes]]
pattern = "spike.bloob.haus/*"
zone_name = "bloob.haus"
```
`worker/public/m/public-marble/index.html`:
```html
<!doctype html><html><head><meta charset="utf-8"><title>Public marble</title></head>
<body style="font-family:system-ui;padding:40px">
<h1>🌍 Public marble</h1><p>Anyone can see this — served fast from the edge.</p>
</body></html>
```

- [ ] **Step 7: Seed the KV visibility map + deploy**

```bash
cd ../bloob-haus-cloud/worker
npx wrangler kv key put --namespace-id <KV_NAMESPACE_ID> "/m/public-marble" "public"
npx wrangler kv key put --namespace-id <KV_NAMESPACE_ID> "/m/private-marble" "private"
npx wrangler deploy
```
Expected: deploy prints the `spike.bloob.haus/*` route bound to the Worker.

- [ ] **Step 8: Commit**

```bash
cd ../bloob-haus-cloud
git add worker && git rm -r _spike-worker
git commit -m "feat(worker): KV-driven public(edge)/private(proxy) routing on spike.bloob.haus"
```

---

### Task 6: End-to-end verification + throwaway teardown

**Files:**
- Modify: `../bloob-haus-cloud/NOTES-infra.md` (record the passing E2E results)

**Interfaces:**
- Consumes: everything. Produces: a proven spike + a clean repo.

- [ ] **Step 1: Verify the PUBLIC marble is fast and needs no auth**

```bash
curl -sS https://spike.bloob.haus/m/public-marble
curl -sS -D - -o /dev/null https://spike.bloob.haus/m/public-marble | grep -i "cf-cache-status\|cache-control"
```
Expected: prints the `🌍 Public marble` HTML with **no** cookie required; served from the edge.

- [ ] **Step 2: Verify the PRIVATE marble blocks an anonymous visitor**

```bash
curl -sS -o /dev/null -w "%{http_code} %{redirect_url}\n" https://spike.bloob.haus/m/private-marble
```
Expected: `302 https://auth.bloob.haus/login` — the Worker proxied to the origin, the origin found no session, and redirected to login.

- [ ] **Step 3: Verify the PRIVATE marble is served after login (the whole point)**

In a browser (fresh profile): visit `https://spike.bloob.haus/m/private-marble` → redirected to login → "Sign in with Google" → land back on `https://spike.bloob.haus/m/private-marble`.
Expected: the `🔒 Private marble` page renders **your email**, at the **same-looking URL** as the public one — proving the session cookie set on `auth.bloob.haus` round-tripped through the Worker at `spike.bloob.haus` to the Scaleway origin. Record PASS in `NOTES-infra.md`.

- [ ] **Step 4: Confirm same-looking URLs + no private caching**

```bash
curl -sS -D - -o /dev/null https://spike.bloob.haus/m/private-marble | grep -i "cache-control"
```
Expected: `cache-control: no-store` on the private path; both marbles live under identical `spike.bloob.haus/m/<slug>` shape.

- [ ] **Step 5: Confirm production is untouched**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://bloob.haus
curl -sS -o /dev/null -w "%{http_code}\n" https://leons.bloob.haus
```
Expected: both `200` — the spike added only `auth.` and `spike.` subdomains; live sites are unaffected.

- [ ] **Step 6: Commit the passing spike**

```bash
cd ../bloob-haus-cloud
git add NOTES-infra.md
git commit -m "test: V1 spike passes end-to-end — public edge + private auth-gated across the proxy boundary"
```

---

## Self-Review

**Spec coverage** (against the phase-3 V1 spike + 2026-07-07 refinements):
- "signs in with Google (Better Auth on Scaleway)" → Task 3. ✓
- "one public marble, served fast from Cloudflare's edge" → Task 5 (ASSETS binding) + Task 6 Step 1. ✓
- "one private marble → Worker sees `private` → proxies to Scaleway → checks the session cookie" → Tasks 4 + 5 + Task 6 Steps 2–3. ✓
- "Same-looking URLs" → both at `spike.bloob.haus/m/<slug>`; Task 6 Step 4. ✓
- "highest-risk piece: login session surviving the proxy boundary" → de-risked first in Task 1, realized in Tasks 3–5, verified in Task 6 Step 3. ✓
- Safe default = private (open question #4 posture) → `decideRoute` fail-closed, Task 5 Steps 2/4. ✓
- Centralized auth, no wildcard redirect URIs (2026-07-07 note) → single redirect URI on `auth.bloob.haus`, Task 0 Step 3. ✓
- Parent-domain cookie (`.bloob.haus`) → Task 3 Step 2, verified Task 3 Step 6. ✓
- Existing sites untouched → new subdomains only; Task 6 Step 5. ✓
- **Deliberately out of scope** (documented simplifications, not gaps): Object Storage content source, build→KV visibility sync (oq#4), build trigger (oq#5), subdomain auto-provisioning, `/api/render`, GitHub provider, account linking — all deferred per the phase-3 doc's "Out of scope".

**Placeholder scan:** `<INSTANCE_ID>`, `<CONTAINER_ID>`, `<NS_ID>`, `<KV_NAMESPACE_ID>`, `<password>` are **runtime-generated identifiers recorded in `NOTES-infra.md`**, not unfilled logic — each has an exact command that produces it. No `TODO`/`add error handling`/`write tests for the above` placeholders remain; all code and test bodies are complete.

**Type consistency:** `decideRoute(path: string, visibility: string \| null): RouteDecision` is used identically in `router.ts`, `router.test.ts`, and `index.ts`. `Env` (`VISIBILITY`, `ASSETS`, `ORIGIN`) matches `wrangler.toml` bindings. `auth.api.getSession({ headers })` is used the same way in Task 4 as configured in Task 3. Origin route `/m/[slug]` path matches the Worker's proxied `/m/<slug>` and the KV keys `"/m/public-marble"`/`"/m/private-marble"`.
