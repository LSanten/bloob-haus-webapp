import { describe, it, expect, afterEach } from 'vitest';
import { pathToFileURL } from 'url';
import { isMainModule } from '../../scripts/utils/is-main.js';

describe('isMainModule', () => {
  const realArgv1 = process.argv[1];
  afterEach(() => {
    process.argv[1] = realArgv1;
  });

  it('returns true when import.meta.url matches the entry script (run directly)', () => {
    process.argv[1] = '/some/path/script.js';
    expect(isMainModule(pathToFileURL('/some/path/script.js').href)).toBe(true);
  });

  it('returns false when the module was imported (url differs from entry)', () => {
    process.argv[1] = '/some/path/entry.js';
    expect(isMainModule(pathToFileURL('/some/path/other-module.js').href)).toBe(false);
  });

  it('returns false when there is no entry path (e.g. `node -e`, argv[1] undefined)', () => {
    // Regression: pathToFileURL(undefined) throws — the helper must guard it.
    process.argv[1] = undefined;
    expect(() => isMainModule('file:///whatever.js')).not.toThrow();
    expect(isMainModule('file:///whatever.js')).toBe(false);
  });

  it('compares against the pathToFileURL form, not the old `file://${argv[1]}` string', () => {
    // The Windows bug (TECH-DEBT #25): import.meta.url is always the pathToFileURL
    // form (percent-encoded, drive-normalized), never the naive string-concat form.
    process.argv[1] = '/path with spaces/script.js';
    expect(isMainModule(pathToFileURL('/path with spaces/script.js').href)).toBe(true);
    // The old buggy comparison used `file://${argv[1]}` (spaces NOT encoded) — would miss.
    expect(`file://${process.argv[1]}`).not.toBe(pathToFileURL(process.argv[1]).href);
  });
});
