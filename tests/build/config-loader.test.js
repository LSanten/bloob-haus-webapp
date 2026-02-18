import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadSiteConfig, resolveSiteName } from '../../scripts/utils/config-loader.js';

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
  it('loads buffbaby.yaml successfully', async () => {
    const config = await loadSiteConfig('buffbaby');
    expect(config).toBeDefined();
    expect(config.site).toBeDefined();
    expect(config.site.name).toBe('Buff Baby Kitchen');
  });

  it('has expected top-level shape', async () => {
    const config = await loadSiteConfig('buffbaby');
    expect(config.site).toBeDefined();
    expect(config.content).toBeDefined();
    expect(config.theme).toBeDefined();
    expect(config.features).toBeDefined();
    expect(config.visualizers).toBeDefined();
    expect(config.media).toBeDefined();
  });

  it('has correct site fields', async () => {
    const config = await loadSiteConfig('buffbaby');
    expect(config.site.name).toBeTypeOf('string');
    expect(config.site.description).toBeTypeOf('string');
    expect(config.site.url).toMatch(/^https?:\/\//);
    expect(config.site.author).toBeTypeOf('string');
    expect(config.site.language).toBeTypeOf('string');
  });

  it('has correct content fields', async () => {
    const config = await loadSiteConfig('buffbaby');
    expect(config.content.repo).toBeTypeOf('string');
    expect(config.content.branch).toBe('main');
    expect(config.content.publish_mode).toMatch(/^(blocklist|allowlist)$/);
  });

  it('has theme as a string', async () => {
    const config = await loadSiteConfig('buffbaby');
    expect(config.theme).toBeTypeOf('string');
  });

  it('has visualizers as an array', async () => {
    const config = await loadSiteConfig('buffbaby');
    expect(Array.isArray(config.visualizers)).toBe(true);
  });

  it('has boolean feature flags', async () => {
    const config = await loadSiteConfig('buffbaby');
    for (const [key, value] of Object.entries(config.features)) {
      expect(value, `features.${key} should be boolean`).toBeTypeOf('boolean');
    }
  });

  it('throws for nonexistent site config', async () => {
    await expect(loadSiteConfig('nonexistent-site-xyz'))
      .rejects
      .toThrow(/Site config not found/);
  });
});
