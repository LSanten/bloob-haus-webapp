# Bloob Haus: Future Features Roadmap

**Purpose:** Document features planned for Phase 2 and beyond. This is a "parking lot" to capture ideas without letting them creep into Phase 1.  
**Last Updated:** January 29, 2026  
**Status:** Planning document - features require approval before implementation

---

## Phase Overview

| Phase | Focus | Status |
|-------|-------|--------|
| Phase 1 | Recipe site (buffbaby.bloob.haus) | In Development |
| Phase 2 | Enhanced linking + API foundation | Planning |
| Phase 3 | Quick Mode + Multi-user | Planning |
| Phase 4 | Interactive visualizers | Planning |
| Phase 5+ | Advanced features | Ideas |

---

## Phase 2: Enhanced Linking & API Foundation

**Goal:** Add backlinks, graph data, and prepare for webapp features.

### 2.1 Links.json Generation
Generate a `links.json` file during build containing all link relationships:

```json
{
  "vegan-masala-chai": {
    "title": "Vegan Masala Chai",
    "outgoing": ["/mochi-muffins/", "/spice-guide/"],
    "incoming": ["/breakfast-ideas/", "/tea-recipes/"]
  }
}
```

**Privacy consideration:** Only scan published files (those with `publish: true`), never expose links to/from private files.

**Use cases:**
- Display backlinks section on each page
- Power graph visualization
- Detect broken links before deploy

### 2.2 Backlinks Display
Show "Pages that link here" section at bottom of each page.

**Implementation:** Hugo partial that reads `links.json` and displays incoming links.

### 2.3 Pre-build Validation
Before Hugo runs, validate:
- No broken wiki-links
- No broken image references
- Required frontmatter fields present

Output report of issues. Optionally fail build on errors.

### 2.4 API Routes (Next.js)
Add Next.js API layer for:
- `/api/build` - Trigger rebuild programmatically
- `/api/status` - Check build status
- `/api/links` - Serve links.json for client-side graph

**Architecture change:** Wrap Hugo in Next.js app (already planned for Quick Mode).

### 2.5 Staging/Preview
Preview changes before going live:
- Branch deploys (Vercel does this automatically)
- Or explicit "draft" mode with preview URL

---

## Phase 3: Quick Mode & Multi-User

**Goal:** Anyone can create visualizations without GitHub.

### 3.1 Quick Mode
Core flow:
1. User visits bloob.haus
2. Pastes markdown into text area
3. Selects visualizer/theme
4. Gets instant hosted URL (e.g., `bloob.haus/m/abc123`)

**No GitHub required.** Content stored in database.

### 3.2 User Accounts
- Authentication (NextAuth.js)
- User dashboard showing their marbles
- Edit, delete, unpublish capabilities

### 3.3 Multi-User Repo Mode
- GitHub OAuth for connecting repos
- Each user gets subdomain: `username.bloob.haus`
- Per-user site configuration

### 3.4 Wildcard Subdomains
DNS and routing setup for `*.bloob.haus`:
- `leon.bloob.haus` → Leon's site
- `buffbaby.bloob.haus` → Recipe site
- Reserved: `www`, `api`, `app`, `studio`

### 3.5 Cloudflare Pages for User Sites
**Rationale:** Unlimited bandwidth, no viral user cost risk.
- Vercel: Dashboard + API (controlled cost)
- Cloudflare Pages: User-generated static sites

### 3.6 Pricing Model
- Free tier: 1 site, subdomain, reasonable limits
- Paid ($3-5/mo): Custom domain, multiple sites
- Metered billing for heavy usage

---

## Phase 4: Interactive Visualizers

**Goal:** Go beyond static pages to dynamic, interactive visualizations.

### 4.1 Link Previews on Hover
When hovering over a wiki-link, show preview card with:
- Title
- First paragraph
- Featured image (if any)

**Implementation:** Client-side JS (Tippy.js) + preloaded data or fetch on hover.

### 4.2 Graph Visualization
Interactive graph showing note connections:
- Local graph (current note + immediate connections)
- Global graph (entire site)

**Libraries:** D3.js, vis.js, or Cytoscape.js

**Data source:** `links.json` from Phase 2.

### 4.3 Stacked Notes (Andy Matuschak Style)
When clicking a link, new note opens in a column to the right instead of replacing current page.

Good for: Recipe comparison, research, exploration.

### 4.4 Timeline Visualizer
Custom visualizer for timeline content:
```markdown
---
visualizer: timeline
---

| 2020 | Started baking |
| 2022 | Opened bakery |
| 2024 | Expanded menu |
```

