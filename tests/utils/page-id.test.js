import { describe, it, expect } from 'vitest';
import { derivePageId } from '../../scripts/utils/page-id.js';

describe('derivePageId', () => {
  it('builds host + path, lowercased, no trailing slash', () => {
    expect(derivePageId('https://leons.bloob.haus', '/marbles/My-Note/'))
      .toBe('leons.bloob.haus/marbles/my-note');
  });

  it('handles already-lowercase slugify sites', () => {
    expect(derivePageId('https://melt.bloob.haus', '/about-melt/'))
      .toBe('melt.bloob.haus/about-melt');
  });

  it('reduces the homepage to just the host', () => {
    expect(derivePageId('https://buffbaby.bloob.haus', '/'))
      .toBe('buffbaby.bloob.haus');
  });

  it('includes nested folder segments (mount_path or folders)', () => {
    expect(derivePageId('https://leons.bloob.haus', '/marbles/sub/Deep-Note/'))
      .toBe('leons.bloob.haus/marbles/sub/deep-note');
  });

  it('works with custom domains', () => {
    expect(derivePageId('https://alterengineers.com', '/Projects/Library/'))
      .toBe('alterengineers.com/projects/library');
  });

  it('is robust to a bare host (no scheme) and missing path', () => {
    expect(derivePageId('leons.bloob.haus', '/x/')).toBe('leons.bloob.haus/x');
    expect(derivePageId('https://melt.bloob.haus', undefined)).toBe('melt.bloob.haus');
  });
});
