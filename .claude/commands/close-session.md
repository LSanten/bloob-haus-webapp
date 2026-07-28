Close out this work session. Keep updates concise — these docs should be easy to scan, not exhaustive.

All paths below are relative to the `bloob-haus-webapp/` repo root.

1. Run `npm test` and report results. Flag failures.

2. Add a short entry to `docs/CHANGELOG.md`:
   - One sentence per major thing built or fixed
   - Note anything left incomplete
   - Keep it under ~15 lines

3. Update `docs/CLAUDE_CONTEXT.md` only if the project status or "what's working" list meaningfully changed. Its cited test count and "Last Updated" date go stale quietly — check them.

4. Add to `docs/implementation-plans/DECISIONS.md` only if a genuinely architectural decision was made — something future-Claude needs to know *why* a thing works the way it does. Skip implementation details.

5. `docs/TECH-DEBT.md` — **follow that file's own two rules, they are not optional:**
   - **Every new row needs a *How to check*** — a fast command or observation that reveals whether the item is still real. A row without one is the exact failure the file was rewritten to end.
   - **Delete rows that got fixed.** Never leave a "✅ Done" row; the history belongs in CHANGELOG. A row's existence *is* its status.
   - Use the next free ID from the header, then increment it. IDs are stable and never reused — code comments reference them by number.

6. Update `docs/next-steps.md` — move completed items out of "Immediate Next Steps" and add a summary line to "What's Done". Delete finished items rather than ticking them. Update the "Last updated" line.

7. **If settings changed**, update `docs/architecture/settings-registry.md` (the single source of truth for all settings across all themes), and note that the "All Possible Settings" table in each vault's `_bloob-settings.md` is handwritten and needs the same change by hand.

8. **If a new architectural pattern was introduced**, update the relevant file in `docs/architecture/`. If the work touched shapes, that includes the trinity — `ontology.md` / `shapes.md` / `visualizers.md`.

9. Commit and push **`bloob-haus-webapp/` only**. Write a clear commit message. Report the result.

10. **Report — do not commit — the state of any sibling repo this session touched.** Work routinely spills into `../bloob-haus-obsidian-plugin/`, the content vaults (`../melt-website/`, `../bloob-haus-marbles/`, `../buffbaby/`), or `../bloob-haus-cloud/`. Run `git status --porcelain` and `git log --oneline @{u}..HEAD` in each, and say plainly what is uncommitted or unpushed, and which changes were yours versus the user's. The user commits vaults themselves; the point is that nothing is silently left behind.
