# `_bloob-settings.md` — Vault-Level Publishing Config

**Status:** Implemented — config loader now merges _bloob-settings.md
**Created:** 2026-02-26
**Related:** [URL Naming & Multi-Site Architecture](../phase-3/2026-02-25_url-naming-and-multi-site-architecture.md)

---

## Problem

Publishing settings are currently split across two places:

1. **`sites/<name>.yaml`** in the bloob-haus-webapp repo — infra + author settings mixed together
2. **The vault itself** — has no way to declare its own publishing preferences

This means:
- Vault authors can't control their own settings from Obsidian
- Adding a new site requires editing the webapp repo
- Settings like permalink strategy, visualizers, and exclusion rules are disconnected from the content they apply to
- There's no single source of truth the author can see and edit

## Proposal

A `_bloob-settings.md` file at the root of every Obsidian vault that publishes through Bloob Haus. YAML frontmatter holds the config. The markdown body is freeform — can be a reminder to the author, documentation, whatever.

The `_` prefix ensures it sorts to the top and is conventionally ignored by most vault structures. The `.md` extension means Obsidian renders it natively — the author can read and edit the YAML frontmatter in Obsidian's Properties panel.

### Example — buffbaby vault

```markdown
---
# ── Bloob Haus Publishing Settings ──

subdomain: buffbaby
# mount_path: (omit for root — buffbaby.bloob.haus/)

repo: LSanten/buffbaby

theme: warm-kitchen

icon: "[[icon.png]]"
favicon: "[[icon.png]]"

permalink_strategy: slugify

publish_mode: blocklist
blocklist_tag: not-for-public
exclude_files: []

visualizers:
  - checkbox-tracker
  - graph

features:
  search: true
  backlinks: true
  og_images: true
  tags: true
  rss: true

media:
  optimize: true
  formats: ["webp", "jpeg"]
  widths: [600, 1200]
---

# Bloob Haus Settings

This file configures how this vault is published to **buffbaby.bloob.haus**.

Edit the properties above in Obsidian to change publishing behavior.
Don't rename or move this file.
```

### Example — marbles vault (future separate repo)

```markdown
---
subdomain: leons
mount_path: marbles

repo: LSanten/marbles

theme: warm-kitchen

permalink_strategy: preserve-case

publish_mode: blocklist
blocklist_tag: private-marble-keep-from-public
exclude_files:
  - ALL

visualizers:
  - checkbox-tracker
  - graph
  - fridge-magnets

features:
  search: true
  backlinks: true
  og_images: true
  tags: true
  rss: true
---

# Bloob Haus Settings

Publishes to **leons.bloob.haus/marbles/**.
```

---

## What Goes Where

The goal: **vault authors own their publishing intent. The webapp repo owns infrastructure.**

| Setting | Lives in `_bloob-settings.md` (vault) | Lives in webapp infra |
|---------|---------------------------------------|----------------------|
| subdomain | ✅ | |
| mount_path | ✅ | |
| repo (GitHub) | ✅ | |
| theme | ✅ | |
| icon / favicon | ✅ | |
| permalink_strategy | ✅ | |
| publish_mode / blocklist | ✅ | |
| visualizers | ✅ | |
| features (search, rss, etc.) | ✅ | |
| media optimization settings | ✅ | |
| GitHub token | | ✅ (env var / secret) |
| Cloudflare project config | | ✅ (Cloudflare dashboard) |
| Build pipeline / CI config | | ✅ (GitHub Actions) |
| DNS / domain routing | | ✅ (Cloudflare) |

---

## How the Builder Uses It

1. **Clone step:** The builder still needs to know *which repo to clone* — this comes from the CI trigger (e.g., GitHub Actions on push to `LSanten/buffbaby`). The builder doesn't need `sites/<name>.yaml` for this.
2. **After clone:** The builder reads `_bloob-settings.md` from the vault root, parses the YAML frontmatter, and uses it to drive the entire preprocessing + build pipeline.
3. **`sites/<name>.yaml` becomes optional / infra-only:** It can still exist for overrides or infra settings that don't belong in the vault, but the vault's `_bloob-settings.md` is the primary config source.

### Merge precedence (if both exist)

```
_bloob-settings.md (vault)        ← author intent, primary
  ← sites/<name>.yaml (webapp)    ← infra overrides, secondary
```

---

## Open Questions — Need Further Thought

These settings are a first draft. Before implementing, we need to review:

