import { describe, it, expect } from 'vitest';
import { handleTransclusions } from '../../scripts/utils/transclusion-handler.js';

describe('handleTransclusions', () => {
  describe('page transclusions', () => {
    it('converts page transclusion to placeholder', () => {
      const result = handleTransclusions('![[Base Dough Recipe]]');
      expect(result.content).toContain('<div class="transclusion-placeholder">');
      expect(result.content).toContain('Base Dough Recipe');
      expect(result.transclusions).toHaveLength(1);
      expect(result.transclusions[0].target).toBe('Base Dough Recipe');
    });

    it('handles transclusion with alt text (pipe syntax)', () => {
      const result = handleTransclusions('![[Spice Mix|Our special blend]]');
      expect(result.content).toContain('transclusion-placeholder');
      expect(result.content).toContain('Spice Mix');
      expect(result.transclusions).toHaveLength(1);
    });

    it('generates a link in the placeholder', () => {
      const result = handleTransclusions('![[My Recipe Page]]');
      expect(result.content).toContain('<a href="/my-recipe-page/">');
    });
  });

  describe('media files are left untouched', () => {
    const mediaExtensions = [
      'photo.jpg', 'photo.jpeg', 'screenshot.png', 'anim.gif',
      'image.webp', 'icon.svg', 'document.pdf', 'video.mp4',
      'clip.webm', 'page.html',
    ];

    for (const filename of mediaExtensions) {
      it(`leaves ![[${filename}]] untouched`, () => {
        const input = `![[${filename}]]`;
        const result = handleTransclusions(input);
        expect(result.content).toBe(input);
        expect(result.transclusions).toHaveLength(0);
      });
    }

    it('is case-insensitive for media detection', () => {
      const input = '![[Photo.JPG]]';
      const result = handleTransclusions(input);
      expect(result.content).toBe(input);
      expect(result.transclusions).toHaveLength(0);
    });
  });

  describe('no transclusions', () => {
    it('passes through plain text unchanged', () => {
      const input = '# Hello\n\nJust some text.';
      const result = handleTransclusions(input);
      expect(result.content).toBe(input);
      expect(result.transclusions).toHaveLength(0);
    });

    it('does not match regular wiki links [[Page]]', () => {
      const input = '[[Page Name]]';
      const result = handleTransclusions(input);
      expect(result.content).toBe(input);
      expect(result.transclusions).toHaveLength(0);
    });
  });

  describe('multiple transclusions', () => {
    it('converts multiple transclusions in same content', () => {
      const input = 'Before\n\n![[Page One]]\n\nMiddle\n\n![[Page Two]]\n\nAfter';
      const result = handleTransclusions(input);
      expect(result.transclusions).toHaveLength(2);
      expect(result.content).not.toContain('![[Page One]]');
      expect(result.content).not.toContain('![[Page Two]]');
    });
  });
});
