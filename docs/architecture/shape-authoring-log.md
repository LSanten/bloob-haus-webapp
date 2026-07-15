# Shape Authoring — Build Log

> **This file is raw material, not a source of truth.** `ontology.md` holds the intent, `shapes.md`
> holds the mechanism. This log holds the *derivation* — the gaps we hit, the alternatives we
> rejected, the platform facts that bit us, and which conventions are load-bearing versus taste.
>
> **Why it exists:** polished docs record the rule but lose the reason. A future human or AI reading
> "shapes have an `assets/` folder" can't tell whether that's structural or arbitrary, and can't tell
> what was already tried and rejected — so it re-proposes it. This log is what a
> `SHAPE-AUTHORING-GUIDE.md` gets **distilled from**, once at least one shape (garden) has been built
> correctly end-to-end *including its builder*. Do not write that guide before then; it would be
> speculative.
>
> **Format:** append-only, newest first, dated. Rough is fine. Five categories worth capturing:
> **contract gaps** · **rejected alternatives (+ why)** · **load-bearing vs. incidental** ·
> **platform gotchas** · **forward hinges** (deliberately provisional choices).

---

## 2026-07-13 — Garden: the first shape with a builder

Source: converting Odalys Benitez's [GardenVisualizer](https://github.com/odalysbest/GardenVisualizer)
into the `garden` shape. Plan: `bloob-haus-cloud/docs/implementation-plans/2026-07-13_garden-shape-and-builder.md`.

### Contract gaps found

- **A shape had no home for its own shipped assets.** Garden ships 8 icon PNGs (seed, sapling,
  mature-tree, flower, compost, water-bucket, waffle-planter, bee). `shapes.md` → "What a complete
  shape carries" listed `manifest.json`, `schema.md`, `index.js`, `browser.js`, `styles.css`,
  `layout.njk` — **no `assets/`**. Every prior visualizer either had no static assets or borrowed the
  site's `media/`. Garden is the first shape that owns images. → add `assets/` to the contract.

- **A shape had no home for its builder.** The builders that exist (`scene-nav-builder`,
  `ken-burns-zoom-builder`) were filed as *magic machines* (`type: "gui"`), physically separate from
  the visualizer they author for. The symptom was already recorded in `magic-machines.md` as tech debt
  ("Shared Logic: Builder vs. Visualizer (Future Refactor)" — the two duplicate the fence parser and
  "should stay in sync"). **That duplication is not a tidiness problem; it is the wrong taxonomy.**
  If the builder is a face of the shape it shares the parser *by construction* and there is nothing to
  keep in sync. → add `builder/` to the contract; the tech-debt note gets **deleted, not deferred**.

### The taxonomy correction (the big one)

A **shape** = core format + renderer (read) + builder (write). The builder is a face of the shape.

- **Shape builder**: authors a shape's own core data. Output is meaningless without that shape's
  renderer. Lives *inside* the shape folder.
- **Magic machine**: everything else in the tools category — content→content transforms (`ai`,
  `script`) *and* standalone apps.

**First draft of this rule was too tight and got falsified within the hour.** The proposed line was
"builder = GUI→core; magic machine = content→content." Then `youtube-non-addictive-interface` turned
up: it produces no shape data *and* transforms no content — it's a standalone app (a distraction-free
YouTube player, by an external author). So `type: "gui"` must **not** be deleted; it stays valid for
standalone apps. Only *builders* move out. Lesson worth keeping: **the taxonomy has three members, not
two — builder, transform, app — and only the first is rigorously defined.** "Magic machine" is
deliberately left loose for now; being precise about *shapes* is what matters.

`circular-nav`'s `debug: on` mode accidentally got the model right years before it was named: the
builder lives *inside* the visualizer (sliders + copy-YAML on the live rendered page), so it cannot
drift from the renderer.

### Rejected alternatives (and why — do not re-propose)

- **Serving shape assets from a central CDN** (`shapes.bloob.haus/garden/seed.png`). Rejected: it makes
  every user's static site depend at runtime on a host we control, which breaks "zip your site and it
  still works" — portability is a core value, and 8 duplicated PNGs per site is not worth trading it
  for. Assets get **copied into the build output**, like visualizer JS/CSS already is.
