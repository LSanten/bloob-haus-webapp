# Onboarding Documentation — Design Spec

**Created:** 2026-07-20
**Status:** Design approved (Leon, 2026-07-20). Next: implementation plan → write the docs.
**Related:** `docs/architecture/bring-your-own-theme.md`, `themes.md`, `shapes.md`,
`settings-registry.md`, `ontology.md`; `docs/architecture/shape-authoring-log.md` (the
distilled-guide / raw-log pattern this borrows); memory `odalys-onboarding-and-bloob-shape`.

---

## Why this exists

Odalys is the first **external forker** of `bloob-haus-webapp` — she will fork the repo, own her
own theme + `sites/odalys.yaml` + a content vault, and deploy to `odalys.bloob.haus` on Leon's
Cloudflare zone (Deploy-Hook hosting, PR-only upstream). See memory
`odalys-onboarding-and-bloob-shape`.

Two things must exist that don't yet:

1. **A self-serve onboarding path** so *any* future stranger can fork and stand up their own bloob
   haus without hand-holding. None of this is written today.
2. **A collaborator kit for Odalys specifically** — she is greenfield (vault not yet bloob-shaped)
   and content-first, and Leon wants her to *document her own journey* so future users need to
   restructure even less. Her friction points are the raw material that improves the onboarding
   docs over time.

The doc-unification prerequisite is already done: `bloob-shape:` is the single forward-facing
identity+rendering key, and `ontology.md`/`shapes.md` are the clean conceptual/technical SSOT pair
(committed to `main`, 2026-07-20). This spec builds on top of that.

---

## The two guiding principles

### 1. Link into SSOTs; never restate them

The architecture docs (`ontology.md`, `shapes.md`, `themes.md`, `bring-your-own-theme.md`,
`settings-registry.md`) are already the single sources of truth. The failure mode that produces
doc-sprawl is an onboarding doc that **re-explains** what those already say — now two copies drift.

