import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const manifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf-8')
);

const mod = await import('./index.js');

describe('checkbox-tracker visualizer', () => {
  describe('manifest.json', () => {
    it('has name "checkbox-tracker"', () => {
      expect(manifest.name).toBe('checkbox-tracker');
    });

    it('has type "runtime"', () => {
      expect(manifest.type).toBe('runtime');
    });

    it('has a version', () => {
      expect(manifest.version).toBeDefined();
    });

    it('has a description', () => {
      expect(manifest.description).toBeDefined();
      expect(manifest.description.length).toBeGreaterThan(0);
    });

    it('has auto-detect activation method', () => {
      expect(manifest.activation).toBeDefined();
      expect(manifest.activation.method).toBe('auto-detect');
      expect(manifest.activation.pattern).toBeDefined();
    });

    it('references files that exist on disk', () => {
      for (const [key, filename] of Object.entries(manifest.files)) {
        const filePath = path.join(__dirname, filename);
        expect(fs.existsSync(filePath), `${key}: ${filename} should exist`).toBe(true);
      }
    });
  });

  describe('index.js exports', () => {
    it('exports name matching manifest', () => {
      expect(mod.name).toBe(manifest.name);
    });

    it('exports type matching manifest', () => {
      expect(mod.type).toBe(manifest.type);
    });

    it('exports a transform function', () => {
      expect(mod.transform).toBeTypeOf('function');
    });

    it('transform is a no-op for runtime visualizer', () => {
      const input = '<input type="checkbox"> test';
      expect(mod.transform(input)).toBe(input);
    });
  });
});
