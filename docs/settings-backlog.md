# Settings backlog — what isn't built yet

Shared by both repos: the builder (`bloob-haus-webapp`, this repo) and the cloud
(`../bloob-haus-cloud`). Settings work happens on both sides, so this file is reached from both:
`CLAUDE.md` and `docs/architecture/settings-registry.md` here, `CLAUDE.md` and `docs/BACKLOG.md`
in the cloud repo.

- `docs/architecture/settings-registry.md` says what **exists**. This file is what's **ahead**.
- `[ ]` open · `[x]` shipped · `[?]` **blocked on Leon**, not on code · `[~]` in progress. Tick a box
  in the same commit that ships the code. Leon dumps items however messy; they get normalised here.

## The one rule: one setting, several doors

A site setting is one value, whichever door it comes through. Today there are two doors, and the
vault wins:

1. `sites/*.yaml` in the builder repo (sites deployed by Leon via GitHub)
2. `_bloob-settings.md` in the content vault

The account settings page (cloud) will be a third door. Whatever it shows has to be the value the
build actually uses, never a second copy that can disagree.

## Account & site settings (cloud)

- [?] **SET1** — what a Bloob Haus account *owns*: a link between an account and its subdomain(s).
      Nothing records this yet. Every per-site setting in the account depends on it.
- [?] **SET2** — the precedence rule once the account is a door: does the account page win over
      `_bloob-settings.md`, or does it write *into* the vault/config so there's only ever one place?
      (Default if undecided: the account writes the value, the build reads it; no third copy.)
- [ ] **SET3** — `features.show_in_search` (`yes` / `quiet` / `no`) on the account settings page,
      for sites linked to that account. The first per-site setting to go through the account door.
- [?] **SET4** — account-level settings (not per site): name, email, connected sites, deleting the
      account, … Not thought about yet.

## Search (both sides)

- [ ] **SET5** — dynamic sitemap index at `bloob.haus/sitemap.xml`, listing the sitemap of every
      site set to `show_in_search: yes`. Each build writes its value to the Worker's KV; the Worker
      answers that one path and lets everything else on `bloob.haus` fall through to the live site.
      Submit it to Search Console once. **Build when the first customer site exists** — until then
      the per-site sitemaps submitted by hand (leons, buffbaby, 2026-10-27) do the same job.
- [x] **SET7** — what AIs may do with a site, three switches in `_bloob-settings.md` (Leon,
      2026-11-01). Defaults: **reading by link on, AI search on, training off**, for every site.
      Leon's format, one line, any order, write only what differs from the default:
      `ai: read_links:yes, search:yes, train:no`; the nested form (`ai:` + `  train: no`) works
      too, and the broken one-line form (`ai: train: no`) is repaired instead of failing the
      whole file. Every site gets a `robots.txt`, one group per switch. Agents per switch come
      from each company's own docs and live in `scripts/utils/ai-agents.yaml` (Meta, Amazon,
      ByteDance, Exa, ElevenLabs, Reflection AI, Mistral and DuckDuckGo added to Leon's list,
      2026-11-14). `facebookexternalhit` (link previews) is never blocked. Shipped 2026-11-14;
      reference in `docs/architecture/settings-registry.md` → "What AIs may do".
- [ ] **SET9** — SEO scrapers (SemrushBot, AhrefsBot, DotBot, MJ12bot). **Parked** (2026-11-14):
      they aren't AI, so they get no switch under `ai:`. If a site owner asks to block them, it is
      a new key (not `ai:`), or a Cloudflare WAF rule, which already stops the ones that ignore
      robots.txt. See `docs/implementation-plans/DECISIONS.md` 2026-11-14.
- [x] **SET6** — melt's `show_in_search` is `yes` (2026-10-28, in the vault's `_bloob-settings.md`).
      Leon reviewed the page list: the bios page is meant to be found; the four `Resources/` drafts
      are `visibility: private` and not built at all.

## Site content (builder)

- [x] **SET8** — a license for a site's writing (Leon, report 78eec483, 2026-11-14):
      `license:` in `_bloob-settings.md` / `site.license` in `sites/*.yaml`, overridden per note
      by `license:` frontmatter (`none` takes it away). Common Creative Commons spellings and CC0
      map to the deed URL; anything else shows as written with a build warning. A quiet foot line
      for people, `<link rel="license">` and JSON-LD `license` for machines. leons:
      `CC BY-NC-SA 4.0`, what the old leonsanten.info marbles carried. Shipped 2026-11-14.
