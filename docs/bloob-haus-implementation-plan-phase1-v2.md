# Bloob Haus Implementation Plan: Phase 1

**Version:** 2.1  
**Date:** January 30, 2026  
**Status:** Tasks 1-10 COMPLETE, Tasks 11-18 pending  
**Goal:** Get `buffbaby.bloob.haus` live with Leon's recipes

---

## Overview

### What We're Building in Phase 1

A pipeline that:
1. Pulls markdown files from a private GitHub repo (buffbaby)
2. Preprocesses them (resolves links, filters private files, fixes image paths)
3. Builds a static site with Hugo
4. Deploys to Vercel
5. Auto-rebuilds when content changes

### Success Criteria

- [ ] buffbaby.bloob.haus is live and accessible
- [ ] All published recipes render correctly with images
- [ ] Wiki-links (`[[Recipe Name]]`) work
- [ ] Standard markdown links (`[text](file.md)`) work
- [ ] Private files (without `publish: true`) are excluded
- [ ] Pushing to buffbaby repo triggers rebuild
- [ ] Pages have Open Graph tags for nice sharing previews

### Out of Scope for Phase 1

- User authentication / accounts
- Quick Mode (paste markdown in browser)
- Backlinks / graph visualization
- Multiple users / sites
- Comments
- Private sharing links
- Interactive visualizers (beyond basic styling)

---

