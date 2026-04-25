/**
 * Local export test for ken-burns-zoom-builder.
 *
 * Requires:
 *   1. A site with magic_machines: true running locally:
 *        npm run dev:alter-engineers  (with magic_machines: true in alter-engineers.yaml)
 *      OR
 *        npm run dev:marbles          (if bloob-haus-marbles is present at ../bloob-haus-marbles)
 *   2. Playwright: npm install playwright (or npx playwright)
 *
 * Usage:
 *   node scripts/test-ken-burns-export.js [http://localhost:8080]
 */

import { chromium } from 'playwright';

const BASE_URL = process.argv[2] ?? 'http://localhost:8080';
const MACHINE_URL = `${BASE_URL}/magic-machine/ken-burns-zoom-builder/`;

const { browser } = await (async () => {
  const browser = await chromium.launch({ headless: true });
  return { browser };
})();

const page = await browser.newPage();

await page.goto(MACHINE_URL);
await page.waitForFunction(() => typeof loadImage === 'function', { timeout: 10000 });

console.log('Injecting test image…');
await page.evaluate(async () => {
  const resp = await fetch('https://picsum.photos/seed/kbtest/270/480');
  const blob = await resp.blob();
  loadImage(new File([blob], 'test.jpg', { type: 'image/jpeg' }));
  state.duration = 2;
});

await page.waitForFunction(
  () => { const img = document.getElementById('preview-img'); return img && img.naturalWidth > 0; },
  { timeout: 10000 }
);

console.log('Image loaded. Triggering export…');
await page.evaluate(() => document.getElementById('btn-download').click());

await page.waitForFunction(
  () => {
    const entries = [...document.querySelectorAll('#debug-log .debug-entry')];
    return entries.some(e => e.classList.contains('error')) ||
           entries.some(e => e.textContent.toLowerCase().includes('encoded') || e.textContent.toLowerCase().includes('saved'));
  },
  { timeout: 60000 }
).catch(() => console.log('Timed out — reading partial log'));

const entries = await page.evaluate(() =>
  [...document.querySelectorAll('#debug-log .debug-entry')].map(e => e.textContent.trim())
);

console.log('\n=== DEBUG LOG ===');
entries.forEach(t => console.log(t));

const errors = entries.filter(t => t.includes('[ERROR]') || t.toLowerCase().includes('error'));
console.log(errors.length ? `\nFAIL — ${errors.length} error(s)` : '\nPASS');

await browser.close();
process.exit(errors.length ? 1 : 0);
