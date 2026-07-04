import { describe, it, expect } from 'vitest';
import computed from '../../lib/eleventyComputed.js';

const bloobPageId = computed.bloobPageId;

describe('eleventyComputed.bloobPageId', () => {
  it('derives lowercased host + path when no override', () => {
    expect(bloobPageId({ site: { url: 'https://leons.bloob.haus' }, page: { url: '/marbles/My-Note/' } }))
      .toBe('leons.bloob.haus/marbles/my-note');
  });

  it('honors a bloob-page-id frontmatter override (lowercased, trimmed)', () => {
    expect(bloobPageId({
      'bloob-page-id': 'leons.bloob.haus/marbles/OLD-Location',
      site: { url: 'https://leons.bloob.haus' },
      page: { url: '/marbles/new-location/' },
    })).toBe('leons.bloob.haus/marbles/old-location');
  });

  it('override wins over the derived URL so moved notes keep their thread', () => {
    const moved = bloobPageId({
      'bloob-page-id': 'melt.bloob.haus/resources/old-slug',
      site: { url: 'https://melt.bloob.haus' },
      page: { url: '/articles/new-slug/' },
    });
    expect(moved).toBe('melt.bloob.haus/resources/old-slug');
  });
});
