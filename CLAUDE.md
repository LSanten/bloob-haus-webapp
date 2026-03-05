# Bloob Haus — Development Guide

This file is read automatically by Claude Code at session start. It contains development rules and practices.

## Project Quick Start
- Read `docs/CLAUDE_CONTEXT.md` for project status and architecture overview
- Read `docs/TECH-DEBT.md` for outstanding technical debt
- This file (CLAUDE.md) contains development rules and practices

## Sibling Repo: Planning Vault
The product vision, values, room concepts, and engineering reports live in a separate Obsidian vault at `../bloobhaus-notes/` (see its `CLAUDE.md`). If you need context on *why* things are designed a certain way, check there. This repo is the source of truth for *how* — technical architecture, build pipeline, and implementation plans.

## Development Principles
1. **Don't build infrastructure for users you don't have yet** — build what makes current sites better today
2. **Implement when needed, not when designed** — avoid over-architecture
3. **Rule of Three** — don't abstract until you've built the same thing 3 times
4. **Feature flags** — every toggleable feature uses `sites/*.yaml` `features:` section
5. **Build time is a first-class metric** — investigate if it crosses 30s, alarm at 60s

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
