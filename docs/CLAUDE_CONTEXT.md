# Bloob Haus - Claude Code Context

**Purpose:** Share this file at the start of each Claude Code session.  
**Last Updated:** February 3, 2026  
**Current Phase:** Phase 1 Complete, Phase 2 Planning

---

## Quick Status

| Milestone | Status |
|-----------|--------|
| Phase 1: Recipe Site | ✅ COMPLETE |
| Phase 1 Enhancements: Interactive checkboxes | ✅ COMPLETE |
| Phase 2: Enhanced Linking & API | 📋 PLANNING |

**🎉 LIVE SITE:** https://buffbaby.bloob.haus (Buff Baby Kitchen)

---

## What This Project Is

Bloob Haus transforms Obsidian markdown vaults into hosted static websites using Hugo.

**Phase 1 Achievement:** buffbaby.bloob.haus is live with Leon's recipes from a private GitHub repo.

---

## What's Working

✅ Full preprocessing pipeline  
✅ Hugo site with warm color theme  
✅ Auto-deployment on content updates  
✅ Custom domain with HTTPS  
✅ Git-based date tracking  
✅ Comment stripping for privacy  
✅ Clickable recipe cards  
✅ Auto-generated navigation  
✅ Interactive checkboxes with persistence  

**Build pipeline:**
```bash
npm run build    # Full build: clone → preprocess → hugo
```

**Deployment:**
- Push to `buffbaby` repo → auto-rebuild via webhook
- Push to `bloob-haus-webapp` repo → auto-redeploy site

---

## Project Structure

```
bloob-haus-webapp/
├── scripts/
│   ├── clone-content.js         ✅ Clones private GitHub repo
│   ├── preprocess-content.js    ✅ Orchestrates preprocessing
│   ├── build-site.js            ✅ Full build pipeline
│   └── utils/
│       ├── config-reader.js         ✅ Reads Obsidian config
│       ├── publish-filter.js        ✅ Dual-mode filtering
│       ├── file-index-builder.js    ✅ Filename-based URLs
│       ├── wiki-link-resolver.js    ✅ [[Links]] resolution
│       ├── markdown-link-resolver.js ✅ Standard links
│       ├── attachment-resolver.js   ✅ Image handling
│       ├── transclusion-handler.js  ✅ ![[Embed]] placeholders
│       ├── comment-stripper.js      ✅ Privacy protection
│       └── git-date-extractor.js    ✅ Last modified dates
│
├── hugo/
│   ├── content/                 ← Generated from preprocessing
│   ├── static/media/            ← Generated (images)
│   ├── config.yaml              ✅ Hugo configuration
│   ├── layouts/                 ✅ Hugo templates
│   └── assets/
│       ├── css/visualizers/     ✅ Visualizer styles
│       └── js/visualizers/      ✅ Visualizer scripts
│
├── content-source/              ← Cloned from GitHub (gitignored)
├── public/                      ← Hugo output (gitignored)
├── vercel.json                  ✅ Deployment config
└── docs/                        ✅ Documentation
```

---

## Key Features

### URL Structure
- **Slugs from FILENAME** - Stable URLs even when titles change
- **Folder-based URLs** - `/recipes/challah/`, `/resources/guide/`
- **Titles from first `#` heading** - Display only, preserves formatting

### Publishing Model (Dual Mode)
| Mode | Behavior | Config |
|------|----------|--------|
| **blocklist** (Leon's) | Publish all EXCEPT `#not-for-public` | Current setup |
| **allowlist** | Only publish if `publish: true` | Alternative |

### Link Resolution
- `[[Wiki Links]]` → Resolved to folder-based URLs
- `[text](file.md)` → Resolved to folder-based URLs
- Broken links → `<span class="broken-link">` (doesn't crash build)

### Privacy & Content
- **Comment Stripping** - Removes Obsidian `%% %%` and HTML `<!-- -->` comments
- **Git Date Tracking** - Extracts last modified dates for sorting
- **Tag Filtering** - Excludes files with `#not-for-public` tag

---

## Environment Variables

```bash
# Required in .env.local (local) and Vercel dashboard (production)
GITHUB_TOKEN=ghp_xxx              # GitHub PAT with repo scope
CONTENT_REPO=LSanten/buffbaby     # Private repo to clone
SITE_URL=https://buffbaby.bloob.haus

# Publishing configuration
PUBLISH_MODE=blocklist            # or "allowlist"
BLOCKLIST_TAG=not-for-public      # Tag that prevents publishing
```

---

## Build Pipeline Flow

```
GitHub (buffbaby) 
    ↓ clone-content.js
content-source/
    ↓ preprocess-content.js
    │  ├─ Strip comments (%% %% and <!-- -->)
    │  ├─ Filter (#not-for-public)
    │  ├─ Build index (filename → URL)
    │  ├─ Resolve [[wiki-links]]
    │  ├─ Resolve [text](file.md)
    │  ├─ Resolve images → /media/
    │  ├─ Handle transclusions
    │  └─ Extract git dates
hugo/content/ + hugo/static/media/
    ↓ hugo build
public/
    ↓ Vercel
buffbaby.bloob.haus ✅ LIVE
```

---

## Commands

```bash
# Full build pipeline
npm run build

# Local development (after running build)
npm run dev

# Individual steps (for debugging)
node scripts/clone-content.js
node scripts/preprocess-content.js
npx hugo -s hugo
```

---

## What to Do Next

Phase 1 is **COMPLETE**! Phase 2 is being planned.

**Phase 2 Focus:** Enhanced Linking & API Foundation
- JSON generation (`links.json`, `search-index.json`)
- Backlinks display
- Pre-build validation
- RSS feed

See `docs/implementation-plans/ROADMAP.md` for the full roadmap.

---

## Documentation Map

```
docs/
├── CLAUDE_CONTEXT.md           ← This file (quick orientation)
├── CHANGELOG.md                ← Session history & milestones
│
├── architecture/               ← How systems work
│   ├── visualizers.md          ← Read/display components
│   └── magic-machines.md       ← Write/transform AI tools
│
└── implementation-plans/
    ├── ROADMAP.md              ← Phase overview & priorities
    ├── DECISIONS.md            ← Architectural decision log
    ├── IDEAS.md                ← Future ideas parking lot
    │
    ├── _completed/             ← Finished plans (historical)
    │   └── phase-1-implementation-plan.md
    │
    └── phases/                 ← Active implementation plans
        ├── phase-2-linking-api.md
        └── 2026-02-03_recipe-scaling.md
```

**Naming conventions for new plans:**
- `YYYY-MM-DD_descriptive-name.md` for feature-specific plans

**External reference:** The Obsidian vault `bloobhaus-obsidian` contains the original vision docs including the Vicki engineering report.

---

*buffbaby.bloob.haus is LIVE and auto-updating!*
