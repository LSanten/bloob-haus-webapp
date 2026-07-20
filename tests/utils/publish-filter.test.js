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
      expect(excluded[0].relativePath).toBe(path.join('notes', 'private.md'));
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

  // --- Status field mode ---

  describe('status_field mode', () => {
    it('excludes files where website_status is draft', async () => {
      await writeFile('projects/draft-project.md', '---\nwebsite_status: draft\n---\nDraft');
      const { published, excluded } = await filterPublishableFiles(tmpDir, {
        publishMode: 'status_field',
        statusField: 'website_status',
      });
      expect(published).toHaveLength(0);
      expect(excluded).toHaveLength(1);
    });

    it('publishes files where website_status is public', async () => {
      await writeFile('projects/live.md', '---\nwebsite_status: public\n---\nLive');
      const { published } = await filterPublishableFiles(tmpDir, {
        publishMode: 'status_field',
        statusField: 'website_status',
      });
      expect(published).toHaveLength(1);
    });

    it('publishes files where website_status is unlisted', async () => {
      await writeFile('projects/hidden.md', '---\nwebsite_status: unlisted\n---\nHidden');
      const { published } = await filterPublishableFiles(tmpDir, {
        publishMode: 'status_field',
        statusField: 'website_status',
      });
      expect(published).toHaveLength(1);
    });

    it('publishes files where website_status is archived', async () => {
      await writeFile('projects/old.md', '---\nwebsite_status: archived\n---\nOld');
      const { published } = await filterPublishableFiles(tmpDir, {
        publishMode: 'status_field',
        statusField: 'website_status',
      });
      expect(published).toHaveLength(1);
    });

    it('publishes files with no website_status field when publishByDefault is true (default)', async () => {
      await writeFile('index.md', '---\ntitle: Home\n---\nWelcome');
      const { published } = await filterPublishableFiles(tmpDir, {
        publishMode: 'status_field',
        statusField: 'website_status',
      });
      expect(published).toHaveLength(1);
    });

    it('uses website_status as the default statusField', async () => {
      await writeFile('projects/draft.md', '---\nwebsite_status: draft\n---\nDraft');
      const { published, excluded } = await filterPublishableFiles(tmpDir, {
        publishMode: 'status_field',
      });
      expect(published).toHaveLength(0);
      expect(excluded).toHaveLength(1);
    });

    describe('publishByDefault: false', () => {
      it('excludes files with no website_status field', async () => {
        await writeFile('projects/no-status.md', '---\ntitle: No Status\n---\nContent');
        const { published, excluded } = await filterPublishableFiles(tmpDir, {
          publishMode: 'status_field',
          statusField: 'website_status',
          publishByDefault: false,
        });
        expect(published).toHaveLength(0);
        expect(excluded).toHaveLength(1);
      });

      it('still publishes files with explicit public status', async () => {
        await writeFile('projects/live.md', '---\nwebsite_status: public\n---\nLive');
        const { published } = await filterPublishableFiles(tmpDir, {
          publishMode: 'status_field',
          statusField: 'website_status',
          publishByDefault: false,
        });
        expect(published).toHaveLength(1);
      });

      it('still publishes files with unlisted status', async () => {
        await writeFile('projects/hidden.md', '---\nwebsite_status: unlisted\n---\nHidden');
        const { published } = await filterPublishableFiles(tmpDir, {
          publishMode: 'status_field',
          statusField: 'website_status',
          publishByDefault: false,
        });
        expect(published).toHaveLength(1);
      });

      it('still excludes draft regardless of publishByDefault', async () => {
        await writeFile('projects/draft.md', '---\nwebsite_status: draft\n---\nDraft');
        const { published, excluded } = await filterPublishableFiles(tmpDir, {
          publishMode: 'status_field',
          statusField: 'website_status',
          publishByDefault: false,
        });
        expect(published).toHaveLength(0);
        expect(excluded).toHaveLength(1);
      });
    });
  });

  // --- Universal visibility: private ---

  describe('universal private blocking', () => {
    it('always excludes files with visibility: private, regardless of publish mode', async () => {
      await writeFile('notes/hidden.md', '---\nvisibility: private\ntitle: Hidden\n---\nSecret');
      const { published, excluded } = await filterPublishableFiles(tmpDir, {
        publishMode: 'blocklist',
        blocklistTag: 'not-for-public',
      });
      expect(published).toHaveLength(0);
      expect(excluded).toHaveLength(1);
    });

    it('always excludes files with visibility: private in allowlist mode', async () => {
      await writeFile('notes/hidden.md', '---\nvisibility: private\npublish: true\n---\nSecret');
      const { published, excluded } = await filterPublishableFiles(tmpDir, {
        publishMode: 'allowlist',
        allowlistKey: 'publish',
        allowlistValue: true,
      });
      expect(published).toHaveLength(0);
      expect(excluded).toHaveLength(1);
    });

    it('always excludes files with #private tag in frontmatter', async () => {
      await writeFile('notes/hidden.md', '---\ntags:\n  - private\ntitle: Hidden\n---\nSecret');
      const { published, excluded } = await filterPublishableFiles(tmpDir, {
        publishMode: 'blocklist',
        blocklistTag: 'not-for-public',
      });
      expect(published).toHaveLength(0);
      expect(excluded).toHaveLength(1);
    });

    it('always excludes files with #private in body content', async () => {
      await writeFile('notes/hidden.md', '---\ntitle: Hidden\n---\nThis note is #private');
      const { published, excluded } = await filterPublishableFiles(tmpDir, {
        publishMode: 'blocklist',
        blocklistTag: 'not-for-public',
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
      expect(published[0].relativePath).toBe(path.join('recipes', 'good.md'));
    });

    it('skips every _bloob-* system file (convention: settings, registries, auto-tagging, future)', async () => {
      // `_bloob-*` is the reserved system-file prefix — none of these are content,
      // so none may render as pages (registries, settings, auto-tagging rules, and
      // any future _bloob-* config file). See the `_bloob-*` convention in shapes.md.
      await writeFile('_bloob-settings.md', '---\nbloob-settings: settings\n---\nx');
      await writeFile('_bloob-objects.md', '---\nbloob-settings: objects\n---\n| a |');
      await writeFile('_bloob-types.md', '---\nbloob-settings: types\n---\n| a |');
      await writeFile('_bloob-shapes.md', '---\nbloob-settings: types\n---\n| a |');
      await writeFile('_bloob-auto-tagging.md', '## Auto tagging rules\n\n| keyword | tag |');
      await writeFile('_bloob-future-thing.md', '---\n---\nsome future config');
      await writeFile('recipes/good.md', '---\ntitle: Good\n---\nHello');
      const { published } = await filterPublishableFiles(tmpDir, {
        publishMode: 'blocklist',
        blocklistTag: 'not-for-public',
      });
      expect(published).toHaveLength(1);
      expect(published[0].relativePath).toBe(path.join('recipes', 'good.md'));
    });

    it('does NOT skip a folder index (_index.md) — only the _bloob-* prefix is reserved', async () => {
      await writeFile('notes/_index.md', '---\ntitle: Notes\n---\nIndex body');
      const { published } = await filterPublishableFiles(tmpDir, {
        publishMode: 'blocklist',
        blocklistTag: 'not-for-public',
      });
      expect(published).toHaveLength(1);
      expect(published[0].relativePath).toBe(path.join('notes', '_index.md'));
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
