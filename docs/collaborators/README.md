# Collaborator Kit

This folder is for people **collaborating directly with the Bloob Haus maintainer** — early adopters
who are helping shape the platform by being among the first to fork it and build a real site.

If you're a solo self-serve user with no relationship to the maintainer, you don't need anything here.
Go to [`../onboarding/`](../onboarding/) instead.

---

## What this kit is for

As a collaborator, the friction you hit — a note you had to restructure, a concept that confused you, a
step that didn't work — is genuinely valuable. It's the raw material that makes the onboarding smoother
for the next person. So this kit sets up a lightweight, **automatic** way to capture that friction as
you work, without you having to stop and journal.

It works like the project's own `docs/architecture/shape-authoring-log.md`: an append-only log that a
polished guide gets distilled from later. Your AI assistant does the capturing; you just work.

---

## The three pieces

| File | You create it as | Tracked in git? | What it does |
|---|---|---|---|
| `collaborating.template.md` | `docs/collaborators/collaborating.md` | ✅ yes | Your working agreement with the maintainer: what to document, how you send changes back. |
| `field-notes.template.md` | `<yourname>-field-notes.md` (repo root) | ✅ **yes** | Your journey log. This is what reaches the maintainer. |
| `CLAUDE.local.template.md` | `CLAUDE.local.md` (repo root) | ❌ **no (gitignored)** | The instruction that makes your AI log to the field-notes file automatically. Lives only on your machine. |

### Why two separate files for the log?

This is the important design point. The **log** and the **instruction that writes to it** are kept
apart on purpose:

- Your `<yourname>-field-notes.md` is **committed**, so it travels back to the maintainer when you push
  or open a PR.
- Your `CLAUDE.local.md` is **gitignored**, so it exists *only on your clone*. It never gets committed,
  and the maintainer's own AI never sees it. That's what makes the logging *yours* and not theirs —
  identity is established simply by the file not existing on anyone else's machine. No magic detection.

The maintainer maintains the **templates** (the `.template.md` files here). Your personal
`CLAUDE.local.md` is a one-time copy you own — if the template later improves, you re-copy it.

---

## Setup (do this once, right after you fork)

From the root of your fork:

```bash
# 1. Your working agreement (tracked)
cp docs/collaborators/collaborating.template.md docs/collaborators/collaborating.md

# 2. Your field-notes log (tracked). Replace <yourname>.
cp docs/collaborators/field-notes.template.md <yourname>-field-notes.md
git add <yourname>-field-notes.md

# 3. The personal AI instruction (NOT tracked — .gitignore already lists CLAUDE.local.md)
cp docs/collaborators/CLAUDE.local.template.md CLAUDE.local.md
```

Then open `CLAUDE.local.md` and `collaborating.md` and replace the placeholders:
- `<yourname>` → your name (e.g. `odalys`)
- `<yourname>-field-notes.md` → your actual log filename

**Verify it loaded:** start a Claude Code session and run `/context`. You should see `CLAUDE.local.md`
listed under **Memory files**. If it's there, your AI will now log friction automatically.

> `CLAUDE.local.md` is already in this repo's `.gitignore`, so step 3 stays personal with no extra
> action. Double-check with `git status` — it should **not** show `CLAUDE.local.md` as a new file.
