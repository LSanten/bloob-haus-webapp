# Start Your Own Bloob Haus

Welcome. This is the guided path for turning your own Obsidian vault into a live website on
`yourname.bloob.haus` (or your own domain).

> **The one thing to know before you start:** a plain markdown file is already a website. You do
> **not** need to restructure your notes, learn a template language, or write any code to get a
> working site. You add richness gradually, only where you want it.

---

## The whole idea in 30 seconds

1. Your notes live in **your own** Obsidian vault (a private GitHub repo). They stay yours.
2. This builder reads that vault, turns each markdown file into a page, and deploys a static site.
3. **Folder = URL. Filename = page.** The site map is the shape of your notes.
4. The only special ingredient is one optional line of frontmatter — `bloob-shape:` — which tells a
   page what *kind of thing* it is (a marble, an article, a garden…) so it gets a matching look.

Everything else is optional polish.

---

## The path (do these in order)

### 1. Prepare your vault → [`prepare-your-vault.md`](prepare-your-vault.md)
What a bloob-haus vault looks like, why you probably don't need to change much, where to put images,
and the single load-bearing piece of frontmatter. **Start here** — it's the part that decides how
much work (usually very little) the rest will be.

### 2. Fork, deploy, and work day-to-day → [`fork-deploy-and-workflow.md`](fork-deploy-and-workflow.md)
Fork this builder, point it at your vault, get it live on Cloudflare, install the Obsidian plugin,
and learn the pull-updates / send-changes-back rhythm.

### 3. Configure your site → [`../../sites/_template.yaml`](../../sites/_template.yaml)
A copy-and-fill template for your site's one config file (which vault, which theme, which features).

---

## Where the real detail lives (single sources of truth)

These onboarding docs are a **guided path** — they point you to the authoritative reference docs
rather than repeating them, so nothing goes stale. When you're ready to go deeper:

| Topic | Authoritative doc |
|---|---|
| What a "shape" is (the core concept) | [`../architecture/ontology.md`](../architecture/ontology.md) (the *why*) · [`../architecture/shapes.md`](../architecture/shapes.md) (the *how*) |
| Bringing an existing HTML/CSS design in as a theme | [`../architecture/bring-your-own-theme.md`](../architecture/bring-your-own-theme.md) |
| The full theme contract (CSS tokens every theme must declare) | [`../architecture/themes.md`](../architecture/themes.md) · [`../architecture/theme-standards.md`](../architecture/theme-standards.md) |
| Every per-page and site-wide setting | [`../architecture/settings-registry.md`](../architecture/settings-registry.md) |
| How URLs and page identity are derived | [`../architecture/urls-and-ids.md`](../architecture/urls-and-ids.md) |
| Keeping private things private | [`../architecture/security-by-obscurity.md`](../architecture/security-by-obscurity.md) |

---

## A note on how much to do

You can stop at any stage and have a real, working site:

- **Stage 1 — just notes.** Point the builder at your vault. Every note becomes a page. Done. This
  already works.
- **Stage 2 — some shape.** Give a few pages a `bloob-shape:` so they get banners, icons, or special
  layouts. Add a visualizer or two.
- **Stage 3 — your own look.** Adapt or build a theme so the whole site feels like *you*.

Nothing is ever "wrong" — your site is just more or less defined. (This is the "undefined pile →
stabilized identity" progression described in [`../architecture/ontology.md`](../architecture/ontology.md).)
Start at Stage 1. Grow when you feel like it.
