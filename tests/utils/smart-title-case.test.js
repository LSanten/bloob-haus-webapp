import { describe, it, expect } from 'vitest';
import { smartTitleCase } from '../../scripts/utils/smart-title-case.js';

describe('smartTitleCase', () => {
  describe('deslugifying', () => {
    it('turns hyphens into spaces', () => {
      expect(smartTitleCase('come-to-melt')).toBe('Come to Melt');
    });

    it('turns underscores into spaces', () => {
      expect(smartTitleCase('come_to_melt')).toBe('Come to Melt');
    });

    it('collapses runs of separators', () => {
      expect(smartTitleCase('come--to__melt')).toBe('Come to Melt');
    });

    it('trims leading and trailing separators', () => {
      expect(smartTitleCase('-resources-')).toBe('Resources');
    });
  });

  describe('small words', () => {
    it('lowercases small words that are not first', () => {
      expect(smartTitleCase('music-we-melt-to')).toBe('Music We Melt to');
    });

    it('capitalizes a small word when it leads', () => {
      expect(smartTitleCase('to-the-pond')).toBe('To the Pond');
    });

    it('lowercases every listed small word', () => {
      expect(smartTitleCase('a-guide-of-and-for-the-haus')).toBe(
        'A Guide of and for the Haus',
      );
    });
  });

  describe('acronyms', () => {
    // The whole reason this util exists: melt's vault sets `case: lower`, so an
    // acronym only survives if we prettify the ORIGINAL name, never the URL slug.
    it('preserves an all-caps acronym', () => {
      expect(smartTitleCase('come-to-MELT')).toBe('Come to MELT');
    });

    it('preserves interior capitals', () => {
      expect(smartTitleCase('the-McKenzie-method')).toBe('The McKenzie Method');
    });

    it('preserves a standalone acronym', () => {
      expect(smartTitleCase('RSVP')).toBe('RSVP');
    });
  });

  describe('already-readable input', () => {
    it('leaves a spaced folder name alone', () => {
      expect(smartTitleCase('Resources')).toBe('Resources');
    });

    it('capitalizes a bare lowercase word', () => {
      expect(smartTitleCase('resources')).toBe('Resources');
    });

    it('does not destroy existing spacing', () => {
      expect(smartTitleCase('MELT videos')).toBe('MELT Videos');
    });
  });

  describe('edge cases', () => {
    it('returns empty string for empty input', () => {
      expect(smartTitleCase('')).toBe('');
    });

    it('returns empty string for null/undefined', () => {
      expect(smartTitleCase(null)).toBe('');
      expect(smartTitleCase(undefined)).toBe('');
    });

    it('handles numbers and mixed tokens', () => {
      expect(smartTitleCase('top-10-of-2026')).toBe('Top 10 of 2026');
    });

    it('coerces non-strings', () => {
      expect(smartTitleCase(42)).toBe('42');
    });
  });
});
