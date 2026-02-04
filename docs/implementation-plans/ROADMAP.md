# Bloob Haus Roadmap

**Purpose:** High-level planning document for features and phases.  
**Last Updated:** February 3, 2026  
**Status:** Phase 1 Complete, Phase 2 Planning

---

## Current Focus

**Phase 2: Enhanced Linking & API Foundation**

See [Phase 2 Implementation Plan](phases/phase-2-linking-api.md) for detailed tasks.

---

## Phase Overview

| Phase | Focus | Status | Details |
|-------|-------|--------|---------|
| Phase 1 | Recipe site (buffbaby.bloob.haus) | ✅ Complete | [Archived Plan](_completed/phase-1-implementation-plan.md) |
| Phase 2 | Enhanced linking + API foundation | 📋 Planning | [Phase 2 Plan](phases/phase-2-linking-api.md) |
| Phase 3 | Quick Mode + Multi-user | ⏳ Future | See below |
| Phase 4 | Interactive visualizers + Magic Machines | ⏳ Future | See below |
| Phase 5+ | Advanced features | 💡 Ideas | See below |

---

## Architecture Documentation

| System | Description | Docs |
|--------|-------------|------|
| **Visualizers** | "Read" tools that transform content into visual experiences | [Architecture](../architecture/visualizers.md) |
| **Magic Machines** | "Write" tools that transform content using AI | [Architecture](../architecture/magic-machines.md) |

---

## Phase 2: Enhanced Linking & API Foundation

**Goal:** Add backlinks, graph data, and prepare for webapp features.

### Key Deliverables
- `links.json` - Bidirectional link data for backlinks & graph
- `search-index.json` - Search data with titles, excerpts, tags, images
- Backlinks display on pages
- Pre-build validation for broken links
- RSS feed

**Detailed plan:** [phases/phase-2-linking-api.md](phases/phase-2-linking-api.md)

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
- **Link Previews** - Hover to see page preview
- **Graph Visualization** - Interactive note connections (D3.js)
- **Stacked Notes** - Andy Matuschak style columns
- **Timeline Visualizer** - Date-based content display
- **Recipe Scaling** - Cooklang syntax with scaling UI ([detailed plan](phases/2026-02-03_recipe-scaling.md))

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
| RSS/Atom | Feed subscription | Phase 2 |
| IndieAuth | Domain-based identity | Phase 3 |
| Webmention | Cross-site notifications | Phase 4 |
| Micropub | Standard posting API | Phase 5 |

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
1. **Phase 1 (current):** Single Vercel project
2. **Phase 3:** Vercel for app + Cloudflare Pages for user sites
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
5. **Create detailed plans** in `phases/` when ready to implement
