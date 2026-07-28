# Tech Debt — Parking Lot

**This is a reminder list, not a ledger.** It holds things that are (or might still be) wrong and
that we might want to fix one day. It is deliberately *not* an authoritative inventory — nobody
updates it the moment reality changes, and pretending otherwise is what made the old version
useless.

**Two rules, and they are the whole point:**

1. **Verify before acting.** Every row carries a *How to check* — a fast way to find out whether
   the item is still real. Run it before you plan any work. Items have sat here for months after
   quietly fixing themselves.
2. **Delete when done.** Do not add a "✅ Done" row. Resolved items leave this file entirely; the
   history lives in `docs/CHANGELOG.md`. A row's existence *is* its status.

There is no Status column on purpose. If it's here, it's a candidate. If it's fixed, it's gone.

**IDs are stable and never reused** — code comments and other docs reference them by number
(`#4`, `#40`, `#41` appear in `lib/visualizers/**` and `docs/architecture/visualizers.md`).
**Next free ID: 45.**

---

## Live items

| # | Item | Impact | How to check it's still real | Fix direction |
|---|------|--------|------------------------------|---------------|
| 7 | No error tracking (Sentry) | Blind to prod issues | Always true — nothing is wired | Add when there are users who'd report breakage |
| 8 | No analytics | No usage insight | GoatCounter exists per-site via snippet fence; check `_bloob-settings.md` of a vault | Per-site opt-in already possible; see IDEAS "automated GoatCounter provisioning" |
| 9 | Hugo output dirs still referenced in `preprocess-content.js` | Dead code | `grep -n "hugo\|public/" scripts/preprocess-content.js` | Delete the dead branches |
| 10 | Local builds share a single `_site/` dir | Must build sites sequentially | `ls -d src-*` shows per-site src dirs already exist; `_site` is still shared | Give `_site` the same per-site treatment as `src-*` (`scripts/utils/get-src-dir.js` is the pattern) |
| 11 | `eleventyComputed.js` duplicates slug strategies inline | Divergence risk | `grep -n "slugify" src-*/\_data/eleventyComputed.js` vs `scripts/utils/` | Accept, or migrate the shared util to CJS so the data file can import it |
| 12 | Marbles: ~25 broken internal links | Dead links on the live site | Run a marbles build and read the validation report output | Content cleanup in the marbles vault |
| 13 | Marbles: truncated attachment filenames with parentheses | Missing images | Build marbles, grep the report for the affected files | Rename the files in the vault |
| 14 | Marbles: HEIC image not web-compatible (`IMG_7966.heic`) | One missing image | `find ~/Documents/GitHub/bloob-haus-marbles -name "*.heic"` | Convert to JPEG/PNG in the vault |
| 15 | CI: no image-optimization cache | Slow deploys — rebuilds all images every time | Read `.github/workflows/deploy-*.yml` for a cache step on the optimized-image dir | Add a GH Actions cache keyed on the source-image hashes |
| 16 | `mount_path` causes doubled URLs (pathPrefix bug) | Blocks the multi-repo "haus with rooms" architecture | Only bites if you try to mount a site on a subpath — nothing does today | Do not use Eleventy `pathPrefix` for subpath mounting (see CLAUDE.md gotchas); needs a real design pass before Phase 3 multi-repo |
| 19 | warm-kitchen: inline search widget + redundant mobile CSS | Diverges from the code-fence standard | `grep -n "home-search\|PagefindUI" themes/warm-kitchen/pages/index.njk` | See **Notes → #19** below for the full migration steps |
| 20 | scene-nav magic machine duplicates visualizer logic | Parser/renderer changes must be mirrored by hand | `ls lib/magic-machines/scene-nav-builder/` — **likely already resolved**, S61 deleted this directory | If the directory is gone, delete this row |
| 21 | alter-engineers: Satoshi font loaded from the Fontshare CDN | External dependency; fails offline; third-party request on every page | `grep -rn "fontshare" themes/alter-engineers/` | Self-host `.ttf` → `themes/alter-engineers/assets/fonts/` (the `@font-face` already points there) |
| 22 | alter-engineers: `theme.min.css` contains hardcoded hex colors | Token drift — new sections built against `theme.min.css` won't follow `--accent-color` | `grep -nE "#[0-9a-f]{6}" themes/alter-engineers/assets/css/theme.min.css \| head` | Extract the values into `main.css` tokens and rebuild; until then keep `main.css` in sync by hand |
| 23 | `publish-filter.test.js`: 2 tests fail on Windows (path separators) | Local Windows dev shows red; Mac/Linux CI is green | Run `npx vitest run publish-filter` on a Windows machine | Normalize with `path.normalize` in the fixtures |
| 26 | `theme.min.css` still contains dead `.team*` rules | Duplicate rules; `styles.css` wins on load order, so no visual impact | `grep -c "\.team" themes/alter-engineers/assets/css/theme.min.css` | Remove in one pass once all visualizers are migrated off them |
| 27 | Transclusion: heading slice `![[note#heading]]` unsupported | Embeds the whole page and warns | `grep -rn "heading slice\|#heading" scripts/utils/transclusion*.js` | Slice the target AST from the heading to the next same-or-higher heading |
| 28 | Transclusion: block slice `![[note#^blockid]]` unsupported | Same fallback as #27 | As above | Pre-pass building a global `{blockId → node}` map |
| 29 | Transclusion heading bump is fixed at +1 | An embed under an `h3` produces `h2`s. Rare. | Embed a note under an `h3` and inspect the output | Detect the parent heading depth and bump by the real delta |
| 30 | `.transclusion-*` CSS only exists in the `melt` theme | Other themes render unstyled embed containers | `grep -l "transclusion" themes/*/assets/css/main.css` | Copy melt's pattern into the other themes |
| 31 | `redirect-resolver.js`: `[[folder/index]]` redirect returns null | Extremely rare — needs a slash-containing wiki-link in `redirect:` frontmatter | `grep -n "filenameLookup" scripts/utils/redirect-resolver.js` | Apply the same `filenameLookup[key]` fallback that `markdown-link-resolver.js` has |
| 32 | Folder-index stub generated for folders holding only attachments | A spurious empty `/folder/` page lands in `sitemap.xml`, advertising the folder. Relevant to `docs/architecture/security-by-obscurity.md`. | Put a folder of only media in a vault, build, check `_site/<folder>/index.html` | Skip the stub when a folder has no buildable pages (`preprocess-content.js` step 9.5) |
| 33 | Base `head.njk` loads Google Fonts from a third-party CDN | A URL-leak vector on `unlisted` pages + a general privacy/offline dependency | `grep -n "googleapis\|gstatic" themes/_base/partials/head.njk` | Offer a self-hosted-fonts toggle; for sensitive client work prefer self-contained raw HTML |
| 35 | No sandboxing for untrusted **build-time** shape code | Blocks a true open shape marketplace — strangers' build-time renderers run in our Node build job | Design-level; true until isolated per-tenant build jobs exist | Phase 4+. Until then enforce runtime-only (`browser.js`) for third-party shapes and keep build-time renderers approval-gated |
| 36 | Canonical `schema.md` template not written | Shapes accrete inconsistent schema formats; blocks reliable AI-authoring, MCP wrapping, marketplace consistency | `ls lib/visualizers/*/schema.md` — few have one, and they don't match | **Cheapest high-leverage item here — it's a template, not code.** Write it, then serve schemas at stable URLs. Resolves shapes.md open Q3 |
| 37 | Build pipeline does not scan the vault's `_bloob-shapes/` folder | The gateway from *creator* shapes to *user* shapes has no pipeline support — only `lib/visualizers/` built-ins are discovered | `grep -rn "_bloob-shapes/" scripts/` | Scan built-ins + `_bloob-shapes/`, local wins on name collision. See shapes.md → "User-authored shapes" |
| 38 | No Terms of Service / Acceptable-Use / DSA takedown process | Once the platform hosts others' content at `*.bloob.haus` it's a hosting provider with EU DSA notice-and-takedown obligations. *(Not legal advice.)* | Always true until written | Required before any public (non-friends) launch. CSP on user-hosted pages is the technical brake |
| 40 | Content-generating shapes not on the pure-renderer standard | `folder-preview`, `circular-nav`, `fridge-magnets`, `tags`, `graph` build markup in `browser.js`, so **a crawler sees nothing** and the future playground would need a second implementation — the drift that killed the scene-nav magic machine | `grep -L "renderer.js" lib/visualizers/*/manifest.json`, or look for the ⚠️ banner at the top of each `browser.js` | Convert each **when next touched** — extract a pure `renderer.js`, keep `browser.js` behavior-only, add a build-time `<a href>` test. Reference: `lib/visualizers/collection/`. **Do not retrofit speculatively.** |
| 41 | `collection` / `folder-preview` share unscoped `fp-*` class names | Latent collision trap. The collection side was scoped + guarded 2026-07-27; the **reverse direction is unverified** — whether `folder-preview` depends on `collection.css` | `npx vitest run css-independence` | Extend `tests/css-independence.test.js` to the reverse direction when folder-preview is retrofitted under #40 |
| 42 | warm-kitchen: missing PhotoSwipe wiring (`head.njk` + `scripts.njk`) | Image zoom silently broken on warm-kitchen sites | `grep -rn "photoswipe" themes/warm-kitchen/` | Copy the wiring from alter-engineers, per `docs/architecture/settings-registry.md` |
| 24 | warm-kitchen + marbles-pouch: missing color-pair CSS contract | `bg=` on visualizers has no effect until the themes define `--pair-bg/--pair-title/--pair-text` for `.bg-*` classes | `grep -n "pair-bg" themes/warm-kitchen/assets/css/main.css themes/marbles-pouch/assets/css/main.css` | Copy the pattern from `alter-engineers/main.css`, adjusting token colors per theme |
| 43 | `audit-visualizer-detection.js` samples one page per detection *signature*, missing theme-rendered markup | A clean audit is necessary but **not sufficient** — it can license a per-page rollout that breaks live pages. Proven on AE 2026-07-28: the audit reported `7/7 signatures safe (86/86 pages)` while every `/tags/<tag>/` page had lost its card grid. Grouping by detected-shape set assumes pages sharing that set render equivalent markup — false when a theme template hand-rolls another shape's classes | `node scripts/audit-visualizer-detection.js --src=src-<name>`, then open one page per distinct *template* (not per signature) in a browser | Group the sample by template (`inputPath`) as well as by detection signature, so each distinct template is measured at least once. Until then, enabling `per_page_visualizers` on a site needs a manual browser pass over each template |
| 44 | Shape **width contract** is coupled to `article`'s markup, not to the shape system | A page can declare `bloob-shape: article`, nest a `wide` shape, and emit `data-width="wide"` correctly — and still never break out, because the rule that implements it (`.article-body > [data-width]`, `lib/visualizers/article/styles.css`) keys on a CSS class emitted by **one layout**. Any other layout hosting a nested shape (melt's `folder-index.njk` wraps in `.folder-items-area`, marbles-pouch's likewise) silently opts out. Compounding it: `article/styles.css` **owns** `.article-body > [data-width]` but its `detect.selectors` lists only `.article-page` / `.share-bar`, so on a per-page-loading site the stylesheet isn't even present on those pages — the **third** instance of "detect must list what a stylesheet owns, not what its renderer emits" (after `article`/`.share-bar` and `folder-preview`/`.fp-card`). **No live symptom today**, for two independent reasons: no theme sets `--shape-width-wide` (so `wide` resolves to 100% = the prose column everywhere), and the stylesheet is absent on non-article layouts. Both mask it until a theme opts in | Set `:root { --shape-width-wide: 1100px; }` in `themes/melt/assets/css/main.css`, rebuild, and compare `/resources/` (author-written, `article.njk`) with `/videos/` (generated, `folder-index.njk`) — the first breaks out, the second does not. Also `curl -s localhost:8080/videos/ \| grep -c 'visualizers/article.css'` → 0 | Decouple the contract from `article`'s markup. Decide (a) which stylesheet **owns** a cross-shape contract — it must be one that is always loaded, which is exactly what per-page loading exists to avoid, so this is a real architectural call, not a selector tweak; (b) the container marker — a `data-shape-container` attribute beats a `:where(.article-body, .folder-items-area, …)` list, which just relocates the coupling. Then mark the layouts that genuinely host nested shapes (18 render `content \| safe`; far fewer qualify), fix the owning package's `detect`, extend `tests/shape-width.test.js` (12 browser tests, all currently assume an `.article-body` container) with a non-article container case, and update the width-contract section of `shapes.md` + detect guidance in `visualizers.md`. **Shape work — read the trinity first.** Shared CSS across 4 themes: see the S67 lesson that raising specificity in shared CSS silently outranks every theme override |

