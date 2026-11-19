import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import sharp from 'sharp';

// sharp's file cache keeps handles open; on Windows that locks the temp files (EBUSY on cleanup).
sharp.cache(false);

let tmpSrc;
let prevSrcDir;

beforeEach(async () => {
  tmpSrc = await fs.mkdtemp(path.join(os.tmpdir(), 'gen-fav-'));
  await fs.ensureDir(path.join(tmpSrc, 'media'));
  await sharp({ create: { width: 400, height: 400, channels: 4, background: '#5b5dd3' } })
    .png().toFile(path.join(tmpSrc, 'media', 'logo.png'));
  prevSrcDir = process.env.SRC_DIR;
  process.env.SRC_DIR = tmpSrc;
});

afterEach(async () => {
  if (prevSrcDir === undefined) delete process.env.SRC_DIR;
  else process.env.SRC_DIR = prevSrcDir;
  await fs.remove(tmpSrc);
});

/** Parses an ICO file: header + directory entries + the image bytes each entry points at. */
function readIco(buf) {
  const reserved = buf.readUInt16LE(0);
  const type = buf.readUInt16LE(2);
  const count = buf.readUInt16LE(4);
  const entries = [];
  for (let i = 0; i < count; i++) {
    const o = 6 + i * 16;
    const width = buf[o] || 256;
    const height = buf[o + 1] || 256;
    const size = buf.readUInt32LE(o + 8);
    const offset = buf.readUInt32LE(o + 12);
    entries.push({ width, height, data: buf.subarray(offset, offset + size), size, offset });
  }
  return { reserved, type, count, entries };
}

const config = { site: { favicon: '[[logo.png]]' } };

describe('generateFavicons: favicon.ico', () => {
  it('writes a valid favicon.ico holding 32×32 and 48×48 PNG images', async () => {
    const { generateFavicons } = await import('../../scripts/generate-favicons.js');
    await generateFavicons({ config });

    const icoPath = path.join(tmpSrc, 'favicon.ico');
    expect(fs.existsSync(icoPath)).toBe(true);

    const buf = await fs.readFile(icoPath);
    const ico = readIco(buf);
    expect(ico.reserved).toBe(0);
    expect(ico.type).toBe(1); // 1 = icon
    expect(ico.entries.map((e) => [e.width, e.height])).toEqual([[32, 32], [48, 48]]);

    for (const e of ico.entries) {
      expect(e.offset + e.size).toBeLessThanOrEqual(buf.length);
      const meta = await sharp(e.data).metadata();
      expect(meta.format).toBe('png');
      expect([meta.width, meta.height]).toEqual([e.width, e.height]);
    }
  });

  it('regenerates favicon.ico when it is missing but the source is unchanged', async () => {
    const { generateFavicons } = await import('../../scripts/generate-favicons.js');
    await generateFavicons({ config });
    const icoPath = path.join(tmpSrc, 'favicon.ico');
    await fs.remove(icoPath); // e.g. a cache from before favicon.ico existed

    await generateFavicons({ config });
    expect(fs.existsSync(icoPath)).toBe(true);
  });
});
