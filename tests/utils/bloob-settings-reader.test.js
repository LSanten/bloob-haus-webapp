import { describe, it, expect } from 'vitest';
import { parseEmbedFences, EMBED_TARGETS } from '../../scripts/utils/bloob-settings-reader.js';

describe('parseEmbedFences', () => {
  it('returns an empty object for empty/null input', () => {
    expect(parseEmbedFences('')).toEqual({});
    expect(parseEmbedFences(null)).toEqual({});
    expect(parseEmbedFences(undefined)).toEqual({});
  });

  it('extracts a single named fence with its raw content', () => {
    const body = [
      '# Settings',
      '',
      '```goat-counter-tracking',
      '<script data-goatcounter="https://melt.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>',
      '```',
    ].join('\n');

    expect(parseEmbedFences(body)).toEqual({
      'goat-counter-tracking':
        '<script data-goatcounter="https://melt.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>',
    });
  });

  it('skips empty fences (empty fence = feature off)', () => {
    const body = [
      '```fast-comments-embed',
      '',
      '',
      '```',
      '```goat-counter-tracking',
      '<script src="//gc.zgo.at/count.js"></script>',
      '```',
    ].join('\n');

    const result = parseEmbedFences(body);
    expect(result['fast-comments-embed']).toBeUndefined();
    expect(result['goat-counter-tracking']).toBe('<script src="//gc.zgo.at/count.js"></script>');
  });

  it('extracts multiple fences and preserves multi-line content', () => {
    const body = [
      '```header-snippet',
      '<link rel="stylesheet" href="/custom.css">',
      '```',
      '',
      '```fast-comments-embed',
      '<div id="fastcomments-widget"></div>',
      '<script>',
      '  FastCommentsUI(el, { tenantId: "abc", urlId: "{{ page_id }}" });',
      '</script>',
      '```',
    ].join('\n');

    const result = parseEmbedFences(body);
    expect(result['header-snippet']).toBe('<link rel="stylesheet" href="/custom.css">');
    expect(result['fast-comments-embed']).toContain('<div id="fastcomments-widget"></div>');
    expect(result['fast-comments-embed']).toContain('urlId: "{{ page_id }}"');
    expect(result['fast-comments-embed'].split('\n')).toHaveLength(4);
  });

  it('ignores unnamed fences (bare ```)', () => {
    const body = ['```', 'plain code block', '```'].join('\n');
    expect(parseEmbedFences(body)).toEqual({});
  });

  it('handles CRLF line endings', () => {
    const body = '```header-snippet\r\n<meta name="x" content="y">\r\n```';
    expect(parseEmbedFences(body)).toEqual({
      'header-snippet': '<meta name="x" content="y">',
    });
  });
});

describe('EMBED_TARGETS', () => {
  it('routes goatcounter + header-snippet to head, footer to bodyEnd', () => {
    expect(EMBED_TARGETS['goat-counter-tracking']).toBe('head');
    expect(EMBED_TARGETS['header-snippet']).toBe('head');
    expect(EMBED_TARGETS['footer-snippet']).toBe('bodyEnd');
    expect(EMBED_TARGETS['embed-endofbody']).toBe('bodyEnd');
  });

  it('does NOT auto-inject fast-comments-embed (placed by page layout)', () => {
    expect(EMBED_TARGETS['fast-comments-embed']).toBeUndefined();
  });
});
