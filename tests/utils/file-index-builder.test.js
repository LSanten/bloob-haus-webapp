import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { buildFileIndex, resolveLink, buildAttachmentIndex } from '../../scripts/utils/file-index-builder.js';

describe('buildFileIndex', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'file-index-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  function makeFile(relativePath, content) {
    const fullPath = path.join(tmpDir, relativePath);
    return { path: fullPath, relativePath, content };
  }

  async function writeAndIndex(files) {
    const publishedFiles = [];
    for (const f of files) {
      await fs.ensureDir(path.dirname(f.path));
      await fs.writeFile(f.path, f.content);
      publishedFiles.push({ path: f.path, relativePath: f.relativePath });
    }
    return buildFileIndex(publishedFiles, tmpDir);
  }

  // --- URL generation ---

  describe('URL generation', () => {
    it('generates folder-based URLs from filenames', async () => {
      const index = await writeAndIndex([
        makeFile('recipes/Challah.md', '---\ntitle: Challah Bread\n---\n# Challah Bread'),
      ]);
      const page = Object.values(index.pages)[0];
      expect(page.url).toBe('/recipes/challah/');
    });

    it('slugifies folder names with spaces', async () => {
      const index = await writeAndIndex([
        makeFile('lists of favorites/Best Books.md', '---\n---\n# Best Books'),
      ]);
      const page = Object.values(index.pages)[0];
      expect(page.url).toBe('/lists-of-favorites/best-books/');
    });

    it('generates root URLs for files without folders', async () => {
      const index = await writeAndIndex([
        makeFile('About.md', '---\n---\n# About'),
      ]);
      const page = Object.values(index.pages)[0];
      expect(page.url).toBe('/about/');
    });
  });

  // --- Title extraction ---

  describe('title extraction', () => {
    it('uses frontmatter title first', async () => {
      const index = await writeAndIndex([
        makeFile('recipes/cake.md', '---\ntitle: Chocolate Cake\n---\n# Different Heading'),
      ]);
      const page = Object.values(index.pages)[0];
      expect(page.title).toBe('Chocolate Cake');
    });

    it('falls back to first heading', async () => {
      const index = await writeAndIndex([
        makeFile('recipes/cake.md', '---\n---\n# My Cake Recipe'),
      ]);
      const page = Object.values(index.pages)[0];
      expect(page.title).toBe('My Cake Recipe');
    });

    it('falls back to filename when no title or heading', async () => {
      const index = await writeAndIndex([
        makeFile('recipes/cake.md', '---\n---\nJust content'),
      ]);
      const page = Object.values(index.pages)[0];
      expect(page.title).toBe('cake');
    });
  });

  // --- Slug generation ---

  describe('slug generation', () => {
    it('generates lowercase slugs from filenames', async () => {
      const index = await writeAndIndex([
        makeFile('recipes/Chocolate Cake.md', '---\n---\n# Chocolate Cake'),
      ]);
      const page = Object.values(index.pages)[0];
      expect(page.slug).toBe('chocolate-cake');
    });

    it('removes special characters from slugs', async () => {
      const index = await writeAndIndex([
        makeFile("recipes/Mom's Recipe.md", '---\n---\n# Mom\'s Recipe'),
      ]);
      const page = Object.values(index.pages)[0];
      expect(page.slug).toBe('moms-recipe');
    });

    it('collapses multiple hyphens', async () => {
      const index = await writeAndIndex([
        makeFile('recipes/My - - Recipe.md', '---\n---\n# Recipe'),
      ]);
      const page = Object.values(index.pages)[0];
      expect(page.slug).toBe('my-recipe');
    });
  });

  // --- Duplicate handling ---

  describe('duplicate filenames in different folders', () => {
    it('handles same filename in different folders', async () => {
      const index = await writeAndIndex([
        makeFile('recipes/index.md', '---\n---\n# Recipes'),
        makeFile('notes/index.md', '---\n---\n# Notes'),
      ]);
      expect(Object.keys(index.pages)).toHaveLength(2);
      // Folder index files use the folder name as their fullSlug key, not "folder/index"
      expect(index.pages['recipes']).toBeDefined();
      expect(index.pages['notes']).toBeDefined();
    });
  });

  // --- _index.md support ---

  describe('_index.md treated identically to index.md', () => {
    it('_index.md gets folder URL, not /_index/', async () => {
      const index = await writeAndIndex([
        makeFile('projects/_index.md', '---\n---\n# Our Projects'),
      ]);
      const page = Object.values(index.pages)[0];
      expect(page.url).toBe('/projects/');
    });

    it('_index.md slug is folder name, not "_index"', async () => {
      const index = await writeAndIndex([
        makeFile('projects/_index.md', '---\n---\n# Our Projects'),
      ]);
      const page = Object.values(index.pages)[0];
      expect(page.slug).toBe('projects');
    });

    it('_index.md uses prettified folder name as title fallback', async () => {
      const index = await writeAndIndex([
        makeFile('my-projects/_index.md', '---\n---\n'),
      ]);
      const page = Object.values(index.pages)[0];
      expect(page.title).toBe('My Projects');
    });

    it('_index.md fullSlug key is folder path, same as index.md', async () => {
      const index = await writeAndIndex([
        makeFile('projects/_index.md', '---\n---\n# Projects'),
      ]);
      expect(index.pages['projects']).toBeDefined();
    });
  });
});

