import { describe, it, expect } from 'vitest';
import { resolveIdentityKey, normalizeBloobObject } from '../../scripts/utils/bloob-objects-reader.js';

describe('resolveIdentityKey', () => {
  it('prefers bloob-type (legacy explicit identity) above all', () => {
    expect(
      resolveIdentityKey({ 'bloob-type': 'guide', 'bloob-object': 'note', 'bloob-shape': 'page' }),
    ).toBe('guide');
  });

  it('falls back to bloob-object when bloob-type is absent', () => {
    expect(resolveIdentityKey({ 'bloob-object': 'note', 'bloob-shape': 'page' })).toBe('note');
  });

  it('falls back to bloob-shape when neither bloob-type nor bloob-object is set', () => {
    // Regression guard: new vaults declare ONLY bloob-shape and must still get their identity
    // (banner image/text, icon) resolved from the registry keyed by the shape name.
    expect(resolveIdentityKey({ 'bloob-shape': 'page' })).toBe('page');
  });

  it('lets an explicit bloob-type win over a bloob-shape on the same note', () => {
    // A note can render as one shape but identify as another (rendering vs identity axis).
    expect(resolveIdentityKey({ 'bloob-type': 'marble', 'bloob-shape': 'garden' })).toBe('marble');
  });

  it('returns null when no identity/shape key is present', () => {
    expect(resolveIdentityKey({})).toBeNull();
    expect(resolveIdentityKey({ title: 'Hello' })).toBeNull();
  });

  it('handles null/undefined frontmatter safely', () => {
    expect(resolveIdentityKey(null)).toBeNull();
    expect(resolveIdentityKey(undefined)).toBeNull();
  });
});

describe('normalizeBloobObject', () => {
  it('lowercases, trims, and strips a leading #', () => {
    expect(normalizeBloobObject('  Marble ')).toBe('marble');
    expect(normalizeBloobObject('#Note')).toBe('note');
  });

  it('returns null for empty or non-string input', () => {
    expect(normalizeBloobObject('')).toBeNull();
    expect(normalizeBloobObject(undefined)).toBeNull();
  });
});
