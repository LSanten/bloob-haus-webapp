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

## 2026-09-18 — Letter: sealing forces the closed state, and two axes got untangled

Source: a design conversation (Leon + Claude) in `bloob-haus-cloud` about Briefgeheimnis for the post
office, before the `letter` shape exists. Outcome doc: `bloob-haus-cloud/docs/architecture/letters-and-envelopes.md`;
contract changes: `shapes.md` → "Sealing", open questions #5 (updated) and #8 (new).

**Addendum 2026-09-20** (same conversation, continued; independent review folded in):
- **New hard rule for the marketplace: third-party shape code never loads on a sealed page.** Any
  script on a page can read the key that unseals it, so sealed pages are CSP-locked to first-party
  code. This is stricter than the existing "user-authored code runs client-side only" line — for
  sealed content, *approved* is not enough either; only shapes we ship run there. Consequence: a
  marketplace shape that wants to render private things must be adopted into the built-in set.
- **A shape's closed state must be drawable from the envelope alone to be sealable** (already
  recorded) — and the *carried set* matters too: a shape that embeds other files (images, notes)
  must expose what it embeds, because sharing carries them. For markdown shapes that is the
  `![[…]]`/`[[…]]` references; a shape with its own reference syntax (garden's `page:` blocks) must
  declare how to enumerate them. Contract gap; record when the second such shape appears.
- **Flows vs. stocks** went into `ontology.md` as the delivery-layer framing ("a postal system for
  places, not a chat"), with room-vs-shelf and the three permissions.

### Contract gaps found

- **No shape could say whether its closed state needs its body.** Once a file's inside is encrypted,
  the server can only draw the *outside*. Garden's closed state is a canvas flatten of the body; a
  letter's is `to`/`from`/`date`. That difference had no name. → "sealable" = *can draw its closed
  state from the envelope alone*, and `renderClosed(envelope, state)` joins the contract as a pure
  server-side function. Open question #5 gets its answer from the letter, not from wikilink embedding.
- **No home for what general markdown a shape refuses.** The letter must refuse raw HTML and remote
  images (a remote image is a read receipt). Today that's code in the cloud app, and the two hosts run
  *different* markdown-it plugin sets. → open question #8 (`manifest.json` `markdown:` block; one
  shared baseline config).

### Rejected alternatives (and why — do not re-propose)

- **Rendering the closed state in the sender's browser at send time** (canvas → PNG, the "free
  closed-state" trick noted 2026-07-13). Rejected for the letter: the server needs to draw the envelope
  in many places (`og:image`, inbox rows, locker spines, the gate page) and with door state (opened /
  sealed), so it must be a server-side pure function. The browser trick remains the way a
  *body-dependent* closed state (garden) can be attached at seal time — a fallback, not the rule.
- **Putting the shape name in the URL** (`…/letter/⟨token⟩`). Rejected: a URL is an address (haus +
  folders + file) or a door (token); the shape lives in the file. `/mail/` is a reserved folder whose
  *name* happens to say what it holds — naming, not a type system. See `urls-and-ids.md` → "Addresses
  vs. doors".
- **A second, cloud-only implementation of `note`/`letter` as React components.** The cloud's
  `src/shapes/note/` (30 lines, bare markdown-it) is provisional. The real shape is written once under
  the Pure-Renderer Standard; the cloud app is the standard's *third host* ("standalone playground",
  `visualizers.md`), which the standard reserved in July and the post office hadn't taken.

### Terminology correction (worth keeping)

