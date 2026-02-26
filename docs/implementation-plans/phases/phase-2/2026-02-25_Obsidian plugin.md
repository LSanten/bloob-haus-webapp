# Obsidian Plugin & Magic Machine Sync — Implementation Plan

**Status:** Planning  
**Created:** 2026-02-25  
**Location:** `docs/implementation-plans/phases/phase-5/`

---

## Overview

This plan covers the Bloob Haus Obsidian plugin — a one-click "Publish to Bloob Haus" experience that abstracts GitHub entirely from the user. It also covers the **safe round-trip flow** where Magic Machines run server-side after a publish and write changes (e.g. YAML frontmatter updates) back to the local Obsidian vault without merge conflicts.

**Related:**
- [Magic Machines Architecture](../../architecture/magic-machines.md)
- [ROADMAP.md](../ROADMAP.md) — Phase 5+ planning

---

## Goals

1. Friend/early users can publish their Obsidian vault to Bloob Haus in under 5 minutes with zero GitHub knowledge
2. Magic Machines can safely edit markdown files on GitHub and sync changes back to Obsidian
3. The vault is never in a conflicted state — the plugin enforces a publish lock during the machine cycle
4. Data ownership is clear and consented to upfront

---

## User Types & Scope

This plan covers **Type A users only** — Obsidian users who want their vault published. Interface-only (Type B) users are out of scope here.

| User Type | Storage | Plugin Needed |
|-----------|---------|---------------|
| Type A — Obsidian users | GitHub repo (user-owned) | Yes — this plan |
| Type B — Interface-only | Scaleway | No |

---

## Architecture Summary

```
[Obsidian Plugin]
       │
       │  1. User clicks "Publish to Bloob Haus"
       ▼
[GitHub REST API]  ←── User's private repo (created on their account via OAuth)
       │
       │  2. GitHub Action fires
       ▼
[Bloob Haus Build Pipeline]
       │
       │  3. Build runs (Eleventy)
       │  4. Magic Machines run (if applicable)
       │  5. Job status written to repo (.bloob/job-status.json)
       ▼
[Plugin polls job status API]
       │
       │  6. Status: "complete" → pull changed files back into vault
       ▼
[Obsidian vault updated]
```

---

## Onboarding Flow (First Time)

The user should experience this as "creating a Bloob Haus account" — GitHub is invisible.

```
1. User installs plugin from Obsidian Community Plugins (or via BRAT for early users)
2. Plugin shows welcome screen: "Publish your garden to Bloob Haus"
3. User clicks "Connect Bloob Haus Account"
4. Browser opens → bloob.haus/connect
5. Page shows: "Sign in with GitHub to create your garden" (GitHub OAuth button)
6. User creates GitHub account if needed (GitHub's own flow)
7. GitHub OAuth completes → Bloob Haus receives OAuth token
8. Bloob Haus creates a private repo on the user's GitHub account:
   - Name: bloob-haus-garden (or user-chosen name)
   - Private: true
   - Initialized with a .bloob/config.yaml
9. Bloob Haus installs a GitHub App on the repo (for build triggers + write-back)
10. Browser redirects to bloob.haus/connect/success?token=xxx
11. Plugin receives token via deep link (obsidian://bloob-haus/auth?token=xxx)
12. Plugin stores token in local settings
13. Plugin shows: "✅ Your garden is ready. Click 'Publish' to go live."
```

**Privacy consent moment (step 8, shown on bloob.haus/connect):**
> "Your vault will be stored in a private GitHub repository that you own. Content marked `#private` will not appear on your published site, but it will exist on GitHub (Microsoft's servers). If you prefer full data sovereignty without GitHub, use our web editor instead."

---

## Publish Flow (Recurring)

```
1. User clicks "Publish to Bloob Haus" in Obsidian ribbon or command palette
2. Plugin checks: is a job already in progress? → show warning if yes, return
3. Plugin reads vault → assembles list of changed files (diff against last push SHA)
4. Plugin pushes changed files to GitHub via REST API (no git binary needed)
5. Plugin generates a job ID and stores it locally
6. Plugin sets jobInProgress = true in settings (persists across restarts)
7. Plugin shows status: "✨ Bloob Haus is building your garden..."
8. Plugin polls GET /api/jobs/{jobId} every 3 seconds
9. Status transitions: pending → building → machines_running → complete | failed
10. On complete:
    a. Plugin receives list of changed files from job result
    b. Plugin fetches each changed file from GitHub API
    c. Plugin writes updated content to vault via vault.modify()
    d. Plugin sets jobInProgress = false
    e. Plugin shows: "✅ Published! X files updated."
11. On failed:
    a. Plugin unlocks vault
    b. Shows error with "Retry" option
```

---

## Job Status API

A lightweight endpoint to track build + magic machine state. In early phases this can be implemented as a JSON file written into the repo itself — no external DB needed.

