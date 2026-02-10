# Bloob Haus Roadmap

**Purpose:** High-level planning document for features and phases.  
**Last Updated:** February 9, 2026  
**Status:** Phase 1 Complete, Eleventy Migration Complete, Phase 2.5 (Tags & Search) Complete

---

## Current Focus

**Phase 2: Enhanced Linking & API Foundation**

See [Phase 2 Implementation Plan](phases/phase-2/phase-2-linking-api.md) for detailed tasks.

---

## Phase Overview

| Phase | Focus | Status | Details |
|-------|-------|--------|---------|
| Phase 1 | Recipe site (buffbaby.bloob.haus) | ✅ Complete | [Archived Plan](_completed/phase-1-implementation-plan.md) |
| Migration | Hugo → Eleventy (M0-M7) | ✅ Complete | [Migration Plan](_completed/2026-02-05_Migration-plan-from%20HUGO%20to%20ELEVENTY.md) |
| Phase 2 | Enhanced linking + API foundation | 📋 Planning | [Phase 2 Plan](phases/phase-2/phase-2-linking-api.md) |
| Phase 2.5 | Tags, search, page preview | ✅ Complete | [Archived Plan](_completed/2026-02-08%20tag%20system%20and%20search%20implementation.md) |
| Phase 3 | Quick Mode + Multi-user | ⏳ Future | See below |
| Phase 4 | Interactive visualizers + Magic Machines | ⏳ Future | See below |
| Phase 5+ | Advanced features | 💡 Ideas | See below |

---

## Architecture Documentation

| System | Description | Docs |
|--------|-------------|------|
| **Visualizers** | "Read" tools that transform content into visual experiences | [Architecture](../architecture/visualizers.md) |
| **Magic Machines** | "Write" tools that transform content using AI | [Architecture](../architecture/magic-machines.md) |
| **Search** | Static search with Pagefind, tag filtering, multi-index merging | [Architecture](../architecture/search.md) |

---

## Phase 2: Enhanced Linking & API Foundation

**Goal:** Add graph data, search, and prepare for webapp features.

### Already Completed (during migration)
- ✅ Backlinks display on pages (M5)
- ✅ RSS feed (`/feed.xml`)
- ✅ Sitemap (`/sitemap.xml`)
- ✅ Image optimization (WebP + responsive)

### Remaining Deliverables
- `links.json` - Bidirectional link data for graph visualization
- `search-index.json` - Search data with titles, excerpts, tags, images
- Pre-build validation for broken links
- Client-side search (lunr.js or pagefind)

**Detailed plan:** [phases/phase-2/phase-2-linking-api.md](phases/phase-2/phase-2-linking-api.md)

---

## Phase 2.5: Tag Index System & Search

**Goal:** Comprehensive tag indexing, navigation, and full-text search.

### Completed
- ✅ **Tag extraction** — from frontmatter (with/without `#`) and inline `#tags` in body
- ✅ **Tag Index Page** — browse all tags at `/tags/` with weighted tag cloud
- ✅ **Individual Tag Pages** — `/tags/[tag-name]/` showing all pages with that tag
- ✅ **Privacy Protection** — tag extraction runs after publish-filter; `not-for-public` stripped
- ✅ **Pagefind search** — full-text search at `/search/` with tag filtering
- ✅ **Search thumbnails** — OG images shown in search results
- ✅ **Page preview visualizer** — eye icon button on cards/tags/search, modal overlay

### Not Yet Implemented
- Inline tag suggestions ("Related by tag" boxes on pages)
- Hierarchical tags (`#recipe/dessert`)

**Detailed plan:** [_completed/2026-02-08 tag system and search implementation.md](_completed/2026-02-08%20tag%20system%20and%20search%20implementation.md)

---

## Phase 3: Quick Mode & Multi-User

**Goal:** Anyone can create visualizations without GitHub.

### Key Features
- **Quick Mode** - Paste markdown, get instant hosted URL
- **User Accounts** - Dashboard, edit/delete capabilities
- **Multi-User Repo Mode** - GitHub OAuth, per-user subdomains
- **Wildcard Subdomains** - `username.bloob.haus`
- **Cloudflare Pages** - For user sites (unlimited bandwidth)
- **Pricing Model** - Free tier + paid options

---

## Phase 4: Interactive Visualizers

**Goal:** Dynamic, interactive visualizations beyond static pages.

### Planned Visualizers
- ~~**Link Previews** - Hover to see page preview~~ → Done as **page-preview** visualizer (eye icon button + modal)
- **Graph Visualization** - Interactive note connections (D3.js)
- **Stacked Notes** - Andy Matuschak style columns
- **Timeline Visualizer** - Date-based content display
- **Recipe Scaling** - Cooklang syntax with scaling UI ([detailed plan](phases/phase-2/2026-02-03_recipe-scaling.md))

### Magic Machines (Phase 4+)
- Local magic machine runner
- Recipe unit extractor (first implementation)

---

## Phase 5+: Advanced Features

### Access Control
- Site-wide password
- Per-page access (Next.js middleware)
- Private/time-limited links

### Content Features
- Full transclusion support (`![[embed]]`)
- Mobile publishing workflow
- Comments / discussions
- Version history

### Platform Features
- Custom domains for users
- Collaboration (multiple editors)
- AI features (user provides API key)
- External data sources (Google Sheets, Airtable)
- Export options (PDF, image, standalone HTML)

---

## IndieWeb Protocols

| Protocol | Purpose | Phase |
|----------|---------|-------|
| Microformats2 | Semantic markup | ✅ Phase 1 |
| Open Graph | Social previews | ✅ Phase 1 |
| RSS/Atom | Feed subscription | ✅ Complete |
| IndieAuth | Domain-based identity | Phase 3 |
| Webmention | Cross-site notifications | Phase 4 |
| Micropub | Standard posting API | Phase 5 |

---

## Technical Debt & Infrastructure

### Ongoing Considerations
- [ ] Test suite foundation — Vitest, preprocessing unit tests ([detailed plan](phases/phase-2/2026-02-07_test-suite.md))
- [ ] Monitoring and alerting for builds
- [ ] Error tracking (Sentry or similar)
- [ ] Analytics (privacy-respecting: Plausible, Fathom)
- [ ] Backup strategy for user content
- [ ] Rate limiting for API endpoints
- [ ] CDN caching strategy

### Hosting Evolution
1. **Current:** Single Vercel project (Eleventy)
2. **Next:** Hybrid EU + CDN — Scaleway (builds, private content, DB) + Cloudflare Pages (public content). See hosting architecture research in Obsidian vault.
3. **Future:** Evaluate based on scale and cost

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [DECISIONS.md](DECISIONS.md) | Why we chose X over Y |
| [IDEAS.md](IDEAS.md) | Unprioritized feature ideas |
| [Visualizer Architecture](../architecture/visualizers.md) | How visualizers work |
| [Magic Machines Architecture](../architecture/magic-machines.md) | How magic machines work |

---

## How to Use This Document

1. **Check current focus** at the top
2. **Review phase details** before starting work
3. **Add ideas** to [IDEAS.md](IDEAS.md), not here
4. **Log decisions** in [DECISIONS.md](DECISIONS.md)
5. **Create detailed plans** in `phases/<phase-N>/` when ready to implement
