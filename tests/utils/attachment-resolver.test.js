import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { resolveAttachments, copyAttachments, extractFirstImage } from '../../scripts/utils/attachment-resolver.js';
import { createMockAttachmentIndex } from '../helpers/mock-index.js';

// Base index used by most tests. vaultPath entries enable path-aware resolution tests.
const index = createMockAttachmentIndex([
  { filename: 'image.jpg',                   path: '/media/image.jpg',                          vaultPath: 'media/image.jpg' },
  { filename: 'Pasted image 20250315.jpg',   path: '/media/Pasted%20image%2020250315.jpg',      vaultPath: 'media/Pasted image 20250315.jpg' },
  { filename: 'cleanshot@2x.png',            path: '/media/cleanshot%402x.png',                 vaultPath: 'media/cleanshot@2x.png' },
  { filename: 'photo with spaces.png',       path: '/media/photo%20with%20spaces.png',           vaultPath: 'media/photo with spaces.png' },
  { filename: 'diagram.html',               path: '/projects/diagram.html',                    vaultPath: 'projects/diagram.html' },
  { filename: 'chart.svg',                  path: '/assets/chart.svg',                         vaultPath: 'assets/chart.svg' },
]);

describe('resolveAttachments', () => {
  describe('standard markdown images ![alt](path)', () => {
    it('resolves a basic image reference', () => {
      const result = resolveAttachments('![alt](image.jpg)', index);
      expect(result.content).toBe('![alt](/media/image.jpg)');
      expect(result.resolved).toHaveLength(1);
      expect(result.broken).toHaveLength(0);
    });

    it('decodes URL-encoded filenames for lookup (the %20 bug case)', () => {
      const result = resolveAttachments('![](Pasted%20image%2020250315.jpg)', index);
      expect(result.content).toBe('![](/media/Pasted%20image%2020250315.jpg)');
      expect(result.resolved).toHaveLength(1);
    });

    it('resolves filenames with @ symbol', () => {
      const result = resolveAttachments('![screenshot](cleanshot@2x.png)', index);
      expect(result.content).toBe('![screenshot](/media/cleanshot%402x.png)');
      expect(result.resolved).toHaveLength(1);
    });

    it('keeps original tag for unresolved images', () => {
      const input = '![alt](nonexistent.jpg)';
      const result = resolveAttachments(input, index);
      expect(result.content).toBe(input);
      expect(result.broken).toHaveLength(1);
      expect(result.broken[0].original).toBe('nonexistent.jpg');
    });

    it('resolves via case-insensitive lookup', () => {
      const result = resolveAttachments('![](IMAGE.JPG)', index);
      expect(result.content).toBe('![](/media/image.jpg)');
      expect(result.resolved).toHaveLength(1);
    });

    it('uses path-aware resolution when sourceVaultPath is provided', () => {
      // File is at marbles/my-page.md; relative path ../media/image.jpg → media/image.jpg
      const result = resolveAttachments(
        '![](../media/image.jpg)',
        index,
        { sourceVaultPath: 'marbles/my-page.md' },
      );
      expect(result.content).toBe('![](/media/image.jpg)');
      expect(result.resolved).toHaveLength(1);
    });

    it('falls back to basename when path-aware lookup fails but basename matches', () => {
      const result = resolveAttachments(
        '![](../unknown-folder/image.jpg)',
        index,
        { sourceVaultPath: 'marbles/my-page.md' },
      );
      expect(result.content).toBe('![](/media/image.jpg)');
      expect(result.resolved).toHaveLength(1);
    });
  });

  describe('wiki-style images ![[image]]', () => {
    it('resolves wiki-style image to standard markdown', () => {
      const result = resolveAttachments('![[image.jpg]]', index);
      expect(result.content).toBe('![](/media/image.jpg)');
      expect(result.resolved).toHaveLength(1);
    });

    it('preserves alt text from pipe syntax', () => {
      const result = resolveAttachments('![[image.jpg|my alt text]]', index);
      expect(result.content).toBe('![my alt text](/media/image.jpg)');
    });

    it('resolves non-media vault files by basename', () => {
      // diagram.html lives at projects/diagram.html — wiki link has no path info
      const result = resolveAttachments('![[diagram.html]]', index);
      expect(result.content).toBe('![](/projects/diagram.html)');
      expect(result.resolved).toHaveLength(1);
    });

    it('converts unresolved wiki image to standard markdown', () => {
      const result = resolveAttachments('![[nonexistent.jpg]]', index);
      expect(result.content).toBe('![](nonexistent.jpg)');
      expect(result.broken).toHaveLength(1);
    });

    it('converts unresolved wiki image with alt to standard markdown', () => {
      const result = resolveAttachments('![[nonexistent.jpg|alt]]', index);
      expect(result.content).toBe('![alt](nonexistent.jpg)');
    });

    it('always uses basename lookup, ignoring sourceVaultPath', () => {
      const result = resolveAttachments(
        '![[image.jpg]]',
        index,
        { sourceVaultPath: 'marbles/my-page.md' },
      );
      expect(result.content).toBe('![](/media/image.jpg)');
    });
  });

  describe('raw HTML src= tags', () => {
    describe('<img>', () => {
      it('resolves a relative ../media/ path to root-relative', () => {
        const result = resolveAttachments(
          '<img src="../media/image.jpg">',
          index,
          { sourceVaultPath: 'marbles/my-page.md' },
        );
        expect(result.content).toBe('<img src="/media/image.jpg" class="no-optimize">');
        expect(result.resolved).toHaveLength(1);
      });

      it('preserves other attributes and adds no-optimize class', () => {
        // User-authored HTML <img> tags must pass through the image optimizer unchanged.
        // no-optimize class tells the optimizer to preserve inline styles, width, etc.
        const result = resolveAttachments(
          '<img src="../media/image.jpg" width="150" style="display:block; margin:auto;">',
          index,
          { sourceVaultPath: 'marbles/my-page.md' },
        );
        expect(result.content).toBe(
          '<img src="/media/image.jpg" width="150" style="display:block; margin:auto;" class="no-optimize">',
        );
      });

      it('merges no-optimize into an existing class attribute', () => {
        const result = resolveAttachments(
          '<img src="../media/image.jpg" class="centered">',
          index,
          { sourceVaultPath: 'marbles/my-page.md' },
        );
        expect(result.content).toBe('<img src="/media/image.jpg" class="centered no-optimize">');
      });

      it('does not duplicate no-optimize if already present', () => {
        const result = resolveAttachments(
          '<img src="../media/image.jpg" class="no-optimize">',
          index,
          { sourceVaultPath: 'marbles/my-page.md' },
        );
        expect(result.content).toBe('<img src="/media/image.jpg" class="no-optimize">');
      });

      it('resolves a bare filename src via basename fallback', () => {
        const result = resolveAttachments('<img src="image.jpg">', index);
        expect(result.content).toBe('<img src="/media/image.jpg" class="no-optimize">');
      });

      it('leaves already-root-relative src unchanged', () => {
        const input = '<img src="/media/image.jpg">';
        expect(resolveAttachments(input, index).content).toBe(input);
        expect(resolveAttachments(input, index).resolved).toHaveLength(0);
      });

      it('leaves absolute http:// src unchanged', () => {
        const input = '<img src="https://example.com/photo.png">';
        expect(resolveAttachments(input, index).content).toBe(input);
      });

      it('leaves data: URIs unchanged', () => {
        const input = '<img src="data:image/png;base64,abc123">';
        expect(resolveAttachments(input, index).content).toBe(input);
      });

      it('reports broken for unresolvable src', () => {
        const input = '<img src="../media/nonexistent.jpg">';
        const result = resolveAttachments(input, index, { sourceVaultPath: 'marbles/my-page.md' });
        expect(result.content).toBe(input);
        expect(result.broken).toHaveLength(1);
        expect(result.broken[0].original).toBe('../media/nonexistent.jpg');
      });

      it('resolves URL-encoded filenames in src', () => {
        const result = resolveAttachments(
          '<img src="../media/Pasted%20image%2020250315.jpg">',
          index,
          { sourceVaultPath: 'marbles/my-page.md' },
        );
        expect(result.content).toBe('<img src="/media/Pasted%20image%2020250315.jpg" class="no-optimize">');
      });
    });

    describe('<iframe>', () => {
      it('resolves a same-folder HTML file', () => {
        // Both files in marbles/ — gomez-marin-concepts.html → /marbles/gomez-marin-concepts.html
        const htmlIndex = createMockAttachmentIndex([
          {
            filename: 'diagram.html',
            path: '/marbles/diagram.html',
            vaultPath: 'marbles/diagram.html',
          },
        ]);
        const result = resolveAttachments(
          '<iframe src="diagram.html" width="100%" height="600"></iframe>',
          htmlIndex,
          { sourceVaultPath: 'marbles/my-page.md' },
        );
        expect(result.content).toBe(
          '<iframe src="/marbles/diagram.html" width="100%" height="600"></iframe>',
        );
        expect(result.resolved).toHaveLength(1);
      });

      it('resolves ../ relative path to a sibling folder', () => {
        const result = resolveAttachments(
          '<iframe src="../projects/diagram.html"></iframe>',
          index,
          { sourceVaultPath: 'marbles/my-page.md' },
        );
        expect(result.content).toBe('<iframe src="/projects/diagram.html"></iframe>');
      });

      it('leaves external iframe src unchanged', () => {
        const input = '<iframe src="https://www.youtube.com/embed/abc123"></iframe>';
        expect(resolveAttachments(input, index).content).toBe(input);
      });
    });

    describe('<video> and <audio>', () => {
      it('resolves <video src>', () => {
        const videoIndex = createMockAttachmentIndex([
          { filename: 'demo.mp4', path: '/media/demo.mp4', vaultPath: 'media/demo.mp4' },
        ]);
        const result = resolveAttachments('<video src="demo.mp4" controls></video>', videoIndex);
        expect(result.content).toBe('<video src="/media/demo.mp4" controls></video>');
      });

      it('resolves <source src>', () => {
        const videoIndex = createMockAttachmentIndex([
          { filename: 'demo.mp4', path: '/media/demo.mp4', vaultPath: 'media/demo.mp4' },
        ]);
        const result = resolveAttachments('<source src="demo.mp4" type="video/mp4">', videoIndex);
        expect(result.content).toBe('<source src="/media/demo.mp4" type="video/mp4">');
      });
    });

    describe('path-aware resolution with vault structure', () => {
      it('resolves a non-media vault file via exact vault path', () => {
        const result = resolveAttachments(
          '<img src="../assets/chart.svg">',
          index,
          { sourceVaultPath: 'marbles/my-page.md' },
        );
        expect(result.content).toBe('<img src="/assets/chart.svg" class="no-optimize">');
      });

      it('handles nested source paths correctly', () => {
        // Source at docs/sub/page.md, file at docs/images/photo.jpg
        const nestedIndex = createMockAttachmentIndex([
          {
            filename: 'photo.jpg',
            path: '/docs/images/photo.jpg',
            vaultPath: 'docs/images/photo.jpg',
          },
        ]);
        const result = resolveAttachments(
          '<img src="../images/photo.jpg">',
          nestedIndex,
          { sourceVaultPath: 'docs/sub/page.md' },
        );
        expect(result.content).toBe('<img src="/docs/images/photo.jpg" class="no-optimize">');
      });
    });
  });

  describe('mixed content', () => {
    it('resolves multiple images and tracks both resolved and broken', () => {
      const input = '![](image.jpg)\n\n![](nonexistent.jpg)\n\n![[cleanshot@2x.png]]';
      const result = resolveAttachments(input, index);
      expect(result.resolved).toHaveLength(2);
      expect(result.broken).toHaveLength(1);
    });

    it('resolves all three syntaxes in a single document', () => {
      const input = [
        '![md](image.jpg)',
        '![[cleanshot@2x.png]]',
        '<img src="../media/image.jpg" width="150" style="display:block; margin:auto;">',
        '<iframe src="../projects/diagram.html" height="600"></iframe>',
      ].join('\n\n');
      const result = resolveAttachments(input, index, { sourceVaultPath: 'marbles/my-page.md' });
      expect(result.resolved).toHaveLength(4);
      expect(result.broken).toHaveLength(0);
      expect(result.content).toContain('![md](/media/image.jpg)');
      expect(result.content).toContain('![](/media/cleanshot%402x.png)');
      expect(result.content).toContain('<img src="/media/image.jpg"');
      expect(result.content).toContain('<iframe src="/projects/diagram.html"');
    });

    it('passes through content with no images', () => {
      const input = '# Hello\n\nJust text, no images.';
      const result = resolveAttachments(input, index);
      expect(result.content).toBe(input);
      expect(result.resolved).toHaveLength(0);
      expect(result.broken).toHaveLength(0);
    });
  });
});