---

## Notes

### #19 — warm-kitchen: migrate to index.md code-fence search

**Context:** marbles-pouch was migrated (2026-03-01) to use ` ```search ``` ` code fences in the content repo's `index.md`. The search visualizer's `styles.css` now handles mobile reordering (results above filters) as a standard. warm-kitchen still uses the old approach.

**What needs to change:**

1. **`themes/warm-kitchen/pages/index.njk`** — remove the inline `<div class="home-search">` block (hardcoded `new PagefindUI(...)`, inline `<script src="pagefind-ui.js">`). The homepage content should come from the content repo's `index.md` instead.

2. **`themes/warm-kitchen/assets/css/main.css`** — remove the mobile reorder block (lines ~645–659). This is now handled globally by `lib/visualizers/search/styles.css` → `src/assets/css/visualizers/search.css`.

3. **warm-kitchen content repo** — add an `index.md` with a ` ```search ``` ` fence (and ` ```tags ``` ` if wanted). Match the pattern from `bloob-haus-marbles/index.md`.

4. **Verify** warm-kitchen `head.njk` loads `pagefind-ui.css` in `<head>` (anti-FOUC) — check if it already does via `_base/partials/head.njk` or theme-specific head.

**No FOUC risk** — pagefind-ui.css is already in `<head>` and the visualizer CSS is auto-included. The `order` CSS is layout-only, not a flash concern.

