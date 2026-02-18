import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'tests/**/*.test.js',
      'lib/**/*.test.js',
    ],
  },
});
