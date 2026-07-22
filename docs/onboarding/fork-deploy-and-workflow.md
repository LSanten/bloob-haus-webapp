# Fork, Deploy, and Work Day-to-Day

This covers standing up your site once, and the rhythm of working with it after: pulling in
improvements to the builder, and (optionally) sending your improvements back.

**Prerequisite:** you've read [`prepare-your-vault.md`](prepare-your-vault.md) and your vault has a
`_bloob-settings.md`.

---

## Part A — One-time setup

### 1. Fork this builder repo

Fork `bloob-haus-webapp` to your own GitHub account. This fork is *yours*: it holds your site config
(`sites/yourname.yaml`) and your theme (`themes/yourname/` — or a theme you were handed). Your **content**
stays in a separate repo (your vault).

Clone your fork locally and install:

```bash
git clone https://github.com/<you>/bloob-haus-webapp.git
cd bloob-haus-webapp
npm install
```

### 2. Point the builder at your vault

Copy the annotated template and fill it in:

```bash
cp sites/_template.yaml sites/yourname.yaml
```

Edit `sites/yourname.yaml` — set your deployed URL, your content repo, and your theme. The template
explains every field. (For the full list of features and settings, it links to
[`../architecture/settings-registry.md`](../architecture/settings-registry.md).)

### 3. Run it locally

Local dev reads your vault straight from a **folder on your computer** — no GitHub token, no clone,
nothing to configure. Just point the builder at your vault folder:

```bash
node scripts/dev-local.js --site=yourname --content=../your-vault-folder
```

Open the local URL it prints. If your notes show up as pages, the hard part is over.

> **Why no token?** `dev-local.js` reads the local folder you pass to `--content=`. A GitHub token is
> only needed by the *automated cloud build* (`build-site.js`), which runs with no local folder
> available and so clones your vault from GitHub instead. That token lives in the deploy environment
> (see Part A step 5), never on your laptop for dev.

> Iterating on one page? Add `--page=<path-in-vault>` to preprocess just that file — much faster. See
> the README's "Fast single-file iteration" section.

### 4. Get an Obsidian authoring experience (optional but recommended)

Install the **Bloob Haus Obsidian plugin** so frontmatter like `date_created` / `date_updated` and
shape helpers are written for you as you work. It's distributed via **BRAT** (Beta Reviewers Auto-update
Tool):

1. In Obsidian, install the community plugin **BRAT**.
2. BRAT → "Add beta plugin" → `LSanten/bloob-haus-obsidian-plugin`.
3. Enable the Bloob Haus plugin in Obsidian's community-plugins list.

### 5. Deploy

Bloob Haus sites are static and deploy to **Cloudflare Pages**. There are two hosting models, and they
have *different setup steps that don't mix*. Settle which one you're on before you touch Cloudflare:

| | **Model 1 — self-serve** | **Model 2 — hosted by a maintainer** |
|---|---|---|
| Your URL | your own domain / `*.pages.dev` | `yourname.bloob.haus` |
| Cloudflare account | **yours** | the **maintainer's** |
| Who builds the site | Cloudflare (Connect to Git) | **your own GitHub Actions** |
| Connect Pages to Git? | **yes** | **no — never** |
| Rebuild on content change | Cloudflare **Deploy Hook** | **`repository_dispatch`** from your vault |

> **If a maintainer set up a subdomain for you, you are on Model 2.** Don't follow Model 1's
> "Connect to Git" step — it would build the site a second time, from the wrong account, and fight
> your Actions workflow. Record which model you're on in your `docs/collaborators/collaborating.md`
> ("Your setup at a glance") so your AI assistant stops guessing.

**Model 1 — You host it yourself (self-serve).**
In the Cloudflare dashboard: **Pages → Create → Connect to Git → your fork**. Set the build command
and output directory to match this repo (see the repo's build scripts / existing Pages projects for the
exact values), and add your `GITHUB_TOKEN` (to read your vault) as an environment variable. Point a
subdomain or custom domain at the Pages project. Every push to your fork rebuilds; to rebuild when your
*vault* changes, add a Cloudflare **Deploy Hook** and call it from your vault repo (a small GitHub
Action on push).

**Model 2 — Someone hosts you on their `bloob.haus` zone (collaborator).**
Your fork **builds the site in its own GitHub Actions** and then deploys the finished `_site/` to the
maintainer's Cloudflare. The build logs and the whole process stay on your side; the maintainer owns
only the hosting. **If you're a collaborator, this is your path — see
[`../collaborators/`](../collaborators/) for the workflow template and the kit setup.**

