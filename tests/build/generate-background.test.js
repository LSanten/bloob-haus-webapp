import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import sharp from 'sharp';
import { glob } from 'glob';

let tmpSrc;

beforeAll(async () => {
  tmpSrc = await fs.mkdtemp(path.join(os.tmpdir(), 'gen-bg-'));
  await fs.ensureDir(path.join(tmpSrc, 'media'));
  // real 2400×2400 png so the resize path actually runs
  await sharp({ create: { width: 2400, height: 2400, channels: 3, background: '#88cc88' } })
    .png().toFile(path.join(tmpSrc, 'media', 'MELT background.png.jpg'));
});
afterAll(async () => { await fs.remove(tmpSrc); });

describe('generateBackground', () => {
  it('resolves wiki-link value, writes 1920px webp, returns URL', async () => {
    const { generateBackground } = await import('../../scripts/generate-background.js');
    const config = { site: { background_image: '[[MELT background.png.jpg]]' } };
    const url = await generateBackground({ config, srcDir: tmpSrc });
    expect(url).toBe('/media/optimized/site-background.webp');
    const out = path.join(tmpSrc, 'media', 'optimized', 'site-background.webp');
    expect(fs.existsSync(out)).toBe(true);
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(1920);
    expect(meta.format).toBe('webp');
    expect(fs.existsSync(path.join(tmpSrc, '.background-hash'))).toBe(true);
  });

  it('returns null and writes nothing when background_image is not set', async () => {
    const { generateBackground } = await import('../../scripts/generate-background.js');
    const url = await generateBackground({ config: { site: {} }, srcDir: tmpSrc });
    expect(url).toBeNull();
  });

  it('skips sharp when hash matches (cache hit leaves mtime unchanged)', async () => {
    const { generateBackground } = await import('../../scripts/generate-background.js');
    const config = { site: { background_image: '[[MELT background.png.jpg]]' } };
    await generateBackground({ config, srcDir: tmpSrc });
    const out = path.join(tmpSrc, 'media', 'optimized', 'site-background.webp');
    const mtime1 = (await fs.stat(out)).mtimeMs;
    await generateBackground({ config, srcDir: tmpSrc });
    const mtime2 = (await fs.stat(out)).mtimeMs;
    expect(mtime2).toBe(mtime1);
  });

  it('md-link value with alt text also resolves', async () => {
    const { generateBackground } = await import('../../scripts/generate-background.js');
    const config = { site: { background_image: '[a watercolor wash](MELT background.png.jpg)' } };
    const url = await generateBackground({ config, srcDir: tmpSrc });
    expect(url).toBe('/media/optimized/site-background.webp');
  });
});

describe('generatePageBackgrounds (per-page overrides)', () => {
  async function writePage(rel, frontmatter) {
    const p = path.join(tmpSrc, rel);
    await fs.ensureDir(path.dirname(p));
    const fm = Object.entries(frontmatter).map(([k, v]) => `${k}: ${v}`).join('\n');
    await fs.writeFile(p, `---\n${fm}\n---\n\n# ${rel}\n`);
  }

  afterEach(async () => {
    // Remove page .md so each test scans a clean set (keep the source image + optimized cache).
    const mds = await glob('**/*.md', { cwd: tmpSrc, nodir: true });
    await Promise.all(mds.map((m) => fs.remove(path.join(tmpSrc, m))));
  });

  it('optimizes a page background_image override → { value: hashed-webp-url } map', async () => {
    const { generatePageBackgrounds } = await import('../../scripts/generate-background.js');
    await writePage('landing.md', { background_image: '"[[MELT background.png.jpg]]"' });
    const map = await generatePageBackgrounds({ srcDir: tmpSrc });
    const key = '[[MELT background.png.jpg]]';
    expect(map[key]).toMatch(/^\/media\/optimized\/bg-[a-f0-9]{32}\.webp$/);
    const out = path.join(tmpSrc, map[key].replace(/^\//, ''));
    expect(fs.existsSync(out)).toBe(true);
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(1920);
    expect(meta.format).toBe('webp');
  });

  it('returns an empty map when no page sets background_image', async () => {
    const { generatePageBackgrounds } = await import('../../scripts/generate-background.js');
    await writePage('plain.md', { title: 'no bg here' });
    const map = await generatePageBackgrounds({ srcDir: tmpSrc });
    expect(map).toEqual({});
  });

  it('dedupes multiple pages referencing the same image to one entry', async () => {
    const { generatePageBackgrounds } = await import('../../scripts/generate-background.js');
    await writePage('a.md', { background_image: '"[[MELT background.png.jpg]]"' });
    await writePage('sub/b.md', { background_image: '"[[MELT background.png.jpg]]"' });
    const map = await generatePageBackgrounds({ srcDir: tmpSrc });
    expect(Object.keys(map)).toEqual(['[[MELT background.png.jpg]]']);
  });

  it('skips (does not throw) when the referenced image is missing', async () => {
    const { generatePageBackgrounds } = await import('../../scripts/generate-background.js');
    await writePage('broken.md', { background_image: '"[[does-not-exist.png]]"' });
    const map = await generatePageBackgrounds({ srcDir: tmpSrc });
    expect(map).toEqual({});
  });
});
