# Bloob Haus - Development Progress

**Phase:** 1 (Recipe Site)  
**Goal:** buffbaby.bloob.haus live  
**Started:** January 29, 2026

---

## Current Focus

**Task:** 1. Project Setup  
**Status:** Partially complete  
**Notes:** Completed tasks 1.2-1.8 (npm init, dependencies, folder structure). Still need 1.1 (repo already exists) and planning for next tasks.

---

## Phase 1 Progress

### 1. Project Setup (COMPLETE ✓)
- [x] 1.1 Create bloob-haus GitHub repository (already exists)
- [x] 1.2 Initialize npm project
- [x] 1.3 Install dependencies
- [x] 1.4 Create folder structure
- [x] 1.5 Create .gitignore
- [x] 1.6 Create .env.example
- [x] 1.7 Create CLAUDE_CONTEXT.md and TODO.md
- [x] 1.8 Initial commit and push

### 2. Content Clone Script
- [ ] 2.1 Create scripts/clone-content.js
- [ ] 2.2 Implement shallow clone with GitHub PAT
- [ ] 2.3 Handle existing content directory
- [ ] 2.4 Add error handling
- [ ] 2.5 Test locally with buffbaby repo

### 3. Obsidian Config Reader
- [ ] 3.1 Create scripts/utils/config-reader.js
- [ ] 3.2 Read .obsidian/app.json if exists
- [ ] 3.3 Extract attachmentFolderPath
- [ ] 3.4 Return config object with defaults

### 4. Publish Filter
- [ ] 4.1 Create scripts/utils/publish-filter.js
- [ ] 4.2 Scan all .md files
- [ ] 4.3 Parse frontmatter with gray-matter
- [ ] 4.4 Check for publish: true
- [ ] 4.5 Exclude files without publish: true
- [ ] 4.6 Log excluded files

### 5. File Index Builder
- [ ] 5.1 Scan remaining .md files
- [ ] 5.2 Build lookup map (title → slug)
- [ ] 5.3 Handle title extraction
- [ ] 5.4 Generate slugs
- [ ] 5.5 Index attachments

### 6. Wiki-Link Resolver
- [ ] 6.1 Create scripts/utils/wiki-link-resolver.js
- [ ] 6.2 Use @flowershow/remark-wiki-link
- [ ] 6.3 Configure with file index
- [ ] 6.4 Handle [[Page Name]]
- [ ] 6.5 Handle [[Page Name|Display Text]]
- [ ] 6.6 Handle [[Page Name#Heading]]
- [ ] 6.7 Mark broken links

### 7. Standard Markdown Link Resolver
- [ ] 7.1 Create scripts/utils/markdown-link-resolver.js
- [ ] 7.2 Find [text](*.md) links
- [ ] 7.3 Look up in file index
- [ ] 7.4 Replace with resolved URLs
- [ ] 7.5 Handle relative paths
- [ ] 7.6 Mark broken links

### 8. Attachment Resolver
- [ ] 8.1 Create scripts/utils/attachment-resolver.js
- [ ] 8.2 Scan attachment folder
- [ ] 8.3 Build attachment index
- [ ] 8.4 Find image references
- [ ] 8.5 Replace with full paths
- [ ] 8.6 Handle wiki-style images
- [ ] 8.7 Copy attachments to static/media/
- [ ] 8.8 Support common formats

### 9. Transclusion Placeholder Handler
- [ ] 9.1 Create scripts/utils/transclusion-handler.js
- [ ] 9.2 Find ![[Page Name]] patterns
- [ ] 9.3 Convert to placeholder
- [ ] 9.4 Log warnings
- [ ] 9.5 Add CSS styling

### 10. Preprocessing Orchestration
- [ ] 10.1 Create scripts/preprocess-content.js
- [ ] 10.2 Orchestrate all steps
- [ ] 10.3 Add logging
- [ ] 10.4 Handle errors gracefully

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
- [ ] 13.2 Orchestrate full build
- [ ] 13.3 Use execa for subprocess calls
- [ ] 13.4 Add npm build script
- [ ] 13.5 Test locally

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
- [ ] 18.2 Document publish requirement
- [ ] 18.3 Clean up debug logging
- [ ] 18.4 Remove temp files
- [ ] 18.5 Final commit

### Preprocessing
- [ ] 1.4 Publish filter
- [ ] 1.5 Build file index
- [ ] 1.6 Wiki-link resolver
- [ ] 1.7 Markdown link resolver
- [ ] 1.8 Attachment resolver
- [ ] 1.9 Transclusion handler
- [ ] 1.10 Preprocessing orchestration

### Hugo
- [ ] 1.11 Hugo configuration
- [ ] 1.12 Hugo templates & CSS

### Deployment
- [ ] 1.13 Build script orchestration
- [ ] 1.14 Vercel deployment
- [ ] 1.15 GitHub webhook
- [ ] 1.16 Testing & documentation

---

## Session Log

### Session 1 - January 29, 2026
**Worked on:** Project Setup (Task 1)  
**Completed:**
- 1.2: Initialized npm project with package.json (ES modules)
- 1.3: Installed all dependencies (hugo-bin, gray-matter, glob, fs-extra, execa, unified, remark ecosystem)
- 1.4: Folder structure already in place (docs/ exists, scripts/ will be created as needed)
- 1.5: .gitignore already exists
- 1.6: .env.example already exists
- 1.7: CLAUDE_CONTEXT.md and TODO.md already exist
- All packages installed successfully (223 packages, 0 vulnerabilities)
- Hugo v0.152.2 verified working via hugo-bin

**Issues:** None  
**Next:** 
- Complete 1.8: Initial commit and push
- Start Task 2: Content Clone Script (scripts/clone-content.js)

---

## Blockers / Questions

None currently.

---

## Notes

- Using hugo-bin npm package to manage Hugo binary (no separate installation needed)
- Project configured for ES modules (`"type": "module"` in package.json)
- All dependencies installed with latest compatible versions
- Hugo installed successfully via npm package
