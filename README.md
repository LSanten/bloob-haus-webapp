# Bloob Haus

**Live sites built with Obsidian to Webpage builder (still under construction but good for getting the idea):**
- [buffbaby.bloob.haus](https://buffbaby.bloob.haus) — Buff Baby Kitchen (recipes)
- [leons.bloob.haus](https://leons.bloob.haus) — Leon's Marbles (notes, thoughts, creative work)


---

## What this is

Bloob Haus is a personal web-home builder and an experiment in making **visual interfaces easy to create, share, and reproduce**.

The deeper vision: what if building a beautiful, interactive page was as easy as writing a few lines in a text file? What if you could hand someone a visualizer — a scene, a graph, a custom layout — and they could drop it into their own site and start shaping it immediately, with a live GUI, no code required?
(the vision goes deeper than this, but I am keeping myself short here)

The name comes from *Bauhaus* the idea that design and daily life should be integrated, not kept separate, and *Bloob*, which is my partner's design language for cute things and characters. A "haus" is your home on the web. In this context, a "bloob" is a real object on the web: asoft, shapeable thing — not a brand, not a product, just a place.

That's what this is building toward. The current architecture has three core concepts:

### Marbles
In my world, a marble is a metaphorical container for a note that I want to share and shape with you. It can be a sketchy idea, an insight, a piece of knowledge, or a question that I consider valuable for my life's ongoing dialogue. These marbles are never perfect and always a snapshot of a given moment.  [leons.bloob.haus/marbles](https://leons.bloob.haus)  as an example of my "marbles" collection. 

### Visualizers

Self-contained interactive components that live inside your markdown as code fences. You write:

~~~markdown
```scene-nav
aspectRatio: "16/9"
elements:
  - image: ![](/media/dragonfly.png)
    x: 66
    y: 4
    label: "dragonfly"
    glow: "#B388FF"
    action: link
    value: "https://studio.bloob.haus/"
```
~~~

And the site renders a full interactive scene with draggable elements, glow shadows, mobile/desktop positioning, and clickable links. Each visualizer is a self-contained package — its own parser, renderer, browser-side logic, styles, and tests. Same parser code runs at build time, in the browser preview, and (eventually) as an Obsidian plugin.

Current visualizers: interactive link graph, tag cloud, scene navigator.

#### GOOD EXAMPLES OF WORKING AND INTEGRATED VISUALIZERS ARE:

- [Fridge Magnets Visualization](https://leons.bloob.haus/marbles/FRIDGE-MAGNETS-FOR-GAS-BURNER-AWARENESS/)
- [PNG based interface that is highly customizable](https://leons.bloob.haus/say-hello-to/the-core-family-of-studio-bloob/)

### Magic Machines

GUI builders that write the code for you. Open the **Scene Nav Builder**, drag images onto a canvas, set glow colors and link targets, toggle between desktop and mobile layouts — then copy the generated code fence into your Obsidian file. The site picks it up automatically on the next build.

The point is that you shouldn't have to hand-write YAML to build something that looks and feels custom. The machine writes it; you shape it.

QUESTION: still a little bit open what a magic machine exactly is. I currenlty have one working magic machine but it is more like a *Builder* for a *Visualizer*, which feels a little bit different. 

INSIGHT: some core piece around magic machines is that I want to find a place and container for small apps. 

Check this magic machine out: [Interface Builder](https://leons.bloob.haus/tools/scene-nav-builder/)

---

## What this is (for non-technical readers)

Bloob Haus is a small piece of infrastructure that Leon and Whitney are building for their own digital lives. It turns private Obsidian notebooks into real websites — with interactive visuals, backlinks between pages, search, and custom themes.

The goal is to make something that feels genuinely personal, not like a template. Each page can declare what *kind of thing* it is (a marble, a note, a letter, a piece of art) and gets a matching banner image, colors, and icon. Links between pages show you what type of thing you're linking to. Scenes can be laid out with characters and objects, clicking through to products or other pages.

It started as a recipe site. It's grown into a platform for personal expression with real interactive interfaces.

---

## Values

**Your content stays yours.** Content lives in your own private GitHub repo. The builder clones it, transforms it, and deploys the site. You can walk away at any time and still have all your files.

**Consent-first publishing.** Nothing goes public by accident. You either tag things `#not-for-public` (blocklist mode) or explicitly mark them `publish: true` (allowlist mode). The filter runs before anything else.

**No surveillance, no tracking.** No analytics that follow people. No cookies that require banners. Just a static site hosted on Cloudflare.

**Build what you actually need.** The architecture evolves session by session based on real use, not hypothetical features. If it's not needed yet, it isn't built.

**Legible structure.** Folder = URL. Filename = stable identity. The site map follows the shape of your notes, not an algorithm.

---

## The journey so far

The project started in January 2026 as a Hugo site for Leon's recipes. Within a week it became clear that the vision was bigger — visualizers that work both on the web *and* inside Obsidian, backlinks between notes, interactive graphs. Hugo uses Go templates; those couldn't be shared with a browser. So the whole thing was migrated to Eleventy (JavaScript), which made it possible to use the same parsing code everywhere.

Since then:

- **Multi-site builder** — One codebase, multiple sites. Each site has its own YAML config, its own theme, its own content repo.
- **`marbles-pouch` theme** — Leon's personal theme: white banner, sky-blue body, organic wave separator, bloob-object type system. Each page declares what kind of thing it is (a marble, a note, a letter) and gets a matching visual identity.
- **Visualizers** — Modular interactive components that live inside your markdown as code fences. Currently: an interactive link graph, a tag cloud, and the scene navigator.
- **Scene Navigator** — Place images at positions on a canvas, give them glow effects and labels, link them to pages or URLs. Works on both desktop and mobile with independent positioning. Comes with a drag-and-drop GUI builder.
- **Internal link pills** — Wiki-links and markdown links in your content are automatically styled as pills with the target page's bloob-object icon, so you can see at a glance what kind of thing you're linking to.
- **Bloob objects** — A registry (`_bloob-objects.md`) that maps object types (marble, note, letter, pouch…) to images, banner text, and descriptions. Declares what kinds of things exist in your haus.
- **Image pipeline** — Banner images, OG images, inline icons, favicon — all generated and optimized from one source image per object type.
- **Private content that stays private** — The publish filter now loads directly from the vault settings file, so there's no way to accidentally expose private content by running a script in the wrong order.

---

## How it works

```
Your Obsidian vault (private GitHub repo)
    ↓
Preprocessor:
  - filter out private content
  - resolve [[wiki-links]] and images
  - parse visualizer code fences
  - build graph.json link map
    ↓
Eleventy builds the static site
    ↓
Cloudflare Pages deploys it
    ↓
yourdomain.bloob.haus
```

When you push to your content repo, Cloudflare rebuilds the site automatically. When you push to this repo (the builder), all sites rebuild.

---

## What's live today

- **buffbaby.bloob.haus** — Buff Baby Kitchen. Recipes from Leon's private Obsidian vault. Recipe cards, sections, search, RSS feed.
- **leons.bloob.haus** — Leon's Marbles. Notes and creative work. The scene navigator is live on the [Studio Bloob family page](https://leons.bloob.haus/say-hello-to/the-core-family-of-studio-bloob/).

---

## Technical quick start

```bash
npm install
cp .env.local.example .env.local  # add your GITHUB_TOKEN

npm run dev:marbles    # dev server for marbles site
npm run dev:buffbaby   # dev server for buffbaby site
npm run build          # full build (defaults to buffbaby)
npm test               # run the test suite
```

Site configs live in `sites/*.yaml`. Themes live in `themes/`. Content stays in its own private repo — this builder just reads it.

### Adding a new site
1. Create `sites/my-site.yaml` pointing to a content repo and a theme
2. Create `themes/my-theme/` with layouts, partials, and CSS
3. `SITE_NAME=my-site npm run build`

---

## Stack

- **Eleventy 3.x** — static site generator (ESM)
- **esbuild** — bundles visualizers
- **sharp** — image optimization (WebP, icons, favicons)
- **Cloudflare Pages** — hosting and CDN
- **Obsidian** — content authoring
- **Vitest** — test suite (195+ tests)

---

## Documentation

- [`docs/CHANGELOG.md`](docs/CHANGELOG.md) — session-by-session build history
- [`docs/CLAUDE_CONTEXT.md`](docs/CLAUDE_CONTEXT.md) — architecture overview and project status
- [`docs/implementation-plans/DECISIONS.md`](docs/implementation-plans/DECISIONS.md) — why things are the way they are
- [`docs/implementation-plans/ROADMAP.md`](docs/implementation-plans/ROADMAP.md) — what's coming next
- [`docs/architecture/`](docs/architecture/) — how the visualizer, magic machine, and search systems work
