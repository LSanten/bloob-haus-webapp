import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadSiteConfig, resolveSiteName } from '../../scripts/utils/config-loader.js';
import { readBloobSettings, mergeBloobSettings } from '../../scripts/utils/bloob-settings-reader.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('resolveSiteName', () => {
  const originalArgv = process.argv;
  const originalEnv = process.env.SITE_NAME;

  afterEach(() => {
    process.argv = originalArgv;
    if (originalEnv === undefined) {
      delete process.env.SITE_NAME;
    } else {
      process.env.SITE_NAME = originalEnv;
    }
  });

  it('defaults to "buffbaby" when no args or env var', () => {
    process.argv = ['node', 'script.js'];
    delete process.env.SITE_NAME;
    expect(resolveSiteName()).toBe('buffbaby');
  });

  it('reads --site= CLI arg', () => {
    process.argv = ['node', 'script.js', '--site=marbles'];
    delete process.env.SITE_NAME;
    expect(resolveSiteName()).toBe('marbles');
  });

  it('reads SITE_NAME env var', () => {
    process.argv = ['node', 'script.js'];
    process.env.SITE_NAME = 'testsite';
    expect(resolveSiteName()).toBe('testsite');
  });

  it('CLI arg takes precedence over env var', () => {
    process.argv = ['node', 'script.js', '--site=fromcli'];
    process.env.SITE_NAME = 'fromenv';
    expect(resolveSiteName()).toBe('fromcli');
  });
});

describe('loadSiteConfig', () => {
  // Test yaml-only loading (skipBloobSettings: true)
  describe('yaml-only mode', () => {
    it('loads buffbaby.yaml successfully', async () => {
      const config = await loadSiteConfig('buffbaby', { skipBloobSettings: true });
      expect(config).toBeDefined();
      expect(config.site).toBeDefined();
    });

    it('has site.url from yaml', async () => {
      const config = await loadSiteConfig('buffbaby', { skipBloobSettings: true });
      expect(config.site.url).toMatch(/^https?:\/\//);
    });

    it('has content repo and branch', async () => {
      const config = await loadSiteConfig('buffbaby', { skipBloobSettings: true });
      expect(config.content.repo).toBeTypeOf('string');
      expect(config.content.branch).toBe('main');
    });

    it('throws for nonexistent site config', async () => {
      await expect(loadSiteConfig('nonexistent-site-xyz'))
        .rejects
        .toThrow(/Site config not found/);
    });
  });
});

describe('readBloobSettings', () => {
  const testDir = path.join(__dirname, 'test-fixtures', 'bloob-settings-test');

  beforeEach(async () => {
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  it('returns null when _bloob-settings.md does not exist', async () => {
    const result = await readBloobSettings(testDir);
    expect(result).toBeNull();
  });

  it('parses frontmatter from _bloob-settings.md', async () => {
    const settingsContent = `---
name: "Test Site"
description: "A test site"
author: "Tester"
footer_text: "Test footer"
theme: warm-kitchen
features:
  search: true
  backlinks: false
---

# Test Settings
`;
    await fs.writeFile(path.join(testDir, '_bloob-settings.md'), settingsContent);

    const result = await readBloobSettings(testDir);
    expect(result).not.toBeNull();
    expect(result.name).toBe('Test Site');
    expect(result.description).toBe('A test site');
    expect(result.author).toBe('Tester');
    expect(result.footer_text).toBe('Test footer');
    expect(result.theme).toBe('warm-kitchen');
    expect(result.features.search).toBe(true);
    expect(result.features.backlinks).toBe(false);
  });
});

describe('mergeBloobSettings', () => {
  it('merges site-level settings', () => {
    const baseConfig = {
      site: { url: 'https://test.bloob.haus' },
      content: { repo: 'test/repo', branch: 'main' },
    };
    const bloobSettings = {
      name: 'Merged Name',
      description: 'Merged description',
      author: 'Merged Author',
      footer_text: 'Merged footer',
    };

    const merged = mergeBloobSettings(baseConfig, bloobSettings);

    expect(merged.site.name).toBe('Merged Name');
    expect(merged.site.description).toBe('Merged description');
    expect(merged.site.author).toBe('Merged Author');
    expect(merged.site.footer_text).toBe('Merged footer');
    expect(merged.site.url).toBe('https://test.bloob.haus'); // preserved from base
  });

  it('merges theme setting', () => {
    const baseConfig = { site: {}, content: {} };
    const bloobSettings = { theme: 'cool-theme' };

    const merged = mergeBloobSettings(baseConfig, bloobSettings);

    expect(merged.theme).toBe('cool-theme');
  });

  it('merges features', () => {
    const baseConfig = {
      site: {},
      content: {},
      features: { search: true, rss: true },
    };
    const bloobSettings = {
      features: { search: false, backlinks: true },
    };

    const merged = mergeBloobSettings(baseConfig, bloobSettings);

    expect(merged.features.search).toBe(false); // overridden
    expect(merged.features.rss).toBe(true); // preserved
    expect(merged.features.backlinks).toBe(true); // added
  });

  it('merges visualizers', () => {
    const baseConfig = { site: {}, content: {} };
    const bloobSettings = { visualizers: ['graph', 'checkbox-tracker'] };

    const merged = mergeBloobSettings(baseConfig, bloobSettings);

    expect(merged.visualizers).toEqual(['graph', 'checkbox-tracker']);
  });

  it('merges permalink_strategy', () => {
    const baseConfig = { site: {}, content: {} };
    const bloobSettings = { permalink_strategy: 'preserve-case' };

    const merged = mergeBloobSettings(baseConfig, bloobSettings);

    expect(merged.permalinks.strategy).toBe('preserve-case');
  });

  it('returns original config when bloobSettings is null', () => {
    const baseConfig = { site: { url: 'https://test.bloob.haus' }, content: {} };

    const merged = mergeBloobSettings(baseConfig, null);

    expect(merged).toEqual(baseConfig);
  });
});
