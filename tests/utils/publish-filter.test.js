import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// The module reads env vars at call time, so we can set them before calling
import { filterPublishableFiles } from '../../scripts/utils/publish-filter.js';

describe('filterPublishableFiles', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'publish-filter-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  async function writeFile(relativePath, content) {
    const fullPath = path.join(tmpDir, relativePath);
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content);
  }

  // --- Blocklist mode ---

  describe('blocklist mode', () => {
    it('publishes files without blocklist tag', async () => {
      await writeFile('recipes/good.md', '---\ntitle: Good\n---\nHello');
      const { published, excluded } = await filterPublishableFiles(tmpDir, {
        publishMode: 'blocklist',
        blocklistTag: 'not-for-public',
      });
      expect(published).toHaveLength(1);
      expect(excluded).toHaveLength(0);
    });

    it('excludes files with blocklist tag in frontmatter', async () => {
      await writeFile('notes/private.md', '---\ntags:\n  - not-for-public\n---\nSecret');
      const { published, excluded } = await filterPublishableFiles(tmpDir, {
        publishMode: 'blocklist',
        blocklistTag: 'not-for-public',
      });
      expect(published).toHaveLength(0);
      expect(excluded).toHaveLength(1);
      expect(excluded[0].relativePath).toBe('notes/private.md');
    });

    it('excludes files with # prefixed blocklist tag in frontmatter', async () => {
      await writeFile('notes/private.md', '---\ntags:\n  - "#not-for-public"\n---\nSecret');
      const { published, excluded } = await filterPublishableFiles(tmpDir, {
        publishMode: 'blocklist',
        blocklistTag: 'not-for-public',
      });
      expect(published).toHaveLength(0);
      expect(excluded).toHaveLength(1);
    });

    it('excludes files with blocklist tag in body', async () => {
      await writeFile('notes/draft.md', '---\ntitle: Draft\n---\nThis is #not-for-public content');
      const { published, excluded } = await filterPublishableFiles(tmpDir, {
        publishMode: 'blocklist',
        blocklistTag: 'not-for-public',
      });
      expect(published).toHaveLength(0);
      expect(excluded).toHaveLength(1);
    });

    it('publishes files with unrelated tags', async () => {
      await writeFile('recipes/cake.md', '---\ntags:\n  - dessert\n  - baking\n---\nCake recipe');
      const { published } = await filterPublishableFiles(tmpDir, {
        publishMode: 'blocklist',
        blocklistTag: 'not-for-public',
      });
      expect(published).toHaveLength(1);
    });
  });

  // --- Allowlist mode ---

  describe('allowlist mode', () => {
    it('publishes files with publish: true', async () => {
      await writeFile('recipes/good.md', '---\npublish: true\ntitle: Good\n---\nHello');
      const { published } = await filterPublishableFiles(tmpDir, {
        publishMode: 'allowlist',
        allowlistKey: 'publish',
        allowlistValue: true,
      });
      expect(published).toHaveLength(1);
    });

    it('excludes files without publish key', async () => {
      await writeFile('recipes/draft.md', '---\ntitle: Draft\n---\nHello');
      const { published, excluded } = await filterPublishableFiles(tmpDir, {
        publishMode: 'allowlist',
        allowlistKey: 'publish',
        allowlistValue: true,
      });
      expect(published).toHaveLength(0);
      expect(excluded).toHaveLength(1);
    });

    it('excludes files with publish: false', async () => {
      await writeFile('recipes/hidden.md', '---\npublish: false\ntitle: Hidden\n---\nHello');
      const { published, excluded } = await filterPublishableFiles(tmpDir, {
        publishMode: 'allowlist',
        allowlistKey: 'publish',
        allowlistValue: true,
      });
      expect(published).toHaveLength(0);
      expect(excluded).toHaveLength(1);
    });
  });

  // --- Edge cases ---

  describe('edge cases', () => {
    it('skips .obsidian folder files', async () => {
      await writeFile('.obsidian/config.md', '---\ntitle: Config\n---\ntest');
      await writeFile('recipes/good.md', '---\ntitle: Good\n---\nHello');
      const { published } = await filterPublishableFiles(tmpDir, {
        publishMode: 'blocklist',
        blocklistTag: 'not-for-public',
      });
      expect(published).toHaveLength(1);
      expect(published[0].relativePath).toBe('recipes/good.md');
    });

    it('handles files with no frontmatter', async () => {
      await writeFile('notes/bare.md', 'Just plain markdown content');
      const { published } = await filterPublishableFiles(tmpDir, {
        publishMode: 'blocklist',
        blocklistTag: 'not-for-public',
      });
      expect(published).toHaveLength(1);
    });

    it('handles empty directory', async () => {
      const { published, excluded } = await filterPublishableFiles(tmpDir, {
        publishMode: 'blocklist',
        blocklistTag: 'not-for-public',
      });
      expect(published).toHaveLength(0);
      expect(excluded).toHaveLength(0);
    });

    it('handles mixed published and excluded files', async () => {
      await writeFile('recipes/public.md', '---\ntitle: Public\n---\nGood');
      await writeFile('recipes/private.md', '---\ntags:\n  - not-for-public\n---\nSecret');
      await writeFile('notes/draft.md', '---\ntitle: Draft\n---\nAlso good');
      const { published, excluded } = await filterPublishableFiles(tmpDir, {
        publishMode: 'blocklist',
        blocklistTag: 'not-for-public',
      });
      expect(published).toHaveLength(2);
      expect(excluded).toHaveLength(1);
    });
  });
});
