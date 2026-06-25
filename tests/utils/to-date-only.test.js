import { describe, it, expect } from 'vitest';
import { toDateOnly } from '../../scripts/preprocess-content.js';

describe('toDateOnly', () => {
  it('formats a UTC-midnight Date as the same calendar date (no off-by-one)', () => {
    // Bare YAML dates parse to UTC midnight; must not roll back a day in
    // negative-offset timezones.
    expect(toDateOnly(new Date('2023-10-17T00:00:00.000Z'))).toBe('2023-10-17');
    expect(toDateOnly(new Date('2024-11-07T00:00:00.000Z'))).toBe('2024-11-07');
  });

  it('truncates an ISO timestamp string to the date portion', () => {
    expect(toDateOnly('2025-04-01T00:00:00.000Z')).toBe('2025-04-01');
  });

  it('passes a plain YYYY-MM-DD string through unchanged', () => {
    expect(toDateOnly('2023-10-17')).toBe('2023-10-17');
  });

  it('leaves non-date strings untouched', () => {
    expect(toDateOnly('not a date')).toBe('not a date');
  });

  it('preserves the legacy comma-label form (melt/legacy theme feature)', () => {
    expect(toDateOnly('2024-11-07, Written on')).toBe('2024-11-07, Written on');
  });

  it('returns non-string, non-Date values unchanged', () => {
    expect(toDateOnly(null)).toBe(null);
    expect(toDateOnly(undefined)).toBe(undefined);
  });

  it('ignores invalid Date objects', () => {
    const bad = new Date('nonsense');
    expect(toDateOnly(bad)).toBe(bad);
  });
});
