# Hugo → Eleventy Migration Checklist

**Quick reference during implementation. Full details in the main migration plan.**

**Status: ALL PHASES COMPLETE**

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

## M3: Template Parity ✅ COMPLETE
- [x] Set up section collections in `eleventy.config.js` (`recipes`, `recipesByDate`, etc.)
- [x] Create homepage `src/index.njk`
- [x] Create section index pages (`src/recipes/index.njk`, etc.)
- [x] Visual comparison: Hugo vs Eleventy side-by-side
- [x] Fix any differences

---

## M4: Visualizer Architecture ✅ COMPLETE
- [x] Create `lib/visualizers/checkbox-tracker/browser.js` (DOM/localStorage)
- [x] Create `lib/visualizers/checkbox-tracker/index.js` (exports + transform)
- [x] Copy styles to `lib/visualizers/checkbox-tracker/styles.css`
- [x] Create `scripts/bundle-visualizers.js` (esbuild, auto-discovers visualizer folders)
- [x] Add `addTransform("visualizers", ...)` to `eleventy.config.js`
- [x] Update `package.json` build scripts
- [x] Add `markdown-it-task-lists` plugin for checkbox rendering
- [x] Verify: checkboxes work (build-time + browser interactivity + persistence)

---

## M5: Backlinks ✅ COMPLETE
- [x] Add `addCollection("withBacklinks", ...)` to `eleventy.config.js`
- [x] Create `src/_includes/partials/backlinks.njk`
- [x] Add backlinks include to `page.njk`
- [x] Add backlinks CSS
- [x] Verify: backlinks appear on linked pages

---

## M6: Deployment ✅ COMPLETE
- [x] Full test: `npm run build:eleventy && npx serve _site`
- [x] Update `vercel.json`
- [x] Push to main
- [x] Verify production deployment
- [x] Add RSS feed, sitemap, robots.txt, 404 page
- [x] Add image optimization (WebP + responsive sizes)

---

## M7: Cleanup ✅ COMPLETE
- [x] Archive Hugo: `git checkout -b archive/hugo-version && git push`
- [x] Remove `hugo/` folder
- [x] `npm uninstall hugo-bin`
- [x] Clean up `package.json` scripts
- [x] Clean up `.gitignore` and `vercel.json`
- [x] Update `docs/CLAUDE_CONTEXT.md`
- [x] Update `docs/implementation-plans/ROADMAP.md`
- [x] Verify `docs/implementation-plans/DECISIONS.md`
- [x] Verify `docs/architecture/visualizers.md`
- [x] Create `README.md`
