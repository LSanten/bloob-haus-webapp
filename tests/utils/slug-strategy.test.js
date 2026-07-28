import { describe, it, expect } from 'vitest';
import { getSlugFunction, slugifyHeading, slugifyPath } from '../../scripts/utils/slug-strategy.js';

describe('getSlugFunction', () => {
  describe('slugify strategy (default)', () => {
    const slugFn = getSlugFunction('slugify');

    it('lowercases everything', () => {
      expect(slugFn('Hello World')).toBe('hello-world');
    });

    it('removes special characters', () => {
      expect(slugFn("Mom's Recipe")).toBe('moms-recipe');
    });

    it('replaces spaces with hyphens', () => {
      expect(slugFn('Chocolate Cake')).toBe('chocolate-cake');
    });

    it('collapses multiple hyphens', () => {
      expect(slugFn('My - - Recipe')).toBe('my-recipe');
    });

    it('removes leading and trailing hyphens', () => {
      expect(slugFn('-hello-')).toBe('hello');
    });
  });

  describe('preserve-case strategy', () => {
    const slugFn = getSlugFunction('preserve-case');

    it('preserves original casing', () => {
      expect(slugFn('Hello World')).toBe('Hello-World');
    });

    it('replaces spaces with hyphens', () => {
      expect(slugFn('AI CORPORATE STANDARD')).toBe('AI-CORPORATE-STANDARD');
    });

    it('preserves dots and underscores', () => {
      expect(slugFn('file_name.v2')).toBe('file_name.v2');
    });

    it('removes URL-unsafe special characters', () => {
      expect(slugFn("Mom's Recipe")).toBe('Moms-Recipe');
    });

    it('keeps hyphens as-is', () => {
      expect(slugFn('EYT-SET-SpaceCloud')).toBe('EYT-SET-SpaceCloud');
    });

    it('collapses multiple hyphens', () => {
      expect(slugFn('My - - Recipe')).toBe('My-Recipe');
    });
  });

  describe('default fallback', () => {
    it('returns slugify for unknown strategy', () => {
      const slugFn = getSlugFunction('unknown');
      expect(slugFn('Hello World')).toBe('hello-world');
    });

    it('returns slugify for undefined', () => {
      const slugFn = getSlugFunction(undefined);
      expect(slugFn('Hello World')).toBe('hello-world');
    });
  });
});

describe('slugifyHeading', () => {
  it('lowercases headings', () => {
    expect(slugifyHeading('Getting Started')).toBe('getting-started');
  });

  it('removes special characters', () => {
    expect(slugifyHeading("What's New?")).toBe('whats-new');
  });

  it('trims whitespace', () => {
    expect(slugifyHeading('  Hello  ')).toBe('hello');
  });
});

describe('slugifyPath', () => {
  // Regression: folder-index permalinks were pinned from the RAW directory name
  // while every other URL went through the slug strategy. On macOS the
  // case-insensitive filesystem hid it; on Linux "/Resources/" and
  // "/resources/playlists/" are different directories and the breadcrumb 404s.
  describe('slugify strategy', () => {
    it('lowercases a single mixed-case segment', () => {
      expect(slugifyPath('Resources', 'slugify')).toBe('resources');
    });

    it('slugifies every segment of a nested path', () => {
      expect(slugifyPath('Resources/Deep Folder', 'slugify')).toBe('resources/deep-folder');
    });

    it('matches what a leaf page URL uses for the same folder', () => {
      // file-index-builder builds "/resources/playlists/" — the folder index
      // permalink must agree, or the two live at different paths.
      const folder = slugifyPath('Resources', 'slugify');
      expect(`/${folder}/`).toBe('/resources/');
    });
  });

  describe('preserve-case strategy', () => {
    it('keeps casing and converts spaces', () => {
      expect(slugifyPath('Resources/Deep Folder', 'preserve-case')).toBe('Resources/Deep-Folder');
    });
  });

  describe('normalisation', () => {
    it('accepts Windows separators', () => {
      expect(slugifyPath('Resources\\Deep Folder', 'slugify')).toBe('resources/deep-folder');
    });

    it('drops "." and empty segments', () => {
      expect(slugifyPath('./Resources//Sub', 'slugify')).toBe('resources/sub');
    });

    it('returns empty string for "." and empty input', () => {
      expect(slugifyPath('.', 'slugify')).toBe('');
      expect(slugifyPath('', 'slugify')).toBe('');
      expect(slugifyPath(null, 'slugify')).toBe('');
    });

    it('defaults to the slugify strategy when none is given', () => {
      expect(slugifyPath('Resources')).toBe('resources');
    });
  });
});
