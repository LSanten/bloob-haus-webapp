# Hugo → Eleventy Migration Checklist

**Quick reference during implementation. Full details in the main migration plan.**

---

## M0: Preparation ✅ COMPLETE
- [x] Create `src/` directory structure
- [x] Create `lib/visualizers/checkbox-tracker/`
- [x] `npm install @11ty/eleventy esbuild --save-dev`
- [x] Update `.gitignore` (section dirs, `_site/`, `src/media/`)
- [x] Add npm scripts to `package.json`
- [x] Create `.eleventyignore` with `node_modules/`

---

## M1: Foundation ✅ COMPLETE
- [x] Create `eleventy.config.js` (ESM, Eleventy 3.x)
- [x] Create `src/_data/site.js`
- [x] Create `src/_data/eleventyComputed.js` (slugified permalinks)
- [x] Port templates: `base.njk`, `page.njk`, `list.njk`
- [x] Port partials: `head.njk`, `nav.njk`, `footer.njk`, `scripts.njk`
- [x] Copy CSS + JS assets to `src/assets/`
- [x] Verify test page renders

---

## M2: Preprocessing ✅ COMPLETE
- [x] Modify `preprocess-content.js` — `BUILD_TARGET` support (lazy getter)
- [x] Modify `build-site.js` — `--target=` flag
- [x] Add `layout: layouts/page.njk` to frontmatter for Eleventy
- [x] Verify: 67 pages, 22 media, 0 broken links

---

## M3: Template Parity (~1-2 hrs)
- [ ] Set up section collections in `eleventy.config.js` (`recipes`, `recipesByDate`, etc.)
- [ ] Create homepage `src/index.njk`
- [ ] Create section index pages (`src/recipes/index.njk`, etc.)
- [ ] Visual comparison: Hugo vs Eleventy side-by-side
- [ ] Fix any differences

---

## M4: Visualizer Architecture (~2-3 hrs)
- [ ] Create `lib/visualizers/checkbox-tracker/parser.js` (pure, operates on HTML)
- [ ] Create `lib/visualizers/checkbox-tracker/renderer.js` (pure, returns HTML string)
- [ ] Create `lib/visualizers/checkbox-tracker/browser.js` (DOM/localStorage)
- [ ] Create `lib/visualizers/checkbox-tracker/index.js` (exports + transform)
- [ ] Copy styles to `lib/visualizers/checkbox-tracker/styles.css`
- [ ] Create `scripts/bundle-visualizers.js` (esbuild, auto-discovers visualizer folders)
- [ ] Add `addTransform("visualizers", ...)` to `eleventy.config.js`
- [ ] Update `package.json` build scripts
- [ ] Verify: checkboxes work (build-time + browser interactivity + persistence)

---

## M5: Backlinks (~1-2 hrs)
- [ ] Add `addCollection("withBacklinks", ...)` to `eleventy.config.js`
- [ ] Create `src/_includes/partials/backlinks.njk`
- [ ] Add backlinks include to `page.njk`
- [ ] Add backlinks CSS
- [ ] Verify: backlinks appear on linked pages

---

## M6: Deployment (~1-2 hrs)
- [ ] Full test: `npm run build:eleventy && npx serve _site`
- [ ] Update `vercel.json`
- [ ] Push to branch, test preview
- [ ] Compare with production
- [ ] Merge to main
- [ ] Verify production deployment
- [ ] Test webhook (push to buffbaby)

---

## M7: Cleanup (~2-3 hrs)
- [ ] Archive Hugo: `git checkout -b archive/hugo-version && git push`
- [ ] Remove `hugo/` folder
- [ ] `npm uninstall hugo-bin`
- [ ] Clean up `package.json` scripts
- [ ] Create `docs/implementation-plans/DECISIONS.md`
- [ ] Update `docs/CLAUDE_CONTEXT.md`
- [ ] Update `docs/architecture/visualizers.md`
- [ ] Update `docs/implementation-plans/ROADMAP.md`
- [ ] Update README.md
