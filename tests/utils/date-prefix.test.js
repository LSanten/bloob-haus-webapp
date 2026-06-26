import { describe, it, expect } from 'vitest';
import { stripDatePrefix } from '../../scripts/utils/date-prefix.js';

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
