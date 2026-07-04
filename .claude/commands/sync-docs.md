Perform a holistic documentation sync. The goal is to make sure all docs accurately reflect the current state of the codebase — not what was planned or what existed months ago.

All paths below are relative to the repository root (the `bloob-haus-webapp` repo itself — it is checked out standalone, so the repo root IS the project root).

1. Read the following to understand current state:
   - `CLAUDE.md` (repo root — development practices, auto-read by Claude Code)
   - `docs/CLAUDE_CONTEXT.md` (quick orientation / status)
   - `docs/CHANGELOG.md` (recent session history)

2. Scan the actual codebase to check for drift:
   - List `lib/visualizers/` — are all visualizers (and any file-scope shapes with a `layout.njk`) reflected in `docs/CLAUDE_CONTEXT.md` and `docs/architecture/shapes.md`?
   - List `themes/` — are all themes listed (currently: alter-engineers, marbles-pouch, melt, warm-kitchen)?
   - List `sites/` — are all site YAMLs listed (currently: alter-engineers, buffbaby, marbles, melt)?
   - List `docs/architecture/` — does the "Documentation Map" in CLAUDE_CONTEXT.md list all of them?
   - Check that the graph.json node schema documented in CLAUDE_CONTEXT.md matches what `scripts/preprocess-content.js` actually writes.

3. Update `docs/CLAUDE_CONTEXT.md` for anything that's drifted: bump "Last Updated", fix outdated status items, add missing visualizers/themes/sites/docs, correct the node schema, refresh "What to Do Next".

4. Update `CLAUDE.md` (repo root) if the "IMPORTANT: Read these files" list, session checklists, or rules are out of date (e.g. a new architecture doc that should be required reading).

5. Update `docs/architecture/settings-registry.md` if new settings shipped and aren't documented, and any other `docs/architecture/*.md` that has drifted from the code.

6. Report: what was outdated, what you changed, and anything you couldn't verify from the codebase alone.

Note: this repo has no project-root `next-steps.md` or `alter-website-content/` — do not look for them.
