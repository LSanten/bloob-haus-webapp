# Implementation Plan: Migrate to Cloudflare (+ GitHub Actions)

**Purpose:** Move hosting from Vercel to Cloudflare Pages, DNS from Porkbun to Cloudflare, builds from Vercel to GitHub Actions  
**Created:** February 16, 2026  
**Status:** ✅ CORE COMPLETE (DNS propagating, Vercel decommission pending)  
**Phase:** 2.6 (after templatization, before Phase 3 webapp)  
**Estimated effort:** 5–8 hours total  
**Depends on:** Plan A: Templatize the Builder (recommended but not strictly required)  
**Prerequisite for:** Deploying marbles or any second site

---

## Summary of Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Public site hosting | **Cloudflare Pages** | Unlimited bandwidth free, no surprise bills, global CDN, supports custom domains |
| DNS provider | **Cloudflare DNS** (Porkbun stays as registrar) | Integrated with Pages, CDN proxy, DDoS protection, wildcard support, CNAME flattening |
| Build runner | **GitHub Actions** | Free for this usage, already integrated with repos, no Docker needed, native Node.js support |
| Private content hosting | **Deferred to Phase 3** — Scaleway Object Storage when auth is needed | No need to set up Scaleway until private content features are built |
| Domain registrar | **Keep Porkbun** | Only changing nameservers, not transferring the domain. Porkbun remains registrar for bloob.haus |

---

## Architecture: Before and After

### Current (Vercel)

```
Push to buffbaby repo
  → Vercel webhook fires
  → Vercel clones bloob-haus-webapp, runs npm run build
  → Vercel serves _site/ at buffbaby.bloob.haus
  → DNS: Porkbun CNAME → cname.vercel-dns.com

Push to bloob-haus-webapp repo
  → Vercel auto-rebuilds and redeploys
```

### After (Cloudflare + GitHub Actions)

```
Push to buffbaby content repo
  → GitHub Actions workflow in bloob-haus-webapp fires (via repository_dispatch)
  → Actions: checkout builder + content, npm run build:buffbaby
  → Actions: deploy _site/ to Cloudflare Pages via wrangler
  → Cloudflare serves at buffbaby.bloob.haus (global CDN)
  → DNS: Cloudflare manages bloob.haus zone

Push to bloob-haus-webapp repo
  → GitHub Actions rebuilds all configured sites (or just the ones that changed)
```

### For Multiple Sites

```
Push to buffbaby repo  → Actions → build:buffbaby → deploy to CF Pages project "buffbaby"
Push to marbles repo   → Actions → build:marbles  → deploy to CF Pages project "marbles"
Push to builder repo   → Actions → rebuild all sites (optional, or manual trigger)
```

Each site is a separate Cloudflare Pages project. Wildcard DNS (`*.bloob.haus`) routes each subdomain to the right project.

---

## Implementation Steps

### Step C1: Set Up Cloudflare Account and Add Domain (30 minutes)

**Tasks:**

- [x] **C1.1** Create a Cloudflare account at https://dash.cloudflare.com (free tier)
- [x] **C1.2** In Cloudflare dashboard, click "Add a Site" → enter `bloob.haus`
- [x] **C1.3** Select the **Free** plan
- [x] **C1.4** Cloudflare will scan your existing DNS records automatically. Verify it found:
  - `buffbaby` CNAME → `cname.vercel-dns.com` (this will be changed later)
  - Any other records you have (MX, TXT, etc.)
- [x] **C1.5** Cloudflare gives you two nameservers. Note them down:
  ```
  dimitris.ns.cloudflare.com
  kara.ns.cloudflare.com
  ```
- [x] **C1.6** ~~Do NOT change nameservers at Porkbun yet~~ — Done in C4

**Success criteria:** Cloudflare account exists, `bloob.haus` is added (pending nameserver change).

---

### Step C2: Create Cloudflare Pages Project for Buffbaby (1 hour)

**Tasks:**

