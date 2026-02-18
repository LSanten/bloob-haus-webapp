# Test Suite Implementation Plan

**Created:** February 7, 2026  
**Updated:** February 17, 2026 (co-located testing architecture, templatizer additions)  
**Status:** Phase 1 + 1.5 COMPLETE (9 files, 104 tests passing)  
**Motivation:** The URL-encoding bug (filenames with spaces breaking images) is exactly the kind of regression a test suite would catch. The preprocessing pipeline has rich pure-function logic that's highly testable. Adding tests before Phase 2 adds more complexity is the right time.

---

## Design Principles

### Co-located Tests for Modular Packages

Modular packages (visualizers, future magic machines) carry their own tests alongside their code. This ensures each package is fully self-contained — manifest, logic, styles, and proof-it-works all live together. When you add a new visualizer, you add its test too. When you delete it, the test goes with it.

Central tests still exist for shared pipeline code, config/build orchestration, and integration testing.

### Always Run

`npm test` runs everything. No toggle needed — tests are fast (pure functions, no network). During development, `npm run test:watch` only re-runs tests related to changed files. You can also scope runs manually: `npx vitest run tests/utils/` or `npx vitest run lib/visualizers/`.

### Test What's Activated

Config-driven tests verify that the build respects `sites/*.yaml` — if a visualizer isn't listed, it shouldn't be bundled. If `backlinks: false`, they shouldn't appear. You don't need to test every permutation; test whatever is activated in a given config.

---

## Reminder: Where Activation Config Lives

Tests need to know what's "turned on." Here's where that info lives:

| What | Where | Example |
|------|-------|---------|
| Which visualizers to bundle | `sites/buffbaby.yaml` → `visualizers:` | `- checkbox-tracker` |
| Feature flags (RSS, backlinks, search, etc.) | `sites/buffbaby.yaml` → `features:` | `backlinks: true` |
| Visualizer self-description & activation method | `lib/visualizers/<name>/manifest.json` | `"method": "auto-detect"` |
| Theme used for the site | `sites/buffbaby.yaml` → `theme:` | `"warm-kitchen"` |
| Publish mode | `sites/buffbaby.yaml` → `content.publish_mode:` | `"blocklist"` |

---

## Framework: Vitest

- Native ESM support (project uses `"type": "module"`)
- Zero config needed
- Fast watch mode for development
- Built-in `vi.mock()` for mocking `fs-extra`, `glob`, `child_process`
- No Babel or transform plugins needed

---

## File Structure

```
vitest.config.js

tests/                                   # Central tests (pipeline, config, build)
  helpers/
    mock-index.js                        # Shared mock file index factory
  utils/
    comment-stripper.test.js             # Phase 1
    attachment-resolver.test.js          # Phase 1
    wiki-link-resolver.test.js           # Phase 1
    markdown-link-resolver.test.js       # Phase 1
    transclusion-handler.test.js         # Phase 1
    file-index-builder.test.js           # Phase 2
    publish-filter.test.js               # Phase 2
    config-reader.test.js                # Phase 2
    git-date-extractor.test.js           # Phase 2
  build/
    config-loader.test.js                # Phase 1.5 (templatizer)
    assemble-src.test.js                 # Phase 1.5 (templatizer)
  eleventy/
    filters.test.js                      # Phase 2
    computed.test.js                     # Phase 2
    backlinks.test.js                    # Phase 3
  integration/
    preprocess-pipeline.test.js          # Phase 3
    build-config.test.js                 # Phase 3
  fixtures/                              # Small test vault for integration tests

lib/visualizers/                         # Co-located tests (modular packages)
  checkbox-tracker/
    manifest.json
    index.js
    browser.js
    styles.css
    checkbox-tracker.test.js             # Phase 1.5
  page-preview/
    manifest.json
    index.js
    browser.js
    styles.css
    page-preview.test.js                 # Phase 1.5

lib/machines/                            # Future: same co-located pattern
  <machine-name>/
    <machine-name>.test.js
```

**Vitest discovers tests by glob pattern** — both central and co-located tests are found automatically:

```js
// vitest.config.js
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: [
      'tests/**/*.test.js',    // Central tests (pipeline, config, etc.)
      'lib/**/*.test.js',      // Co-located modular tests (visualizers, machines)
    ],
  },
});
```

---

## Phase 1: Pure Function Unit Tests

**Priority: Highest. Zero mocking needed.**

These modules are pure `(string, object) -> object` with no file I/O. This is where bugs live and where tests deliver the most value per line of code.

