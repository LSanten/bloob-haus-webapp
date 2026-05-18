import { describe, it, expect } from 'vitest';
import { stripLeadingTitleHeading } from '../../scripts/utils/title-deduplicator.js';

describe('stripLeadingTitleHeading', () => {
  describe('strips matching H1', () => {
    it('removes H1 when it exactly matches the page title', () => {
      const input = '# Our vision\n\nSome content here.';
      const result = stripLeadingTitleHeading(input, 'Our vision');
      expect(result).toBe('Some content here.');
    });

    it('removes the following blank line along with the H1', () => {
      const input = '# Our vision\n\nParagraph one.\n\nParagraph two.';
      const result = stripLeadingTitleHeading(input, 'Our vision');
      expect(result).toBe('Paragraph one.\n\nParagraph two.');
    });

    it('removes H1 with no blank line after it', () => {
      const input = '# Our vision\nParagraph immediately after.';
      const result = stripLeadingTitleHeading(input, 'Our vision');
      expect(result).toBe('Paragraph immediately after.');
    });

    it('matches case-insensitively', () => {
      const result = stripLeadingTitleHeading('# OUR VISION\n\nContent.', 'our vision');
      expect(result).toBe('Content.');
    });

    it('strips inline bold formatting before comparing', () => {
      const result = stripLeadingTitleHeading('# Hello **world**\n\nContent.', 'Hello world');
      expect(result).toBe('Content.');
    });

    it('strips inline italic formatting before comparing', () => {
      const result = stripLeadingTitleHeading('# Hello *world*\n\nContent.', 'Hello world');
      expect(result).toBe('Content.');
    });

    it('strips inline code before comparing', () => {
      const result = stripLeadingTitleHeading('# Hello `world`\n\nContent.', 'Hello world');
      expect(result).toBe('Content.');
    });

    it('strips inline link text before comparing', () => {
      const result = stripLeadingTitleHeading('# [Our vision](https://example.com)\n\nContent.', 'Our vision');
      expect(result).toBe('Content.');
    });

    it('ignores Eleventy anchor ID syntax in the heading', () => {
      const result = stripLeadingTitleHeading('# Our vision {#our-vision}\n\nContent.', 'Our vision');
      expect(result).toBe('Content.');
    });

    it('handles leading whitespace before the H1', () => {
      const result = stripLeadingTitleHeading('\n# Our vision\n\nContent.', 'Our vision');
      expect(result).toBe('Content.');
    });
  });

  describe('does not strip when there is no match', () => {
    it('leaves content unchanged when H1 text differs from title', () => {
      const input = '# Different Heading\n\nContent.';
      const result = stripLeadingTitleHeading(input, 'Our vision');
      expect(result).toBe(input);
    });

    it('does not strip H2 even when it matches the title', () => {
      const input = '## Our vision\n\nContent.';
      const result = stripLeadingTitleHeading(input, 'Our vision');
      expect(result).toBe(input);
    });

    it('does not strip H3 or deeper', () => {
      const input = '### Our vision\n\nContent.';
      const result = stripLeadingTitleHeading(input, 'Our vision');
      expect(result).toBe(input);
    });

    it('leaves content unchanged when there is no leading heading', () => {
      const input = 'Just a paragraph.\n\n## Section';
      const result = stripLeadingTitleHeading(input, 'Our vision');
      expect(result).toBe(input);
    });

    it('does not strip a matching H1 that appears mid-document', () => {
      const input = 'Intro paragraph.\n\n# Our vision\n\nContent.';
      const result = stripLeadingTitleHeading(input, 'Our vision');
      expect(result).toBe(input);
    });
  });

  describe('edge cases', () => {
    it('returns original content when pageTitle is empty', () => {
      const input = '# Our vision\n\nContent.';
      expect(stripLeadingTitleHeading(input, '')).toBe(input);
    });

    it('returns original content when content is empty', () => {
      expect(stripLeadingTitleHeading('', 'Our vision')).toBe('');
    });

    it('returns original content when content is null/undefined', () => {
      expect(stripLeadingTitleHeading(null, 'Our vision')).toBe(null);
      expect(stripLeadingTitleHeading(undefined, 'Our vision')).toBe(undefined);
    });

    it('handles a title that is the entire content', () => {
      const result = stripLeadingTitleHeading('# Our vision\n', 'Our vision');
      expect(result).toBe('');
    });
  });
});
