# URL Naming & Multi-Site Architecture — Planning Notes

**Status:** Planning / thinking-out-loud
**Created:** 2026-02-25
**Related:** [ROADMAP.md Phase 3](../ROADMAP.md), [Obsidian Plugin Plan](../phase-2/2026-02-25_Obsidian%20plugin.md), [`_bloob-settings.md` spec](../phase-2/2026-02-26_bloob-settings-file.md)

---

## Overview

As Bloob Haus grows beyond buffbaby, we need clear conventions for how sites, users, rooms, and content get addressed. This doc captures current thinking on URL structure, subdomain conventions, and reserved namespaces — before they get locked in by accident.

---

## Known Upcoming Sites

| Site | Intended URL | Source | Status |
|------|-------------|--------|--------|
| Buff Baby Kitchen | `buffbaby.bloob.haus` | Leon's recipes vault | ✅ Live |
| Leon's Marbles | `leons.bloob.haus/marbles` or `marbles.bloob.haus` | Leon's marbles vault | Built, not deployed |
| ESJP Resources | `resources.esjp.org` | Custom domain, separate org | Future |
| Friends' vaults | `leyla.bloob.haus/TCM` etc. | Other Obsidian users | Future (Phase 3+) |
| bloob.haus core site | `bloob.haus` | Special case — vault-driven homepage | Future |
| Visualizer showcase | `bloob.haus/visualizers` | Reserved system path | Planned |

---

## URL Pattern Options

### Option A — subdomain per user, paths per "room"
```
leons.bloob.haus/         ← Leon's root (could be a landing/index)
leons.bloob.haus/marbles  ← marbles collection
leons.bloob.haus/kitchen  ← recipes (could replace buffbaby.bloob.haus eventually)
leons.bloob.haus/notes    ← general notes
leyla.bloob.haus/TCM      ← Leyla's TCM room
```
**Pros:** One GitHub repo / vault per user, rooms = top-level folders in the vault. Clean mental model.
**Cons:** Requires wildcard DNS (`*.bloob.haus`) and wildcard Cloudflare Pages routing. Per-user build pipelines needed.

### Option B — subdomain per "room" (current approach)
```
buffbaby.bloob.haus       ← one room, one subdomain
marbles.bloob.haus        ← another room, another subdomain
```
**Pros:** Simple — current setup works this way. Each site is fully independent.
**Cons:** Doesn't scale to multi-user. Each new room requires a new Cloudflare Pages project + workflow. Rooms can't share a nav or user identity.

### Option C — hybrid (preferred long-term)
Each user gets a subdomain. Rooms are paths within it. Early "named brand" sites (buffbaby, marbles) can keep their own subdomains as aliases or redirects for backward compat.

```
leons.bloob.haus/marbles   ← canonical
marbles.bloob.haus         ← optional vanity alias → redirects to above
```

---

## Rooms vs. GitHub Repos

One key open question: **is a "room" a folder in a single vault repo, or a separate repo?**

Current thinking:
- A user's **entire Obsidian vault** lives in one GitHub repo
- **Rooms** = top-level folders in that vault (e.g. `/marbles/`, `/recipes/`, `/notes/`)
- The builder uses folder structure to drive URL paths: `/marbles/item-name/`
- A marble might appear in multiple "rooms" via `[[links]]` or transclusion — the URL lives in whichever folder it's physically in; it can be *linked* from anywhere

This means:
- One Cloudflare Pages project per user (not per room)
- One GitHub Actions build per user
- Room navigation is just top-level folder nav (already how sections work)

For **webapp users (Type B, no Obsidian):** there's no GitHub repo and no folder on disk. URLs should still be descriptive and room-based — the "where it's saved" implementation detail is invisible.

---

## Technical Note: mount_path Bug & Temporary Workaround (2026-02-27)

**Bug discovered:** Eleventy's `| url` filter + `pathPrefix` causes doubled paths when mounting content to a subdirectory.

```
Expected: /marbles/ADAPT-CHANGE/
Actual:   /marbles/marbles/ADAPT-CHANGE/  ← doubled!
```

**Temporary workaround (single-repo):** Put content in folders within one repo. Folder structure = URL structure.

**This does NOT work for the target architecture** where each room is a separate repo:
```
leons.bloob.haus/           ← Haus landing (lists all rooms)
leons.bloob.haus/marbles/   ← Room from bloob-haus-marbles repo
leons.bloob.haus/recipes/   ← Room from bloob-haus-recipes repo
```

**mount_path needs a proper fix** for multi-repo mounting. Options to explore:
1. Don't use pathPrefix; rewrite URLs in build postprocessing
2. Use Cloudflare Workers for path routing
3. Custom `| url` filter that's mount_path-aware
4. Build each room separately, merge output directories

See [DECISIONS.md](../../DECISIONS.md) and [TECH-DEBT.md](../../TECH-DEBT.md) #16 for details.

---

## Reserved / System URLs

These paths should be treated as reserved at the platform level — user vault folders with these names must be blocked or warned about:

| Reserved path | Purpose |
|---------------|---------|
| `bloob.haus/visualizers` | Showcase of what Bloob Haus visualizers can do |
| `bloob.haus/connect` | OAuth onboarding (Obsidian plugin auth) |
| `*.bloob.haus/assets/` | Static assets (already reserved by builder) |
| `*.bloob.haus/og/` | OG images (already reserved by builder) |
| `*.bloob.haus/_data/` | Eleventy internals (already reserved) |
| `*.bloob.haus/graph.json` | Graph API (already generated) |
| `*.bloob.haus/search/` | Pagefind search |
| `*.bloob.haus/tags/` | Tag index |
| `*.bloob.haus/feed.xml` | RSS |

See also: [`IDEAS.md` — Reserved root folder validation](../IDEAS.md)

---

## bloob.haus Core Site — Special Case

The main `bloob.haus` homepage is itself planned to be vault-driven. This is the most complex case:

- Content comes from a dedicated Obsidian vault (Leon's notes about the project, vision, etc.)
- It's not a "user site" — it's the product homepage
- Magic Machines might write to it (e.g. auto-updating feature showcases)
- It needs to coexist with reserved system paths (`/connect`, `/visualizers`, `/api/`, etc.)

**Decision needed:** Does `bloob.haus` run on the same Eleventy builder, or is it a separate Next.js/webapp layer? Current leaning: same builder (simpler, consistent), with system paths handled by Cloudflare redirect rules or a separate Pages Function.

---

## Custom Domains (e.g. resources.esjp.org)

External domains like `resources.esjp.org` are just another Cloudflare Pages project pointing at a different custom domain. The builder already supports this — `site_url` in the YAML config is the only thing that changes. No structural changes needed.

---

## Open Questions

1. **Wildcard subdomains:** When do we need `*.bloob.haus` DNS → dynamic routing? That requires either a server (Scaleway) or Cloudflare Workers to dispatch per-user builds. Not needed until Phase 3 multi-user.
2. **`leons.bloob.haus` vs `marbles.bloob.haus`:** For now, Option B (room-as-subdomain) is fine since there's only one user. Migrate to Option C (user-subdomain + room-as-path) when adding a second user.
3. **Room naming collision:** What if a user names a folder `visualizers` or `connect`? Builder should validate against reserved names. Add to tech debt / IDEAS.
4. **bloob.haus homepage timing:** This blocks having a real product presence. Even a hand-built static page would unblock the domain while the vault-driven version is planned.
