# Ideas Parking Lot

Features and ideas that came up but aren't prioritized yet. Add ideas here to capture them without committing to implementation.

---

## Unprioritized Ideas

### Site Features
- [x] RSS feed generation (done — Session 5, `/feed.xml`)
- [x] Sitemap generation (done — Session 5, `/sitemap.xml`)
- [x] Search (done — Pagefind with tag filtering at `/search/`)
- [ ] **Vault index.md homepage** — if vault root has `index.md`, use its content as the homepage body. Design options:
  - **Option A (recommended):** Preprocessor detects `index.md` at vault root → copies it without modification into `src/`. Theme's `index.njk` checks `collections.vaultIndex` (a special collection); if found, renders its content. Shortcodes `{% search %}` and `{% tags %}` let users inline the search bar and tag cloud from their markdown.
  - **Option B:** If vault `index.md` has `permalink: /`, it overrides theme's `index.njk` entirely. Requires assemble-src.js to suppress theme's `index.njk` when vault index exists (to avoid conflict).
  - **Shortcodes needed:** `eleventyConfig.addShortcode("search", ...)` → renders Pagefind widget HTML; `eleventyConfig.addShortcode("tags", ...)` → renders tag cloud. These shortcodes would work in any `.md` file (not just index).
  - No existing standard for inline search or tags yet — this would establish it.
- [ ] Multi-language support
- [ ] Version history / revision tracking
- [ ] Scheduled publishing
- [ ] A/B testing for content

### Infrastructure / Safety
- [ ] Reserved root folder validation — prevent user vault folders from colliding with system directories (`assets/`, `og/`, `_data/`, `_includes/`). Becomes more important with multi-user/multi-vault support.

### Ecosystem / Integrations
- [ ] Theme marketplace
- [ ] Plugin/visualizer marketplace
- [ ] Obsidian plugin for Bloob Haus sync (push/pull with GitHub)
- [ ] Obsidian plugin for Cooklang syntax preview
- [ ] VS Code extension
- [ ] CLI tool (`bloob publish`)
- [ ] Webhook integrations (Zapier, IFTTT)

### Recipe-Specific
- [ ] Ingredient database / linking (`@rice` → ingredient page)
- [ ] Timer visualizer (`~{5%minutes}` becomes clickable timer)
- [ ] Nutrition calculation from ingredients
- [ ] Shopping list generation from recipes

### Visualizer Ideas
- [ ] PDF viewer visualizer
- [ ] Code playground visualizer
- [ ] Map/location visualizer
- [ ] Audio player visualizer
- [ ] Thesis visualizations (communication mapping, systemic sensing, community gardens)

---

## How to Use This Document

1. **When ideas come up:** Add them here with a checkbox
2. **When planning a phase:** Review this list for candidates
3. **When prioritizing:** Move items to the appropriate phase in ROADMAP.md
4. **Include source:** Note where the idea came from (user request, session, etc.)

---

## Recently Added

| Date | Idea | Source |
|------|------|--------|
| 2026-02-03 | Obsidian plugin for Bloob Haus sync | Session 4 planning |
| 2026-02-03 | Obsidian plugin for Cooklang syntax preview | Session 4 planning |
| 2026-02-03 | Ingredient database / linking | Recipe scaling discussion |
| 2026-02-03 | Timer visualizer | Cooklang research |
| 2026-02-09 | Reserved root folder validation | Duplicate image bug fix — OG images moved to `/og/` |
| 2026-02-19 | UUID-based file identity for tracking files across renames/moves | Engineering review discussion |
| 2026-02-19 | Demo reel / showcase on bloob.haus index page | Engineering review — could be another Obsidian-powered site |
| 2026-02-19 | `npm run lint` script with depcheck and other hygiene checks | Engineering review |
| 2026-02-19 | CI-integrated depcheck as a workflow step | Engineering review |
| 2026-02-19 | Git sparse checkout for subfolder-only cloning (save bandwidth/time) | Marbles site build discussion |
| 2026-02-19 | User-editable vault customization (themes/CSS/visualizer config in Obsidian vault root) | Marbles folder structure discussion |
| 2026-02-19 | Webapp places visualizer folders into GitHub repo/Obsidian vault | Future UX for user plugin management |
| 2026-02-28 | Vault index.md to control homepage content + search/tags shortcodes | User session — marbles homepage |
| 2026-02-28 | `folder-contents` visualizer — ` ```folder-contents ``` ` code fence renders a list of pages in a folder (sort: recent/alpha, limit, filter by tag). Would replace the Nunjucks for loop in index.md entirely, making index.md pure markdown with no Nunjucks. | User session — marbles index.md UX |
| 2026-02-28 | Magic machine to auto-update `_bloob-settings.md` config table when theme features change — GitHub API workflow that edits vault file, user pulls | User session — settings reference table |