### Setup

1. `npm install -D vitest`
2. Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`
3. Create `vitest.config.js` (see above)
4. Create `tests/helpers/mock-index.js` with a reusable mock file index factory

### Test Files (in implementation order)

#### 1. `comment-stripper.test.js`

**Location:** `tests/utils/comment-stripper.test.js`  
**Target:** `stripComments(content)` from `scripts/utils/comment-stripper.js`

Simplest module (~35 lines, one function). Perfect for validating the test infrastructure works.

| Test Case | Input | Expected |
|-----------|-------|----------|
| Inline Obsidian comment | `before %% comment %% after` | `before  after` |
| Multiline Obsidian comment | `before\n%% line1\nline2 %%\nafter` | `before\n\nafter` |
| HTML comment | `before <!-- comment --> after` | `before  after` |
| Multiline HTML comment | `before\n<!-- line1\nline2 -->\nafter` | `before\n\nafter` |
| Whitespace collapse | Triple+ newlines after removal | Collapsed to double newlines |
| No comments | `hello world` | `hello world` (passthrough) |
| Empty string | `""` | `""` |
| Multiple comments in one line | `a %% b %% c %% d %% e` | `a  c  e` |

#### 2. `attachment-resolver.test.js`

**Location:** `tests/utils/attachment-resolver.test.js`  
**Target:** `resolveAttachments(content, attachmentIndex)` from `scripts/utils/attachment-resolver.js`

**This is the highest-value test file** — the URL-encoding bug for filenames with spaces lived here.

| Test Case | Why It Matters |
|-----------|----------------|
| `![alt](image.jpg)` resolves via index | Basic functionality |
| `![](Pasted%20image%2020250315.jpg)` decodes %20 for lookup | **The bug case** |
| `![[image.jpg]]` wiki-style resolves to standard markdown | Format conversion |
| `![[image.jpg\|alt text]]` preserves alt | Pipe syntax |
| Filenames with spaces get encoded `/media/` path | URL validity |
| Filenames with `@` get encoded (e.g., `@2x.png`) | Special chars |
| Case-insensitive lookup (lowercase fallback) | Robustness |
| Unresolved image keeps original tag | Graceful degradation |
| Unresolved wiki image converts to standard markdown | Consistent output |
| Mixed resolved + broken populates both arrays | Stats tracking |

#### 3. `wiki-link-resolver.test.js`

**Location:** `tests/utils/wiki-link-resolver.test.js`  
**Target:** `resolveWikiLinks(content, index)` from `scripts/utils/wiki-link-resolver.js`

| Test Case | Input Pattern | Expected |
|-----------|--------------|----------|
| Basic link | `[[Page Name]]` | `[Page Name](/section/page-name/)` |
| Display text | `[[Page\|Custom Text]]` | `[Custom Text](/section/page-name/)` |
| Heading anchor | `[[Page#My Heading]]` | `[Page#My Heading](/section/page-name/#my-heading)` |
| Heading + display | `[[Page#Heading\|Text]]` | `[Text](/section/page-name/#heading)` |
| Title lookup | Matches by title (case-insensitive) | Resolved |
| Filename lookup | Matches by filename when title fails | Resolved |
| Normalized lookup | Strips special chars as fallback | Resolved |
| Broken link | `[[Nonexistent]]` | `<span class="broken-link">` |
| Skips transclusions | `![[Page]]` | Left untouched |
| Stats tracking | Mixed content | `resolved` and `broken` arrays populated |

#### 4. `markdown-link-resolver.test.js`

**Location:** `tests/utils/markdown-link-resolver.test.js`  
**Target:** `resolveMarkdownLinks(content, index)` from `scripts/utils/markdown-link-resolver.js`

| Test Case | Input Pattern |
|-----------|--------------|
| Basic md link | `[text](file.md)` |
| With folder path | `[text](folder/file.md)` (strips path, resolves by filename) |
| URL-encoded path | `[text](file%20name.md)` (decodes for lookup) |
| Heading anchor | `[text](file.md#heading)` (preserved + slugified) |
| Broken link | `[text](nonexistent.md)` → `<span class="broken-link">` |
| Non-.md links | `[text](https://example.com)` left untouched |
| Multiple links | Several links in same content |

#### 5. `transclusion-handler.test.js`

**Location:** `tests/utils/transclusion-handler.test.js`  
**Target:** `handleTransclusions(content)` from `scripts/utils/transclusion-handler.js`

| Test Case | Input | Expected |
|-----------|-------|----------|
| Page transclusion | `![[Page Name]]` | `<div class="transclusion-placeholder">` with link |
| With alt text | `![[Page\|Alt]]` | Placeholder with alt text |
| Media exclusion: .jpg | `![[photo.jpg]]` | Left untouched (for attachment resolver) |
| Media exclusion: .png | `![[screenshot.png]]` | Left untouched |
| Media exclusion: .pdf | `![[document.pdf]]` | Left untouched |
| Media exclusion: .mp4 | `![[video.mp4]]` | Left untouched |
| All media extensions | .jpg .jpeg .png .gif .webp .svg .pdf .mp4 .webm .html | All left untouched |
| No transclusions | Plain text | Passthrough |
| Multiple in same content | Two `![[...]]` patterns | Both converted |

---

## Phase 1.5: Templatizer & Co-located Visualizer Tests

**Added February 17, 2026** — covers the templatized builder (Session 9) and establishes the co-located test pattern for modular packages.

### Templatizer Tests (central)

#### 6. `config-loader.test.js`

**Location:** `tests/build/config-loader.test.js`  
**Target:** `loadSiteConfig()`, `resolveSiteName()` from `scripts/utils/config-loader.js`

| Test Case | What It Verifies |
|-----------|------------------|
| Loads `sites/buffbaby.yaml` correctly | YAML parsing, all fields present |
| `resolveSiteName()` reads `--site=` CLI arg | CLI flag parsing |
| `resolveSiteName()` reads `SITE_NAME` env var | Env var fallback |
| `resolveSiteName()` defaults to `buffbaby` | Default when nothing specified |
| CLI arg takes precedence over env var | Priority chain |
| Missing YAML file throws clear error | Error handling |
| Config has expected shape (site, content, theme, features, etc.) | Schema validation |

#### 7. `assemble-src.test.js`

**Location:** `tests/build/assemble-src.test.js`  
**Target:** `assembleSrc(config)` from `scripts/assemble-src.js`  
**Mocking:** `fs-extra` (file copy operations)

| Test Case | What It Verifies |
|-----------|------------------|
| Copies `themes/_base/` partials into `src/_includes/` | Base layer assembly |
| Copies theme layouts into `src/_includes/layouts/` | Theme layer assembly |
| Theme partials override base partials with same name | Override precedence |
| Copies theme pages into `src/` root (index.njk, 404.njk, etc.) | Page assembly |
| Generates `src/_data/site.js` with values from config | Config → site.js generation |
| Generated `site.js` contains correct site name, URL, author | Field accuracy |
| Copies theme CSS into `src/assets/css/` | Asset assembly |
| Works for a different theme name (not just warm-kitchen) | Theme independence |

### Co-located Visualizer Tests

These live inside each visualizer's folder and test the package in isolation.

#### 8. `checkbox-tracker.test.js`

**Location:** `lib/visualizers/checkbox-tracker/checkbox-tracker.test.js`  
**Target:** `index.js` exports from `lib/visualizers/checkbox-tracker/`

| Test Case | What It Verifies |
|-----------|------------------|
| Exports `type` as `"runtime"` | Correct type declaration |
| Exports `name` as `"checkbox-tracker"` | Name matches folder |
| `transform()` is a no-op for runtime visualizers | No build-time side effects |
| `manifest.json` has required fields (name, type, version, activation) | Manifest completeness |
| `manifest.json` activation method is `"auto-detect"` | Correct activation |
| `manifest.json` files list matches actual files on disk | No missing files |

#### 9. `page-preview.test.js`

**Location:** `lib/visualizers/page-preview/page-preview.test.js`  
**Target:** `index.js` exports from `lib/visualizers/page-preview/`

Same pattern as checkbox-tracker — validates exports, manifest, and file references.

**Template for future visualizers:** When creating a new visualizer, copy the test file from an existing one and adapt. The test structure is the same for all visualizers:
1. Validate `index.js` exports (type, name, transform)
2. Validate `manifest.json` structure and fields
3. For build-time visualizers: test `parser(input) → data` and `renderer(data) → html` as pure functions
4. For runtime visualizers: validate no-op transform, test any exported utilities

---

## Phase 2: Mocked I/O Tests + Eleventy Logic

### Minor Refactoring First

Export `extractTitle` and `slugify` from `scripts/utils/file-index-builder.js`. These are pure functions currently trapped as module-internal. Adding `export` enables direct unit testing. No behavior change.

### Test Files

#### 10. `file-index-builder.test.js`

**Location:** `tests/utils/file-index-builder.test.js`  
**Targets:** `resolveLink()` (pure, test directly), `extractTitle()`, `slugify()` (export first), `buildFileIndex()` and `buildAttachmentIndex()` (mock `fs-extra` + `glob`)

Key test cases:
- `resolveLink`: title lookup → filename lookup → normalized lookup cascade, `.md` stripping, not-found returns `{ url: null, found: false }`
- `extractTitle`: frontmatter title > first `#`/`##` heading > filename, strips `{#anchor-id}` syntax
- `slugify`: lowercase, special chars removed, spaces/underscores → hyphens, collapse multiples, trim edges
- `buildAttachmentIndex`: URL-encodes output paths, stores both encoded and decoded keys, lowercase variants, empty dir returns `{}`

#### 11. `filters.test.js`

**Location:** `tests/eleventy/filters.test.js`  
**Targets:** Eleventy filter functions from `eleventy.config.js`

Approach: create a mock `eleventyConfig` that captures registered filters, then test them directly.

```js
const filters = {};
const mockConfig = {
  addFilter: (name, fn) => { filters[name] = fn; },
  addCollection: () => {}, addTransform: () => {},
  addPassthroughCopy: () => {}, // ... stub the rest
};
```

**Note:** `eleventy.config.js` now reads site config via `config-loader.js` (Session 9). The mock setup needs to either mock `loadSiteConfig()` or set `SITE_NAME` env var so config loading succeeds.

| Filter | Key Test Cases |
|--------|---------------|
| `dateFormat` | Formats Date to "Month Day, Year", handles null |
| `truncate` | Truncates + ellipsis, short string passthrough |
| `head` | First N items, empty array |
| `capitalize` | First char uppercase, handles null |
| `titleCase` | Capitalizes words, small words stay lowercase (a, an, the, of, etc.) except first word |

#### 12. `computed.test.js`

**Location:** `tests/eleventy/computed.test.js`  
**Target:** `permalink(data)` from `src/_data/eleventyComputed.js`

**Note:** `eleventyComputed.js` is now generated by `assemble-src.js` from theme files. The logic is identical, but tests should import from the theme source (or generate and then import).

| Test Case | Input | Expected |
|-----------|-------|----------|
| Explicit permalink | `data.permalink = '/custom/'` | `/custom/` |
| Subfolder file | `filePathStem: 'recipes/My Recipe'` | `/recipes/my-recipe/` |
| Root file | `filePathStem: 'About'` | `/about/` |
| Slugify enabled | `site.permalinks.slugify: true` | Lowercased, hyphenated |
| Slugify disabled | `site.permalinks.slugify: false` | Original case preserved |

#### 13. `publish-filter.test.js`

**Location:** `tests/utils/publish-filter.test.js`  
**Target:** `filterPublishableFiles()` from `scripts/utils/publish-filter.js` (mock `fs-extra` + `glob`)

| Test Case | Mode |
|-----------|------|
| Publishes files without blocklist tag | blocklist |
| Excludes `#not-for-public` in body | blocklist |
| Excludes `not-for-public` in frontmatter tags | blocklist |
| Skips `.obsidian/` folder files | both |
| Only publishes `publish: true` | allowlist |
| Excludes missing/false publish key | allowlist |

#### 14. `config-reader.test.js`

**Location:** `tests/utils/config-reader.test.js`  
**Target:** `readObsidianConfig()` from `scripts/utils/config-reader.js` (mock `fs-extra`)

- Reads and parses `.obsidian/app.json`
- Strips `./` prefix from attachment path
- Falls back to defaults when file missing
- Falls back to defaults when JSON invalid

#### 15. `git-date-extractor.test.js`

**Location:** `tests/utils/git-date-extractor.test.js`  
**Target:** `getLastModifiedDate()` from `scripts/utils/git-date-extractor.js` (mock `execSync`)

- Returns ISO date string from git output
- Returns null when git fails
- Returns null for uncommitted files

---

## Phase 3: Integration Tests

#### 16. `backlinks.test.js`

**Location:** `tests/eleventy/backlinks.test.js`  
**Target:** `extractLinks(source)` from the backlinks collection in `eleventy.config.js`

Recommendation: extract this function to a shared utility (e.g., `scripts/utils/extract-links.js`) for direct testability.

- Extracts internal markdown links (starting with `/`)
- Excludes image links (`![](...)`)
- Excludes `/media/` links
- Normalizes trailing slashes

#### 17. `preprocess-pipeline.test.js`

**Location:** `tests/integration/preprocess-pipeline.test.js`  
**Target:** Full pipeline from `scripts/preprocess-content.js`

Create `tests/fixtures/` with 3-4 markdown files that exercise:
- Wiki-links + markdown links (some broken)
- Obsidian comments to strip
- Image references (with spaces in filenames)
- Transclusion embeds
- Frontmatter with and without blocklist tags

Verify:
- Output files written to correct paths
- Frontmatter enriched (title, slug, layout, date)
- Stats accurate (filesProcessed, linksResolved, linksBroken, etc.)

#### 18. `build-config.test.js`

**Location:** `tests/integration/build-config.test.js`  
**Target:** Config-driven build behavior

| Test Case | What It Verifies |
|-----------|------------------|
| Build with `backlinks: false` doesn't register backlinks collection | Feature flags work |
| Build with `search: false` skips Pagefind | Feature flags work |
| Only listed visualizers are bundled | Visualizer filtering |
| Different site configs produce different `site.js` output | Config isolation |
| Missing theme throws clear error | Error handling |

---

## Scope Summary

| Phase | Test Files | ~Test Cases | Mocking? | Location |
|-------|-----------|-------------|----------|----------|
| Phase 1 | 5 + setup | ~55 | None | `tests/utils/` |
| Phase 1.5 | 4 | ~25 | fs-extra (assemble only) | `tests/build/` + `lib/visualizers/` |
| Phase 2 | 6 | ~45 | fs-extra, glob, execSync | `tests/utils/` + `tests/eleventy/` |
| Phase 3 | 3 + fixtures | ~20 | Partial (git/clone only) | `tests/eleventy/` + `tests/integration/` |
| **Total** | **18** | **~145** | | |

**Phase 1 alone is a solid minimum viable test suite** covering the most critical preprocessing logic.

**Phase 1 + 1.5 adds templatizer and co-located visualizer tests** — recommended before adding more complexity.

---

## Co-located Test Template

When creating a new visualizer (or magic machine), include a test file following this template:

```js
// lib/visualizers/<name>/<name>.test.js
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load manifest
const manifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf-8')
);

// Load module
const mod = await import('./index.js');

describe('<name> visualizer', () => {
  describe('manifest.json', () => {
    it('has required fields', () => {
      expect(manifest.name).toBe('<name>');
      expect(manifest.type).toMatch(/^(runtime|build-time|hybrid)$/);
      expect(manifest.version).toBeDefined();
      expect(manifest.description).toBeDefined();
      expect(manifest.activation).toBeDefined();
    });

    it('references files that exist', () => {
      for (const [key, filename] of Object.entries(manifest.files || {})) {
        const filePath = path.join(__dirname, filename);
        expect(fs.existsSync(filePath), `${key}: ${filename} should exist`).toBe(true);
      }
    });
  });

  describe('index.js exports', () => {
    it('exports name matching manifest', () => {
      expect(mod.name).toBe(manifest.name);
    });

    it('exports type matching manifest', () => {
      expect(mod.type).toBe(manifest.type);
    });
  });

  // For build-time visualizers, add:
  // describe('parser', () => { ... });
  // describe('renderer', () => { ... });
});
```

---

## Platform-Independent Notes

- Tests are pure Node.js/Vitest — no dependency on hosting platform (Vercel, Scaleway, Cloudflare, etc.)
- The preprocessing pipeline and Eleventy config are platform-agnostic; tests stay valid across any deployment target
- Integration tests use local fixture files, not network calls

---

## Files Modified

| File | Change |
|------|--------|
| `package.json` | Add `vitest` devDependency, `test` and `test:watch` scripts |
| `vitest.config.js` | New, discovers tests in both `tests/` and `lib/` |
| `scripts/utils/file-index-builder.js` | Export `extractTitle` and `slugify` (Phase 2) |
| `eleventy.config.js` | Extract `extractLinks` to shared utility (Phase 3, optional) |
| `tests/` | All new central test files |
| `lib/visualizers/checkbox-tracker/` | Add `checkbox-tracker.test.js` |
| `lib/visualizers/page-preview/` | Add `page-preview.test.js` |

## Verification

```bash
npm test              # Run all tests once (central + co-located)
npm run test:watch    # Watch mode during development
npx vitest run tests/ # Run only central tests
npx vitest run lib/   # Run only co-located modular tests
```
