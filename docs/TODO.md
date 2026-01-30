# Bloob Haus - Development Progress

**Phase:** 1 (Recipe Site)  
**Goal:** buffbaby.bloob.haus live  
**Started:** January 29, 2026

---

## Current Focus

**Task:** 11. Hugo Configuration  
**Status:** Ready to start  
**Notes:** Tasks 1-10 complete. Preprocessing pipeline fully functional.

---

## Phase 1 Progress

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
- [x] 5.3 Extract titles from frontmatter OR first # heading
- [x] 5.4 Generate slugs from FILENAME (not title) for stable URLs
- [x] 5.5 Support folder-based URLs (e.g., /recipes/challah/)
- [x] 5.6 Index attachments

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

### 11. Hugo Configuration
- [ ] 11.1 Create hugo/config.yaml
- [ ] 11.2 Create baseof.html
- [ ] 11.3 Create single.html
- [ ] 11.4 Create list.html
- [ ] 11.5 Create partials/head.html with OG tags
- [ ] 11.6 Create partials/nav.html
- [ ] 11.7 Create partials/footer.html

### 12. CSS Styling
- [ ] 12.1 Create hugo/assets/css/main.css
- [ ] 12.2 Implement warm color theme
- [ ] 12.3 Add Google Fonts
- [ ] 12.4 Style links, headings, images
- [ ] 12.5 Style broken links
- [ ] 12.6 Style transclusion placeholders
- [ ] 12.7 Responsive design

### 13. Build Script
- [ ] 13.1 Create scripts/build-site.js
- [ ] 13.2 Orchestrate full build (clone → preprocess → hugo)
- [ ] 13.3 Add npm build script
- [ ] 13.4 Test locally

### 14. Local Testing
- [ ] 14.1 Add dev server npm script
- [ ] 14.2 Verify all functionality
- [ ] 14.3 Test responsive design
- [ ] 14.4 Fix issues

### 15. Vercel Deployment
- [ ] 15.1 Create vercel.json
- [ ] 15.2 Connect repo to Vercel
- [ ] 15.3 Add environment variables
- [ ] 15.4 Deploy to default URL
- [ ] 15.5 Test deployed site

### 16. Custom Domain Setup
- [ ] 16.1 Add custom domain in Vercel
- [ ] 16.2 Configure DNS CNAME
- [ ] 16.3 Wait for propagation
- [ ] 16.4 Verify HTTPS
- [ ] 16.5 Test at custom domain

### 17. Auto-Rebuild Webhook
- [ ] 17.1 Create Deploy Hook in Vercel
- [ ] 17.2 Copy webhook URL
- [ ] 17.3 Add webhook to buffbaby repo
- [ ] 17.4 Test push triggers rebuild
- [ ] 17.5 Verify changes appear

### 18. Documentation & Cleanup
- [ ] 18.1 Update README.md
- [ ] 18.2 Document publish modes
- [ ] 18.3 Clean up debug logging
- [ ] 18.4 Final commit

---

## Session Log

### Session 1 - January 29, 2026
**Worked on:** Project Setup (Task 1)  
**Completed:**
- Initialized npm project with ES modules
- Installed all dependencies (223 packages)
- Hugo v0.152.2 verified working

### Session 2 - January 30, 2026
**Worked on:** Tasks 2-10 (Full preprocessing pipeline)  
**Completed:**
- Content clone script with GitHub PAT authentication
- Obsidian config reader (attachment folder detection)
- Dual-mode publish filter (allowlist/blocklist)
- File index builder with folder-based URLs
- Wiki-link resolver ([[links]])
- Markdown link resolver ([text](file.md))
- Attachment resolver (images copied to /media/)
- Transclusion placeholder handler
- Full preprocessing orchestration

**Key decisions:**
- URL slugs based on FILENAME (stable URLs)
- Page titles from first # heading (display titles)
- Blocklist mode for Leon's recipes (#not-for-public tag)
- Folder structure preserved in URLs (/recipes/*, /resources/*)

**Test results:**
- 59 files processed
- 21 files excluded (private)
- 12 links resolved
- 0 broken links
- 21 attachments copied

**Next:** Hugo templates and CSS (Tasks 11-12)

---

## Blockers / Questions

None currently.

---

## Notes

- Preprocessing pipeline fully functional
- Content flows: clone → filter → index → resolve links → copy to hugo/
- Dual publish modes: allowlist (`publish: true`) or blocklist (`#not-for-public`)
- URLs: /recipes/recipe-name/, /resources/resource-name/
