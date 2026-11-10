import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import {
  buildDateRedirects,
  formatRedirects,
  writeRedirects,
} from '../../scripts/utils/date-redirects.js';

const page = (relativePath, url, dateAliasUrl, frontmatter = {}) => ({
  relativePath,
  url,
  dateAliasUrl,
  frontmatter,
});

describe('buildDateRedirects', () => {
  it('redirects the alias URL to the page URL', () => {
    const pages = { a: page('sets/2026-11-07 A.md', '/sets/2026-11-07-A/', '/sets/A/') };
    expect(buildDateRedirects(pages)).toEqual([{ from: '/sets/A/', to: '/sets/2026-11-07-A/' }]);
  });

  it('ignores pages without a date alias', () => {
    expect(buildDateRedirects({ a: page('A.md', '/A/') })).toEqual([]);
  });

  it('never covers a real page: skips an alias that is another page URL', () => {
    const pages = {
      a: page('2026-11-07 A.md', '/2026-11-07-A/', '/A/'),
      b: page('A.md', '/A/'),
    };
    expect(buildDateRedirects(pages)).toEqual([]);
  });

  it('skips pages with their own permalink (their URL is not the computed one)', () => {
    const pages = { a: page('2026-11-07 A.md', '/2026-11-07-A/', '/A/', { permalink: '/x/' }) };
    expect(buildDateRedirects(pages)).toEqual([]);
  });

  it('only includes published pages when a published set is given', () => {
    const pages = {
      a: page('2026-11-07 A.md', '/2026-11-07-A/', '/A/'),
      d: page('2026-11-08 Draft.md', '/2026-11-08-Draft/', '/Draft/'),
    };
    const rules = buildDateRedirects(pages, { published: new Set(['2026-11-07 A.md']) });
    expect(rules).toEqual([{ from: '/A/', to: '/2026-11-07-A/' }]);
  });

  it('skips an alias two dated pages share (ambiguous)', () => {
    const pages = {
      a: page('2026-11-07 A.md', '/2026-11-07-A/', '/A/'),
      b: page('2026-11-08 A.md', '/2026-11-08-A/', '/A/'),
    };
    expect(buildDateRedirects(pages)).toEqual([]);
  });
});

describe('formatRedirects', () => {
  it('writes a 301 for the slash and no-slash form', () => {
    expect(formatRedirects([{ from: '/sets/A/', to: '/sets/2026-11-07-A/' }])).toBe(
      '/sets/A/ /sets/2026-11-07-A/ 301\n/sets/A /sets/2026-11-07-A/ 301\n',
    );
  });

  it('prefixes the mount path', () => {
    expect(formatRedirects([{ from: '/A/', to: '/2026-11-07-A/' }], 'marbles')).toBe(
      '/marbles/A/ /marbles/2026-11-07-A/ 301\n/marbles/A /marbles/2026-11-07-A/ 301\n',
    );
  });
});

describe('writeRedirects', () => {
  let dir;
  beforeEach(async () => { dir = await fs.mkdtemp(path.join(os.tmpdir(), 'redirects-')); });
  afterEach(async () => { await fs.remove(dir); });

  it('writes nothing when there are no rules', async () => {
    await writeRedirects(dir, []);
    expect(await fs.pathExists(path.join(dir, '_redirects'))).toBe(false);
  });

  it('appends to an existing _redirects instead of overwriting it', async () => {
    await fs.writeFile(path.join(dir, '_redirects'), '/old /new 301');
    await writeRedirects(dir, [{ from: '/A/', to: '/2026-11-07-A/' }]);
    const out = await fs.readFile(path.join(dir, '_redirects'), 'utf-8');
    expect(out.startsWith('/old /new 301\n')).toBe(true);
    expect(out).toContain('/A/ /2026-11-07-A/ 301');
  });
});