**File:** `.bloob/job-status.json` (committed to GitHub by the GitHub Action)

```json
{
  "jobId": "abc123",
  "status": "machines_running",
  "currentStep": "recipe-unit-extractor (2/3)",
  "startedAt": "2026-02-25T14:00:00Z",
  "completedAt": null,
  "changedFiles": []
}
```

**Status values:**

| Status | Meaning |
|--------|---------|
| `pending` | Push received, action queued |
| `building` | Eleventy build running |
| `machines_running` | Magic Machines processing files |
| `complete` | Done — changedFiles populated |
| `failed` | Error — message populated |

**Later phase:** Replace file-in-repo approach with a real API endpoint on Scaleway for lower latency and better error handling.

---

## Vault Locking

The lock prevents the user from pushing while a job is in progress, which would cause merge conflicts when Magic Machines write back to GitHub.

```typescript
// Stored in plugin settings (persists across Obsidian restarts)
interface PluginSettings {
  bloobHausToken: string;
  repoOwner: string;
  repoName: string;
  lastPushSHA: string;
  jobInProgress: boolean;
  currentJobId: string | null;
}
```

**UX during lock:**
- Ribbon icon changes to a spinner/lock state
- Status bar shows: "🔒 Magic machines working..."
- Publish command shows a notice instead of running
- If Obsidian is restarted mid-job, plugin resumes polling on load

**What the lock does NOT prevent:** Users can still edit files locally. The lock only blocks the *next push*. This is intentional — editing is fine, it's the push that needs to wait.

---

## File Pull (Writing Magic Machine Changes Back)

After a job completes, the plugin fetches only the files that were changed by Magic Machines and writes them into the vault using Obsidian's API. This is safer than git pull because Obsidian handles its internal cache correctly.

```typescript
async function pullChangedFiles(changedFiles: string[]) {
  for (const filePath of changedFiles) {
    // Fetch file content from GitHub API
    const content = await fetchFileFromGitHub(filePath);
    
    // Get existing vault file
    const file = this.app.vault.getAbstractFileByPath(filePath);
    
    if (file instanceof TFile) {
      // Update existing file — Obsidian reconciles its frontmatter cache
      await this.app.vault.modify(file, content);
    } else {
      // New file created by magic machine
      await this.app.vault.create(filePath, content);
    }
  }
}
```

**Why this matters for YAML frontmatter:** Obsidian caches frontmatter for its Properties panel. Using `vault.modify()` lets Obsidian update its internal cache correctly, rather than having files changed underneath it by git, which can cause "file modified externally" confusion and cache staleness.

---

## Implementation Phases

### Phase A — Plugin scaffold + auth (Est. 3–4 hrs)