- [x] **C2.1** In Cloudflare dashboard → Pages → Create a project
- [x] **C2.2** Choose **"Direct Upload"** method (not Git integration — we'll deploy via GitHub Actions + wrangler CLI)
- [x] **C2.3** Name the project: `buffbaby` (assigned URL: `buffbaby-f5k.pages.dev`)
- [x] **C2.4** Do an initial manual deploy to create the project (drag-and-drop of _site/, 180 MB):
  ```bash
  # Locally, build the site first
  npm run build:buffbaby

  # Install wrangler CLI
  npm install -g wrangler

  # Login to Cloudflare
  wrangler login

  # Deploy
  wrangler pages deploy _site --project-name=buffbaby
  ```
- [x] **C2.5** Verify the site works at `buffbaby-f5k.pages.dev`
- [x] **C2.6** Add custom domain `buffbaby.bloob.haus` in Cloudflare Pages project settings
- [x] **C2.7** Note the Cloudflare Pages project ID and account ID (needed for GitHub Actions)

**Success criteria:** Buffbaby site is accessible at `buffbaby.pages.dev` (the default Cloudflare URL).

---

### Step C3: Set Up GitHub Actions Workflow (2–3 hours)

**Goal:** Automated builds triggered by content pushes, deploying to Cloudflare Pages

#### C3a: Create the Build-and-Deploy Workflow

- [x] **C3.1** Create `.github/workflows/deploy-buffbaby.yml` in the `bloob-haus-webapp` repo:

```yaml
name: Deploy Buffbaby

on:
  # Trigger when builder repo changes
  push:
    branches: [main]

  # Trigger from content repo webhook (repository_dispatch)
  repository_dispatch:
    types: [deploy-buffbaby]

  # Allow manual trigger
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout builder repo
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build site
        run: npm run build:buffbaby
        env:
          GITHUB_TOKEN: ${{ secrets.CONTENT_REPO_TOKEN }}
          SITE_NAME: buffbaby

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy _site --project-name=buffbaby
```

- [x] **C3.2** Add secrets to the `bloob-haus-webapp` GitHub repo settings:
  - `CONTENT_REPO_TOKEN` — GitHub Personal Access Token
  - `CLOUDFLARE_API_TOKEN` — Cloudflare API token with Pages edit permissions
  - `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account identifier

#### C3b: Create Webhook from Content Repo to Builder Repo

- [x] **C3.3** In the `buffbaby` content repo, set up a webhook that triggers the builder:

  **Option A: GitHub Actions workflow in content repo** (simpler):
  Create `.github/workflows/trigger-build.yml` in the `buffbaby` content repo:
  ```yaml
  name: Trigger Site Build

  on:
    push:
      branches: [main]

  jobs:
    trigger:
      runs-on: ubuntu-latest
      steps:
        - name: Trigger builder
          run: |
            curl -X POST \
              -H "Accept: application/vnd.github.v3+json" \
              -H "Authorization: token ${{ secrets.BUILDER_REPO_TOKEN }}" \
              https://api.github.com/repos/leonsanten/bloob-haus-webapp/dispatches \
              -d '{"event_type":"deploy-buffbaby"}'
  ```

  Add `BUILDER_REPO_TOKEN` secret to the buffbaby repo (a GitHub PAT with `repo` scope for the builder repo).

  **Option B: GitHub webhook** (current approach, adapted):
  In buffbaby repo settings → Webhooks, point to a GitHub repository dispatch URL instead of Vercel. This requires a small intermediary (like a Cloudflare Worker or just Option A above).

  **Recommendation:** Option A — it's simpler and stays within GitHub.

#### C3c: Multi-Site Workflow (for when marbles is ready)

- [ ] **C3.4** Create `.github/workflows/deploy-marbles.yml` (same pattern, different site name and project):
  ```yaml
  name: Deploy Marbles
  on:
    repository_dispatch:
      types: [deploy-marbles]
    workflow_dispatch:
  jobs:
    build-and-deploy:
      # Same steps, but:
      #   SITE_NAME: marbles
      #   command: pages deploy _site --project-name=marbles
  ```

- [x] **C3.5** Create a "rebuild all" workflow triggered on builder repo push:
  ```yaml
  name: Rebuild All Sites
  on:
    push:
      branches: [main]
      paths:
        - 'themes/**'
        - 'scripts/**'
        - 'lib/**'
        - 'eleventy.config.js'
  jobs:
    rebuild:
      strategy:
        matrix:
          site: [buffbaby, marbles]
      steps:
        # Same build-and-deploy steps for each site in the matrix
  ```

**Success criteria:** Push to buffbaby content repo → GitHub Actions builds → deploys to Cloudflare Pages. Manual `workflow_dispatch` also works.

---

### Step C4: DNS Migration — Porkbun to Cloudflare (1 hour)

**This is the critical cutover step. Do it during low-traffic hours.**

#### C4a: Preparation (before changing nameservers)

- [x] **C4.1** In Cloudflare, verify all existing DNS records are present:
  - The `buffbaby` CNAME (will be auto-managed by Cloudflare Pages once project is linked)
  - Any wildcard records (`*`)
  - Any MX records (email), TXT records (SPF, DKIM, verification), etc.
  - If unsure, run `dig bloob.haus ANY` and `dig buffbaby.bloob.haus ANY` to see current records

- [x] **C4.2** ~~Lower TTL~~ — Skipped, proceeded directly

- [x] **C4.3** Verify the Cloudflare Pages custom domain for `buffbaby.bloob.haus` is configured

#### C4b: The Switch

- [x] **C4.4** In Porkbun → Domain Management → `bloob.haus` → Authoritative Nameservers:
  - Changed FROM: `curitiba/fortaleza/maceio/salvador.ns.porkbun.com`
  - Changed TO: `dimitris.ns.cloudflare.com` and `kara.ns.cloudflare.com`

- [ ] **C4.5** Wait for propagation. Check status:
  ```bash
  # Check if Cloudflare nameservers are active
  dig NS bloob.haus

  # Check if buffbaby resolves correctly
  dig buffbaby.bloob.haus
  ```
  Typically takes 1-24 hours, often under 1 hour.

- [ ] **C4.6** Cloudflare dashboard will show the domain as "Active" once nameservers propagate

#### C4c: Verification

- [ ] **C4.7** Verify `buffbaby.bloob.haus` loads correctly via Cloudflare
- [ ] **C4.8** Verify HTTPS works (Cloudflare auto-provisions SSL certificates)
- [ ] **C4.9** Verify Cloudflare CDN is working: check response headers for `cf-ray` and `server: cloudflare`
- [ ] **C4.10** Test a content push → GitHub Actions → Cloudflare deploy cycle end-to-end

#### C4d: Set Up Wildcard DNS for Future Sites

- [ ] **C4.11** In Cloudflare DNS, add a wildcard CNAME:
  ```
  Type: CNAME
  Name: *
  Target: buffbaby.bloob.haus (or a Cloudflare Pages catch-all)
  Proxy: Yes (orange cloud)
  ```
  Note: Wildcard custom domains on Cloudflare Pages require the domain to be on Cloudflare DNS (which it now is). Each new site (marbles, etc.) would get its own custom domain configured in its Cloudflare Pages project, and Cloudflare DNS routes it automatically.

**Success criteria:** `buffbaby.bloob.haus` loads via Cloudflare. DNS is managed in Cloudflare. Wildcard routing is prepared for future sites.

---

### Step C5: Decommission Vercel (30 minutes)

**Only do this after C4 is verified and stable (wait at least 24-48 hours).**

- [ ] **C5.1** Remove the Vercel deploy hook webhook from the buffbaby GitHub repo
- [ ] **C5.2** Remove `vercel.json` from the bloob-haus-webapp repo
- [ ] **C5.3** In Vercel dashboard, remove the custom domain `buffbaby.bloob.haus`
- [ ] **C5.4** Delete or archive the Vercel project
- [ ] **C5.5** Remove Vercel-specific environment variables from any documentation
- [ ] **C5.6** Update `docs/CLAUDE_CONTEXT.md` — deployment is now Cloudflare Pages via GitHub Actions
- [ ] **C5.7** Update `docs/implementation-plans/ROADMAP.md` — hosting evolution: "Current: Cloudflare Pages"
- [ ] **C5.8** Update `docs/implementation-plans/DECISIONS.md`:
  - Decision: Migrate from Vercel to Cloudflare Pages
  - Rationale: Unlimited bandwidth, no surprise bills, EU-friendly CDN, wildcard subdomains, prepares for multi-site architecture

**Success criteria:** Vercel is fully decommissioned. All documentation reflects Cloudflare as the hosting platform.

---

### Step C6: Documentation and Cleanup (30 minutes)

- [ ] **C6.1** Update `README.md`:
  - Build and deploy instructions
  - How to add a new site (create Cloudflare Pages project, add workflow, add site config)
  - Environment variables / secrets needed

- [ ] **C6.2** Document the "add a new site" process:
  ```
  1. Create sites/{name}.yaml in builder repo
  2. Create (or reuse) a theme in themes/
  3. Create Cloudflare Pages project via wrangler or dashboard
  4. Add deploy workflow: .github/workflows/deploy-{name}.yml
  5. Configure content repo webhook (trigger-build.yml)
  6. Add custom domain in Cloudflare Pages
  7. First deploy: npm run build:{name} locally, wrangler pages deploy
  ```

- [ ] **C6.3** Document secrets needed across repos:
  | Secret | Where | Purpose |
  |--------|-------|---------|
  | `CONTENT_REPO_TOKEN` | bloob-haus-webapp repo | Clone private content repos |
  | `CLOUDFLARE_API_TOKEN` | bloob-haus-webapp repo | Deploy to Cloudflare Pages |
  | `CLOUDFLARE_ACCOUNT_ID` | bloob-haus-webapp repo | Cloudflare account identifier |
  | `BUILDER_REPO_TOKEN` | Each content repo | Trigger builder via repository_dispatch |

**Success criteria:** A new site can be added by following documentation, without needing to remember undocumented steps.

---

## Cost Summary

| Service | Cost | Notes |
|---------|------|-------|
| Cloudflare Pages (free tier) | **€0/month** | Unlimited bandwidth, 500 builds/month, unlimited sites |
| Cloudflare DNS (free tier) | **€0/month** | Full DNS management for bloob.haus |
| GitHub Actions (free tier) | **€0/month** | 2,000 minutes/month for private repos, unlimited for public |
| Porkbun domain registration | **~€10/year** | Already paying this, no change |
| **Total** | **€0/month** | Same as current Vercel cost, but with better bandwidth safety |

---

## Estimated Total Time

| Step | Estimated Hours |
|------|-----------------|
| C1: Cloudflare account + domain | 0.5 |
| C2: Cloudflare Pages project | 1 |
| C3: GitHub Actions workflows | 2–3 |
| C4: DNS migration | 1 |
| C5: Decommission Vercel | 0.5 |
| C6: Documentation | 0.5 |
| **Total** | **5.5–6.5 hours** |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| DNS propagation downtime | Lower TTL in advance; keep Vercel running until Cloudflare is confirmed working |
| Cloudflare Pages build limits (500/month) | We're not using CF Pages builds — we build in GitHub Actions and do "direct upload". The 500 limit is for CF's own build system, which we bypass |
| GitHub Actions minutes | Free tier has 2,000 min/month for private repos. Each build takes ~2–3 minutes. Even 20 builds/day = 1,200 min/month. Well within limits |
| Secrets management | All secrets in GitHub repo settings, not in code. `GITHUB_TOKEN` → renamed to `CONTENT_REPO_TOKEN` to avoid confusion with GitHub's built-in token |

---

## Future: Adding Scaleway (Phase 3+)

When you need private content hosting or the webapp, add Scaleway alongside Cloudflare:

```
Public content:   Cloudflare Pages (unchanged)
Private content:  Scaleway Object Storage (new, EU-hosted)
Webapp/API:       Scaleway Serverless Container (new)
Builds:           GitHub Actions (unchanged) or Scaleway Serverless Jobs (for webapp-triggered builds)
```

The build pipeline gains a second deployment target:
```yaml
# In GitHub Actions workflow, after building:
- name: Deploy public to Cloudflare
  run: wrangler pages deploy _site --project-name=${{ matrix.site }}

- name: Deploy private to Scaleway (if private content exists)
  if: steps.build.outputs.has_private == 'true'
  run: aws s3 sync _site-private/ s3://private-${{ matrix.site }}/ --endpoint-url ${{ secrets.SCALEWAY_S3_ENDPOINT }}
```

Nothing in Plan B prevents this addition. The Cloudflare + GitHub Actions foundation stays.

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [Plan A: Templatize Builder](2026-02-16_plan-a-templatize-builder.md) | Builder refactor (do before this) |
| [DECISIONS.md](DECISIONS.md) | Log migration decisions |
| [ROADMAP.md](ROADMAP.md) | Update hosting evolution |
| [Multi-Index Search Architecture](phases/phase-3/2026-02-08%20multi%20index%20search%20architecture.md) | Future Scaleway integration for private content |
| [Hosting Research](../../bloobhaus-obsidian/Bloob%20Haus%20Webapp/Research/2026-01-29%20Claude%20Responses%20to%20my%20questions.md#8-hosting-cloudflare-vs-vercel) | Original Vercel vs Cloudflare analysis |