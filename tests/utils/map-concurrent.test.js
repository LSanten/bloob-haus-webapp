import { describe, it, expect } from 'vitest';
import { mapWithConcurrency } from '../../scripts/utils/map-concurrent.js';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

describe('mapWithConcurrency', () => {
  it('returns results in input order regardless of completion order', async () => {
    const out = await mapWithConcurrency([30, 5, 15], 3, async (ms) => {
      await delay(ms);
      return ms * 2;
    });
    expect(out).toEqual([60, 10, 30]);
  });

  it('processes every item exactly once', async () => {
    const seen = [];
    await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => {
      seen.push(n);
      return n;
    });
    expect(seen.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it('never runs more than `concurrency` mappers at once', async () => {
    let active = 0;
    let maxActive = 0;
    const items = Array.from({ length: 20 }, (_, i) => i);
    await mapWithConcurrency(items, 4, async (n) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await delay(5);
      active--;
      return n;
    });
    expect(maxActive).toBeLessThanOrEqual(4);
    expect(maxActive).toBeGreaterThan(1); // proves it actually parallelized
  });

  it('handles concurrency greater than the item count', async () => {
    const out = await mapWithConcurrency([1, 2], 10, async (n) => n * 10);
    expect(out).toEqual([10, 20]);
  });

  it('returns an empty array for no items', async () => {
    let called = false;
    const out = await mapWithConcurrency([], 4, async () => {
      called = true;
    });
    expect(out).toEqual([]);
    expect(called).toBe(false);
  });

  it('coerces a concurrency below 1 to sequential (1)', async () => {
    let active = 0;
    let maxActive = 0;
    await mapWithConcurrency([1, 2, 3], 0, async (n) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await delay(2);
      active--;
      return n;
    });
    expect(maxActive).toBe(1);
  });

  it('rejects if a mapper throws', async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error('boom');
        return n;
      }),
    ).rejects.toThrow('boom');
  });
});
