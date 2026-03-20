Perform a holistic documentation sync. The goal is to make sure all docs accurately reflect the current state of the codebase — not what was planned or what existed months ago.

First, orient yourself: read CLAUDE.md at the project root to confirm the locations of the bloob-haus-webapp/ directory, the alter-website-content/ directory, and the docs/ folder.

1. Read the following files to understand current state:
   - CLAUDE.md at the project root
   - bloob-haus-webapp/CLAUDE.md
   - bloob-haus-webapp/docs/CLAUDE_CONTEXT.md
   - docs/next-steps.md at the project root

2. Scan the actual codebase to check for drift:
   - List bloob-haus-webapp/lib/visualizers/ — are all visualizers listed in CLAUDE_CONTEXT.md?
   - List bloob-haus-webapp/themes/ — are all themes listed?
   - List bloob-haus-webapp/sites/ — are all sites listed?
   - Check that the graph.json node schema documented in CLAUDE_CONTEXT.md matches what bloob-haus-webapp/scripts/preprocess-content.js actually writes

3. Update bloob-haus-webapp/docs/CLAUDE_CONTEXT.md for anything that's drifted: outdated status items, missing visualizers, wrong node schema, stale "What to Do Next".

4. Update CLAUDE.md at the project root if anything in the "Required reading" or "Key facts" section is wrong or outdated.

5. Update bloob-haus-webapp/CLAUDE.md if the session checklist or rules are out of date.

6. Update docs/next-steps.md at the project root — move anything completed to the "What's Done" section, update next steps to reflect reality.

7. Report: what was outdated, what you changed, and anything you couldn't verify from the codebase alone.
