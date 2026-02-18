import { describe, it, expect } from 'vitest';
import { resolveWikiLinks } from '../../scripts/utils/wiki-link-resolver.js';
import { createMockIndex } from '../helpers/mock-index.js';

const index = createMockIndex([
  { slug: 'recipes/fluffy-millet-quinoa-cake', title: 'Fluffy Millet Quinoa-Cake', url: '/recipes/fluffy-millet-quinoa-cake/' },
  { slug: 'recipes/cauliflower-stir-fry', title: 'Cauliflower Stir Fry', url: '/recipes/cauliflower-stir-fry/' },
  { slug: 'notes/cooking-tips', title: 'Cooking Tips', url: '/notes/cooking-tips/' },
]);

describe('resolveWikiLinks', () => {
  describe('basic resolution', () => {
    it('resolves a simple wiki link by title', () => {
      const result = resolveWikiLinks('See [[Fluffy Millet Quinoa-Cake]] for details.', index);
      expect(result.content).toBe('See [Fluffy Millet Quinoa-Cake](/recipes/fluffy-millet-quinoa-cake/) for details.');
      expect(result.resolved).toHaveLength(1);
    });

    it('resolves case-insensitively', () => {
      const result = resolveWikiLinks('[[fluffy millet quinoa-cake]]', index);
      expect(result.content).toContain('/recipes/fluffy-millet-quinoa-cake/');
      expect(result.resolved).toHaveLength(1);
    });

    it('resolves by filename when title has no match', () => {
      const result = resolveWikiLinks('[[cooking-tips]]', index);
      expect(result.content).toContain('/notes/cooking-tips/');
      expect(result.resolved).toHaveLength(1);
    });
  });

  describe('display text', () => {
    it('uses pipe display text', () => {
      const result = resolveWikiLinks('[[Cauliflower Stir Fry|this recipe]]', index);
      expect(result.content).toBe('[this recipe](/recipes/cauliflower-stir-fry/)');
    });
  });

  describe('heading anchors', () => {
    it('appends slugified heading anchor', () => {
      const result = resolveWikiLinks('[[Cooking Tips#My Heading]]', index);
      expect(result.content).toContain('/notes/cooking-tips/#my-heading');
    });

    it('handles heading + display text', () => {
      const result = resolveWikiLinks('[[Cooking Tips#My Heading|see tips]]', index);
      expect(result.content).toBe('[see tips](/notes/cooking-tips/#my-heading)');
    });

    it('uses target#heading as default display when no pipe text', () => {
      const result = resolveWikiLinks('[[Cooking Tips#My Heading]]', index);
      expect(result.content).toContain('[Cooking Tips#My Heading]');
    });
  });

  describe('broken links', () => {
    it('wraps unresolved links in broken-link span', () => {
      const result = resolveWikiLinks('[[Nonexistent Page]]', index);
      expect(result.content).toContain('<span class="broken-link"');
      expect(result.content).toContain('data-target="Nonexistent Page"');
      expect(result.content).toContain('Nonexistent Page</span>');
      expect(result.broken).toHaveLength(1);
      expect(result.broken[0].target).toBe('Nonexistent Page');
    });
  });

  describe('transclusions are skipped', () => {
    it('does not match ![[Page]] (transclusion syntax)', () => {
      const input = '![[Fluffy Millet Quinoa-Cake]]';
      const result = resolveWikiLinks(input, index);
      expect(result.content).toBe(input);
      expect(result.resolved).toHaveLength(0);
    });
  });

  describe('mixed content', () => {
    it('resolves multiple links and tracks stats', () => {
      const input = '[[Cauliflower Stir Fry]] and [[Nonexistent]] and [[Cooking Tips]]';
      const result = resolveWikiLinks(input, index);
      expect(result.resolved).toHaveLength(2);
      expect(result.broken).toHaveLength(1);
    });

    it('passes through content with no wiki links', () => {
      const input = '# Just a heading\n\nNo links here.';
      const result = resolveWikiLinks(input, index);
      expect(result.content).toBe(input);
      expect(result.resolved).toHaveLength(0);
      expect(result.broken).toHaveLength(0);
    });
  });
});
