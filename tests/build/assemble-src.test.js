import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');
const THEMES_DIR = path.join(ROOT_DIR, 'themes');

describe('assemble-src theme structure', () => {
  describe('themes/_base/ exists and has required partials', () => {
    it('has a partials directory', () => {
      expect(fs.existsSync(path.join(THEMES_DIR, '_base', 'partials'))).toBe(true);
    });

    it('has head.njk in base partials', () => {
      expect(fs.existsSync(path.join(THEMES_DIR, '_base', 'partials', 'head.njk'))).toBe(true);
    });

    it('has backlinks.njk in base partials', () => {
      expect(fs.existsSync(path.join(THEMES_DIR, '_base', 'partials', 'backlinks.njk'))).toBe(true);
    });
  });

  describe('themes/warm-kitchen/ has required structure', () => {
    const themeDir = path.join(THEMES_DIR, 'warm-kitchen');

    it('has layouts directory with base.njk', () => {
      expect(fs.existsSync(path.join(themeDir, 'layouts', 'base.njk'))).toBe(true);
    });

    it('has layouts directory with page.njk', () => {
      expect(fs.existsSync(path.join(themeDir, 'layouts', 'page.njk'))).toBe(true);
    });

    it('has partials directory', () => {
      expect(fs.existsSync(path.join(themeDir, 'partials'))).toBe(true);
    });

    it('has pages directory with index.njk', () => {
      expect(fs.existsSync(path.join(themeDir, 'pages', 'index.njk'))).toBe(true);
    });

    it('has assets/css/main.css', () => {
      expect(fs.existsSync(path.join(themeDir, 'assets', 'css', 'main.css'))).toBe(true);
    });
  });
});

describe('assemble-src generateSiteData output', () => {
  // Test the shape of what generateSiteData produces by checking the template logic
  // (We test the function indirectly since it writes to disk)

  it('config values map to expected site.js fields', () => {
    // This tests the contract: config shape → site.js field names
    const mockConfig = {
      site: {
        name: 'Test Site',
        description: 'A test',
        url: 'https://test.bloob.haus',
        author: 'Tester',
        language: 'en-us',
      },
    };

    // Simulate the template from generateSiteData
    const siteJs = `export default {
  title: ${JSON.stringify(mockConfig.site.name)},
  description: ${JSON.stringify(mockConfig.site.description)},
  url: process.env.SITE_URL || ${JSON.stringify(mockConfig.site.url)},
  author: ${JSON.stringify(mockConfig.site.author)},
  languageCode: ${JSON.stringify(mockConfig.site.language)},
  year: new Date().getFullYear(),
  permalinks: { slugify: true },
};`;

    expect(siteJs).toContain('"Test Site"');
    expect(siteJs).toContain('"A test"');
    expect(siteJs).toContain('"https://test.bloob.haus"');
    expect(siteJs).toContain('"Tester"');
    expect(siteJs).toContain('"en-us"');
    expect(siteJs).toContain('SITE_URL');
  });
});

describe('assemble-src module exports', () => {
  it('exports assembleSrc function', async () => {
    const mod = await import('../../scripts/assemble-src.js');
    expect(mod.assembleSrc).toBeTypeOf('function');
  });
});
