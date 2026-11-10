# Obsidian Plugin — Next Debugging Session

**Status:** 1.3.0 shipped 2026-08-23 — remaining items are two issue close-outs and one deferred migration
**Created:** 2026-08-23
**Plugin repo:** `LSanten/bloob-haus-obsidian-plugin` (local: `../bloob-haus-obsidian-plugin`)

**Related:**
- [v1 plan](2026-05-01_plugin-v1.md)
- Plugin `docs/design-notes.md` — the living record of trade-offs; read before touching a module

---

## Where things stand after 2026-08-23

Auto tagging was **not** broken by 1.1.0 or 1.2.0. The rule engine was verified
against Leon's real `_bloob-auto-tagging.md` files and matches correctly,
case-insensitively, in every form issue #7 described. What was actually wrong is
that auto tagging failed **silently** — see the issue #7 entry below.

**Shipped in [1.3.0](https://github.com/LSanten/bloob-haus-obsidian-plugin/releases/tag/1.3.0)**
(released 2026-08-23; BRAT will pull it to every device automatically):

| # | Fix | Test |
|---|-----|------|
| 1 | Whole-word matching is Unicode-aware — accented names (`Zoë`, `José`) and punctuated keywords (`c++`) match now | ✅ |
| 2 | `excludedFolders` compares whole path segments — `media` no longer swallows `media-plan.md` | ✅ |
| 3 | Every auto-tagging outcome is reportable (`TagOutcome` + `describeOutcome`); live tagging announces when it acts | ✅ |
| 4 | Keywords tolerate differing runs of whitespace | ✅ |
| 7 | Test suite: `npm test`, 58 tests, zero runtime deps, nothing added to the shipped bundle | ✅ |

`minAppVersion` deliberately stays at **1.4.0** — no user is dropped. See item 1.

---

## 1. DECLINED FOR NOW — issue #6, migrate to the declarative settings API

**Decision 2026-08-23: not doing this yet.** Leon chose to keep supporting
Obsidian < 1.13, so 1.3.0 shipped with `minAppVersion` unchanged at `1.4.0`.
Rationale is recorded in the plugin's `docs/design-notes.md`. The issue stays
open as a "revisit later"; the analysis below is what a future session needs.

- The [declarative settings API](https://docs.obsidian.md/plugins/guides/migrate-declarative-settings)
  requires **Obsidian 1.13.0+**.
- Leon's installed Obsidian is **1.8.4**. Migrating now ships a settings tab that
  does not render on his own machine — or on any early user's below 1.13.
- `manifest.json` `minAppVersion` is currently `1.4.0`. Migrating forces it to
  `1.13.0`, which drops every user below that. **That is a product decision, not
  a technical one.**

**Two further complications found while scoping it:**

1. **The API's `key` is flat.** Controls are declared as
   `control: { type: 'toggle', key: 'enabled' }`, and Obsidian reads/writes
   `plugin.settings[key]`. Dot-notation for nested paths is *not documented*.
   This plugin's settings are deeply nested (`settings.tagMatching.matchMode`,
   `settings.frontmatter.customFields`, …). So the migration needs **either**
   a flattened settings model — which means a data migration over every existing
   user's `data.json`, with real risk of losing their configuration — **or** a
   `render` callback for nearly every row, which negates most of the benefit.
2. **`PluginSettingTab` is not deprecated.** It remains the supported base class.
   There is no forcing function here beyond wanting the newer look.

**Revisit sequence, when it comes back up:**
1. Leon updates Obsidian past 1.13.0 and confirms the version (was **1.8.4** on
   2026-08-23).
2. Re-decide whether dropping < 1.13.0 users is acceptable. Declined once
   already — don't silently reverse it.
3. Spike **one** module's settings (auto tagging) declaratively and check whether
   `key` accepts a dot path. If it does, the rest is mechanical. If it does not,
   re-scope: the flattening migration is the real work, not the UI.

**Do not start at step 3.** Steps 1–2 decide whether step 3 is worth doing.

---

## 2. Close issue #5 — verify, then close

**Almost certainly already fixed** by `8c131fa` in 1.2.0, which made copy-link
read the vault's `_bloob-settings.md` → `url:` block.

Evidence gathered 2026-08-23: melt declares `case: lower`, and
`bloob-url-core.test.ts` now asserts the issue's exact case —
`Resources/VIDEO-assisted-stetching.md` → `https://melt.bloob.haus/resources/video-assisted-stetching/`.
Those tests **passed against unmodified 1.2.0 logic**; every URL function was
diffed byte-for-byte against the shipped version and is unchanged.

**Remaining step is a real-app check, not code:** in the melt vault, click the
copy-link button on that note and confirm the pasted URL is lowercase. Then close
#5. Per the repo's "Verify Before Fixing" rule this has *not* been assumed done.

---

## 3. Close issue #7 — with an explanation, not just a fix

The root cause was **not** a matching bug:

- The name rules (`mama` → `#Mama`, `papa`, `natasha`, `whitney`, `nhi`) live only
  in the `leon-all-sorts-of-notes` vault.
- That vault's `data.json` has `"liveOnActiveNote": false`, and was last written
  **2026-06-27** — a month before #7 was filed and two days before 1.1.0 existed.
  Live tagging has never been switched on there.
- Auto tagging demonstrably works where it *is* on: marbles has 33 notes in
  `tagMemory.autoAdded`.

Fix #3 (outcome reporting) addresses the real defect — the silence. When closing
#7, say that live tagging was off *and* that the plugin now tells you so.

**Worth confirming with Leon:** was he in `leon-all-sorts-of-notes` when he hit
this? It is the only vault with name rules, so almost certainly yes.

---

## 4. Optional — extend the test suite to the Obsidian-coupled layer

Currently untested, and the part hardest to eyeball in the app:

- rejected-tag memory reconciliation (`reconcileMemory`, `recordAutoAdded`)
- rename/delete memory key migration
- event wiring (`vault.on('modify')` → debounce → write)
- `processFrontMatter` tag writes

Needs a faked Obsidian API (`App`, `TFile`, `Vault`, `MetadataCache`,
`fileManager.processFrontMatter`). Deliberately deferred on 2026-08-23 — the pure
layer caught the real bugs at a fraction of the upkeep. Revisit if a memory bug
actually shows up.

---

## Watch after the 1.3.0 rollout

Whole-word matching semantics changed: keywords beginning or ending in a
non-ASCII letter or punctuation now match where they silently did not before. So
**some notes will pick up tags on their next scan that they never did.** That is
the intended fix, but it is the one thing worth eyeballing after BRAT updates
your devices — run "Scan vault now" on marbles and check the preview list before
confirming it.

The preview-first design means nothing is written without confirmation, so the
blast radius is a modal, not the vault.

---

## Toolchain changes made 2026-08-23

- `typescript` 4.7.4 → ^5.7.2 (needed for `allowImportingTsExtensions`)
- `@types/node` ^16 → ^22.10.2 (needed for `node:test` types)
- `tsconfig.json`: added `allowImportingTsExtensions`
- `package.json`: added `test` and `test:watch` scripts

Tests need **Node 22.6+** (native TypeScript type-stripping). This has no effect
on what Obsidian loads — the shipped bundle is unchanged in shape.
