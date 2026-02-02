# Bloob Haus - Development Progress

**Phase:** 1 (Recipe Site)  
**Goal:** buffbaby.bloob.haus live  
**Status:** COMPLETE ✅  
**Started:** January 29, 2026  
**Completed:** January 30, 2026

---

## Current Status

🎉 **buffbaby.bloob.haus is LIVE!**

**Live URL:** https://buffbaby.bloob.haus  
**Recipes Published:** 59  
**Recipes Private:** 21 (tagged #not-for-public)

---

## Phase 1 Progress - ALL TASKS COMPLETE

### 1. Project Setup (COMPLETE ✓)
- [x] 1.1 Create bloob-haus GitHub repository
- [x] 1.2 Initialize npm project
- [x] 1.3 Install dependencies
- [x] 1.4 Create folder structure
- [x] 1.5 Create .gitignore
- [x] 1.6 Create .env.example
- [x] 1.7 Create CLAUDE_CONTEXT.md and TODO.md
- [x] 1.8 Initial commit and push

### 2. Content Clone Script (COMPLETE ✓)
- [x] 2.1 Create scripts/clone-content.js
- [x] 2.2 Implement shallow clone with GitHub PAT
- [x] 2.3 Handle existing content directory (pull if exists)
- [x] 2.4 Add error handling (token redaction)
- [x] 2.5 Test locally with buffbaby repo

### 3. Obsidian Config Reader (COMPLETE ✓)
- [x] 3.1 Create scripts/utils/config-reader.js
- [x] 3.2 Read .obsidian/app.json if exists
- [x] 3.3 Extract attachmentFolderPath
- [x] 3.4 Return config object with defaults

### 4. Publish Filter - Dual Mode (COMPLETE ✓)
- [x] 4.1 Create scripts/utils/publish-filter.js
- [x] 4.2 Read PUBLISH_MODE from environment
- [x] 4.3 Scan all .md files
- [x] 4.4 Parse frontmatter AND content with gray-matter
- [x] 4.5 Implement dual-mode logic:
  - Allowlist: only publish if `publish: true`
  - Blocklist: publish all EXCEPT files with `#not-for-public` tag
- [x] 4.6 Handle both `tag` and `#tag` formats in frontmatter
- [x] 4.7 Log excluded files with reason

### 5. File Index Builder (COMPLETE ✓)
- [x] 5.1 Create scripts/utils/file-index-builder.js
- [x] 5.2 Build lookup maps (title → slug, filename → slug)
- [x] 5.3 Extract titles from frontmatter OR first # heading (h1, h2, h3)
- [x] 5.4 Generate slugs from FILENAME (not title) for stable URLs
- [x] 5.5 Support folder-based URLs (e.g., /recipes/challah/)
- [x] 5.6 Index attachments
- [x] 5.7 Strip bold/italic from titles (implemented then reverted - kept formatting)

### 6. Wiki-Link Resolver (COMPLETE ✓)
- [x] 6.1 Create scripts/utils/wiki-link-resolver.js
- [x] 6.2 Handle [[Page Name]]
- [x] 6.3 Handle [[Page Name|Display Text]]
- [x] 6.4 Handle [[Page Name#Heading]]
- [x] 6.5 Mark broken links with CSS class

### 7. Standard Markdown Link Resolver (COMPLETE ✓)
- [x] 7.1 Create scripts/utils/markdown-link-resolver.js
- [x] 7.2 Find [text](*.md) links
- [x] 7.3 Handle URL-encoded paths (e.g., %20 for spaces)
- [x] 7.4 Replace with resolved URLs
- [x] 7.5 Mark broken links with CSS class

### 8. Attachment Resolver (COMPLETE ✓)
- [x] 8.1 Create scripts/utils/attachment-resolver.js
- [x] 8.2 Handle standard markdown images ![alt](path)
- [x] 8.3 Handle wiki-style images ![[image.jpg]]
- [x] 8.4 Resolve paths to /media/filename
- [x] 8.5 Copy attachments to static/media/

### 9. Transclusion Placeholder Handler (COMPLETE ✓)
- [x] 9.1 Create scripts/utils/transclusion-handler.js
- [x] 9.2 Find ![[Page Name]] patterns (non-image)
- [x] 9.3 Convert to styled placeholder with link
- [x] 9.4 Skip image files (handled by attachment resolver)

### 10. Preprocessing Orchestration (COMPLETE ✓)
- [x] 10.1 Create scripts/preprocess-content.js
- [x] 10.2 Orchestrate all steps in correct order
- [x] 10.3 Add comprehensive logging
- [x] 10.4 Output processed files to hugo/content/
- [x] 10.5 Copy attachments to hugo/static/media/
- [x] 10.6 Add comment stripping (Obsidian %% %% and HTML <!-- -->)
- [x] 10.7 Add git date extraction for sorting

### 11. Hugo Configuration (COMPLETE ✓)
- [x] 11.1 Create hugo/config.yaml
- [x] 11.2 Create baseof.html
- [x] 11.3 Create single.html (simplified - no duplicate title)
- [x] 11.4 Create list.html (clickable cards)
- [x] 11.5 Create partials/head.html with OG tags
- [x] 11.6 Create partials/nav.html (auto-detects all sections)
- [x] 11.7 Create partials/footer.html
- [x] 11.8 Create index.html (homepage)

### 12. CSS Styling (COMPLETE ✓)
- [x] 12.1 Create hugo/assets/css/main.css
- [x] 12.2 Implement warm color theme
- [x] 12.3 Add Google Fonts (Crimson Pro, Inter)
- [x] 12.4 Style links, headings, images
- [x] 12.5 Style broken links
- [x] 12.6 Style transclusion placeholders
- [x] 12.7 Responsive design
- [x] 12.8 Clickable recipe cards
- [x] 12.9 Underlined first heading on recipe pages (h1, h2, h3)

### 13. Build Script (COMPLETE ✓)
- [x] 13.1 Create scripts/build-site.js
- [x] 13.2 Orchestrate full build (clone → preprocess → hugo)
- [x] 13.3 Add npm build script
- [x] 13.4 Test locally

### 14. Local Testing (COMPLETE ✓)
- [x] 14.1 Add dev server npm script
- [x] 14.2 Verify all functionality
- [x] 14.3 Test responsive design
- [x] 14.4 Fix issues (duplicate titles, comment stripping)

### 15. Vercel Deployment (COMPLETE ✓)
- [x] 15.1 Create vercel.json
- [x] 15.2 Connect repo to Vercel
- [x] 15.3 Add environment variables
- [x] 15.4 Deploy to default URL
- [x] 15.5 Test deployed site

### 16. Custom Domain Setup (COMPLETE ✓)
- [x] 16.1 Add custom domain in Vercel
- [x] 16.2 Configure DNS CNAME (buffbaby.bloob.haus)
- [x] 16.3 Wait for propagation
- [x] 16.4 Verify HTTPS
- [x] 16.5 Test at custom domain

### 17. Auto-Rebuild Webhook (COMPLETE ✓)
- [x] 17.1 Create Deploy Hook in Vercel
- [x] 17.2 Copy webhook URL
- [x] 17.3 Add webhook to buffbaby repo
- [x] 17.4 Test push triggers rebuild
- [x] 17.5 Verify changes appear

### 18. Documentation & Cleanup (COMPLETE ✓)
- [x] 18.1 Update README.md
- [x] 18.2 Update all /docs files
- [x] 18.3 Clean up debug logging
- [x] 18.4 Final commit

---

## Session Log

### Session 1 - January 29, 2026
**Worked on:** Project Setup (Task 1)  
**Completed:**
- Initialized npm project with ES modules
- Installed all dependencies (223 packages)
- Hugo v0.152.2 verified working

### Session 2 - January 30, 2026
**Worked on:** Tasks 2-17 (Full implementation and deployment)  

**Preprocessing Pipeline (Tasks 2-10):**
- Content clone script with GitHub PAT authentication
- Obsidian config reader (attachment folder detection)
- Dual-mode publish filter (allowlist/blocklist)
- File index builder with folder-based URLs
- Wiki-link resolver ([[links]])
- Markdown link resolver ([text](file.md))
- Attachment resolver (images copied to /media/)
- Transclusion placeholder handler
- Comment stripper (Obsidian %% %% and HTML <!-- -->)
- Git date extractor (last modified dates for sorting)
- Full preprocessing orchestration

**Hugo Site (Tasks 11-12):**
- Complete template system (baseof, single, list, index)
- Warm color theme with Google Fonts
- Responsive design
- Clickable recipe cards showing full content
- Auto-detected navigation for all sections
- First heading underlined on recipe pages
- Open Graph meta tags for social sharing

**Build & Deploy (Tasks 13-17):**
- Full build script orchestration
- Local testing with dev server
- Vercel deployment with environment variables
- Custom domain setup (buffbaby.bloob.haus)
- Auto-rebuild webhook on content changes

**Key Features Added Beyond Original Plan:**
- Comment stripping for privacy (`%% notes %%` removed)
- Git-based date extraction for "Recent Recipes" sorting
- Clickable recipe cards (whole card is link, not just title)
- Auto-detection of all top-level sections in nav
- Support for h1, h2, AND h3 first headings
- Bold/italic formatting preserved in titles
- YouTube embed support (HTML passthrough)

**Test Results:**
- 59 recipes published
- 21 recipes kept private (#not-for-public tag)
- All links resolved correctly
- All images working
- Comments stripped successfully
- Auto-deployment working

### Session 3 - February 2, 2026
**Worked on:** Interactive checkboxes, visualizer architecture, documentation

**Checkbox Tracker Visualizer:**
- Created modular visualizer folder structure (`hugo/assets/js/visualizers/`, `css/visualizers/`)
- Implemented checkbox-tracker.js with localStorage persistence
- Floating reset button appears only when boxes are checked
- 60-second undo window after reset ("Undo clearing")
- Checkbox states persist across page reloads and visits

**Documentation & Planning:**
- Documented visualizer architecture in future-features-roadmap.md
- Defined build-time vs runtime visualizers
- Defined activation methods (frontmatter, folder config, auto-detect, global)
- Chose Approach A (build-time resolution) over Approach B (runtime resolution)
- Updated CLAUDE_CONTEXT.md and TODO.md
- Created Phase 2 implementation plan skeleton

**Other Changes:**
- Renamed site from "Buff Baby Bakery" to "Buff Baby Kitchen"
- Reduced checkbox spacing
- Updated search-index.json spec (added image field)

---

## Key Technical Decisions

- **URL slugs:** Based on FILENAME for stability (not title)
- **Page titles:** Extracted from first heading (# or ## or ###)
- **Publish mode:** Blocklist (#not-for-public tag)
- **Folder structure:** Preserved in URLs (/recipes/*, /resources/*)
- **Comments:** Stripped during preprocessing for privacy
- **Dates:** Extracted from git history for sorting
- **Navigation:** Auto-generated from all sections
- **Recipe cards:** Full content preview, entirely clickable

---

## Deployment Info

**Production URL:** https://buffbaby.bloob.haus  
**Vercel Project:** bloob-haus-webapp  
**Content Repo:** LSanten/buffbaby (private)  
**Code Repo:** LSanten/bloob-haus-webapp (public)

**Auto-Deploy Triggers:**
- Push to bloob-haus-webapp → Rebuilds site code
- Push to buffbaby → Rebuilds content via webhook

---

## What's Next (Future Phases)

Phase 2 and beyond features are documented in:
- `docs/bloob-haus-future-features-roadmap.md`

Potential next steps:
- Backlinks and graph visualization
- Multi-user support
- Quick Mode (paste markdown directly)
- Interactive visualizers
- Search functionality