describe('extractFirstImage', () => {
  it('extracts the first /media/ image path', () => {
    const content = 'text ![alt](/media/photo.jpg) more ![](/media/second.png)';
    expect(extractFirstImage(content)).toBe('/media/photo.jpg');
  });

  it('extracts images from non-media vault paths', () => {
    const content = 'text ![alt](/projects/images/photo.jpg)';
    expect(extractFirstImage(content)).toBe('/projects/images/photo.jpg');
  });

  it('returns null when no root-relative images exist', () => {
    expect(extractFirstImage('![alt](external.jpg)')).toBeNull();
  });

  it('returns null for empty content', () => {
    expect(extractFirstImage('')).toBeNull();
  });

  it('matches svg images', () => {
    expect(extractFirstImage('![chart](/assets/chart.svg)')).toBe('/assets/chart.svg');
  });

  it('finds a GIF as the first image', () => {
    expect(extractFirstImage('![](/media/animation.gif)')).toBe('/media/animation.gif');
  });

  it('returns null for mp4 — videos are not picked up as OG sources', () => {
    expect(extractFirstImage('![](/media/animation.mp4)')).toBeNull();
  });

  it('finds GIF before a later static image', () => {
    const content = '![](/media/animation.gif) text ![](/media/photo.jpg)';
    expect(extractFirstImage(content)).toBe('/media/animation.gif');
  });
});