- **Extracting shapes into their own repo now.** Right direction, wrong time. Garden is where we
  *discover* what a shape carries — this session alone found two contract gaps. Committing to a repo
  boundary before the contract is known builds the wrong boundary. **Mitigation that keeps it cheap:
  make every shape folder fully self-contained** (nothing reaches outside it) → extraction later is a
  `git mv`, not a refactor. The expensive version of this mistake is what the codebase does *today*:
  scene-nav's renderer in `lib/visualizers/`, its builder in `lib/magic-machines/`, a parser duplicated
  between them.
- **Putting user media under `_bloob-shapes/garden/`.** Rejected: `_bloob-shapes/` already means shape
  *definitions* (manifest, schema, renderer JS). User media goes to `media/garden/` — namespaced by
  shape **type**, not per-instance, so drawings are reusable across gardens. Orphaned media is accepted
  (storage ~€0.01/GB; reuse beats tidiness).
- **Making garden a container shape.** Tempting — the ontology names `garden` explicitly as a container
  ("preserve" policy, coordinates placement) and calls containers "the unbuilt heart of the system."
  But container behavior requires the keystone capability the ontology admits is unbuilt: rendering a
  `[[wikilink]]` as the target shape's **closed-state visual**. Deliberately deferred; **garden ships as
  a leaf.** See the forward hinge below — the schema is shaped so it can graduate without a migration.

### Platform gotchas (hard facts, not opinions)

- **localStorage is 5–10 MB and stores strings only.** Base64 inflates binary ~33%. Any shape whose
  builder handles images (garden: a painted canvas + custom drawings) *will* blow the quota — silently,
  because her `saveState()` catches the exception and just shows "Save failed." → **use IndexedDB**
  (stores Blobs natively, far larger quota) for any builder that persists media client-side. This is a
  real bug, not a nice-to-have.
- **A canvas-flatten-to-PNG is free closed-state.** Garden's Phase 2 already has "Save as Image"
  (`canvas.toDataURL('image/png')`, pure client-side, no deps). Swap `a.download` for `toBlob()` and the
  same code yields the shape's **closed-state visual, OG image, and link preview** at once. Any shape
  with a canvas gets this nearly free — look for it.

### Load-bearing vs. incidental

- **Load-bearing:** the builder and renderer share *one* schema and *one* parser. Break this and the
  drift returns. This is the whole point of the taxonomy change.
- **Load-bearing:** the builder must **read** the core format, not just write it — otherwise a
  hand-edited or AI-generated shape can't be reopened in the GUI, and the "one schema" claim is a
  fiction. (Note: this is an *engineering* requirement, not necessarily a user-facing "Import" button —
  laypeople find that confusing.)
- **Load-bearing:** a builder must be a **single, dependency-free, `file://`-openable HTML file.** Every
  existing bloob-haus builder has this property and it is worth preserving — offline, works inside an
  Obsidian vault, no npm, no toolchain. Odalys's app is ~15 ES modules + Vite, so it *cannot* be opened
  as a plain file (browsers block ES-module imports over `file://`). Resolution: keep Vite as the
  authoring toolchain, bundle to one self-contained file (`vite-plugin-singlefile`). Modular source,
  single-file artifact. Do not force shape authors to flatten their source by hand.
- **Incidental:** the specific fence field names. Bikeshed freely.

### The sequencing error worth not repeating

The first draft of the garden plan split the work into *"Phase A: the shape — useful with zero backend,
via Repo Mode"* and *"Phase B: accounts."* **This was wrong, and it's a seductive kind of wrong.**

Repo Mode *can* render a hand-written garden fence today — technically true. But Repo Mode is a
hand-wired GitHub Actions workflow per site: no OAuth repo hookup, no self-serve provisioning, and
**no GUI**. A garden authored by hand-writing YAML into a vault is exactly what the builder exists to
prevent. So "Phase A is demoable" was a false milestone — real to an engineer, useless to a user.

**The generalizable lesson for any shape with a builder:** rendering the shape is *not* a shippable
milestone; it's a test loop. The shippable milestone is always *someone who isn't you produces the
thing through the GUI and gets a URL.* Sequence backwards from that sentence, and treat the
Repo-Mode render as a cheap verification checkpoint (it also de-risks the cloud build job, which runs
the same Eleventy pipeline).

### Draft-to-vault promotion is a platform primitive (biggest insight of the session)

