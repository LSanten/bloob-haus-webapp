import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { readBloobObjects, resolveIdentityKey, normalizeBloobObject } from '../../scripts/utils/bloob-objects-reader.js';

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

describe('readBloobObjects — registry parsing', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bloob-shapes-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  async function writeRegistry(filename, body) {
    await fs.writeFile(path.join(tmpDir, filename), body);
  }

  // The forward-facing registry: `bloob-shape` key column, no `layout` column,
  // per-shape `fastcomments` / `showvisitorcount` behaviors. Mirrors melt's file.
  const SHAPES_TABLE = [
    '---',
    'bloob-settings: types',
    '---',
    '',
    '| bloob-shape | display_name | image | banner_text               | description | fastcomments | showvisitorcount |',
    '| ----------- | ------------ | ----- | ------------------------- | ----------- | ------------ | ---------------- |',
    '| page        | Page         | none  |                           |             | true         | true             |',
    '| note        | Note         | none  | A note for our community  |             | true         | false            |',
    '| guide       | Guide        | none  | A guide for our community | Long-form.  | false        | true             |',
  ].join('\n');

  it('parses _bloob-shapes.md keyed by the bloob-shape column', async () => {
    await writeRegistry('_bloob-shapes.md', SHAPES_TABLE);
    const registry = await readBloobObjects(tmpDir);
    expect(Object.keys(registry).sort()).toEqual(['guide', 'note', 'page']);
    expect(registry.guide.display_name).toBe('Guide');
    expect(registry.note.banner_text).toBe('A note for our community');
    expect(registry.guide.description).toBe('Long-form.');
  });

  it('exposes per-shape fastcomments / showvisitorcount as booleans', async () => {
    await writeRegistry('_bloob-shapes.md', SHAPES_TABLE);
    const registry = await readBloobObjects(tmpDir);
    expect(registry.page.fastcomments).toBe(true);
    expect(registry.note.showvisitorcount).toBe(false);
    expect(registry.guide.fastcomments).toBe(false);
  });

  it('treats the layout column as optional (absent in _bloob-shapes.md → empty)', async () => {
    await writeRegistry('_bloob-shapes.md', SHAPES_TABLE);
    const registry = await readBloobObjects(tmpDir);
    expect(registry.page.layout).toBe('');
  });

  it('prefers _bloob-shapes.md over legacy _bloob-types.md when both exist', async () => {
    await writeRegistry('_bloob-shapes.md', SHAPES_TABLE);
    await writeRegistry(
      '_bloob-types.md',
      [
        '| object_type | display_name | image | banner_text | description | layout   |',
        '| ----------- | ------------ | ----- | ----------- | ----------- | -------- |',
        '| page        | LEGACY PAGE  | none  |             |             | page.njk |',
      ].join('\n'),
    );
    const registry = await readBloobObjects(tmpDir);
    // _bloob-shapes.md wins: display_name is "Page", not "LEGACY PAGE"
    expect(registry.page.display_name).toBe('Page');
  });

  it('still parses legacy _bloob-types.md (object_type + honored layout column)', async () => {
    await writeRegistry(
      '_bloob-types.md',
      [
        '| object_type     | display_name | image | banner_text | description | layout      |',
        '| --------------- | ------------ | ----- | ----------- | ----------- | ----------- |',
        '| project-profile | Project      | none  |             |             | project.njk |',
      ].join('\n'),
    );
    const registry = await readBloobObjects(tmpDir);
    expect(registry['project-profile'].display_name).toBe('Project');
    expect(registry['project-profile'].layout).toBe('project.njk');
  });

  it('still parses the oldest legacy _bloob-objects.md alias', async () => {
    await writeRegistry(
      '_bloob-objects.md',
      [
        '| object_type | display_name | image                      | banner_text       | description |',
        '| ----------- | ------------ | -------------------------- | ----------------- | ----------- |',
        '| marble      | Marble       | /assets/objects/marble.png | Here is a marble. | A marble.   |',
      ].join('\n'),
    );
    const registry = await readBloobObjects(tmpDir);
    expect(registry.marble.display_name).toBe('Marble');
    expect(registry.marble.image).toBe('/assets/objects/marble.png');
  });

  it('returns an empty object when no registry file exists', async () => {
    const registry = await readBloobObjects(tmpDir);
    expect(registry).toEqual({});
  });
});