---

## Retired IDs

Resolved rows are deleted, not archived — but the numbers live on in code comments, so here's a
one-line index so a `TECH-DEBT #N` pointer never dangles. **Details are in `docs/CHANGELOG.md`.**

`1` `2` `3` `5` `6` vercel/deps/collections/validation-report/test-coverage (2026-02-19) ·
`4` per-page visualizer loading (2026-07-27, referenced from `eleventy.config.js`,
`scripts/utils/visualizer-detection.js`, `scripts/bundle-visualizers.js`,
`tests/css-independence.test.js`) ·
`17` `18` broken images on buffbaby/marbles (2026-07-28 — no longer reproducible) ·
`25` Windows `isMainModule` fix (2026-07-20, referenced from `scripts/utils/is-main.js`,
`tests/utils/is-main.test.js`, CLAUDE.md) ·
`34` bloob-shape / bloob-type unification (2026-07-20) ·
`39` scene-nav builder bugs + real-browser test (2026-07-28)

> Note: `25` was accidentally used twice. The still-live warm-kitchen PhotoSwipe item was
> renumbered to **`42`**.

---

## How to use this file

- **Add** a row when you notice something wrong — always with a *How to check*. A row without one
  will rot into folklore.
- **Verify** before planning any work against a row. Rows go stale silently.
- **Delete** the row when it's fixed. Record the fix in `docs/CHANGELOG.md`.
- **Don't** read this at session start — read `docs/next-steps.md`. Come here when you're choosing
  what to work on.
- New *feature ideas* go in `docs/implementation-plans/IDEAS.md`, not here. This file is for things
  that are wrong, not things that are missing.
