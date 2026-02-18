import { describe, it, expect } from 'vitest';
import { resolveMarkdownLinks } from '../../scripts/utils/markdown-link-resolver.js';
import { createMockIndex } from '../helpers/mock-index.js';

const index = createMockIndex([
  { slug: 'recipes/cauliflower-stir-fry', title: 'Cauliflower Stir Fry', url: '/recipes/cauliflower-stir-fry/' },
  { slug: 'recipes/broccoli-stir-fry', title: 'Broccoli Stir Fry', url: '/recipes/broccoli-stir-fry/' },
  { slug: 'notes/cooking-tips', title: 'Cooking Tips', url: '/notes/cooking-tips/' },
]);

describe('resolveMarkdownLinks', () => {
  describe('basic resolution', () => {
    it('resolves a link to a .md file', () => {
      const result = resolveMarkdownLinks('[recipe](Cauliflower Stir Fry.md)', index);
      expect(result.content).toBe('[recipe](/recipes/cauliflower-stir-fry/)');
      expect(result.resolved).toHaveLength(1);
    });

    it('strips folder path and resolves by filename', () => {
      const result = resolveMarkdownLinks('[text](folder/Broccoli Stir Fry.md)', index);
      expect(result.content).toBe('[text](/recipes/broccoli-stir-fry/)');
    });

    it('decodes URL-encoded paths for lookup', () => {
      const result = resolveMarkdownLinks('[text](Cauliflower%20Stir%20Fry.md)', index);
      expect(result.content).toBe('[text](/recipes/cauliflower-stir-fry/)');
    });
  });

  describe('heading anchors', () => {
    it('preserves and slugifies heading anchors', () => {
      const result = resolveMarkdownLinks('[tips](Cooking Tips.md#My Section)', index);
      expect(result.content).toBe('[tips](/notes/cooking-tips/#my-section)');
    });
  });

  describe('broken links', () => {
    it('wraps unresolved .md links in broken-link span', () => {
      const result = resolveMarkdownLinks('[text](Nonexistent.md)', index);
      expect(result.content).toContain('<span class="broken-link"');
      expect(result.content).toContain('text</span>');
      expect(result.broken).toHaveLength(1);
    });
  });

  describe('non-.md links are untouched', () => {
    it('leaves external URLs alone', () => {
      const input = '[google](https://example.com)';
      const result = resolveMarkdownLinks(input, index);
      expect(result.content).toBe(input);
      expect(result.resolved).toHaveLength(0);
      expect(result.broken).toHaveLength(0);
    });

    it('leaves anchor-only links alone', () => {
      const input = '[section](#heading)';
      const result = resolveMarkdownLinks(input, index);
      expect(result.content).toBe(input);
    });
  });

  describe('multiple links', () => {
    it('resolves several links in the same content', () => {
      const input = '[a](Cauliflower Stir Fry.md) and [b](Broccoli Stir Fry.md) and [c](Nonexistent.md)';
      const result = resolveMarkdownLinks(input, index);
      expect(result.resolved).toHaveLength(2);
      expect(result.broken).toHaveLength(1);
    });

    it('passes through content with no .md links', () => {
      const input = '# Heading\n\nJust text.';
      const result = resolveMarkdownLinks(input, index);
      expect(result.content).toBe(input);
    });
  });
});
