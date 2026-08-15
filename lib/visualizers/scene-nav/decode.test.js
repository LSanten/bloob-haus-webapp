import { describe, it, expect } from 'vitest';
import { safeDecode, encodeRef, encodeGotoRaw } from './decode.js';

describe('safeDecode', () => {
  it('decodes valid percent-escapes', () => {
    expect(safeDecode('Sign%20up.png')).toBe('Sign up.png');
  });

  it('returns the input verbatim when the escape is malformed', () => {
    expect(safeDecode('50% off flyer.png')).toBe('50% off flyer.png');
  });

  it('leaves a string with no escapes untouched', () => {
    expect(safeDecode('Contact us.png')).toBe('Contact us.png');
  });

  it('never throws on a lone trailing percent', () => {
    expect(() => safeDecode('weird%')).not.toThrow();
    expect(safeDecode('weird%')).toBe('weird%');
  });
});

describe('encodeRef', () => {
  it('encodes spaces in a bare filename', () => {
    expect(encodeRef('Contact us.png')).toBe('Contact%20us.png');
  });

  it('encodes each path segment but keeps the separators', () => {
    expect(encodeRef('media/menu-images/Sign up for the next MELT.png'))
      .toBe('media/menu-images/Sign%20up%20for%20the%20next%20MELT.png');
  });

  it('leaves an already-safe ref untouched', () => {
    expect(encodeRef('media/Resources.png')).toBe('media/Resources.png');
  });

  it('leaves absolute URLs alone', () => {
    expect(encodeRef('https://example.com/a b.png')).toBe('https://example.com/a b.png');
    expect(encodeRef('//cdn.example.com/a b.png')).toBe('//cdn.example.com/a b.png');
  });

  it('leaves data URIs alone', () => {
    expect(encodeRef('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
  });

  it('encodes a literal percent so the result round-trips', () => {
    expect(encodeRef('50% off flyer.png')).toBe('50%25%20off%20flyer.png');
    expect(safeDecode(encodeRef('50% off flyer.png'))).toBe('50% off flyer.png');
  });
});

describe('encodeGotoRaw', () => {
  it('encodes spaces in a markdown-link target', () => {
    expect(encodeGotoRaw('[an evening](an evening with melt.md)'))
      .toBe('[an evening](an%20evening%20with%20melt.md)');
  });

  it('leaves the label untouched — only the target is encoded', () => {
    expect(encodeGotoRaw('[Sign up for the next melt](melt page.md)'))
      .toBe('[Sign up for the next melt](melt%20page.md)');
  });

  it('never re-encodes a wiki-link', () => {
    expect(encodeGotoRaw('[[an evening with melt]]'))
      .toBe('[[an evening with melt]]');
  });

  it('leaves an absolute URL alone', () => {
    expect(encodeGotoRaw('[Sign up](https://bit.ly/bodyworkjam)'))
      .toBe('[Sign up](https://bit.ly/bodyworkjam)');
  });

  it('leaves an anchor and a bare value alone', () => {
    expect(encodeGotoRaw('#our-philosophy')).toBe('#our-philosophy');
    expect(encodeGotoRaw('contact-us.md')).toBe('contact-us.md');
  });

  it('does not double-encode an already-encoded target', () => {
    expect(encodeGotoRaw('[x](an%20evening%20with%20melt.md)'))
      .toBe('[x](an%20evening%20with%20melt.md)');
  });

  it('preserves folder granularity', () => {
    expect(encodeGotoRaw('[_index](Resources/sub folder/_index.md)'))
      .toBe('[_index](Resources/sub%20folder/_index.md)');
  });
});
