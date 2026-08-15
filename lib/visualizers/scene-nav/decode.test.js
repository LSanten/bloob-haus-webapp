import { describe, it, expect } from 'vitest';
import { safeDecode } from './decode.js';

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