Model 2 has two repos to wire up, and it is easy to think the other person is doing your half:

**In your fork** — the maintainer gives you `.github/workflows/deploy-<yourname>.yml` and the Cloudflare
values; you supply the token to your own vault:

| Secret | Who creates it |
|---|---|
| `CLOUDFLARE_API_TOKEN` | **maintainer** — a dedicated, revocable token for *their* account |
| `CLOUDFLARE_ACCOUNT_ID` | **maintainer** |
| `CONTENT_REPO_TOKEN` | **you** — a PAT that can *read* your vault repo |

> **Add them under Settings → Secrets and variables → *Actions*.** The sibling **Agents** tab looks
> identical and is for GitHub's Copilot cloud agent — secrets added there are invisible to workflow
> runs, and you get a confusing failure where `${{ secrets.X }}` is silently empty.

Whoever adds them needs **admin** on the fork. If the maintainer is doing it for you, they can set the
Cloudflare values without either of you ever putting the token in a message:

```bash
gh secret set CLOUDFLARE_API_TOKEN -R <you>/bloob-haus-webapp   # prompts, input hidden
```

**In your vault repo** — so pushing a note rebuilds the site. Add a workflow that fires a
`repository_dispatch` at your fork on push to `main`:

```yaml
# .github/workflows/trigger-deploy.yml  (in your VAULT repo)
name: Trigger Deploy
on:
  push:
    branches: [main]
    paths-ignore: ['.github/**', 'README.md']
jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X POST \
            -H "Accept: application/vnd.github+json" \
            -H "Authorization: Bearer ${{ secrets.WEBAPP_TRIGGER_TOKEN }}" \
            https://api.github.com/repos/<you>/bloob-haus-webapp/dispatches \
            -d '{"event_type":"deploy-<yourname>"}'
```

`WEBAPP_TRIGGER_TOKEN` is **yours to create**: a fine-grained PAT with **Contents: write** on your fork.
The `event_type` must match the `repository_dispatch: types:` in your fork's deploy workflow.

**Checking it worked:** the run appears in **your fork's** Actions tab, not the maintainer's. You can
also trigger it by hand from there (`workflow_dispatch`) before any content exists.

---

## Part B — Working day-to-day

### Pulling improvements from the builder

The builder repo keeps improving (new shapes, fixes, features). To pull those into your fork, add the
original as an `upstream` remote once:

```bash
git remote add upstream https://github.com/LSanten/bloob-haus-webapp.git
```

Then, whenever you want updates:

```bash
git fetch upstream
git merge upstream/main
git push
```

> **Important:** the exact remote layout and the rules about which direction is safe to push differ by
> setup, and getting this wrong can overwrite someone's repo. The authoritative rules live in the
> repo's root [`CLAUDE.md`](../../CLAUDE.md) under **"Git Remotes"**. Read that section before pushing
> anything you're unsure about. In short: push to *your own* fork freely; **never** `git push upstream
> main`.

### Sending your improvements back (pull requests)

If you improve something shared — a pipeline script, a fix in `lib/`, a new shape, a doc — open a
**pull request** from your fork back to `LSanten/bloob-haus-webapp`. PRs are the one and only way shared
changes flow upstream; you won't be given direct write access, and that's deliberate — it keeps the
shared builder safe and every change reviewable.

**Keep shared and personal changes in separate commits.** A commit that touches shared infrastructure
(`lib/`, `scripts/`, `themes/_base/`, `tests/`) should not also touch your personal files
(`themes/yourname/`, `sites/yourname.yaml`). This is what makes your good ideas cheap to cherry-pick
upstream. The root [`CLAUDE.md`](../../CLAUDE.md) explains the commit-hygiene rule in full.

---

## Troubleshooting first-build issues

| Symptom | Likely cause |
|---|---|
| Pages missing | File is filtered by your publish mode (blocklist tag / missing `publish: true`). See [`prepare-your-vault.md`](prepare-your-vault.md) §5. |
| Images broken | Filename collision across folders, or an image over the 25 MB hard limit. See [`prepare-your-vault.md`](prepare-your-vault.md) §4. |
| Wrong/doubled URLs | Don't use Eleventy `pathPrefix` for subpath mounting — a known gotcha. |
| Page has no banner/icon | The page's `bloob-shape:` isn't in a registry, or no default image exists — falls back to the theme default. See [`../architecture/shapes.md`](../architecture/shapes.md). |

For anything deeper, the architecture docs in [`../architecture/`](../architecture/) are the reference.
