# AE verification seed — collection pure-renderer refactor (2026-07-27)

**Read this on the machine that HAS the alter-engineers vault.** It was written on Leon's MacBook,
which does not, so nothing below was verified against a real AE build.

Paste this whole file to Claude Code on that machine as context, or work through it by hand.

```
Context: the `collection` shape was refactored to the pure-renderer standard on 2026-07-27.
AE is the production consumer of `display: cards`. Verify nothing regressed, then decide
one open question about the search bar. See docs/collaborators/2026-07-27_AE-verification-seed.md
```

---

## What changed

**Shape:** `lib/visualizers/collection/`

| Before | After |
|---|---|
| `core.js` | `resolve.js` (renamed; pure, nodes injected) |
| `render-card.js` | `renderer.js` (absorbed all 5 display modes as pure string fns) |
| build-time HTML for `display: cards` **only** | build-time HTML for **every** display mode |
| `browser.js` built markup for list/slider/bubbles/marbles | `browser.js` is behavior-only |
| file-scope emitted an empty placeholder forever | `transform()` fills it during the Eleventy pass |

**Shared:** `eleventy.config.js` now passes `pageUrl` into every visualizer `transform()` (additive;
visualizers that ignore it are unaffected). A collection no longer lists the page it sits on.

**CSS:** `--sv-input-bg`, `--sv-input-bg-focus`, `--sv-input-focus-ring` added to the shared search
token contract, consumed with fallbacks. `melt` and `marbles-pouch` `!important` overrides converted
to `:root` tokens (both verified pixel-identical in a real browser). **AE's CSS was not touched.**

Standard: `docs/architecture/visualizers.md` → "The pure-renderer standard".
Spec: `docs/superpowers/specs/2026-07-27-collection-pure-renderer-design.md`.

---

## 1. The automated safety net (run first, no vault needed)

`display: cards` output is frozen byte-for-byte in a committed golden master, because AE could not
be built here. If this passes, AE's cards markup is provably unchanged:

```bash
npx vitest run collection-invariants
```

Expect **31 passing**. If the golden test fails, the cards markup changed — investigate before
deploying. Do **not** regenerate the golden to make it pass unless the change is intended:

```bash
UPDATE_GOLDEN=1 npx vitest run collection-invariants   # only when a cards change is deliberate
```

Full suite: `npx vitest run` → expect **668 passing**.

## 2. Build AE and verify

```bash
npm run dev:alter-engineers
```

Then on any page with a ```collection fence:

- [ ] **Cards look identical** to production — image, title, subtitle, fields, 3-column grid.
- [ ] `view-source:` shows the cards in the **server HTML** (they always did for `cards`; confirm unchanged).
- [ ] Search filtering still narrows the cards, and Pagefind still expands the result set.
- [ ] No console errors from `collection.js`.
- [ ] Any `folder-preview` blocks on the site are **unchanged** (that shape was deliberately not touched).

## 3. THE OPEN QUESTION — AE's collection search bar changed shape

**This is the one intentional visual change to AE, and it needs your call.**

AE sets `--border-radius: 0px` (deliberately square). The collection filter input previously
inherited that and rendered **square**. It now reads `--sv-input-radius`, which defaults to
`999px` — so it renders as a **pill**.

Why it was done that way: you asked for the collection search bar to match the site-wide search
bar. AE's site-wide Pagefind bar is *already* a 999px pill — no theme overrides `--sv-input-radius`.
So this change makes AE internally consistent (both search surfaces now match) at the cost of
changing a live client site.

Look at it, then pick one:

**Option A — keep the pill.** Both AE search surfaces match. No code change.

**Option B — make AE square everywhere.** Add to `themes/alter-engineers/assets/css/main.css` `:root`:

```css
  /* AE is a square theme — square its search surfaces too. */
  --sv-input-radius: var(--border-radius);   /* 0px */
```

Note this squares the **site-wide** Pagefind bar as well, which is arguably what an
`--border-radius: 0px` theme wants — but it *is* a second visual change. Screenshot before/after.

**Option C — square only the collection input.** Narrowest change:

```css
.collection-visualizer { --sv-input-radius: var(--border-radius); }
```

Leaves AE's site-wide bar a pill and its collection input square — i.e. back to today's
inconsistency. Only pick this if the pill genuinely looks wrong in context.

### While you're there: AE has no `--sv-input-bg` / `--sv-input-focus-ring`

AE never overrode the search input background, so it falls back to `var(--card-bg)` exactly as
before — **no change, nothing to do.** But if you want AE's search surfaces to have the same
treatment melt and marbles-pouch now get, that is where you would set it.

## 4. Known adjacent risk — do NOT ship per-page visualizer loading yet

`collection` and `folder-preview` collide on **11 unscoped `fp-*` CSS rules**, and
`folder-preview.css` loads later (alphabetical) so it wins every tie. `.fp-card` and `.fp-cards`
genuinely differ — folder-preview's version adds `border-radius`, `background`, `border`,
`overflow` and `transition`.

**AE's collection cards are therefore currently styled by `folder-preview.css`, not by
`collection.css`.** That works today only because every page loads every stylesheet.

Per-page visualizer loading (TECH-DEBT #4) would drop `folder-preview.css` from pages that only use
`collection` and **silently restyle AE's cards**. Recorded as TECH-DEBT #41, and #4 is now marked
blocked by it. Resolve #41 first.

## 5. If something is wrong

Everything shared is in its own commits, so a revert is clean:

```bash
git log --oneline -12
git revert <hash>          # or, for the CSS only, revert just the token commit
```

The search-bar radius alone is a one-line fix (§3) — no revert needed.

## 6. Report back

Worth telling Leon: which option you picked in §3, whether AE's cards were pixel-identical, and
anything the golden master failed to catch.
