import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { buildFileIndex, resolveLink } from '../../scripts/utils/file-index-builder.js';

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
      expect(index.pages['recipes/index']).toBeDefined();
      expect(index.pages['notes/index']).toBeDefined();
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
