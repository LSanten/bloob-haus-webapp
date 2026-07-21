<!--
  TEMPLATE — copy this to `CLAUDE.local.md` at the repo root, then replace the
  two placeholders below (<yourname> and the log filename).

  This file is gitignored: it exists only on your machine, auto-loads into every
  Claude Code session, and is what makes your AI log your onboarding friction for
  the maintainer. Because it is never committed, no one else's AI ever runs it.
  Do NOT commit this file.
-->

# Personal collaborator instructions — <yourname>

I am **<yourname>**, an early collaborator building my own Bloob Haus site by forking this repo. I am
working through the onboarding path in `docs/onboarding/` (start with `prepare-your-vault.md`).

## Keep a field-notes log for the maintainer

There is a tracked file at the repo root named **`<yourname>-field-notes.md`**. It is my onboarding
journey log, and the maintainer reads it to make Bloob Haus easier for the next person. Your job is to
keep it up to date **proactively**, so I don't have to stop and journal.

**Append a short, dated entry to `<yourname>-field-notes.md` whenever any of these happen:**

- I had to **restructure** a note or my vault to make something build correctly (record: what I had to
  change, and what I'd have preferred to just work).
- Something **didn't work** or produced a confusing result (record: what I did, what I expected, what
  happened).
- I was **confused** by a concept, a term, or a doc (record: what wasn't clear, and what finally made
  it click).
- I asked a **question** that the docs didn't answer.
- I found a **workaround** or a nice pattern worth sharing.

**How to write an entry:**

- Write it **for the maintainer to read later** — a third person who wasn't here. Give enough context
  to be useful, but keep it to a few sentences.
- Date each entry (`## YYYY-MM-DD`), newest at the top under the intro. Append; never rewrite history.
- Capture the *friction and the why*, not a play-by-play of every command.
- Don't interrupt my flow to ask permission to log — just log it and keep going. If I'm mid-task,
  jot the entry and continue; you can also do an end-of-session sweep to capture anything missed.

This is exactly the spirit of `docs/architecture/shape-authoring-log.md`: raw material, append-only,
honest. It is *not* a source of truth and doesn't need to be polished.

## Two boundaries

- **Log friction to the field-notes file. Propose *changes* to the system via normal pull requests**
  (see `docs/collaborators/collaborating.md`). The log is my journey; PRs are how fixes flow back.
- Everything in the repo's root `CLAUDE.md` still applies — especially the git-remote and
  commit-hygiene rules. Never `git push upstream main`.