- [ ] **Full settings audit** — go through every field in current `sites/*.yaml` files and decide: vault-owned or infra-owned?
- [ ] **Theme setting** — should this be in the vault? Pros: author picks their look. Cons: themes are a webapp-side concept and the vault author may not know what's available. *Current lean: yes, put it in the vault — the webapp can validate against available themes at build time.*
- [ ] **Multi-repo subdomain merging** — if two repos publish to the same subdomain in different folders (e.g., repo A → `leons.bloob.haus/marbles/`, repo B → `leons.bloob.haus/recipes/`), how do we handle collisions? For now: one repo per subdomain. Folder merge is a future concern. See [URL Naming doc](../phase-3/2026-02-25_url-naming-and-multi-site-architecture.md).
- [ ] **Subdomain verification** — for now `subdomain` is just a string. Future: OAuth-verified ownership so users can't claim someone else's subdomain. Note this in the file as a comment.
- [ ] **`site_url` vs `subdomain`** — should the vault declare a full URL (`https://buffbaby.bloob.haus`) or just the subdomain name (`buffbaby`)? Custom domains like `resources.esjp.org` need the full URL approach.
- [ ] **Vault name / display name** — should there be a `name: "Buff Baby Kitchen"` field for display purposes?
- [ ] **What triggers a build?** — if the settings file changes, does that trigger a rebuild of the whole site or just update config?
- [ ] **Validation** — what happens if `_bloob-settings.md` is missing, malformed, or has invalid values?

---

## Relationship to Multi-Site Architecture

This file is one piece of the larger multi-site puzzle documented in [URL Naming & Multi-Site Architecture](../phase-3/2026-02-25_url-naming-and-multi-site-architecture.md). Key connections:

- **`subdomain` + `mount_path`** together determine the URL root for the vault's content
- **Option C (hybrid)** from the URL doc is what this settings file naturally supports: `subdomain: leons` + `mount_path: marbles` → `leons.bloob.haus/marbles/`
- **Room-per-repo** is the current model. Each repo has its own `_bloob-settings.md`. Future folder-merge (multiple repos → one subdomain) would need a coordination layer above individual vault settings.

---

## Vault Repo Scaffolding

When the webapp (or Obsidian plugin) sets up a new vault repo for Bloob Haus, it should generate these files automatically:

### `.gitignore` (canonical template)

```
# Obsidian — keep settings, ignore volatile state
.obsidian/workspace.json
.obsidian/workspace-mobile.json
.trash/

# OS
.DS_Store
Thumbs.db
```

**Why keep `.obsidian/`:** The builder reads `.obsidian/app.json` for the attachment folder path. Plugin configs and settings may also be useful for future features (e.g., detecting which plugins the author uses).

**Why ignore `workspace.json`:** It changes every time the user switches panes — creates noisy commits with no value to the build.

### Build-time validation (future)

The builder should warn (not fail) when a vault repo is missing expected scaffolding:

| Check | Severity | Message |
|-------|----------|---------|
| `.gitignore` missing | warn | "No .gitignore found — workspace.json and .DS_Store will be committed" |
| `.obsidian/workspace.json` not in `.gitignore` | warn | "workspace.json is not gitignored — this creates noisy commits" |
| `_bloob-settings.md` missing | warn | "No _bloob-settings.md found — using defaults from sites/*.yaml" |
| `.obsidian/app.json` missing | info | "No Obsidian config found — assuming default attachment folder" |

This validation runs during the clone/preprocess step and logs to the build output. It's advisory, not blocking — a vault without a `.gitignore` still builds fine.

### Scaffolding command (future)

A CLI or webapp action that initializes a vault repo:

```
bloob init                          # interactive
bloob init --subdomain=marbles      # preset
```

Creates: `_bloob-settings.md`, `.gitignore`, and optionally a `media/` folder.

---

## Next Steps

1. ~~Create `_bloob-settings.md` in the buffbaby vault with current settings~~ ✅
2. ~~Update the builder to read `_bloob-settings.md` as primary config source~~ ✅ (2026-02-26)
3. ~~Migrate settings out of `sites/*.yaml` into vault files~~ ✅ (2026-02-26) — yaml now contains only infra settings (repo, branch, url)
4. ~~Debug buffbaby production issues (recipes listing empty)~~ ✅ Fixed: nested addCollection bug
5. Add build-time `.gitignore` validation as a warning
