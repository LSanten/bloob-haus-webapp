import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { resolveMarkdownLinks } from '../../scripts/utils/markdown-link-resolver.js';
import { buildFileIndex } from '../../scripts/utils/file-index-builder.js';
import { createMockIndex } from '../helpers/mock-index.js';

const index = createMockIndex([
  { slug: 'recipes/cauliflower-stir-fry', title: 'Cauliflower Stir Fry', url: '/recipes/cauliflower-stir-fry/' },
  { slug: 'recipes/broccoli-stir-fry', title: 'Broccoli Stir Fry', url: '/recipes/broccoli-stir-fry/' },
  { slug: 'notes/cooking-tips', title: 'Cooking Tips', url: '/notes/cooking-tips/' },
]);

describe('resolveMarkdownLinks', () => {
  describe('basic resolution', () => {
    it('resolves a link to a .md file', () => {
      const result = resolveMarkdownLinks('[recipe](Cauliflower Stir Fry.md)', index);
      expect(result.content).toBe('[recipe](/recipes/cauliflower-stir-fry/)');
      expect(result.resolved).toHaveLength(1);
    });

    it('strips folder path and resolves by filename', () => {
      const result = resolveMarkdownLinks('[text](folder/Broccoli Stir Fry.md)', index);
      expect(result.content).toBe('[text](/recipes/broccoli-stir-fry/)');
    });

    it('decodes URL-encoded paths for lookup', () => {
      const result = resolveMarkdownLinks('[text](Cauliflower%20Stir%20Fry.md)', index);
      expect(result.content).toBe('[text](/recipes/cauliflower-stir-fry/)');
    });
  });

  describe('heading anchors', () => {
    it('preserves and slugifies heading anchors', () => {
      const result = resolveMarkdownLinks('[tips](Cooking Tips.md#My Section)', index);
      expect(result.content).toBe('[tips](/notes/cooking-tips/#my-section)');
    });
  });

  describe('broken links', () => {
    it('wraps unresolved .md links in broken-link span', () => {
      const result = resolveMarkdownLinks('[text](Nonexistent.md)', index);
      expect(result.content).toContain('<span class="broken-link"');
      expect(result.content).toContain('text</span>');
      expect(result.broken).toHaveLength(1);
    });
  });

  describe('non-.md links are untouched', () => {
    it('leaves external URLs alone', () => {
      const input = '[google](https://example.com)';
      const result = resolveMarkdownLinks(input, index);
      expect(result.content).toBe(input);
      expect(result.resolved).toHaveLength(0);
      expect(result.broken).toHaveLength(0);
    });

    it('leaves anchor-only links alone', () => {
      const input = '[section](#heading)';
      const result = resolveMarkdownLinks(input, index);
      expect(result.content).toBe(input);
    });
  });

  describe('multiple links', () => {
    it('resolves several links in the same content', () => {
      const input = '[a](Cauliflower Stir Fry.md) and [b](Broccoli Stir Fry.md) and [c](Nonexistent.md)';
      const result = resolveMarkdownLinks(input, index);
      expect(result.resolved).toHaveLength(2);
      expect(result.broken).toHaveLength(1);
    });

    it('passes through content with no .md links', () => {
      const input = '# Heading\n\nJust text.';
      const result = resolveMarkdownLinks(input, index);
      expect(result.content).toBe(input);
    });
  });

  // Regression: scene-nav `goto: [_index](Resources/_index.md)` and any other
  // markdown link to a folder index written with the _index spelling must resolve
  // to the folder URL — the exact live-site bug. Uses a REAL buildFileIndex so the
  // folder-index alias registration is exercised, not a hand-rolled mock.
  describe('folder index links (_index.md) against a real index', () => {
    let tmpDir;
    let realIndex;

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'md-link-folder-index-'));
      // TWO folder indexes: the bare filename "_index" collides in filenameLookup
      // (last-write-wins), so a fix that leans on the bare filename resolves one of
      // these to the WRONG folder. Only a path-aware alias (folder/_index) is correct.
      const files = [
        { relativePath: 'Resources/_index.md', content: '---\n---\n# Resources' },
        { relativePath: 'Playlists/_index.md', content: '---\n---\n# Playlists' },
        { relativePath: 'Resources/Sign up for a MELT.md', content: '---\n---\n# Sign up' },
      ];
      const published = [];
      for (const f of files) {
        const full = path.join(tmpDir, f.relativePath);
        await fs.ensureDir(path.dirname(full));
        await fs.writeFile(full, f.content);
        published.push({ path: full, relativePath: f.relativePath });
      }
      realIndex = await buildFileIndex(published, tmpDir);
    });

    afterEach(async () => {
      await fs.remove(tmpDir);
    });

    it('resolves each folder _index.md to its OWN folder URL (no cross-folder collision)', () => {
      // Both must resolve to their own folder; pre-fix at most one can be right
      // because both fall back to the shared bare "_index" key.
      expect(resolveMarkdownLinks('[_index](Resources/_index.md)', realIndex).content)
        .toBe('[_index](/resources/)');
      expect(resolveMarkdownLinks('[_index](Playlists/_index.md)', realIndex).content)
        .toBe('[_index](/playlists/)');
    });

    it('still resolves a note inside the same folder', () => {
      const result = resolveMarkdownLinks('[x](Resources/Sign up for a MELT.md)', realIndex);
      expect(result.content).toBe('[x](/resources/sign-up-for-a-melt/)');
    });
  });
});
