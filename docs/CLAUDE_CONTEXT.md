# Bloob Haus - Claude Code Context

**Purpose:** Share this file at the start of each Claude Code session.  
**Last Updated:** January 30, 2026  
**Current Phase:** Phase 1 - Recipe Site (buffbaby.bloob.haus)

---

## Quick Status

| Milestone | Status |
|-----------|--------|
| Tasks 1-10: Preprocessing Pipeline | COMPLETE |
| Tasks 11-12: Hugo Templates & CSS | Next |
| Tasks 13-18: Build & Deploy | Pending |

**Current Task:** 11 - Hugo Configuration

---

## What This Project Is

Bloob Haus transforms Obsidian markdown vaults into hosted static websites using Hugo.

**Phase 1 Goal:** Get buffbaby.bloob.haus live with Leon's recipes from a private GitHub repo.

---

## What's Working

The preprocessing pipeline is fully functional:

```bash
node scripts/clone-content.js      # Clone buffbaby repo
node scripts/preprocess-content.js # Process all files
```

**Last test results:**
- 59 files processed → `hugo/content/`
- 21 files excluded (#not-for-public)
- 12 links resolved (wiki + markdown)
- 21 attachments copied → `hugo/static/media/`

---

## Project Structure

```
bloob-haus/
├── scripts/
│   ├── clone-content.js         ✓ Working
│   ├── preprocess-content.js    ✓ Working
│   └── utils/
│       ├── config-reader.js     ✓ Working
│       ├── publish-filter.js    ✓ Working (dual mode)
│       ├── file-index-builder.js ✓ Working (folder URLs)
│       ├── wiki-link-resolver.js ✓ Working
│       ├── markdown-link-resolver.js ✓ Working
│       ├── attachment-resolver.js ✓ Working
│       └── transclusion-handler.js ✓ Working
│
├── hugo/
│   ├── content/                 ← Generated (59 processed .md files)
│   ├── static/media/            ← Generated (21 images)
│   ├── config.yaml              ← TODO
│   └── layouts/                 ← TODO
│
├── content-source/              ← Cloned from GitHub (gitignored)
└── docs/                        ← Documentation
```

---

## Key Design Decisions

### URL Structure
- **Slugs from FILENAME** (stable URLs even if titles change)
- **Folder-based URLs**: `/recipes/challah/`, `/resources/guide/`
- **Titles from `#` heading** (display only)

### Publishing Model (Dual Mode)
| Mode | Behavior | Config |
|------|----------|--------|
| **blocklist** (Leon's) | Publish all EXCEPT `#not-for-public` | Default |
| **allowlist** | Only publish if `publish: true` | Optional |

### Link Resolution
- `[[Wiki Links]]` → resolved to folder URLs
- `[text](file.md)` → resolved to folder URLs
- Broken links → `<span class="broken-link">` (doesn't crash build)

---

## Environment Variables

```bash
GITHUB_TOKEN=ghp_xxx              # GitHub PAT with repo scope
CONTENT_REPO=LSanten/buffbaby
SITE_URL=https://buffbaby.bloob.haus

PUBLISH_MODE=blocklist            # or "allowlist"
BLOCKLIST_TAG=not-for-public
```

---

## Build Pipeline

```
GitHub (buffbaby) 
    ↓ clone-content.js
content-source/
    ↓ preprocess-content.js
    │  ├─ Filter (#not-for-public)
    │  ├─ Build index (filename → URL)
    │  ├─ Resolve [[wiki-links]]
    │  ├─ Resolve [text](file.md)
    │  ├─ Resolve images → /media/
    │  └─ Handle transclusions
hugo/content/ + hugo/static/media/
    ↓ hugo build (TODO)
public/
    ↓ Vercel (TODO)
buffbaby.bloob.haus
```

---

## Next Steps

1. **Task 11:** Hugo config and templates
2. **Task 12:** CSS styling
3. **Task 13:** Build script (wire everything together)
4. **Task 14:** Local testing
5. **Tasks 15-17:** Vercel deployment

---

## Commands

```bash
# Currently working
node scripts/clone-content.js
node scripts/preprocess-content.js

# TODO
npm run build   # Full pipeline
npm run dev     # Local dev server
```

---

## Documentation

- `docs/TODO.md` — Detailed task checklist & session log
- `docs/CLAUDE_CONTEXT.md` — This file (quick orientation)
- `docs/bloob-haus-implementation-plan-phase1-v2.md` — Full specs

---

## Session History

| Session | Date | Completed |
|---------|------|-----------|
| 1 | Jan 29, 2026 | Task 1: Project setup |
| 2 | Jan 30, 2026 | Tasks 2-10: Full preprocessing pipeline |

---

*Read TODO.md for detailed progress*
