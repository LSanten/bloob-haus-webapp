import { describe, it, expect } from 'vitest';
import { stripDatePrefix, resolveDatePrefixMode } from '../../scripts/utils/date-prefix.js';

describe('stripDatePrefix', () => {
  it('splits a Jekyll-style date prefix into date + clean name', () => {
    expect(stripDatePrefix('2026-06-24-language-to-describe-music')).toEqual({
      date: '2026-06-24',
      name: 'language-to-describe-music',
    });
  });

  it('works with spaces in the remainder (pre-slugify filename)', () => {
    expect(stripDatePrefix('2026-06-24-language to describe music')).toEqual({
      date: '2026-06-24',
      name: 'language to describe music',
    });
  });

  // Regression: Obsidian-style "2026-11-07 Aden Bday Dolores Park Set" (space after
  // the date) was not recognised, so no permalink was pinned and Eleventy silently
  // stripped the date from the URL even on `date_prefix: keep` vaults.
  it('accepts a space as the separator after the date (Obsidian-style)', () => {
    expect(stripDatePrefix('2026-11-07 Aden Bday Dolores Park Set')).toEqual({
      date: '2026-11-07',
      name: 'Aden Bday Dolores Park Set',
    });
  });

  it('does not strip when only a separator follows the date', () => {
    expect(stripDatePrefix('2026-06-24 ')).toEqual({ date: null, name: '2026-06-24 ' });
  });

  it('returns null date and unchanged name when there is no prefix', () => {
    expect(stripDatePrefix('language-to-describe-music')).toEqual({
      date: null,
      name: 'language-to-describe-music',
    });
  });

  it('does not strip when the remainder is empty', () => {
    expect(stripDatePrefix('2026-06-24')).toEqual({ date: null, name: '2026-06-24' });
    expect(stripDatePrefix('2026-06-24-')).toEqual({ date: null, name: '2026-06-24-' });
  });

  it('ignores invalid month/day ranges (not a real date)', () => {
    expect(stripDatePrefix('1234-56-78-foo')).toEqual({ date: null, name: '1234-56-78-foo' });
    expect(stripDatePrefix('2026-13-01-foo')).toEqual({ date: null, name: '2026-13-01-foo' });
    expect(stripDatePrefix('2026-06-32-foo')).toEqual({ date: null, name: '2026-06-32-foo' });
  });

  it('keeps any further date-like segments in the name', () => {
    expect(stripDatePrefix('2026-06-24-2025-recap')).toEqual({
      date: '2026-06-24',
      name: '2025-recap',
    });
  });
});

describe('resolveDatePrefixMode', () => {
  it('defaults to strip (what Eleventy does natively)', () => {
    expect(resolveDatePrefixMode({})).toBe('strip');
    expect(resolveDatePrefixMode(undefined)).toBe('strip');
  });

  it('date_prefix_slugs → strip', () => {
    expect(resolveDatePrefixMode({ date_prefix_slugs: true })).toBe('strip');
    expect(resolveDatePrefixMode({ date_prefix_slugs: true, date_from_filename: true })).toBe('strip');
  });

  it('legacy date_from_filename alone → keep (date stays in the URL)', () => {
    expect(resolveDatePrefixMode({ date_from_filename: true })).toBe('keep');
  });
});
