# Test Suite Implementation Plan

**Created:** February 7, 2026
**Status:** Planning
**Motivation:** The URL-encoding bug (filenames with spaces breaking images) is exactly the kind of regression a test suite would catch. The preprocessing pipeline has rich pure-function logic that's highly testable. Adding tests before Phase 2 adds more complexity is the right time.

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
tests/
  helpers/
    mock-index.js                    # Shared mock file index factory
  utils/
    comment-stripper.test.js         # Phase 1
    attachment-resolver.test.js      # Phase 1
    wiki-link-resolver.test.js       # Phase 1
    markdown-link-resolver.test.js   # Phase 1
    transclusion-handler.test.js     # Phase 1
    file-index-builder.test.js       # Phase 2
    publish-filter.test.js           # Phase 2
    config-reader.test.js            # Phase 2
    git-date-extractor.test.js       # Phase 2
  eleventy/
    filters.test.js                  # Phase 2
    computed.test.js                 # Phase 2
    backlinks.test.js                # Phase 3
  integration/
    preprocess-pipeline.test.js      # Phase 3
  fixtures/                          # Small test vault for integration tests
vitest.config.js
```

---

## Phase 1: Pure Function Unit Tests

**Priority: Highest. Zero mocking needed.**

These modules are pure `(string, object) -> object` with no file I/O. This is where bugs live and where tests deliver the most value per line of code.

### Setup

1. `npm install -D vitest`
2. Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`
3. Create `vitest.config.js`:
   ```js
   import { defineConfig } from 'vitest/config';
   export default defineConfig({
     test: { include: ['tests/**/*.test.js'] },
   });
   ```
4. Create `tests/helpers/mock-index.js` with a reusable mock file index factory

### Test Files (in implementation order)

#### 1. `comment-stripper.test.js`

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

## Phase 2: Mocked I/O Tests + Eleventy Logic

### Minor Refactoring First

Export `extractTitle` and `slugify` from `scripts/utils/file-index-builder.js`. These are pure functions currently trapped as module-internal. Adding `export` enables direct unit testing. No behavior change.

### Test Files

#### 6. `file-index-builder.test.js`

**Targets:** `resolveLink()` (pure, test directly), `extractTitle()`, `slugify()` (export first), `buildFileIndex()` and `buildAttachmentIndex()` (mock `fs-extra` + `glob`)

Key test cases:
- `resolveLink`: title lookup → filename lookup → normalized lookup cascade, `.md` stripping, not-found returns `{ url: null, found: false }`
- `extractTitle`: frontmatter title > first `#`/`##` heading > filename, strips `{#anchor-id}` syntax
- `slugify`: lowercase, special chars removed, spaces/underscores → hyphens, collapse multiples, trim edges
- `buildAttachmentIndex`: URL-encodes output paths, stores both encoded and decoded keys, lowercase variants, empty dir returns `{}`

#### 7. `filters.test.js`

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

| Filter | Key Test Cases |
|--------|---------------|
| `dateFormat` | Formats Date to "Month Day, Year", handles null |
| `truncate` | Truncates + ellipsis, short string passthrough |
| `head` | First N items, empty array |
| `capitalize` | First char uppercase, handles null |
| `titleCase` | Capitalizes words, small words stay lowercase (a, an, the, of, etc.) except first word |

#### 8. `computed.test.js`

**Target:** `permalink(data)` from `src/_data/eleventyComputed.js`

| Test Case | Input | Expected |
|-----------|-------|----------|
| Explicit permalink | `data.permalink = '/custom/'` | `/custom/` |
| Subfolder file | `filePathStem: 'recipes/My Recipe'` | `/recipes/my-recipe/` |
| Root file | `filePathStem: 'About'` | `/about/` |
| Slugify enabled | `site.permalinks.slugify: true` | Lowercased, hyphenated |
| Slugify disabled | `site.permalinks.slugify: false` | Original case preserved |

#### 9. `publish-filter.test.js`

**Target:** `filterPublishableFiles()` from `scripts/utils/publish-filter.js` (mock `fs-extra` + `glob`)

| Test Case | Mode |
|-----------|------|
| Publishes files without blocklist tag | blocklist |
| Excludes `#not-for-public` in body | blocklist |
| Excludes `not-for-public` in frontmatter tags | blocklist |
| Skips `.obsidian/` folder files | both |
| Only publishes `publish: true` | allowlist |
| Excludes missing/false publish key | allowlist |

#### 10. `config-reader.test.js`

**Target:** `readObsidianConfig()` from `scripts/utils/config-reader.js` (mock `fs-extra`)

- Reads and parses `.obsidian/app.json`
- Strips `./` prefix from attachment path
- Falls back to defaults when file missing
- Falls back to defaults when JSON invalid

#### 11. `git-date-extractor.test.js`

**Target:** `getLastModifiedDate()` from `scripts/utils/git-date-extractor.js` (mock `execSync`)

- Returns ISO date string from git output
- Returns null when git fails
- Returns null for uncommitted files

---

## Phase 3: Integration Tests

#### 12. `backlinks.test.js`

**Target:** `extractLinks(source)` from the backlinks collection in `eleventy.config.js`

Recommendation: extract this function to a shared utility (e.g., `scripts/utils/extract-links.js`) for direct testability.

- Extracts internal markdown links (starting with `/`)
- Excludes image links (`![](...)`)
- Excludes `/media/` links
- Normalizes trailing slashes

#### 13. `preprocess-pipeline.test.js`

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

---

## Scope Summary

| Phase | Test Files | ~Test Cases | Mocking? |
|-------|-----------|-------------|----------|
| Phase 1 | 5 + setup | ~55 | None |
| Phase 2 | 6 | ~45 | fs-extra, glob, execSync |
| Phase 3 | 2 + fixtures | ~15 | Partial (git/clone only) |
| **Total** | **13** | **~115** | |

**Phase 1 alone is a solid minimum viable test suite** covering the most critical preprocessing logic.

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
| `vitest.config.js` | New, minimal config |
| `scripts/utils/file-index-builder.js` | Export `extractTitle` and `slugify` (Phase 2) |
| `eleventy.config.js` | Extract `extractLinks` to shared utility (Phase 3, optional) |
| `tests/` | All new test files |

## Verification

```bash
npm test           # Run all tests once
npm run test:watch # Watch mode during development
```
