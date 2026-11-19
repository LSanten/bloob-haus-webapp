// features.referenced_attachments_only — an attachment reaches the site only when
// something being published names it. Regression for: in allowlist mode, every image,
// PDF and video in the vault was copied to the site, including ones that only private
// notes use (reachable by URL, and Obsidian's "Pasted image <timestamp>.png" names are
// guessable).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import {
  copyAttachments,
  selectReferencedAttachments,
} from '../../scripts/utils/attachment-resolver.js';

const norm = (list) => list.map((f) => f.replace(/\\/g, '/'));

describe('selectReferencedAttachments', () => {
  const files = [
    'media/Pasted image 20260623230906.png',
    'media/Gas Prices Near Post Office.png',
    'media/logo.png',
    'docs/syllabus.pdf',
    'clips/walk.mp4',
  ];

  it('keeps a file a published page links to by its encoded URL', () => {
    const corpus = '![](/media/Pasted%20image%2020260623230906.png)';
    expect(selectReferencedAttachments(files, corpus)).toEqual([
      'media/Pasted image 20260623230906.png',
    ]);
  });

  it('withholds a file that no published page names (the leak)', () => {
    const corpus = '# A published note\n\nNo pictures here.';
    expect(selectReferencedAttachments(files, corpus)).toEqual([]);
  });

  it('matches the plain filename too (frontmatter, settings, unresolved raw refs)', () => {
    const corpus = 'logo: "[[logo.png]]"\nimage: syllabus.pdf';
    expect(selectReferencedAttachments(files, corpus)).toEqual([
      'media/logo.png',
      'docs/syllabus.pdf',
    ]);
  });

  it('ignores case, as the attachment index does', () => {
    const corpus = '<video src="/clips/WALK.mp4">';
    expect(selectReferencedAttachments(files, corpus)).toEqual(['clips/walk.mp4']);
  });

  it('keeps a picture that a kept HTML attachment uses itself', () => {
    const all = ['projects/map.html', 'projects/tiles.png', 'media/private.png'];
    const corpus = '<iframe src="/projects/map.html"></iframe>';
    const readText = (f) => (f === 'projects/map.html' ? '<img src="tiles.png">' : '');
    expect(selectReferencedAttachments(all, corpus, { readText })).toEqual([
      'projects/map.html',
      'projects/tiles.png',
    ]);
  });

  it('does not follow an HTML attachment that nothing published uses', () => {
    const all = ['private/map.html', 'private/tiles.png'];
    const readText = () => '<img src="tiles.png">';
    expect(selectReferencedAttachments(all, 'nothing', { readText })).toEqual([]);
  });

  it('handles Windows-style separators', () => {
    const corpus = '![](/media/logo.png)';
    expect(selectReferencedAttachments(['media\\logo.png'], corpus)).toEqual(['media\\logo.png']);
  });
});

describe('copyAttachments with a select filter', () => {
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

  async function writeVaultFile(relPath, content = 'x') {
    const full = path.join(contentDir, relPath);
    await fs.ensureDir(path.dirname(full));
    await fs.writeFile(full, content);
  }

  it('copies only the selected files and reports the rest as withheld', async () => {
    await writeVaultFile('media/public.png');
    await writeVaultFile('media/private.png');

    const select = (files) => files.filter((f) => f.includes('public'));
    const { copied, withheld } = await copyAttachments(contentDir, 'media', staticRootDir, { select });

    expect(norm(copied)).toEqual(['media/public.png']);
    expect(norm(withheld)).toEqual(['media/private.png']);
    expect(await fs.pathExists(path.join(staticRootDir, 'media/public.png'))).toBe(true);
    expect(await fs.pathExists(path.join(staticRootDir, 'media/private.png'))).toBe(false);
  });

  it('removes a withheld file a previous build left behind (videos survive the stale clean)', async () => {
    await writeVaultFile('clips/private.mp4');
    await fs.outputFile(path.join(staticRootDir, 'clips/private.mp4'), 'old copy');

    await copyAttachments(contentDir, 'media', staticRootDir, { select: () => [] });

    expect(await fs.pathExists(path.join(staticRootDir, 'clips/private.mp4'))).toBe(false);
  });

  it('without select, copies everything as before (default unchanged)', async () => {
    await writeVaultFile('media/a.png');
    await writeVaultFile('media/b.png');
    const { copied, withheld } = await copyAttachments(contentDir, 'media', staticRootDir);
    expect(copied).toHaveLength(2);
    expect(withheld).toEqual([]);
  });
});
