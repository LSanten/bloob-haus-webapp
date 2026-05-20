# Bloob Haus — Development Guide

This file is read automatically by Claude Code at session start. It contains development rules and practices.

## IMPORTANT: Read these files before doing any work

**These are NOT optional — read them before writing or modifying any code:**

1. **`docs/CLAUDE_CONTEXT.md`** — architecture overview, graph.json schema, build pipeline, what's working. May be outdated; check the "Last Updated" date and ask the user if the status section looks stale.
2. **`docs/TECH-DEBT.md`** — known debt to avoid making worse
3. **`docs/architecture/visualizers.md`** — before touching `lib/visualizers/`, `scripts/utils/inject-container-raw.js`, or any `:::` container / code fence behavior. Pay special attention to: `data-vis-raw` pipeline, `browser.js` ownership convention, settings flow, and `inject-container-raw.js` utility.
4. **`docs/architecture/themes.md`** — before touching `themes/` or CSS tokens
5. **`docs/architecture/settings-registry.md`** — before adding any new per-page frontmatter or site-wide setting to any theme. This is the authoritative list of all settings across all themes (universal vs theme-specific).

The session checklists below are a reminder for the END of the session.

## Project Quick Start
- This file (CLAUDE.md) contains development rules and practices
- `docs/CLAUDE_CONTEXT.md` — current project status and architecture overview (read it!)
- `docs/TECH-DEBT.md` — outstanding technical debt

## Sibling Repo: Planning Vault
The product vision, values, room concepts, and engineering reports live in a separate Obsidian vault at `../bloobhaus-notes/` (see its `CLAUDE.md`). If you need context on *why* things are designed a certain way, check there. This repo is the source of truth for *how* — technical architecture, build pipeline, and implementation plans.

