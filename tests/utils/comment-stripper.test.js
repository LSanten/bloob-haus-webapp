import { describe, it, expect } from 'vitest';
import { stripComments } from '../../scripts/utils/comment-stripper.js';

describe('stripComments', () => {
  it('removes inline Obsidian comments', () => {
    expect(stripComments('before %% comment %% after')).toBe('before  after');
  });

  it('removes multiline Obsidian comments', () => {
    const input = 'before\n%% line1\nline2 %%\nafter';
    const result = stripComments(input);
    expect(result).toBe('before\n\nafter');
  });

  it('removes HTML comments', () => {
    expect(stripComments('before <!-- comment --> after')).toBe('before  after');
  });

  it('removes multiline HTML comments', () => {
    const input = 'before\n<!-- line1\nline2 -->\nafter';
    const result = stripComments(input);
    expect(result).toBe('before\n\nafter');
  });

  it('collapses triple+ newlines to double newlines', () => {
    const input = 'before\n%%\nremoved\n%%\n\n\nafter';
    const result = stripComments(input);
    expect(result).not.toMatch(/\n\n\n/);
  });

  it('passes through content with no comments', () => {
    expect(stripComments('hello world')).toBe('hello world');
  });

  it('handles empty string', () => {
    expect(stripComments('')).toBe('');
  });

  it('removes multiple Obsidian comments in one line', () => {
    expect(stripComments('a %% b %% c %% d %% e')).toBe('a  c  e');
  });

  it('removes mixed Obsidian and HTML comments', () => {
    const input = 'start %% obs %% middle <!-- html --> end';
    const result = stripComments(input);
    expect(result).toBe('start  middle  end');
  });

  it('handles comment at start of content', () => {
    expect(stripComments('%% removed %%visible')).toBe('visible');
  });

  it('handles comment at end of content', () => {
    expect(stripComments('visible%% removed %%')).toBe('visible');
  });
});