describe('resolveLink', () => {
  let tmpDir;
  let index;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'resolve-link-'));

    const files = [
      { relativePath: 'recipes/Challah.md', content: '---\ntitle: Challah Bread\n---\n# Challah Bread' },
      { relativePath: 'notes/Cooking Tips.md', content: '---\n---\n# Cooking Tips' },
    ];

    const publishedFiles = [];
    for (const f of files) {
      const fullPath = path.join(tmpDir, f.relativePath);
      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, f.content);
      publishedFiles.push({ path: fullPath, relativePath: f.relativePath });
    }
    index = await buildFileIndex(publishedFiles, tmpDir);
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('resolves by title', () => {
    const result = resolveLink('Challah Bread', index);
    expect(result.found).toBe(true);
    expect(result.url).toBe('/recipes/challah/');
  });

  it('resolves by filename (case-insensitive)', () => {
    const result = resolveLink('challah', index);
    expect(result.found).toBe(true);
    expect(result.url).toBe('/recipes/challah/');
  });

  it('resolves by filename with .md extension', () => {
    const result = resolveLink('Challah.md', index);
    expect(result.found).toBe(true);
    expect(result.url).toBe('/recipes/challah/');
  });

  it('resolves filenames with spaces', () => {
    const result = resolveLink('Cooking Tips', index);
    expect(result.found).toBe(true);
    expect(result.url).toBe('/notes/cooking-tips/');
  });

  it('returns not found for nonexistent targets', () => {
    const result = resolveLink('Nonexistent Page', index);
    expect(result.found).toBe(false);
    expect(result.url).toBeNull();
  });

  it('is case-insensitive for title lookup', () => {
    const result = resolveLink('challah bread', index);
    expect(result.found).toBe(true);
  });
});

describe('folder-index link resolution (_index and index spellings)', () => {
  let tmpDir;
  let index;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'folder-index-'));
    // One folder index on disk as _index.md (Obsidian), one as index.md (Jekyll).
    const files = [
      { relativePath: 'Resources/_index.md', content: '---\n---\n# Resources' },
      { relativePath: 'Playlists/index.md', content: '---\n---\n# Playlists' },
    ];
    const publishedFiles = [];
    for (const f of files) {
      const fullPath = path.join(tmpDir, f.relativePath);
      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, f.content);
      publishedFiles.push({ path: fullPath, relativePath: f.relativePath });
    }
    index = await buildFileIndex(publishedFiles, tmpDir);
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('resolves a folder link written with the _index.md spelling', () => {
    const result = resolveLink('Resources/_index.md', index);
    expect(result.found).toBe(true);
    expect(result.url).toBe('/resources/');
  });

  it('resolves a folder link written with the index.md spelling', () => {
    const result = resolveLink('Playlists/index.md', index);
    expect(result.found).toBe(true);
    expect(result.url).toBe('/playlists/');
  });

  it('resolves either spelling regardless of the on-disk index filename', () => {
    // Link spelling should not have to match the on-disk file: both index.md and
    // _index.md alias to the same folder page.
    expect(resolveLink('Resources/index.md', index).url).toBe('/resources/');
    expect(resolveLink('Playlists/_index.md', index).url).toBe('/playlists/');
  });
});