// OG path formula: any non-PNG source (including GIFs) maps to -og.jpeg.
// GIFs get their first frame extracted by generate-og-images.js — never -og.gif.
describe('OG image path formula (extension → og extension)', () => {
  function ogExt(srcPath) {
    const ext = srcPath.split('.').pop().toLowerCase();
    return ext === 'png' ? 'png' : 'jpeg';
  }

  it('GIF source → jpeg OG (first frame, not animated gif)', () => {
    expect(ogExt('/media/animation.gif')).toBe('jpeg');
  });

  it('PNG source → png OG', () => {
    expect(ogExt('/media/photo.png')).toBe('png');
  });

  it('JPEG source → jpeg OG', () => {
    expect(ogExt('/media/photo.jpg')).toBe('jpeg');
  });
});

describe('copyAttachments', () => {
  let contentDir;
  let staticRootDir;

  beforeEach(async () => {
    contentDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vault-'));
    staticRootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'static-'));
  });

  afterEach(async () => {
    await fs.remove(contentDir);
    await fs.remove(staticRootDir);
  });

  async function writeVaultFile(relPath, content = '') {
    const full = path.join(contentDir, relPath);
    await fs.ensureDir(path.dirname(full));
    await fs.writeFile(full, content);
  }

  it('preserves vault directory structure in output', async () => {
    await writeVaultFile('media/logo.png', 'logo');
    await writeVaultFile('projects/diagram.html', '<html></html>');
    await writeVaultFile('marbles/concepts.html', '<html></html>');

    await copyAttachments(contentDir, 'media', staticRootDir);

    expect(await fs.pathExists(path.join(staticRootDir, 'media/logo.png'))).toBe(true);
    expect(await fs.pathExists(path.join(staticRootDir, 'projects/diagram.html'))).toBe(true);
    expect(await fs.pathExists(path.join(staticRootDir, 'marbles/concepts.html'))).toBe(true);
  });

  it('does NOT flatten to a /media/ basename anymore', async () => {
    await writeVaultFile('projects/diagram.html', '<html></html>');
    await copyAttachments(contentDir, 'media', staticRootDir);

    // File must be at its vault-relative path, NOT flattened to media/
    expect(await fs.pathExists(path.join(staticRootDir, 'projects/diagram.html'))).toBe(true);
    expect(await fs.pathExists(path.join(staticRootDir, 'media/diagram.html'))).toBe(false);
  });

  it('creates intermediate directories as needed', async () => {
    await writeVaultFile('deep/nested/folder/image.png', 'img');
    await copyAttachments(contentDir, 'media', staticRootDir);

    expect(await fs.pathExists(path.join(staticRootDir, 'deep/nested/folder/image.png'))).toBe(true);
  });

  it('files in vault media/ folder go to staticRoot/media/', async () => {
    await writeVaultFile('media/photo.jpg', 'jpg');
    await copyAttachments(contentDir, 'media', staticRootDir);

    // media/ maps to media/ in output — same as before for files already in media/
    expect(await fs.pathExists(path.join(staticRootDir, 'media/photo.jpg'))).toBe(true);
  });

  it('reports copied files and no errors on success', async () => {
    await writeVaultFile('media/a.png', '');
    await writeVaultFile('projects/b.jpg', '');
    const { copied, errors } = await copyAttachments(contentDir, 'media', staticRootDir);

    expect(copied).toHaveLength(2);
    expect(errors).toHaveLength(0);
    expect(copied).toContain('media/a.png');
    expect(copied).toContain('projects/b.jpg');
  });

  it('excludes .obsidian/ system folder', async () => {
    await writeVaultFile('.obsidian/app.png', '');
    await writeVaultFile('media/real.png', '');
    const { copied } = await copyAttachments(contentDir, 'media', staticRootDir);

    expect(copied).toHaveLength(1);
    expect(copied[0]).toBe('media/real.png');
  });

  it('auto-compresses PNG over 20 MiB using sharp instead of plain copy', async () => {
    // Minimal valid 1x1 white PNG so sharp can actually process it
    const minimalPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    const full = path.join(contentDir, 'media', 'big.png');
    await fs.ensureDir(path.dirname(full));
    await fs.writeFile(full, minimalPng);

    // Mock stat to report > 20 MiB so the compression path triggers
    const realStat = fs.stat.bind(fs);
    vi.spyOn(fs, 'stat').mockImplementation(async (p) => {
      if (p === full) return { size: 21 * 1024 * 1024 };
      return realStat(p);
    });

    const { copied } = await copyAttachments(contentDir, 'media', staticRootDir);

    // File treated as copied (not skipped) and written to destination
    const normalised = copied.map(f => f.replace(/\\/g, '/'));
    expect(normalised).toContain('media/big.png');
    expect(await fs.pathExists(path.join(staticRootDir, 'media', 'big.png'))).toBe(true);

    vi.restoreAllMocks();
  });

  it('skips non-compressible files over 25 MiB', async () => {
    await writeVaultFile('media/huge.pdf', 'fake-pdf');
    const sourcePath = path.join(contentDir, 'media', 'huge.pdf');

    const realStat = fs.stat.bind(fs);
    vi.spyOn(fs, 'stat').mockImplementation(async (p) => {
      if (p === sourcePath) return { size: 26 * 1024 * 1024 };
      return realStat(p);
    });

    const { copied, skipped } = await copyAttachments(contentDir, 'media', staticRootDir);

    const normCopied = copied.map(f => f.replace(/\\/g, '/'));
    const normSkipped = skipped.map(s => s.file.replace(/\\/g, '/'));
    expect(normCopied).not.toContain('media/huge.pdf');
    expect(normSkipped).toContain('media/huge.pdf');
    expect(await fs.pathExists(path.join(staticRootDir, 'media', 'huge.pdf'))).toBe(false);

    vi.restoreAllMocks();
  });

  it('copies PNG under 20 MiB as-is without compression', async () => {
    await writeVaultFile('media/normal.png', 'small-png');
    const { copied } = await copyAttachments(contentDir, 'media', staticRootDir);

    const normalised = copied.map(f => f.replace(/\\/g, '/'));
    expect(normalised).toContain('media/normal.png');
    const dest = await fs.readFile(path.join(staticRootDir, 'media', 'normal.png'), 'utf8');
    expect(dest).toBe('small-png');
  });
});
