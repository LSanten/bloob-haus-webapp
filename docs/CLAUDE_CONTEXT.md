# Bloob Haus - Claude Code Context

**Purpose:** Share this file at the start of each Claude Code session.  
**Last Updated:** January 29, 2026  
**Current Phase:** Phase 1 - Recipe Site (buffbaby.bloob.haus)

---

## Documentation Workflow

This project uses a three-document system:

### 1. Implementation Plan (`docs/bloob-haus-implementation-plan-phase1-v2.md`)
- **Purpose:** Detailed technical specification & blueprint
- **Contains:** Full task breakdown with subtasks, pseudocode, examples, time estimates
- **When to read:** At start of each major task section (before Task 2, 3, etc.)
- **Updates:** Rarely - only if requirements change significantly
- **Lifecycle:** Phase-specific

### 2. TODO (`docs/TODO.md`)
- **Purpose:** Active progress tracking & session log
- **Contains:** Checklist of all tasks, completion status, session notes
- **When to update:** After completing each subtask, at end of each session
- **Updates:** Constantly - mark complete, add session logs
- **Lifecycle:** Ongoing throughout the phase

### 3. CLAUDE_CONTEXT (`docs/CLAUDE_CONTEXT.md` - this file)
- **Purpose:** Quick reference & orientation for new sessions
- **Contains:** High-level overview, current task pointer, key decisions, code conventions
- **When to read:** At the start of EVERY session
- **Updates:** When current task changes, when key decisions are made
- **Lifecycle:** Living document

### Session Workflow

```
1. Read CLAUDE_CONTEXT.md (orientation)
2. Check TODO.md (what's done, what's next)
3. If starting new major task → Read relevant section of implementation plan
4. Work on tasks
5. Update TODO.md (mark complete, add notes)
6. Update CLAUDE_CONTEXT.md "Current Task" section if needed
```

---

## What This Project Is

Bloob Haus transforms Obsidian markdown vaults into hosted static websites using Hugo.

**Phase 1 Goal:** Get buffbaby.bloob.haus live with Leon's recipes from a private GitHub repo.

---

## Technical Stack

| Component | Choice |
|-----------|--------|
| Static site generator | Hugo (via `hugo-bin` npm package) |
| Wiki-link processing | `@flowershow/remark-wiki-link` |
| Markdown processing | `unified` + `remark` ecosystem |
| Frontmatter parsing | `gray-matter` |
| Hosting | Vercel |
| Content source | Private GitHub repo cloned at build time |

---

## Project Structure

```
bloob-haus/
├── package.json                 
├── vercel.json                  
├── .env.example
│
├── docs/
│   ├── CLAUDE_CONTEXT.md        ← This file
│   ├── TODO.md                  ← Progress tracking
│   └── bloob-haus-implementation-plan-phase1-v2.md
│
├── scripts/
│   ├── build-site.js            ← Main orchestration
│   ├── clone-content.js         ← Git clone from GitHub
│   ├── preprocess-content.js    ← Runs all processors
│   └── utils/
│       ├── config-reader.js     ← Parse .obsidian/app.json
│       ├── publish-filter.js    ← Only include files with publish: true
│       ├── wiki-link-resolver.js
│       ├── markdown-link-resolver.js
│       ├── attachment-resolver.js
│       └── transclusion-handler.js
│
├── hugo/
│   ├── config.yaml              
│   ├── layouts/                 ← Templates
│   └── assets/css/              ← Styling
│
├── content/                     ← Cloned content (gitignored)
└── public/                      ← Hugo output (gitignored)
```

---

## Key Design Decisions

### Publishing Model: Consent-First
- Files are only published if they have `publish: true` in frontmatter
- Default is NOT to publish (prevents accidental exposure)

### Link Resolution
- Wiki-links: `[[Page Name]]` → resolved using @flowershow/remark-wiki-link
- Standard links: `[text](file.md)` → custom processor resolves to URLs
- Broken links: Rendered with `.broken-link` CSS class, not fatal errors