describe('buildAttachmentIndex', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'attach-index-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  async function makeVaultFiles(files) {
    for (const [relPath, content] of Object.entries(files)) {
      const full = path.join(tmpDir, relPath);
      await fs.ensureDir(path.dirname(full));
      await fs.writeFile(full, content);
    }
  }

  it('returns { byBasename, byVaultPath } shape', async () => {
    await makeVaultFiles({ 'media/logo.png': '' });
    const idx = await buildAttachmentIndex(tmpDir, 'media');
    expect(idx).toHaveProperty('byBasename');
    expect(idx).toHaveProperty('byVaultPath');
  });

  it('preserves vault structure in URLs', async () => {
    await makeVaultFiles({
      'media/logo.png': '',
      'projects/diagram.html': '',
    });
    const { byVaultPath } = await buildAttachmentIndex(tmpDir, 'media');
    expect(byVaultPath['media/logo.png']).toBe('/media/logo.png');
    expect(byVaultPath['projects/diagram.html']).toBe('/projects/diagram.html');
  });

  it('byBasename maps filename to vault-structure URL', async () => {
    await makeVaultFiles({ 'projects/diagram.html': '' });
    const { byBasename } = await buildAttachmentIndex(tmpDir, 'media');
    expect(byBasename['diagram.html']).toBe('/projects/diagram.html');
  });

  it('encodes spaces and special characters in URLs', async () => {
    await makeVaultFiles({ 'media/My Photo.jpg': '' });
    const { byVaultPath, byBasename } = await buildAttachmentIndex(tmpDir, 'media');
    expect(byVaultPath['media/My Photo.jpg']).toBe('/media/My%20Photo.jpg');
    expect(byBasename['My Photo.jpg']).toBe('/media/My%20Photo.jpg');
  });

  it('provides case-insensitive byBasename lookup', async () => {
    await makeVaultFiles({ 'media/Logo.PNG': '' });
    const { byBasename } = await buildAttachmentIndex(tmpDir, 'media');
    expect(byBasename['logo.png']).toBe('/media/Logo.PNG');
  });

  it('prefers attachment-folder file on basename collision', async () => {
    await makeVaultFiles({
      'notes/logo.png': '',   // not in attachment folder
      'media/logo.png': '',   // in attachment folder — should win
    });
    const { byBasename } = await buildAttachmentIndex(tmpDir, 'media');
    expect(byBasename['logo.png']).toBe('/media/logo.png');
  });

  it('byVaultPath has no collision — both files indexed separately', async () => {
    await makeVaultFiles({
      'notes/logo.png': '',
      'media/logo.png': '',
    });
    const { byVaultPath } = await buildAttachmentIndex(tmpDir, 'media');
    expect(byVaultPath['notes/logo.png']).toBe('/notes/logo.png');
    expect(byVaultPath['media/logo.png']).toBe('/media/logo.png');
  });

  it('handles same-folder attachment mode without crashing', async () => {
    await makeVaultFiles({ 'media/image.jpg': '' });
    // "." means same-folder — no preferred prefix, just last-write-wins
    const idx = await buildAttachmentIndex(tmpDir, '.');
    expect(idx.byBasename['image.jpg']).toBe('/media/image.jpg');
  });
});