- [ ] **A.1** Bootstrap plugin with [obsidian-sample-plugin](https://github.com/obsidianmd/obsidian-sample-plugin) template
- [ ] **A.2** Add ribbon icon + command palette entry "Publish to Bloob Haus"
- [ ] **A.3** Build settings tab (token storage, repo info, job status display)
- [ ] **A.4** Implement deep link handler (`obsidian://bloob-haus/auth?token=xxx`)
- [ ] **A.5** Build `bloob.haus/connect` onboarding page (webapp side)
- [ ] **A.6** GitHub OAuth flow on webapp → create private repo → install GitHub App → return token

**Early shortcut for friend users:** Hardcode a dev token for testing before the full OAuth flow is built. Remove before any wider release.

---

### Phase B — Push to GitHub (Est. 2–3 hrs)

- [ ] **B.1** Implement `pushVaultToGitHub()` using GitHub Contents API
  - No git binary needed — just REST API calls with base64 file content
  - Create/update files individually or use Git Trees API for batch push
- [ ] **B.2** Implement incremental push — diff against `lastPushSHA`, only push changed files
- [ ] **B.3** Implement vault lock (set `jobInProgress = true` before push)
- [ ] **B.4** Handle first push (no `lastPushSHA`) — push all publishable files
- [ ] **B.5** Respect publish filter — honor `#private` tags and blocklist config before pushing

---

### Phase C — Job status polling (Est. 2 hrs)

- [ ] **C.1** Implement `pollJobStatus(jobId)` — polls `.bloob/job-status.json` from GitHub API
- [ ] **C.2** Update status bar and ribbon icon during polling
- [ ] **C.3** Handle timeout (job takes >10 min → show error, unlock vault)
- [ ] **C.4** Handle failure states with retry option
- [ ] **C.5** On GitHub Actions side: write job status updates to `.bloob/job-status.json` at each stage

---

### Phase D — Magic Machine pull (Est. 2 hrs)

- [ ] **D.1** Implement `pullChangedFiles(changedFiles[])` using `vault.modify()`
- [ ] **D.2** Show diff summary to user: "Recipe Unit Extractor updated 12 files"
- [ ] **D.3** Handle new files created by magic machines (vault.create())
- [ ] **D.4** Unlock vault after successful pull
- [ ] **D.5** Handle edge case: file deleted by magic machine (warn user, don't auto-delete)

---

### Phase E — Polish & distribution (Est. 2 hrs)

- [ ] **E.1** Error handling for all API failure modes (rate limits, auth expiry, network)
- [ ] **E.2** Token refresh flow (GitHub tokens don't expire but app installations can be revoked)
- [ ] **E.3** Distribute via [BRAT](https://github.com/TfTHacker/obsidian42-brat) for friend users (no Obsidian store review needed)
- [ ] **E.4** Submit to Obsidian Community Plugins when ready for public (requires review process)

---

## GitHub Actions Integration

The existing build pipeline gains two new steps:

```yaml
# .github/workflows/build.yml additions

- name: Write job status - building
  run: |
    echo '{"status":"building","jobId":"${{ github.run_id }}"}' > .bloob/job-status.json
    git add .bloob/job-status.json && git commit -m "job: building" && git push

- name: Run magic machines
  run: node scripts/run-magic-machines.js
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

- name: Write job status - complete
  run: |
    CHANGED=$(git diff --name-only HEAD~1 HEAD | jq -R . | jq -s .)
    echo "{\"status\":\"complete\",\"changedFiles\":$CHANGED}" > .bloob/job-status.json
    git add . && git commit -m "job: complete" && git push
```

---

## Estimated Total Effort

| Phase | Estimate |
|-------|----------|
| A — Scaffold + auth | 3–4 hrs |
| B — Push to GitHub | 2–3 hrs |
| C — Job status polling | 2 hrs |
| D — Magic Machine pull | 2 hrs |
| E — Polish + distribution | 2 hrs |
| **Total** | **11–13 hrs** |

---

## Distribution Strategy & Community Plugin Approval

### BRAT — for early/friend users

[BRAT (Beta Reviewers Auto-update Tool)](https://github.com/TfTHacker/obsidian42-brat) is a community plugin already in the Obsidian store. It lets users install any GitHub-hosted plugin by pasting a repo URL — no manual file copying, no sideloading.

**User experience with BRAT:**
1. User installs BRAT from Community Plugins (one time, normal store install)
2. User opens BRAT settings → "Add Beta Plugin" → pastes `your-org/bloob-haus-obsidian-plugin`
3. Done — BRAT handles updates automatically whenever you push a new GitHub release

This is the right path for all friend/early users. Do not block the launch on Community Plugin Store approval.

### Community Plugin Store — for public launch

Submitting to the store is a PR to [obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases). No "networking" with Obsidian staff is needed — it's a purely PR-based process. However:

- **Wait times are long:** 4 weeks to 3+ months is common due to the small review team
- **Strategy:** Submit the PR early, keep shipping with BRAT, let approval happen in the background

### Framing for reviewer transparency

Obsidian reviewers will scrutinize any plugin that writes to the vault or makes external network calls. The key is accurate framing — this plugin is conceptually identical to a sync plugin:

| What reviewers might worry about | Accurate framing |
|----------------------------------|-----------------|
| "Arbitrary content written to vault" | Files come from the user's own GitHub repo, triggered by the user's own publish action |
| "Unknown server-side manipulation" | Magic Machines run on GitHub Actions in the user's repo — the plugin only pulls the result, like any sync tool |
| "External service dependency" | Analogous to Obsidian Sync, Obsidian Git, or any cloud-backed plugin |

**Required README disclosures (per Obsidian submission requirements):**
- Network requests are made to GitHub's API and to `bloob.haus`
- Server-side processing (Magic Machines) occurs on the user's own GitHub Actions
- What data leaves the vault and where it goes
- That the user's content is stored in a private GitHub repo they own

**The deep link / OAuth pattern** (`obsidian://bloob-haus/auth?token=xxx`) is the accepted approach for OAuth in Obsidian plugins and will not raise flags — multiple approved plugins use it.

---

## Open Questions

1. **Git Trees API vs individual file updates?** Trees API is faster for large vaults (one commit for many files) but more complex to implement. Start with individual file updates, optimize later.
2. **How granular should the publish filter be?** Current system uses blocklist tags. Should the plugin UI allow toggling per-file publish status visually?
3. **Magic machine approval step?** Should users review a diff before machine changes are written to vault? Noted as open in magic machines doc — recommend yes for Phase D+.
4. **Offline mode?** What happens if user publishes while offline? Queue the push, or show error?

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [Magic Machines Architecture](../../architecture/magic-machines.md) | Machine manifest format, status tracking |
| [ROADMAP.md](../ROADMAP.md) | Phase 5+ context |
| [DECISIONS.md](../DECISIONS.md) | Log plugin decisions here |
| [IDEAS.md](../IDEAS.md) | Magic machine approval UI, mobile publishing |
