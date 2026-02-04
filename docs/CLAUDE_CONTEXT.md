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
│   ├── layouts/
│   │   ├── _default/
│   │   │   ├── baseof.html      ✅ Base template
│   │   │   ├── single.html      ✅ Recipe pages
│   │   │   └── list.html        ✅ Recipe listings
│   │   └── partials/
│   │       ├── head.html        ✅ Meta tags + visualizer CSS
│   │       ├── nav.html         ✅ Auto-generated nav
│   │       ├── footer.html      ✅ Footer
│   │       └── scripts.html     ✅ Visualizer JS loader
│   └── assets/
│       ├── css/
│       │   ├── main.css             ✅ Template styling
│       │   └── visualizers/
│       │       └── checkbox-tracker.css  ✅ Checkbox visualizer
│       └── js/
│           └── visualizers/
│               └── checkbox-tracker.js   ✅ Checkbox visualizer
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

### UI Features
- **Clickable Recipe Cards** - Entire card is clickable, not just title
- **Auto-Generated Nav** - Detects all top-level sections automatically
- **First Heading Underline** - Visual separation on individual pages
- **Warm Color Theme** - Cozy design with Crimson Pro and Inter fonts
- **Interactive Checkboxes** - Clickable checkmarks with localStorage persistence
- **Floating Reset Button** - Appears when boxes checked, 60-sec undo window

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

## Deployment

### Auto-Rebuild Triggers
1. **Content updates:** Push to `buffbaby` repo → webhook → Vercel rebuild
2. **Code updates:** Push to `bloob-haus-webapp` repo → Vercel redeploy

### DNS Configuration
- Domain: `buffbaby.bloob.haus`
- CNAME: `cname.vercel-dns.com` (configured in Porkbun)
- HTTPS: Automatic via Vercel

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

## Features Added Beyond Original Plan

1. **Comment Stripping** - Privacy protection for `%%comments%%` and `<!--HTML comments-->`
2. **Git Date Extraction** - Last modified dates from git history for sorting
3. **Clickable Recipe Cards** - Entire card is a link, improved UX
4. **Auto-Generated Navigation** - Detects all top-level sections dynamically
5. **First Heading Underline** - Visual styling on individual recipe pages
6. **Dual Publishing Modes** - Flexible allowlist or blocklist configuration
7. **Folder-Based URLs** - Preserves content organization in URL structure
8. **YouTube Embed Support** - Videos render correctly
9. **Checkbox Tracker Visualizer** - Interactive checkmarks with persistence and undo
10. **Modular Visualizer Structure** - `hugo/assets/js/visualizers/` and `css/visualizers/`

---

## Documentation

- `docs/TODO.md` — Detailed progress tracking with session logs
- `docs/CLAUDE_CONTEXT.md` — This file (quick orientation)
- `docs/implementation-plans/` — All implementation plans and roadmaps (see Reference Documents section)

---

## Session History

| Session | Date | Completed |
|---------|------|-----------|
| 1 | Jan 29, 2026 | Task 1: Project setup |
| 2 | Jan 30, 2026 | Tasks 2-18: Full implementation & deployment |
| 3 | Feb 2, 2026 | Checkbox visualizer, modular structure, site rename, Phase 2 planning |
| 4 | Feb 3, 2026 | Recipe cleanup (buffbaby vault), Magic Machines architecture, Cooklang-style recipe scaling plan |

---

## What to Do Next

Phase 1 is **COMPLETE**! Phase 2 is being planned.

**Phase 2 Focus:** Enhanced Linking & API Foundation
- JSON generation (`links.json`, `search-index.json`)
- Backlinks display
- Pre-build validation
- RSS feed

See `docs/bloob-haus-future-features-roadmap.md` for full roadmap including:
- Visualizer architecture (documented)
- Quick Mode (no GitHub needed)
- Multi-user support

---

## Reference Documents

| Document | Location | Purpose |
|----------|----------|---------|
| `CLAUDE_CONTEXT.md` | `docs/` | This file - quick orientation |
| `TODO.md` | `docs/` | Progress tracking, session logs |

**External reference:** The Obsidian vault `bloobhaus-obsidian` contains the original vision docs including the Vicki engineering report.

---

## Documentation Conventions

### Implementation Plans

All implementation plans and roadmaps live in `docs/implementation-plans/`:

```
docs/implementation-plans/
├── bloob-haus-future-features-roadmap.md      ← Master roadmap & architecture
├── bloob-haus-implementation-plan-phase1-v2.md ← Phase 1 (historical/complete)
├── bloob-haus-implementation-plan-phase2.md    ← Phase 2 tasks
├── 2026-02-03_recipe-scaling-and-magic-machines.md ← Feature-specific plan
└── YYYY-MM-DD_feature-name.md                  ← Future feature plans
```

**Naming conventions:**
- **Roadmap/phase plans:** `bloob-haus-*.md` (no date prefix)
- **Feature-specific plans:** `YYYY-MM-DD_descriptive-name.md` (date prefix for chronological sorting)

### Key Documents

| Document | Purpose |
|----------|---------|
| `bloob-haus-future-features-roadmap.md` | Master roadmap, visualizer & magic machine architecture |
| `bloob-haus-implementation-plan-phase1-v2.md` | Phase 1 spec (complete, historical) |
| `bloob-haus-implementation-plan-phase2.md` | Phase 2 detailed tasks |
| `2026-02-03_recipe-scaling-and-magic-machines.md` | Cooklang syntax & Magic Machines |

### Core Architecture Documentation

| Concept | Location |
|---------|----------|
| Visualizers (read/display) | `implementation-plans/bloob-haus-future-features-roadmap.md` → Visualizer Architecture |
| Magic Machines (write/transform) | `implementation-plans/bloob-haus-future-features-roadmap.md` → Magic Machines Architecture |

---

*buffbaby.bloob.haus is LIVE and auto-updating!*
