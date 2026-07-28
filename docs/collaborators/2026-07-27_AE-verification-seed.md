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

Full suite: `npx vitest run` → expect **692 passing**.

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

## 3b. Per-page visualizer loading is now shipped — but OFF for AE

Part 2 landed the same day: pages load only the visualizer CSS/JS they use,
behind `features.per_page_visualizers` in `sites/<name>.yaml`. Enabled and
audited on melt (41 pages) and marbles (1159 pages); pages went from 24
visualizer assets to 11–13.

**`sites/alter-engineers.yaml` is deliberately NOT enabled.** The AE vault does
not exist on Leon's machine, so AE's detection could not be audited — and
enabling it blind is exactly what the flag exists to prevent.

To turn it on for AE, on the machine that has the vault:

```bash
npm run dev:alter-engineers                                   # leave running
node scripts/audit-visualizer-detection.js --src=src-<ae-src-dir>
```

Expect `detection is safe for every page`. **Only then** add to
`sites/alter-engineers.yaml`:

```yaml
features:
  per_page_visualizers: true
```

If the audit reports a failure it names the element that moved and the page it
moved on; add the missing class to the owning shape's `manifest.json`
`detect.selectors` and re-run. AE uses `folder-preview` (articles slider) and
`collection`, both of which are annotated — but AE's theme may render a shape's
markup from a partial the way melt does with `.share-bar`, which is precisely
the case the audit catches and inspection does not.

## 4. Known adjacent risk — largely resolved, one direction left

`collection` and `folder-preview` share unscoped `fp-*` class names and `folder-preview.css` loads
later (alphabetical), so it won every tie — **AE's collection cards were being styled by
folder-preview.css.**

**Resolved for the collection side (2026-07-27).** Measured in a real browser across all 5 display
modes and 4 themes, only THREE rules actually diverged — `.fp-card__title`,
`.folder-preview__link`, `.folder-preview__icon`. (The earlier "11 colliding rules, cards differ"
figure came from a faulty text-diff; the browser is the ground truth.) Those are now scoped, and
`.fp-card__title` deliberately replicates what AE renders today, which is a *merge* of
folder-preview's two competing declarations — so **AE's cards should look unchanged**. Guarded by
`tests/css-independence.test.js`.

Worth a glance while you have AE open: confirm the card titles look the same as production. If they
changed, the values to compare are in `lib/visualizers/collection/styles.css` under the
SELF-SUFFICIENCY comment.

**Still open (low):** the reverse direction is unverified — whether `folder-preview` depends on
anything in `collection.css`. AE is the site most likely to expose it, since it uses both shapes.
The per-page audit in §3b would catch it.

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
