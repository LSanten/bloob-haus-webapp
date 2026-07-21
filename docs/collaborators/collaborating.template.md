<!--
  TEMPLATE — copy this to `docs/collaborators/collaborating.md` and personalize.
  This file IS committed. It's the working agreement between you and the maintainer.
-->

# Collaborating on Bloob Haus — <yourname>

This is the working agreement between me (**<yourname>**) and the Bloob Haus maintainer while I build my
own site by forking this repo. It's short on purpose.

## ⚠️ Read this first — everything to the shared repo goes through a pull request

I may currently have **collaborator access** to the shared `LSanten/bloob-haus-webapp` repo. **I do not
use it to push directly.** All my work on shared code reaches the maintainer as a **pull request** that
the maintainer reviews and merges. I never push to the shared repo's `main`, and I never edit the
maintainer's content or other sites.

- This access is **temporary** and will be **removed** once the fork workflow is settled — so relying
  on direct push would break anyway. PRs are the durable path; use them from day one.
- Concretely: I work on **my own fork**, push to **my fork**, and open a **PR** from my fork to
  `LSanten/bloob-haus-webapp` for anything shared. See
  [`../onboarding/fork-deploy-and-workflow.md`](../onboarding/fork-deploy-and-workflow.md) → "Sending
  your improvements back."
- **Never** `git push` to `LSanten/bloob-haus-webapp` directly, and **never** `git push upstream main`.

## How we work together

- **My content is mine.** It lives in my own vault repo. The builder just reads it.
- **My fork is mine.** My theme (`themes/<yourname>/` or the theme I was handed) and my site config
  (`sites/<yourname>.yaml`) live here. I push to my own fork freely.
- **Shared changes flow back by pull request only** (see the warning above). Every change is reviewable,
  which is what keeps the shared builder safe.

## Two channels, two purposes

| I want to… | I use… |
|---|---|
| Record friction / confusion / "I wish this just worked" | my field-notes log (`<yourname>-field-notes.md`) — my AI keeps it automatically |
| Propose an actual change to shared code, a theme, or a doc | a **pull request** to `LSanten/bloob-haus-webapp` |
| Float an idea before building it | open a GitHub issue, or note it in the field-notes and flag it for the maintainer |

Keep these separate: the log is my *journey* (raw, for the maintainer to learn from); PRs are *changes*
(reviewed, for the shared repo).

## The how-to lives elsewhere (don't duplicate it here)

Everything about *how* to actually do the work is in the shared docs — this file doesn't repeat it:

- Getting started: [`../onboarding/`](../onboarding/)
- Fork / deploy / pull-updates / PR rhythm: [`../onboarding/fork-deploy-and-workflow.md`](../onboarding/fork-deploy-and-workflow.md)
- Git remote safety + commit hygiene: the repo root [`CLAUDE.md`](../../CLAUDE.md)

## Commit hygiene (the one rule that matters for upstreaming)

Keep **shared** changes (`lib/`, `scripts/`, `themes/_base/`, `tests/`) and **my personal** changes
(`themes/<yourname>/`, `sites/<yourname>.yaml`, my field notes) in **separate commits**. That's what
lets my good ideas get cherry-picked upstream cleanly. Full rationale in the root `CLAUDE.md`.