### 4.5 Recipe Card Visualizer
Special layout for recipe content:
- Ingredients sidebar
- Step-by-step with images
- Scaling calculator
- Print-friendly version

### 4.6 Thesis Visualizations (from Master's Thesis)
Interactive visualizations for:
- Communication mapping
- Systemic sensing
- Community gardens

**Architecture:** Client-side JavaScript bundles, potentially with persistence API.

---

## Phase 5+: Advanced Features

### 5.1 Password Protection / Access Control
Options:
- **Site-wide password:** Simple Vercel/Cloudflare password
- **Per-page access:** Server-side auth (Next.js middleware)
- **Private links:** Time-limited, signed URLs

**Recommended approach:** Next.js middleware for flexibility.

### 5.2 Full Transclusion Support
Embed content from one note inside another:
- `![[Recipe Tips]]` embeds full content of Recipe Tips
- Recursive transclusion (with depth limit)
- Block-level transclusion: `![[Page#^block-id]]`

### 5.3 Mobile Publishing Workflow
- PWA or native app
- Quick capture → publish flow
- Image upload from camera roll

### 5.4 Comments / Discussions
- Per-page comments
- Could use third-party (Disqus, Giscus) or custom

### 5.5 Email Notifications
- New comment notifications
- Site update notifications
- Collaboration invites

### 5.6 Custom Domains
Users bring their own domain:
- CNAME setup instructions
- SSL certificate handling
- Vercel or Cloudflare domain verification

### 5.7 Collaboration
- Multiple editors per site
- Change suggestions / pull requests
- Activity feed

### 5.8 AI Features
- AI-assisted markdown generation (user provides API key)
- Auto-tagging / categorization
- Content suggestions

### 5.9 External Data Sources
- Google Sheets as data source for visualizations
- Airtable integration
- API data fetching at build time

### 5.10 Export Options
Every marble exportable as:
- Markdown (original)
- PDF
- Image (screenshot)
- Standalone HTML
- Embed code (iframe)

---

## IndieWeb Protocols (Ongoing)

Implement progressively as relevant:

| Protocol | What It Does | Priority |
|----------|--------------|----------|
| Microformats2 | Semantic markup | Phase 1 ✓ |
| Open Graph | Social sharing previews | Phase 1 ✓ |
| IndieAuth | Domain-based identity | Phase 3 |
| Webmention | Cross-site notifications | Phase 4 |
| Micropub | Standard posting API | Phase 5 |
| RSS/Atom | Feed subscription | Phase 2 |

---

## Technical Debt & Infrastructure

### Ongoing Considerations
- [ ] Monitoring and alerting for builds
- [ ] Error tracking (Sentry or similar)
- [ ] Analytics (privacy-respecting: Plausible, Fathom)
- [ ] Backup strategy for user content
- [ ] Rate limiting for API endpoints
- [ ] CDN caching strategy

### Hosting Evolution
1. **Now (Phase 1):** Single Vercel project
2. **Phase 3:** Vercel for app + Cloudflare Pages for user sites
3. **Future:** Evaluate based on scale and cost

---

## Ideas Parking Lot

Features that came up but aren't prioritized yet:

- [ ] RSS feed generation
- [ ] Sitemap generation
- [ ] Search (client-side: Pagefind, Lunr.js)
- [ ] Multi-language support
- [ ] Theme marketplace
- [ ] Plugin/visualizer marketplace
- [ ] Obsidian plugin for Bloob Haus
- [ ] VS Code extension
- [ ] CLI tool (`bloob publish`)
- [ ] Webhook integrations (Zapier, IFTTT)
- [ ] Version history / revision tracking
- [ ] Scheduled publishing
- [ ] A/B testing for content

---

## Decision Log

Track major decisions and their rationale:

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-29 | Hugo over Eleventy | Faster builds, single binary |
| 2026-01-29 | @flowershow/remark-wiki-link | Battle-tested, maintained |
| 2026-01-29 | Consent-first publishing | Aligns with values, prevents accidents |
| 2026-01-29 | Cloudflare for multi-user | Unlimited bandwidth, cost protection |
| 2026-01-29 | Microformats2 in templates | Low effort, IndieWeb compatibility |

---

## How to Use This Document

1. **Before adding features to Phase 1:** Check if it's listed here. If so, keep it here.
2. **When planning next phase:** Review this document for scope.
3. **When users request features:** Add to Ideas Parking Lot with source.
4. **Before implementing anything Phase 2+:** Get explicit approval.

---

*This document is a living reference. Update as plans evolve.*
