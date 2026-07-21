import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import sharp from 'sharp';

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