## Cross-Platform Compatibility (Mac + Windows)
All scripts and `package.json` commands must work on both Mac/Linux and Windows. Key rules:
- **Never use `VAR=value node ...` inline env syntax in `package.json` scripts** — this fails on Windows. Pass values as CLI args instead (e.g. `node scripts/foo.js --site=x`).
- **Never use `cross-env` unless already a dependency** — prefer CLI args or `process.env` set inside the script itself.
- **Use `path.join` / `path.resolve` for all file paths** — never string-concatenate with `/` or `\`.
- When shelling out with `execSync`, pass env vars via the `env` option object, not inline shell syntax.

## Development Principles
1. **Don't build infrastructure for users you don't have yet** — build what makes current sites better today
2. **Implement when needed, not when designed** — avoid over-architecture
3. **Rule of Three** — don't abstract until you've built the same thing 3 times
4. **Feature flags** — every toggleable feature uses `sites/*.yaml` `features:` section
5. **Build time is a first-class metric** — investigate if it crosses 30s, alarm at 60s

## Multi-Site / Holistic Change Rule
**Any change to shared infrastructure affects ALL sites.** Before touching `scripts/`, `eleventy.config.js`, `lib/`, or `themes/_base/`, explicitly ask: "does this change break or degrade any existing site (marbles, buffbaby, or any future theme)?"

- Changes to `preprocess-content.js`, `assemble-src.js`, `publish-filter.js`, or any pipeline script must be **backwards compatible** — new behavior should only activate when a site/theme opts in
- Theme-specific work (new layouts, partials, assets) goes in `themes/[theme-name]/` — never in `themes/_base/` unless it is genuinely universal
- If a fix is needed for one theme, check whether the same bug affects other themes and fix it once at the right level
- Do not hardcode site names, URLs, or content paths in shared scripts — use `process.env.SITE_NAME`, `siteConfig`, or CLI args

## Session Checklist (start of session)
- [ ] Read `docs/CLAUDE_CONTEXT.md` for current status
- [ ] Check `docs/TECH-DEBT.md` for outstanding items
- [ ] Review recent `docs/CHANGELOG.md` entries for context
- [ ] Review `docs/implementation-plans/ROADMAP.md` for overall project scope
- [ ] Consult `docs/architecture/` if working on architectural changes

## Session Checklist (end of session)
- [ ] Update `docs/CHANGELOG.md` with session summary
- [ ] Add any new decisions to `docs/implementation-plans/DECISIONS.md`
- [ ] Update `docs/CLAUDE_CONTEXT.md` if project structure or status changed
- [ ] Update `docs/TECH-DEBT.md` if new debt was introduced or old debt resolved
- [ ] Update `docs/architecture/` if new architectural patterns were introduced
- [ ] **If new per-page or site-wide settings were added to any theme:** update `docs/architecture/settings-registry.md` — add a row under the correct theme (or Universal if it applies to all). This is the single source of truth for all settings.
- [ ] **If new features or settings were added:** manually update the "All Possible Settings" table in `_bloob-settings.md` in both vault repos (`bloob-haus-marbles` and `buffbaby`). This is handwritten until a magic machine automates it.
- [ ] Run tests: `npm test`

## Code Quality Rules
- Run `npx depcheck` before adding dependencies — keep the tree lean
- When fixing a bug: write a regression test FIRST, then fix
- Co-located tests: visualizers and modular packages carry their own `.test.js`
- Central tests: pipeline utilities go in `tests/`
- Never hardcode site-specific values in shared infrastructure (`eleventy.config.js`, `scripts/`)
- Feature flags: check `siteConfig.features.X` before enabling per-site behavior

## Documentation Rules
- New architectural decisions → `docs/implementation-plans/DECISIONS.md` (date + rationale)
- New feature ideas → `docs/implementation-plans/IDEAS.md` (don't clutter ROADMAP)
- Session work → `docs/CHANGELOG.md`
- Technical debt → `docs/TECH-DEBT.md`
- Project status → `docs/CLAUDE_CONTEXT.md`
- Architecture patterns → `docs/architecture/` (visualizers, magic-machines, search, etc.)
- New or changed settings (any theme) → `docs/architecture/settings-registry.md`

## File Identity Convention
- Files are identified by filename (slug). URLs derive from filenames, not titles.
- If a file is renamed, its URL changes. This is the current design tradeoff.
- UUID-based file identity is deferred to Phase 3+ (noted in IDEAS.md)

## Build Pipeline Architecture
Both dev and prod use the same orchestration steps via `scripts/dev-local.js` and `scripts/build-site.js`:
1. **Preprocess** (`preprocess-content.js`) — filter private content, copy attachments, resolve links
2. **Assemble** (`assemble-src.js`) — copy theme files, generate favicons
3. **Bundle visualizers** (`bundle-visualizers.js`)
4. **Eleventy** — build or serve

**Do not add new dev-only script chains in `package.json`.** All dev commands go through `dev-local.js`. This keeps dev/prod behavior identical and prevents bugs from env var differences.

## Private Content Safety Rules
- `publish-filter.js` reads `blocklist_tag` from the vault's `_bloob-settings.md` — **never from env vars alone**
- `preprocess-content.js` loads site config itself; callers don't need to pre-set env vars
- `blocklist_tag` accepts both `tag` and `#tag` formats — the `#` is stripped at filter entry
- **Any change to publish filtering must be tested with actual private-tagged files**

## Key Commands
```bash
npm run build             # Full build (defaults to buffbaby)
npm run dev               # Dev server with hot reload + file watching
npm run dev:marbles       # Dev server for marbles site
npm run dev:buffbaby      # Dev server for buffbaby site
npm test                  # Run all tests
npm run test:watch        # Watch mode
```

## Debugging and Testing the Pipeline

### Per-site src directories
Each site gets its own generated `src-*/` directory. The subdomain from `site.url` determines the name:
- `leons.bloob.haus` → `src-leons/`
- `buffbaby.bloob.haus` → `src-buffbaby/`
- `melt.bloob.haus` → `src-melt/`

The mapping is in `scripts/utils/get-src-dir.js`. Check `ls src-*/` from the project root to see all current per-site directories.

### What to look for in `src-*/`
After running a dev build, `src-leons/` (for example) should contain:
- `favicon.png` and `apple-touch-icon.png` — generated by `generate-favicons.js`
- `.favicon-hash` — MD5 of the source image; used to skip regeneration
- `media/` — vault attachments copied at vault-relative paths
- `_includes/layouts/` and `_includes/partials/` — theme templates
- `_data/site.js` — generated site data (logo URL, feature flags, etc.)
- `assets/` — theme CSS/JS

If `favicon.png` is missing but `.favicon-hash` exists, the cache is stale — delete `.favicon-hash` and rebuild.

### Testing a single pipeline script in isolation
Run a script directly without a full dev build. Useful for debugging one step:
```bash
# Test favicon generation for marbles without running the full build
SITE_NAME=marbles node -e "
import('./scripts/utils/config-loader.js').then(async ({ loadSiteConfig }) => {
  const config = await loadSiteConfig('marbles', { contentDir: '../bloob-haus-marbles' });
  process.env.SRC_DIR = '/path/to/bloob-haus-webapp/src-leons';
  const { generateFavicons } = await import('./scripts/generate-favicons.js');
  await generateFavicons({ config });
}).catch(console.error);
"
```

The pattern: import the config loader, build the config with the real content dir, set `SRC_DIR` to the per-site src directory, then import and call the specific function.

### Checking running dev servers
```bash
lsof -i :8080 -i :8082 -i :8083   # Check which ports are in use
pkill -f "eleventy --serve"         # Kill all Eleventy instances
pkill -f "dev-local.js"             # Kill dev orchestrators
```

### Useful one-off checks
```bash
# Does a specific file exist after a build?
ls src-leons/favicon.png src-leons/.favicon-hash

# What logo/media files exist in a site's src?
find src-leons/media -name "*.png" | grep -v optimized | head -20

# What does the generated site data say about the logo URL?
node -e "import('./src-leons/_data/site.js').then(m => console.log(m.default.logo))"

# Which ports are used by which process?
lsof -i :8080
```

### Three-tier test strategy (from DECISIONS.md)
1. `npm test` — pure unit tests, no build needed, fastest feedback
2. `node -e "..."` isolated script invocation — test one pipeline step against real vault data without starting Eleventy
3. `npm run dev:marbles` full build — needed for end-to-end verification (template rendering, passthrough copies, Eleventy transforms)
