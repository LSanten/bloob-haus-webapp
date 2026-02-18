import { describe, it, expect } from 'vitest';
import { resolveAttachments, extractFirstImage } from '../../scripts/utils/attachment-resolver.js';
import { createMockAttachmentIndex } from '../helpers/mock-index.js';

describe('resolveAttachments', () => {
  const index = createMockAttachmentIndex([
    { filename: 'image.jpg', path: '/media/image.jpg' },
    { filename: 'Pasted image 20250315.jpg', path: '/media/Pasted%20image%2020250315.jpg' },
    { filename: 'cleanshot@2x.png', path: '/media/cleanshot%402x.png' },
    { filename: 'photo with spaces.png', path: '/media/photo%20with%20spaces.png' },
  ]);

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

    it('converts unresolved wiki image to standard markdown', () => {
      const result = resolveAttachments('![[nonexistent.jpg]]', index);
      expect(result.content).toBe('![](nonexistent.jpg)');
      expect(result.broken).toHaveLength(1);
    });

    it('converts unresolved wiki image with alt to standard markdown', () => {
      const result = resolveAttachments('![[nonexistent.jpg|alt]]', index);
      expect(result.content).toBe('![alt](nonexistent.jpg)');
    });
  });

  describe('mixed content', () => {
    it('resolves multiple images and tracks both resolved and broken', () => {
      const input = '![](image.jpg)\n\n![](nonexistent.jpg)\n\n![[cleanshot@2x.png]]';
      const result = resolveAttachments(input, index);
      expect(result.resolved).toHaveLength(2);
      expect(result.broken).toHaveLength(1);
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

  it('returns null when no /media/ images exist', () => {
    expect(extractFirstImage('![alt](external.jpg)')).toBeNull();
  });

  it('returns null for empty content', () => {
    expect(extractFirstImage('')).toBeNull();
  });
});
