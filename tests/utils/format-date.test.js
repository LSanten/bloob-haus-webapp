import { describe, it, expect } from 'vitest';
import { formatDate } from '../../scripts/utils/format-date.js';

describe('formatDate', () => {
  it('formats a YYYY-MM-DD string without off-by-one', () => {
    expect(formatDate('2023-10-17')).toBe('October 17, 2023');
  });

  it('formats a UTC-midnight Date as the same calendar date', () => {
    expect(formatDate(new Date('2024-11-07T00:00:00.000Z'))).toBe('November 7, 2024');
  });

  it('returns "" for empty / missing input', () => {
    expect(formatDate(undefined)).toBe('');
    expect(formatDate(null)).toBe('');
    expect(formatDate([])).toBe('');
  });

  describe('arrays (date_updated) — shows the latest regardless of order', () => {
    it('ascending list (oldest first)', () => {
      expect(formatDate(['2025-01-19', '2025-04-01'])).toBe('April 1, 2025');
    });

    it('descending list (newest first — the new plugin convention)', () => {
      expect(formatDate(['2025-04-01', '2025-01-19'])).toBe('April 1, 2025');
    });

    it('unsorted / mixed-order list', () => {
      expect(formatDate(['2025-04-01', '2025-12-25', '2025-01-19'])).toBe('December 25, 2025');
    });

    it('single-entry list', () => {
      expect(formatDate(['2025-01-19'])).toBe('January 19, 2025');
    });

    it('array of Date objects picks the latest', () => {
      expect(
        formatDate([
          new Date('2024-09-20T00:00:00.000Z'),
          new Date('2025-03-03T00:00:00.000Z'),
        ]),
      ).toBe('March 3, 2025');
    });
  });
});
