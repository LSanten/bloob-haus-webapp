# Bloob Haus - Claude Code Context

**Purpose:** Share this file at the start of each Claude Code session.  
**Last Updated:** January 30, 2026  
**Current Phase:** Phase 1 - Recipe Site (buffbaby.bloob.haus)

---

## Quick Status

| Milestone | Status |
|-----------|--------|
| Tasks 1-10: Preprocessing Pipeline | ✅ COMPLETE |
| Tasks 11-12: Hugo Templates & CSS | ✅ COMPLETE |
| Tasks 13-18: Build & Deploy | ✅ COMPLETE |

**🎉 LIVE SITE:** https://buffbaby.bloob.haus

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
│   │       ├── head.html        ✅ Meta tags
│   │       ├── nav.html         ✅ Auto-generated nav
│   │       └── footer.html      ✅ Footer
│   └── assets/css/
│       └── main.css             ✅ Warm color theme
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

---

## Documentation

- `docs/TODO.md` — Detailed progress tracking with session logs
- `docs/CLAUDE_CONTEXT.md` — This file (quick orientation)
- `docs/bloob-haus-implementation-plan-phase1-v2.md` — Original specs
- `docs/bloob-haus-future-features-roadmap.md` — Phase 2+ planning

---

## Session History

| Session | Date | Completed |
|---------|------|-----------|
| 1 | Jan 29, 2026 | Task 1: Project setup |
| 2 | Jan 30, 2026 | Tasks 2-18: Full implementation & deployment |

---

## What to Do Next

Phase 1 is **COMPLETE**! 🎉

For future work, see the **Future Features Roadmap** for:
- Backlinks and graph visualization
- Multiple sites / users
- Quick Mode (no GitHub needed)
- Interactive visualizers
- Search functionality

---

*buffbaby.bloob.haus is LIVE and auto-updating!*
