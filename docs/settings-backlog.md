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
- [?] **SET6** — melt's `show_in_search` is held back (2026-10-25) until its page list is reviewed:
      `yes` would announce `/bios-for-whitney-and-vicki/`, which is public but unlinked.