### Attachments
- Images and files copied to `hugo/static/media/`
- All references rewritten to `/media/filename`

### Transclusion
- `![[Page Name]]` (embedding) not fully supported yet
- Converted to placeholder with `.transclusion-placeholder` class

---

## Environment Variables

```bash
GITHUB_TOKEN=ghp_xxx    # GitHub PAT with repo scope
CONTENT_REPO=LSanten/buffbaby
SITE_URL=https://buffbaby.bloob.haus
```

---

## Build Pipeline

```
1. Clone content repo (shallow clone)
2. Read .obsidian/app.json for config
3. Filter to files with publish: true
4. Build file index (titles → slugs, filenames → paths)
5. Process each markdown file:
   - Handle transclusions → placeholders
   - Resolve wiki-links
   - Resolve markdown links to .md files
   - Resolve attachment paths
6. Copy attachments to hugo/static/media/
7. Run Hugo build
8. Output to public/
```

---

## Code Style Preferences

Follow these conventions:

- **ES Modules**: Use `import/export`, not `require`
- **One responsibility per file**: Each file does one main thing
- **JSDoc comments**: Add to all exported functions
- **Descriptive names**: Prefer clear names over comments
- **Error handling**: Catch errors, log helpful messages, don't crash silently
- **Logging**: Use prefixes like `[clone]`, `[preprocess]`, `[wiki-links]` for clarity
- **No magic values**: Use constants or config for repeated values

Example function style:
```javascript
/**
 * Resolves wiki-links to standard markdown links.
 * @param {string} content - Markdown content with [[wiki-links]]
 * @param {Object} fileIndex - Mapping of titles to URLs
 * @returns {string} Markdown with resolved links
 */
export function resolveWikiLinks(content, fileIndex) {
  // Implementation
}
```

---

## Current Task

**Task 1: Project Setup - COMPLETE**

**Next Task:** Task 2 - Content Clone Script (scripts/clone-content.js)

See `docs/TODO.md` for detailed progress and `docs/bloob-haus-implementation-plan-phase1-v2.md` for full task specifications.

---

## Important Files to Reference

**Documentation:**
- `docs/CLAUDE_CONTEXT.md` — This file, session orientation
- `docs/TODO.md` — Progress tracking and session logs
- `docs/bloob-haus-implementation-plan-phase1-v2.md` — Detailed task specs

**Preprocessing:**
- `scripts/preprocess-content.js` — Orchestration
- `scripts/utils/*.js` — Individual processors

**Hugo Templates:**
- `hugo/layouts/_default/single.html` — Page template
- `hugo/layouts/partials/head.html` — Meta tags, OG tags
- `hugo/assets/css/main.css` — Styling

---

## Dependencies

```json
{
  "dependencies": {
    "hugo-bin": "latest",
    "gray-matter": "^4.0.3",
    "glob": "^10.0.0",
    "fs-extra": "^11.0.0",
    "execa": "^8.0.0",
    "unified": "^11.0.0",
    "remark-parse": "^11.0.0",
    "remark-stringify": "^11.0.0",
    "@flowershow/remark-wiki-link": "^3.3.1"
  }
}
```

---

## Recipe File Format (Content Repo)

For a recipe to be published:

```yaml
---
title: "Recipe Name"
publish: true              # Required!
description: "Short description"
image: "photo.jpg"         # For Open Graph
tags: [tag1, tag2]
---

Content with [[wiki-links]] and images...
```

---

## Commands

```bash
npm install          # Install dependencies
npm run build        # Full build (clone → preprocess → hugo)
npm run dev          # Hugo dev server (after content exists)
```

---

## Notes for This Session

**Session 1 (Jan 29, 2026):**
- Completed Task 1 (Project Setup)
- npm project initialized with all dependencies
- Hugo v0.152.2 installed and verified
- All files committed and pushed to GitHub

**Next session:** Start Task 2 (Content Clone Script)

---

*Follow the session workflow: Read this file → Check TODO.md → Reference implementation plan as needed*