Every shape with a builder has the **same** workflow, and it is not shape-specific:

1. A user opens the builder and makes something with **no account** — data lives locally (IndexedDB).
2. They play with it, freely, offline.
3. They decide to **share** it → prompted to sign in and choose a subdomain.
4. On sign-in, the local draft is **migrated into their vault** (Object Storage), registered in the
   ledger, built, and returned as a URL.

The realization (Leon, 2026-07-13): *"this is a workflow that is not just for this shape — we will have
the same with other shapes where users use the GUI to create their own, play with it, and when they want
to share, the data needs to be migrated into their vault folder."*

**Why it's a primitive, not a garden feature:** every builder emits the *same pair* regardless of shape
— **{ a markdown fence, a set of media blobs }**. So the promotion flow is entirely shape-agnostic:

```
promote(fence, media[], auth, chosen_subdomain)
   → upload fence + media to  vault/{user}/{room}/…
   → register room/page in the ledger
   → trigger the build
   → return the live URL
```

Design it **once**; every future shape builder inherits it for free. This also unifies with the
**note-share-link** idea (from the 2026-07-11 session): sharing a private note is the *same* primitive
with a trivial payload (a text fence, no media). "Save an owned thing and get a shareable URL" is the one
capability underneath both.

**Design-now consequences (cheap now, painful to retrofit):**
- The builder's local (anonymous) state and its uploaded (vault) state must be the *same format*, so
  migration is an upload, not a conversion.
- Anonymous draft must survive the sign-in transition (don't clear IndexedDB before the upload confirms).
- Builders should converge on a single "emit {fence, media[]}" interface — the contract the promotion
  endpoint consumes. This is the shape-builder-side half of the "UI only calls the API" rule.
- **Ledger hook for future login-free hosted sharing:** make a room's **owner** able to be either a
  `user_id` *or* an anonymous **edit-token** from the start. Then "share without an account" (the
  Pastebin model — build a garden, get a `bloob.haus/g/…` link, no signup) is a *variant* of this same
  promotion primitive later, not a new subsystem. Viewing is already login-free (published output is
  public static HTML); it's login-free *creation* that needs this hook. Keep signup-after-render the
  default even once it's built — an open anonymous write endpoint carries real spam/abuse/orphan costs.

### The repo-as-shape-folder move (do this again)

Odalys's repo is being restructured so that **its root IS a shape folder** — `manifest.json`,
`schema.md`, `index.js`, `browser.js`, `styles.css`, `layout.njk`, `assets/`, `builder/`.

Why this is more than tidiness:
- Self-containment stops being a guideline and becomes **enforced by the repo boundary**. You cannot
  reach outside the folder because there is nothing outside it.
- It is a **live dry run of the shapes marketplace**: an external creator's shape, in its own repo,
  pulled into a site. The extensibility model gets tested by a real external author *before* any
  marketplace infrastructure is built. If it works for Odalys it works for a stranger.
- The creator keeps a real home and keeps developing upstream — no "we vendored your code and now it
  lives somewhere else."

Watch for: her Vite entry was `index.js` at root, colliding with the shape's build-time renderer
`index.js`. The builder's entry moves under `builder/`.

**Still unsolved (open question):** how the site build *consumes* a shape that lives in someone else's
repo — copy / subtree / submodule / build-time fetch. `shapes.md` already says the build pipeline must
scan multiple shape sources (built-in + vault-local) and that **this isn't implemented**. External repos
are the natural third source. V1 answer: vendor by copying, treat the author's repo as upstream. Revisit
when a second external shape exists (rule of three).

### Forward hinges (deliberately provisional)

- Garden elements carry a **stable `id`** in the fence, and their inline `page:` block is positioned so
  it can later be replaced by `note: "[[Wikilink]]"` — *same slot, same id, no schema change.* The id is
  what makes that swap non-breaking. This is the cheap-now move that keeps the leaf→container graduation
  open. (Connects to phase-3 open question #3: should every note carry a stable unique ID? Garden is the
  first shape to force it.)
- Garden declares `chrome: none` — the first real exercise of `shapes.md` open question #1 (what can a
  shape declare about its frame?). Expect that question to get settled by this shape.
- `authors` is an **array** in the manifest from day one (multi-creator), superseding the singular
  `author` object used by `youtube-non-addictive-interface`.
