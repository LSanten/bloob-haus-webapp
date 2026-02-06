# Hugo → Eleventy Migration Checklist

**Quick reference during implementation. Full details in the main migration plan.**

---

## M0: Preparation (30 min)
- [ ] `mkdir -p src/{_data,_includes/layouts,_includes/partials,content,assets/css,assets/js}`
- [ ] `mkdir -p lib/visualizers/checkbox-tracker`
- [ ] `npm install @11ty/eleventy esbuild --save-dev`
- [ ] Update `.gitignore` (add `_site/`, `src/content/`)
- [ ] Add npm scripts to `package.json`
- [ ] Verify: `npm run dev:eleventy` starts

---

## M1: Foundation (2-3 hrs)
- [ ] Create `.eleventy.js` at root
- [ ] Create `src/_data/site.js` (from hugo/config.yaml)
- [ ] Create `src/_includes/layouts/base.njk` (from baseof.html)
- [ ] Create `src/_includes/layouts/page.njk` (from single.html)
- [ ] Create `src/_includes/partials/head.njk`
- [ ] Create `src/_includes/partials/nav.njk`
- [ ] Copy CSS: `cp -r hugo/assets/css/* src/assets/css/`
- [ ] Create test file `src/content/test.md`
- [ ] Verify: Test page renders with layout and CSS

---

## M2: Preprocessing (1-2 hrs)
- [ ] Modify `preprocess-content.js` - add BUILD_TARGET support
- [ ] Modify `build-site.js` - add --target flag
- [ ] Add `layout: layouts/page.njk` to frontmatter for Eleventy
- [ ] Verify: `npm run build:eleventy` outputs to `src/content/`

---

## M3: Template Parity (2-3 hrs)
- [ ] Create `src/_includes/layouts/list.njk`
- [ ] Set up collections in `.eleventy.js`
- [ ] Create homepage template
- [ ] Add date filter
- [ ] Visual comparison: Hugo vs Eleventy side-by-side
- [ ] Fix any differences

---

## M4: Visualizer Architecture (2-3 hrs)
- [ ] Create `lib/visualizers/checkbox-tracker/parser.js` (pure)
- [ ] Create `lib/visualizers/checkbox-tracker/renderer.js` (pure)
- [ ] Create `lib/visualizers/checkbox-tracker/browser.js` (DOM/localStorage)
- [ ] Create `lib/visualizers/checkbox-tracker/index.js` (exports)
- [ ] Copy styles to `lib/visualizers/checkbox-tracker/styles.css`
- [ ] Create `scripts/bundle-visualizers.js`
- [ ] Integrate with Eleventy (filter or transform)
- [ ] Update package.json build scripts
- [ ] Verify: Build-time rendering + browser interactivity works

---

## M5: Backlinks (1-2 hrs)
- [ ] Create `src/_data/eleventyComputed.js` OR collection in config
- [ ] Create `src/_includes/partials/backlinks.njk`
- [ ] Add backlinks to page layout
- [ ] Add backlinks CSS
- [ ] Verify: Backlinks appear on linked pages

---

## M6: Deployment (1-2 hrs)
- [ ] Full test: `npm run build:eleventy && npx serve _site`
- [ ] Update `vercel.json`
- [ ] Push to branch, test preview
- [ ] Compare with production
- [ ] Merge to main
- [ ] Verify production deployment
- [ ] Test webhook (push to buffbaby)

---

## M7: Cleanup (2-3 hrs)
- [ ] Archive Hugo: `git checkout -b archive/hugo-version && git push`
- [ ] Remove hugo/ folder
- [ ] `npm uninstall hugo-bin`
- [ ] Clean up package.json scripts
- [ ] Create `docs/implementation-plans/DECISIONS.md`
- [ ] Update `docs/CLAUDE_CONTEXT.md`
- [ ] Update `docs/architecture/visualizers.md`
- [ ] Update `docs/implementation-plans/ROADMAP.md`
- [ ] Update README.md

---

## Total Estimated Time: ~12-16 hours (2 focused days)
