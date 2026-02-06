# Bloob Haus

Transform Obsidian markdown vaults into hosted static websites.

**Live site:** [buffbaby.bloob.haus](https://buffbaby.bloob.haus)

## How It Works

1. Content lives in a private Obsidian vault on GitHub
2. A preprocessing pipeline resolves wiki-links, images, and filters private content
3. Eleventy builds the static site with backlinks, RSS, and optimized images
4. Vercel deploys automatically on push

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.local.example .env.local  # Add your GITHUB_TOKEN and CONTENT_REPO

# Build
npm run build

# Development server
npm run dev
```

## Stack

- **Eleventy 3.x** - Static site generator (ESM)
- **esbuild** - Visualizer bundling
- **Vercel** - Hosting and auto-deployment
- **Obsidian** - Content authoring

## Features

- Obsidian wiki-link resolution (`[[links]]`)
- Dual-mode publishing (blocklist/allowlist)
- Backlinks between pages
- Interactive checkboxes with localStorage persistence
- Image optimization (WebP + responsive sizes)
- RSS feed, sitemap, robots.txt
- Modular visualizer architecture

## Documentation

See [`docs/CLAUDE_CONTEXT.md`](docs/CLAUDE_CONTEXT.md) for full project context, or browse:

- [`docs/CHANGELOG.md`](docs/CHANGELOG.md) - Session history
- [`docs/architecture/visualizers.md`](docs/architecture/visualizers.md) - Visualizer system
- [`docs/implementation-plans/ROADMAP.md`](docs/implementation-plans/ROADMAP.md) - Roadmap
- [`docs/implementation-plans/DECISIONS.md`](docs/implementation-plans/DECISIONS.md) - Decision log
