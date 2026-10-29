/**
 * show_in_search: no must cover files no theme head touches: magic machines and raw
 * HTML copied as-is, PDFs, images. Cloudflare Pages reads `_headers`, so the build
 * appends one X-Robots-Tag rule to it, keeping whatever was there.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { addNoindexHeader } from '../../scripts/utils/search-headers.js';

let dir;
beforeEach(async () => { dir = await fs.mkdtemp(path.join(os.tmpdir(), 'search-headers-')); });
afterEach(async () => { await fs.remove(dir); });

describe('addNoindexHeader', () => {
  it('writes a noindex rule for every path when there is no _headers yet', async () => {
    await addNoindexHeader(dir);
    const text = await fs.readFile(path.join(dir, '_headers'), 'utf-8');
    expect(text).toMatch(/^\/\*\n {2}X-Robots-Tag: noindex, nofollow\n/m);
  });

  it('keeps an existing _headers and adds the rule after it', async () => {
    await fs.writeFile(path.join(dir, '_headers'), '# magic machines\n/magic-machine/*\n  X-Test: 1\n');
    await addNoindexHeader(dir);
    const text = await fs.readFile(path.join(dir, '_headers'), 'utf-8');
    expect(text.startsWith('# magic machines\n/magic-machine/*\n  X-Test: 1\n')).toBe(true);
    expect(text).toContain('/*\n  X-Robots-Tag: noindex, nofollow');
  });

  it('scopes the rule to the mount path when the site lives under one', async () => {
    await addNoindexHeader(dir, 'garden');
    const text = await fs.readFile(path.join(dir, '_headers'), 'utf-8');
    expect(text).toContain('/garden/*\n  X-Robots-Tag: noindex, nofollow');
  });
});

import { addFolderNoindexHeaders } from '../../scripts/utils/search-headers.js';

describe('addFolderNoindexHeaders', () => {
  it('adds a noindex rule per unlisted folder, keeping existing rules', async () => {
    await fs.writeFile(path.join(dir, '_headers'), '/magic-machine/*\n  X-Test: 1\n');
    await addFolderNoindexHeaders(dir, ['clients', 'work/private']);
    const text = await fs.readFile(path.join(dir, '_headers'), 'utf-8');
    expect(text.startsWith('/magic-machine/*\n  X-Test: 1\n')).toBe(true);
    expect(text).toContain('/clients/*\n  X-Robots-Tag: noindex, nofollow');
    expect(text).toContain('/work/private/*\n  X-Robots-Tag: noindex, nofollow');
  });

  it('scopes the rules under the mount path', async () => {
    await addFolderNoindexHeaders(dir, ['clients'], 'marbles');
    const text = await fs.readFile(path.join(dir, '_headers'), 'utf-8');
    expect(text).toContain('/marbles/clients/*\n');
  });

  it('writes nothing when there are no folders', async () => {
    await addFolderNoindexHeaders(dir, []);
    expect(await fs.pathExists(path.join(dir, '_headers'))).toBe(false);
  });
});
