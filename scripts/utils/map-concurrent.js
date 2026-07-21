/**
 * Bounded-concurrency async map.
 *
 * Runs `mapper` over every item, keeping at most `concurrency` calls in flight
 * at once — a lightweight worker pool, no dependency. Results are returned in
 * input order regardless of completion order. Rejects on the first mapper error
 * (like `Promise.all`).
 *
 * Used to parallelize CPU/IO-bound batch work (e.g. OG image generation) across
 * cores instead of processing one item at a time.
 *
 * @template T, R
 * @param {T[]} items
 * @param {number} concurrency - max concurrent mapper calls (coerced to >= 1)
 * @param {(item: T, index: number) => Promise<R>} mapper
 * @returns {Promise<R[]>} results in the same order as `items`
 */
export async function mapWithConcurrency(items, concurrency, mapper) {
  const limit = Math.max(1, Math.floor(concurrency) || 1);
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) return;
      results[i] = await mapper(items[i], i);
    }
  }

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
