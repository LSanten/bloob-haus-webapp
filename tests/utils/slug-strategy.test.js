import { describe, it, expect } from 'vitest';
import { getSlugFunction, slugifyHeading } from '../../scripts/utils/slug-strategy.js';

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