## Technical Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Static site generator | Hugo (via hugo-bin) | Fast builds, single binary, good templating |
| Wiki-link processing | @flowershow/remark-wiki-link | Battle-tested, handles edge cases |
| Markdown processing | unified + remark ecosystem | Composable, well-documented |
| Hosting | Vercel | Easy deployment, free tier sufficient for Phase 1 |
| Content source | Private GitHub repo + PAT | Clean separation, mirrors future multi-user |
| Publishing model | Configurable (allowlist OR blocklist) | Flexible: consent-first OR public-by-default |
| Attachment handling | Generic resolver (images + other files) | Extensible pattern |
| URL slugs | Based on FILENAME (not title) | Stable URLs even if titles change |
| Folder structure | Preserved in URLs (/recipes/*, /resources/*) | Clean organization |

---

## Project Structure

```
bloob-haus/
├── package.json                 # Dependencies
├── vercel.json                  # Vercel build configuration
├── .env.example                 # Environment variable template
├── .gitignore
├── CLAUDE_CONTEXT.md            # Context for Claude Code sessions
├── TODO.md                      # Progress tracking
│
├── scripts/
│   ├── build-site.js            # Main build orchestration
│   ├── clone-content.js         # Git clone logic
│   ├── preprocess-content.js    # Preprocessing orchestration
│   └── utils/
│       ├── config-reader.js     # Read .obsidian/app.json
│       ├── publish-filter.js    # Filter files without publish: true
│       ├── wiki-link-resolver.js    # [[links]] → standard links
│       ├── markdown-link-resolver.js # [text](file.md) → URLs
│       ├── attachment-resolver.js    # Images + other files
│       └── transclusion-handler.js   # ![[...]] → placeholder
│
├── hugo/
│   ├── config.yaml              # Hugo site configuration
│   ├── layouts/
│   │   ├── _default/
│   │   │   ├── baseof.html      # Base template
│   │   │   ├── single.html      # Individual page
│   │   │   └── list.html        # List/index pages
│   │   ├── partials/
│   │   │   ├── head.html        # <head> with OG tags
│   │   │   ├── nav.html         # Navigation
│   │   │   └── footer.html      # Footer
│   │   └── shortcodes/          # Future visualizers
│   └── assets/
│       └── css/
│           └── main.css         # Styling
│
├── content/                     # Created at build time (cloned content)
├── static/                      # Created at build time (attachments)
└── public/                      # Hugo output (served by Vercel)
```

---

## Environment Variables

```bash
# .env.local (local development)
# Set in Vercel dashboard for production

GITHUB_TOKEN=ghp_xxxxxxxxxxxx        # Personal Access Token with repo scope
CONTENT_REPO=LSanten/buffbaby        # GitHub repo to clone
SITE_URL=https://buffbaby.bloob.haus # Base URL for the site

# Publishing Mode Configuration
PUBLISH_MODE=blocklist               # "allowlist" or "blocklist"
BLOCKLIST_TAG=not-for-public         # Tag that prevents publishing (blocklist mode)
ALLOWLIST_KEY=publish                # Frontmatter key to check (allowlist mode)
ALLOWLIST_VALUE=true                 # Value that enables publishing (allowlist mode)
```

### Publishing Modes Explained

| Mode | Behavior | Use Case |
|------|----------|----------|
| **allowlist** | Only publish files with `publish: true` in frontmatter | Private-first vaults, selective sharing |
| **blocklist** | Publish ALL files EXCEPT those with specified tag | Public-first vaults, Leon's recipe workflow |

**Default for buffbaby:** `blocklist` mode with `#not-for-public` tag

---

## Detailed Tasks

### 1. Project Setup

**Estimated time:** 1-2 hours

- [ ] **1.1** Create `bloob-haus` GitHub repository (public)
- [ ] **1.2** Initialize npm project: `npm init -y`
- [ ] **1.3** Install dependencies:
  ```bash
  npm install hugo-bin gray-matter glob fs-extra execa
  npm install unified remark-parse remark-stringify @flowershow/remark-wiki-link
  ```
- [ ] **1.4** Create folder structure (as shown above)
- [ ] **1.5** Create `.gitignore`:
  ```
  node_modules/
  .env.local
  content/
  public/
  static/media/
  .DS_Store
  ```
- [ ] **1.6** Create `.env.example` with placeholder values
- [ ] **1.7** Create `CLAUDE_CONTEXT.md` and `TODO.md`
- [ ] **1.8** Initial commit and push

**Success criteria:** Repository exists with proper structure, dependencies installed.

---

### 2. Content Clone Script

**Estimated time:** 1-2 hours

- [ ] **2.1** Create `scripts/clone-content.js`
- [ ] **2.2** Implement shallow clone with GitHub PAT:
  ```javascript
  // Pseudocode
  const url = `https://${GITHUB_TOKEN}@github.com/${CONTENT_REPO}.git`;
  execSync(`git clone --depth 1 ${url} content`);
  ```
- [ ] **2.3** Handle existing content directory (clean before clone)
- [ ] **2.4** Add error handling for auth failures, network issues
- [ ] **2.5** Test locally with buffbaby repo

**Success criteria:** Running `node scripts/clone-content.js` clones the private repo to `content/`.

---

### 3. Obsidian Config Reader

**Estimated time:** 30 minutes

- [ ] **3.1** Create `scripts/utils/config-reader.js`
- [ ] **3.2** Read `.obsidian/app.json` if it exists
- [ ] **3.3** Extract `attachmentFolderPath` (default: current directory)
- [ ] **3.4** Return config object with sensible defaults

```javascript
// Expected output
{
  attachmentFolder: 'media',  // or whatever user configured
}
```

**Success criteria:** Config reader returns attachment folder path, works if .obsidian doesn't exist.

---

### 4. Publish Filter

**Estimated time:** 1.5 hours

- [ ] **4.1** Create `scripts/utils/publish-filter.js`
- [ ] **4.2** Read publish mode from environment (`PUBLISH_MODE`)
- [ ] **4.3** Scan all `.md` files in content directory
- [ ] **4.4** For each file, parse frontmatter AND content with gray-matter
- [ ] **4.5** Implement dual-mode filtering logic:
  - **Allowlist mode:** Include only if frontmatter has `ALLOWLIST_KEY: ALLOWLIST_VALUE`
  - **Blocklist mode:** Include all EXCEPT files containing `#BLOCKLIST_TAG` in content or tags
- [ ] **4.6** Files that don't pass filter are excluded (moved to temp or deleted)
- [ ] **4.7** Log which files are excluded and why (for debugging)

**Logic:**
```javascript
function shouldPublish(frontmatter, content, config) {
  if (config.publishMode === 'allowlist') {
    // Only publish if explicitly marked
    return frontmatter[config.allowlistKey] === config.allowlistValue;
  } else {
    // Blocklist mode: publish unless tagged private
    const hasBlocklistTag = 
      content.includes(`#${config.blocklistTag}`) ||
      (frontmatter.tags && frontmatter.tags.includes(config.blocklistTag));
    return !hasBlocklistTag;
  }
}
```

**Success criteria:** 
- In allowlist mode: Only files with `publish: true` remain
- In blocklist mode: All files EXCEPT those with `#not-for-public` remain

---

### 5. File Index Builder

**Estimated time:** 1 hour

- [ ] **5.1** Create function to scan all remaining `.md` files
- [ ] **5.2** Build lookup map: `{ "Page Title" → "/page-slug/" }`
- [ ] **5.3** Handle title extraction (from frontmatter `title` or filename)
- [ ] **5.4** Generate slugs matching Hugo's output structure
- [ ] **5.5** Also index attachments: `{ "image.jpg" → "/media/image.jpg" }`

**Output:**
```javascript
{
  pages: {
    "Vegan Masala Chai": "/vegan-masala-chai/",
    "Mochi Muffins": "/mochi-muffins/",
  },
  attachments: {
    "chai-photo.jpg": "/media/chai-photo.jpg",
    "recipe.pdf": "/media/recipe.pdf",
  }
}
```

**Success criteria:** Index accurately maps all files to their output URLs.

---

### 6. Wiki-Link Resolver

**Estimated time:** 2-3 hours

- [ ] **6.1** Create `scripts/utils/wiki-link-resolver.js`
- [ ] **6.2** Use `@flowershow/remark-wiki-link` with unified/remark
- [ ] **6.3** Configure with file index from step 5
- [ ] **6.4** Handle `[[Page Name]]` → `[Page Name](/page-slug/)`
- [ ] **6.5** Handle `[[Page Name|Display Text]]` → `[Display Text](/page-slug/)`
- [ ] **6.6** Handle `[[Page Name#Heading]]` → `[Page Name](/page-slug/#heading)`
- [ ] **6.7** For broken links (page not found): add CSS class `.broken-link`, log warning

**Success criteria:** All wiki-links in test files resolve correctly or are marked as broken.

---

### 7. Standard Markdown Link Resolver

**Estimated time:** 1-2 hours

- [ ] **7.1** Create `scripts/utils/markdown-link-resolver.js`
- [ ] **7.2** Find all `[text](target)` links where target ends in `.md`
- [ ] **7.3** Look up target in file index
- [ ] **7.4** Replace with resolved URL: `[text](file.md)` → `[text](/page-slug/)`
- [ ] **7.5** Handle relative paths: `./file.md`, `../folder/file.md`
- [ ] **7.6** For broken links: add CSS class, log warning

**Success criteria:** `[text](Other Recipe.md)` resolves to correct URL.

---

### 8. Attachment Resolver

**Estimated time:** 2 hours

- [ ] **8.1** Create `scripts/utils/attachment-resolver.js`
- [ ] **8.2** Scan attachment folder (from config reader)
- [ ] **8.3** Build attachment index: `{ filename → output path }`
- [ ] **8.4** In each `.md` file, find image references: `![alt](filename)`
- [ ] **8.5** Replace with full path: `![alt](/media/filename)`
- [ ] **8.6** Also handle wiki-style images: `![[image.jpg]]` → `![](/media/image.jpg)`
- [ ] **8.7** Copy attachment folder to `static/media/`
- [ ] **8.8** Support common formats: jpg, jpeg, png, gif, webp, pdf, html

**Note:** For HTML files with internal CSS/JS references, document as "may need manual path adjustment" — full support is Phase 2+.

**Success criteria:** Images display correctly on built site, PDFs link correctly.

---

### 9. Transclusion Placeholder Handler

**Estimated time:** 30 minutes

- [ ] **9.1** Create `scripts/utils/transclusion-handler.js`
- [ ] **9.2** Find all `![[Page Name]]` patterns (not images)
- [ ] **9.3** Convert to: `<span class="transclusion-placeholder">[[Page Name]]</span>`
- [ ] **9.4** Log warning: "Transclusion not yet supported: Page Name"
- [ ] **9.5** Add CSS styling for `.transclusion-placeholder` (visible but distinct)

**Success criteria:** Transclusion syntax doesn't break build, is visually flagged.

---

### 10. Preprocessing Orchestration

**Estimated time:** 1 hour

- [ ] **10.1** Create `scripts/preprocess-content.js`
- [ ] **10.2** Orchestrate all preprocessing steps in order:
  1. Read Obsidian config
  2. Filter unpublished files
  3. Build file index
  4. For each `.md` file:
     - Handle transclusion placeholders
     - Resolve wiki-links
     - Resolve standard markdown links
     - Resolve attachment paths
     - Write processed file back
  5. Copy attachments to static/media/
- [ ] **10.3** Add logging for each step
- [ ] **10.4** Handle errors gracefully (continue on non-fatal errors)

**Success criteria:** Running preprocessing transforms all content correctly.

---

### 11. Hugo Configuration

**Estimated time:** 1-2 hours

- [ ] **11.1** Create `hugo/config.yaml`:
  ```yaml
  baseURL: "https://buffbaby.bloob.haus/"
  languageCode: "en-us"
  title: "Buff Baby Bakery"
  
  contentDir: "../content"
  publishDir: "../public"
  staticDir: "../static"
  
  permalinks:
    page: "/:slug/"
  
  markup:
    goldmark:
      renderer:
        unsafe: true
  ```
- [ ] **11.2** Create `hugo/layouts/_default/baseof.html` (base template)
- [ ] **11.3** Create `hugo/layouts/_default/single.html` (page template)
- [ ] **11.4** Create `hugo/layouts/_default/list.html` (index template)
- [ ] **11.5** Create `hugo/layouts/partials/head.html` with Open Graph tags:
  ```html
  <meta property="og:title" content="{{ .Title }}" />
  <meta property="og:description" content="{{ .Summary | truncate 160 }}" />
  {{ with .Params.image }}
  <meta property="og:image" content="{{ . | absURL }}" />
  {{ end }}
  <meta property="og:url" content="{{ .Permalink }}" />
  <meta property="og:type" content="article" />
  
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{{ .Title }}" />
  <meta name="twitter:description" content="{{ .Summary | truncate 160 }}" />
  ```
- [ ] **11.6** Create `hugo/layouts/partials/nav.html`
- [ ] **11.7** Create `hugo/layouts/partials/footer.html`

**Success criteria:** Hugo builds successfully with templates.

---

### 12. CSS Styling

**Estimated time:** 1-2 hours

- [ ] **12.1** Create `hugo/assets/css/main.css`
- [ ] **12.2** Implement warm color theme:
  ```css
  :root {
    --bg-color: #fffaf0;
    --text-color: #333333;
    --accent-color: #8b4513;
    --link-color: #a0522d;
  }
  
  body {
    background: var(--bg-color);
    font-family: "Crimson Pro", Georgia, serif;
    color: var(--text-color);
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
    line-height: 1.7;
  }
  ```
- [ ] **12.3** Add Google Fonts import for Crimson Pro
- [ ] **12.4** Style links, headings, images
- [ ] **12.5** Style broken links (`.broken-link`)
- [ ] **12.6** Style transclusion placeholders (`.transclusion-placeholder`)
- [ ] **12.7** Basic responsive design (mobile-friendly)

**Success criteria:** Site looks warm and readable on desktop and mobile.

---

### 13. Build Script

**Estimated time:** 1 hour

- [ ] **13.1** Create `scripts/build-site.js`
- [ ] **13.2** Orchestrate full build:
  1. Clean previous build (`content/`, `public/`, `static/media/`)
  2. Clone content repo
  3. Run preprocessing
  4. Run Hugo build
- [ ] **13.3** Use `execa` for subprocess calls (better error handling)
- [ ] **13.4** Add npm script: `"build": "node scripts/build-site.js"`
- [ ] **13.5** Test locally: `npm run build` produces working site

**Success criteria:** Single command builds entire site from scratch.

---

### 14. Local Testing

**Estimated time:** 1 hour

- [ ] **14.1** Add npm script for Hugo dev server: `"dev": "hugo server -s hugo"`
- [ ] **14.2** Build site and verify:
  - [ ] Homepage renders
  - [ ] Recipe pages render
  - [ ] Images display
  - [ ] Links work (both wiki and standard)
  - [ ] Private files are excluded
  - [ ] OG tags present in source
- [ ] **14.3** Test on mobile (responsive)
- [ ] **14.4** Fix any issues found

**Success criteria:** Site works correctly locally.

---

### 15. Vercel Deployment

**Estimated time:** 1-2 hours

- [ ] **15.1** Create `vercel.json`:
  ```json
  {
    "buildCommand": "npm run build",
    "outputDirectory": "public",
    "installCommand": "npm install"
  }
  ```
- [ ] **15.2** Connect bloob-haus repo to Vercel
- [ ] **15.3** Add environment variables in Vercel dashboard:
  - `GITHUB_TOKEN`
  - `CONTENT_REPO`
  - `SITE_URL`
- [ ] **15.4** Deploy and verify at Vercel's default URL
- [ ] **15.5** Test all functionality on deployed site

**Success criteria:** Site works on Vercel's default URL.

---

### 16. Custom Domain Setup

**Estimated time:** 30 minutes

- [ ] **16.1** In Vercel, add custom domain: `buffbaby.bloob.haus`
- [ ] **16.2** In Porkbun DNS, add CNAME record:
  ```
  Type: CNAME
  Host: buffbaby
  Value: cname.vercel-dns.com
  ```
- [ ] **16.3** Wait for DNS propagation
- [ ] **16.4** Verify HTTPS works
- [ ] **16.5** Test site at `buffbaby.bloob.haus`

**Success criteria:** Site live at custom domain with HTTPS.

---

### 17. Auto-Rebuild Webhook

**Estimated time:** 30 minutes

- [ ] **17.1** In Vercel project settings, create Deploy Hook
- [ ] **17.2** Copy the webhook URL
- [ ] **17.3** In buffbaby GitHub repo settings, add webhook:
  - URL: Vercel deploy hook URL
  - Content type: application/json
  - Events: Just the push event
- [ ] **17.4** Test: push a change to buffbaby → verify rebuild triggers
- [ ] **17.5** Verify changes appear on live site

**Success criteria:** Content updates auto-deploy.

---

### 18. Documentation & Cleanup

**Estimated time:** 1 hour

- [ ] **18.1** Update README.md with:
  - Project overview
  - How to set up locally
  - How to add new recipes (frontmatter requirements)
  - Environment variables needed
- [ ] **18.2** Document the `publish: true` requirement
- [ ] **18.3** Clean up any debug logging
- [ ] **18.4** Remove any temporary/test files
- [ ] **18.5** Final commit

**Success criteria:** Project is documented and clean.

---

## Content Requirements (for buffbaby repo)

### Blocklist Mode (Leon's Setup)

All recipes publish by default. To keep a recipe private, add the tag anywhere in the file:

```markdown
---
title: "Secret Family Recipe"
image: secret.jpg  # Optional, for OG tags
---

#not-for-public

This recipe won't be published...
```

Or include it in frontmatter tags:
```yaml
---
title: "Secret Family Recipe"
tags: [not-for-public, desserts]
---
```

### Allowlist Mode (Alternative)

For users who prefer consent-first publishing:

```yaml
---
title: "Vegan Masala Chai"
publish: true
image: chai-photo.jpg  # Optional, for OG tags
---

Recipe content here...
```

Files without `publish: true` will NOT appear on the site.

---

## Estimated Total Time

| Section | Estimated Hours |
|---------|-----------------|
| 1. Project Setup | 1-2 |
| 2. Clone Script | 1-2 |
| 3. Config Reader | 0.5 |
| 4. Publish Filter | 1 |
| 5. File Index Builder | 1 |
| 6. Wiki-Link Resolver | 2-3 |
| 7. Markdown Link Resolver | 1-2 |
| 8. Attachment Resolver | 2 |
| 9. Transclusion Handler | 0.5 |
| 10. Preprocessing Orchestration | 1 |
| 11. Hugo Configuration | 1-2 |
| 12. CSS Styling | 1-2 |
| 13. Build Script | 1 |
| 14. Local Testing | 1 |
| 15. Vercel Deployment | 1-2 |
| 16. Custom Domain | 0.5 |
| 17. Webhook Setup | 0.5 |
| 18. Documentation | 1 |
| **Total** | **18-25 hours** |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Wiki-link library doesn't handle edge cases | Test with real buffbaby content early; fall back to custom regex if needed |
| Hugo templating issues | Start with minimal templates, add complexity incrementally |
| Vercel build failures | Test full build locally before deploying; check Vercel build logs |
| GitHub PAT expires | Document PAT creation; set long expiration; add reminder |
| Content structure issues | Validate buffbaby content early in development |

---

## After Phase 1

See **Future Features Roadmap** for Phase 2+ features including:
- Backlinks and graph visualization
- Multiple sites / users
- Quick Mode (no GitHub needed)
- Private sharing links
- Interactive visualizers

---

*End of Implementation Plan Phase 1*