Two axes were being collapsed into one sentence ("a container shows things as they are, a leaf
reshapes them"):

1. **Leaf vs. container** — does it *hold other shapes*? (`ontology.md`)
2. **Preserve vs. override** — what a container *does* to what it holds. (`shapes.md` → Container-contents policy)

"Shows things as they are" is a *preserve container*; "reshapes them" is an *override container* (or
metabolism). A leaf holds no shapes, so it reshapes nothing — it transforms a span of *content* into a
visual. Placed: letter = leaf; locker = preserve container; mail room = preserve container; the
counter = an app-like leaf (like `search`). Also settled in passing: **a folder with an `_index.md`
declaring a shape is a container instance** (a locker already is one); a file of `[[links]]` is a
*collection* — a view, not a place. **Name ≠ shape**: `mail/` should carry `_index.md` with
`bloob-shape: mail-room` so a link to the folder has a closed state, exactly as lockers do.

### Load-bearing vs. incidental

- **Load-bearing:** the envelope is authored *as outside*. Nothing shown publicly may be derived from
  the body — not filenames, not previews, not search. This is what makes "the platform can't see the
  letter" true wherever it's claimed.
- **Load-bearing:** one pure renderer per shape, drawn by both hosts. The cloud app hosts shapes; it
  does not own them.
- **Incidental:** which fields go on a letter's envelope beyond `to`/`from`/`date`. Bikeshed freely.

### Forward hinges

- **Sealing is per file, sealable per shape.** The holistic rule for *which* private things get
  sealed when is deliberately unwritten; it will be derived from the letter (V1 seals letters and
  lockers only).
- **Escrowed account keys by default; user-held lock-out later.** Chosen because Google-only sign-in
  yields no user-held secret and losing letters is the worse failure. Every later door (password,
  passkey, email) is one more lockbox — no re-sealing. Detail in the cloud doc.

---

## 2026-07-17 — Garden: writing the contract forced three divergences (and settled a fourth call)

Source: garden Task 1 (the `schema.md` contract, written 2026-07-15) and its reconciliation back into
`shapes.md` / `ontology.md` (Task 0, done today). The divergences are now *the documented rule*, not
divergences — recorded here so the why survives.

### Contract gaps found

- **The canonical `schema.md` template had no home for a fence grammar or parsing rules** — the two
  things garden spent the most design effort on. Any shape with non-trivial body syntax needs both.
  → added to the template (shapes.md open question #3).
- **The docs assumed every shape's block is `:::settings` YAML.** Garden's block is not YAML and
  *cannot* be: its element list (`- mature-tree "Title" @240,225` + nested page bullets) parses as a
  YAML *sequence* (consumers expect a mapping), and tab-indented children are illegal YAML —
  `extract-settings-block.js` throws, catches, and silently returns `{}`. This is the concrete proof
  a shape may need its own parser. → new shapes.md section "Shape-named blocks"; only fence-boundary
  discovery is shared.

### The three divergences, reconciled (now rules, not exceptions)

1. **Identity in the body for full-page shapes.** `ontology.md` said frontmatter holds `title`/`author`.
   A `chrome: none` shape owns its entire page, so its block is the whole surface — one in-body source
   of truth is what keeps it hand-editable and byte-identical to what the builder writes. Frontmatter
   carries only `bloob-shape: garden`. The frontmatter rule still holds for shapes sharing a page with
   prose.
2. **Shape-named block (`::: garden`), parsed by the shape itself.** Copy-paste-portable between
   file-scope and inline; bypasses the YAML extractor by construction.
3. **Element ids derived from title-slugs**, not stored (`"Deep-Rooted Endeavors"` →
   `deep-rooted-endeavors`). Builder-minted, unique via `-2`/`-3`, and the stable anchor the future
   `note: "[[Title]]"` swap hangs on. The prototype's opaque `el_<ts>_<rand>` ids die.

### Decisions settled

- **Page fidelity: prose-only (Leon, 2026-07-17).** Her page editor gives each element multiple
  *positioned* text boxes — but the template positions are just a vertical stack (paragraph order in
  coordinates), the drag feature is rarely load-bearing, and the future `note: "[[Wikilink]]"`
  direction has no coordinates at all. So the core stores markdown prose only, order preserved; the
  builder auto-stacks on reopen. Artistic drag-layouts flatten — accepted cost.

### Platform gotchas (hard facts)

- **`extract-settings-block.js` treated a closer with trailing whitespace (`"::: "`) as an OPENER.**
  The closer test was `trimmed === ":::"` after `trimStart()` only — so `"::: "` failed the equality,
  fell into the `else`, and *incremented depth*. One trailing space = the block never closes and the
  whole rest of the body is swallowed as settings. Fixed (trailing-whitespace-tolerant closer) + test.
  Lesson for every fence parser: **tolerate trailing whitespace on both opener and closer.**
- **Never hardcode a tab width when parsing nested bullets.** Any deeper indentation (tabs or spaces)
  is nesting. This is what makes a fence format survive Obsidian's tab/space setting — the whitespace
  brittleness that motivated garden's format in the first place.

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
