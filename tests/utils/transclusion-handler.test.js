import { describe, it, expect } from 'vitest';
import { handleTransclusions } from '../../scripts/utils/transclusion-handler.js';

// Minimal mock fileIndex for tests
function makeIndex(pages = {}) {
  const titleLookup = {};
  const filenameLookup = {};
  for (const [slug, page] of Object.entries(pages)) {
    titleLookup[page.title.toLowerCase()] = slug;
    filenameLookup[slug.toLowerCase()] = slug;
    pages[slug] = { url: `/${slug}/`, fullSlug: slug, rawBody: page.rawBody, title: page.title, ...page };
  }
  return { pages, titleLookup, filenameLookup };
}

describe('handleTransclusions', () => {
  describe('no fileIndex — placeholder fallback (backward compat)', () => {
    it('converts page transclusion to placeholder', () => {
      const result = handleTransclusions('![[Base Dough Recipe]]');
      expect(result.content).toContain('<div class="transclusion-placeholder">');
      expect(result.content).toContain('Base Dough Recipe');
      expect(result.transclusions).toHaveLength(1);
      expect(result.transclusions[0].target).toBe('Base Dough Recipe');
    });

    it('handles pipe syntax (alias)', () => {
      const result = handleTransclusions('![[Spice Mix|Our special blend]]');
      expect(result.content).toContain('transclusion-placeholder');
      expect(result.transclusions).toHaveLength(1);
    });

    it('generates a fallback link in the placeholder', () => {
      const result = handleTransclusions('![[My Recipe Page]]');
      expect(result.content).toContain('href="/my-recipe-page/"');
    });
  });

  describe('with fileIndex — content expansion', () => {
    it('expands a resolved transclusion inline', () => {
      const index = makeIndex({
        'sauces': { title: 'Sauces', rawBody: 'All about sauces.' },
      });
      const result = handleTransclusions('Before\n\n![[Sauces]]\n\nAfter', index);
      expect(result.content).toContain('<div class="transclusion-embed"');
      expect(result.content).toContain('All about sauces.');
      expect(result.content).not.toContain('transclusion-placeholder');
    });

    it('falls back to placeholder when target not found', () => {
      const index = makeIndex({});
      const result = handleTransclusions('![[Unknown Page]]', index);
      expect(result.content).toContain('transclusion-placeholder');
    });

    it('bumps headings down one level in embedded content', () => {
      const index = makeIndex({
        'tips': { title: 'Tips', rawBody: '# Top Tip\n\nContent.\n\n## Sub Tip\n\nMore.' },
      });
      const result = handleTransclusions('![[Tips]]', index);
      expect(result.content).toContain('## Top Tip');
      expect(result.content).toContain('### Sub Tip');
      expect(result.content).not.toMatch(/(^|\n)# Top Tip/);
    });

    it('bumps H5 to H6 and leaves H6 unchanged', () => {
      const index = makeIndex({
        'deep': { title: 'Deep', rawBody: '##### Five\n\n###### Six\n' },
      });
      const result = handleTransclusions('![[Deep]]', index);
      expect(result.content).toContain('###### Five');
      expect(result.content).toContain('###### Six');
    });

    it('breaks transclusion cycles by emitting a link', () => {
      const index = makeIndex({
        'page-a': { title: 'Page A', rawBody: '![[Page B]]' },
        'page-b': { title: 'Page B', rawBody: '![[Page A]]' },
      });
      // Expand page-a (which embeds page-b, which tries to embed page-a again)
      const result = handleTransclusions('![[Page A]]', index, { sourceFile: null });
      // page-a's content should be expanded
      expect(result.content).toContain('transclusion-embed');
      // page-b's back-reference to page-a should be a link, not another embed
      expect(result.content).toContain('<a class="internal-link"');
      // No infinite recursion (test completing is the proof)
    });

    it('embeds full page when heading specifier present (slice not yet supported)', () => {
      const index = makeIndex({
        'guide': { title: 'Guide', rawBody: '## Intro\n\nHello.\n\n## Details\n\nMore.' },
      });
      const result = handleTransclusions('![[Guide#Details]]', index);
      // Should expand the full page, not just the Details section
      expect(result.content).toContain('transclusion-embed');
      expect(result.content).toContain('Hello.');
      expect(result.content).toContain('More.');
    });

    it('sets data-source attribute to the target page URL', () => {
      const index = makeIndex({
        'about': { title: 'About', rawBody: 'Hello.' },
      });
      const result = handleTransclusions('![[About]]', index);
      expect(result.content).toContain('data-source="/about/"');
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
      const result = handleTransclusions('[[Page Name]]');
      expect(result.content).toBe('[[Page Name]]');
      expect(result.transclusions).toHaveLength(0);
    });
  });

  describe('multiple transclusions', () => {
    it('expands multiple transclusions in the same content', () => {
      const index = makeIndex({
        'page-one': { title: 'Page One', rawBody: 'Content one.' },
        'page-two': { title: 'Page Two', rawBody: 'Content two.' },
      });
      const input = 'Before\n\n![[Page One]]\n\nMiddle\n\n![[Page Two]]\n\nAfter';
      const result = handleTransclusions(input, index);
      expect(result.transclusions).toHaveLength(2);
      expect(result.content).toContain('Content one.');
      expect(result.content).toContain('Content two.');
    });
  });
});