**Rule:** an onboarding doc is a *guided path* that links into the existing SSOTs. It says "now set
your CSS tokens → see [themes.md#token-contract]", it does **not** paste the token list. This single
rule is what keeps new docs from becoming new things to maintain.

### 2. Two layers: distilled guides + append-only field log

Mirror the pattern already trusted for shapes (`shape-authoring-log.md` is explicitly *"raw
material, not a source of truth"* that a polished guide gets distilled from):

- **Guides** = truth, structured, maintained.
- **Field log** = raw, append-only, dated derivation. The AI captures it; the human just works.
  Guides get refined *from* the log.

The field log is a **Bucket 2 (collaborator)** mechanism only — see Rule of Three note below.

---

## The two buckets (the core structure)

Split by audience. The split does real work: Bucket 1 stays clean for strangers, while the
"report to Leon" machinery — which only makes sense *because* Odalys collaborates with Leon — is
quarantined in Bucket 2.

### Bucket 1 — Public onboarding (any stranger forking their own bloob haus)

- **Home:** `docs/onboarding/`
- **Audience:** self-serve user with *no* relationship to Leon.
- **Travels with every fork.** Zero Odalys-specifics. Zero field-log.

| Doc | Purpose | Links into (does NOT restate) |
|---|---|---|
| `README.md` | Start-here / guided path / index. Content-first and reassuring: *"a plain markdown file is already a website — you probably don't need to restructure much."* Owns only the ordering of the journey. | all of the below |
| `prepare-your-vault.md` | The content-first guide. Thesis: **the only load-bearing YAML is `bloob-shape:`**; folder = room, filename = URL; everything else optional. Doubles as the AI-assisted vault-conversion guide. | `shapes.md` (what a shape is), `ontology.md` (the "undefined pile" progression), `settings-registry.md` (per-page keys), `urls-and-ids.md` |
| `fork-deploy-and-workflow.md` | One-time setup **and** ongoing workflow: fork → Cloudflare Deploy-Hook runbook → BRAT install of `LSanten/bloob-haus-obsidian-plugin` → pull-upstream / PR-back / keep shared vs. personal changes separate. | `CLAUDE.md` (git remotes + commit hygiene), `bring-your-own-theme.md` |
| `sites/_template.yaml` | Annotated site-config template (copy + fill in). Replaces "copy melt.yaml and guess." | `settings-registry.md` |

**Reference vault:** melt is the clean worked example throughout (migrated, `bloob-shape:`-native).

### Bucket 2 — Odalys collaborator kit (just her, working with Leon)

- **Home (templates):** `docs/collaborators/` — a clean, *separate* tree, not mixed into the public
  path. Reusable if a second collaborator ever appears.
- **Activated in:** her fork.
- **Audience:** assumes the Leon-and-Odalys relationship.

| File | Location in her fork | Tracked? | Role |
|---|---|---|---|
| `collaborating.md` | `docs/collaborators/collaborating.md` (from template) | ✅ tracked | Her mandate to document her journey *for Leon*; how the two collaborate (PRs back; where change-ideas/proposals go); pointer to Bucket 1 for the actual how-to (**no duplication**). |
| `odalys-field-notes.md` | repo root | ✅ **tracked** | Her journey log. Reaches Leon via PR / pull. |
| `CLAUDE.local.md` | repo root | ❌ **gitignored** | The instruction that drives the auto-logging, personalized to her. Exists **only on her clone**. |

---

## The field-log mechanism (Bucket 2)

### Why two separated files solve "her, not me"

The log file and the instruction that drives it live in **different places on purpose**:

- **`odalys-field-notes.md`** is *tracked* → it reaches Leon (he pulls her fork or she PRs it).
- **`CLAUDE.local.md`** is *gitignored* → it exists only on her clone. Leon's Claude never sees it
  and never logs to her file. **Identity is established by the file simply not existing on Leon's
  machine** — no runtime detection, no fragility.

`CLAUDE.local.md` auto-loads into her every session (verified against current Claude Code docs,
2026-07-20: `CLAUDE.local.md` is a first-class, *non-deprecated* "Local instructions" scope, loaded
alongside `CLAUDE.md` and meant to be gitignored). So the logging is automatic without her invoking
anything. No `@import` is used, so there is no external-import approval dialog — simplest path.

### Logging behavior (the `CLAUDE.local.md` content)

Instructs her AI to **proactively** append a dated entry whenever she hits friction — a file she
had to restructure, a concept that confused her, a step that failed, a question she asked — written
*for Leon to read later*, plus an end-of-session sweep. Same spirit as `shape-authoring-log.md`:
the AI captures the derivation; she just works.

**It is an AI instruction, not a hook.** "Was that a struggle?" is a judgment call; hooks are for
deterministic lifecycle events. (Confirmed by the memory docs: use CLAUDE.md-style instructions for
judgment, hooks for enforcement.)

### Her change-ideas / proposals

The field log captures *friction* (the journey). Her *proposals* about how the system should change
go through the normal PR path (lightweight, already works), optionally staged as a section in
`collaborating.md`. We do **not** build a separate proposals subsystem.

---

## Exactly how Leon gives Odalys the file, and where it goes

**One-time, upstream (so every future forker/collaborator inherits it):**

1. Add `CLAUDE.local.md` to the repo's `.gitignore`.
2. Commit the Bucket 2 templates under `docs/collaborators/`:
   - `collaborating.template.md`
   - `field-notes.template.md`
   - `CLAUDE.local.template.md`

**Then nothing is sent out-of-band — it travels with the fork.** Her setup steps (spelled out in
`fork-deploy-and-workflow.md` → collaborator note, or Leon walks her through once):

1. Copy `docs/collaborators/CLAUDE.local.template.md` → **`./CLAUDE.local.md`** (repo root, next to
   `CLAUDE.md`). Replace the name placeholder with "Odalys" and the log filename with
   `odalys-field-notes.md`. Matches the gitignore entry → stays personal automatically.
2. Copy `docs/collaborators/field-notes.template.md` → **`./odalys-field-notes.md`** (repo root),
   then `git add` it so it is tracked.
3. Copy `docs/collaborators/collaborating.template.md` → **`docs/collaborators/collaborating.md`**,
   personalize.
4. Verify it loaded: run `/context`, confirm `CLAUDE.local.md` appears under **Memory files**.

**Fallback** (if Leon prefers to hand it over directly rather than ship the template): send her the
`CLAUDE.local.md` content, she saves it at repo root. Identical result. The ship-upstream route is
recommended because it is self-contained and generalizes for free.

---

## Out of scope (deliberate, YAGNI)

- **A `/onboard` skill or command.** Rule of Three: the onboarding path has not been written even
  once. Encoding a maintenance/scaffold tool now is over-architecture (CLAUDE.md warns against
  exactly this). Revisit only if maintaining the docs turns out to have a repeatable shape.
- **Generalizing the field-log to the public set.** Only makes sense once a *second* collaborator
  exists. A stranger has no "Leon" to report to. Keep it Bucket-2-only for now.
- **The shape-authoring guide.** Deferred until the `garden` shape ships end-to-end
  (per `shape-authoring-log.md`). Not a blocker for theme onboarding — do not pull it forward.
- **The garden shape / cloud-backend threads.** Tracked separately in
  `bloob-haus-cloud/docs/implementation-plans/2026-07-13_garden-shape-and-builder.md`.

---

## Open questions / to confirm during implementation

1. **SSOT debt** — RESOLVED while writing: (a) `/media` convention now has a canonical home —
   `docs/onboarding/prepare-your-vault.md` §4, which documents the *real* verified behavior (media
   copied from anywhere preserving structure; wiki `![[x]]` embeds resolve by **basename only** →
   collision risk; single-`media/`-folder + Obsidian attachment-folder setting recommended, not
   required). Other docs should link there. (b) Stale test counts fixed: README "195+" and
   CLAUDE_CONTEXT "297 across 16 files" → **534 across 30 files** (verified via grep, phrased "530+").
2. **Starter theme** — RESOLVED: **melt** is the theme Leon hands Odalys (Leon, 2026-07-20). Leon is
   still tweaking melt over the next days, but it is the confirmed starting theme. `_template.yaml` and
   the onboarding docs use melt as the reference throughout.
3. **Exact `CLAUDE.local.md` phrasing** — drafted in `docs/collaborators/CLAUDE.local.template.md`
   (proactive friction-logging, dated append-only entries written for Leon, no-permission-needed, plus
   end-of-session sweep). Still wants a **real-session dry-run** to confirm it triggers and that
   `CLAUDE.local.md` shows under `/context` → Memory files.

## Implementation status (2026-07-20)

All docs written (not yet committed — repo is on `main`, awaiting Leon's go to branch + commit):
- Bucket 1: `docs/onboarding/{README,prepare-your-vault,fork-deploy-and-workflow}.md` + `sites/_template.yaml`
- Bucket 2: `docs/collaborators/{README,collaborating.template,field-notes.template,CLAUDE.local.template}.md`
- Mechanism: `CLAUDE.local.md` added to `.gitignore`
- SSOT fixes: test counts in README + CLAUDE_CONTEXT

---

## Validation

This is a docs effort, so "tests" = usability, not `npm test`. Validate by:

- Every Bucket 1 doc links to an SSOT for anything it would otherwise restate (grep for duplicated
  token lists / schema tables → there should be none).
- Dry-run the `CLAUDE.local.md` mechanism in a throwaway clone: confirm it appears under `/context`
  → Memory files, and that a simulated friction moment produces a field-notes entry.
- Walk `fork-deploy-and-workflow.md` against the actual CF Deploy-Hook + BRAT steps end to end.
