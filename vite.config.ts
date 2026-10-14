import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the built site works from a GitHub Pages subpath (user.github.io/repo/).
  base: './',
  build: {
    // Phaser alone is > 1 MB; that's expected, so don't warn about it.
    chunkSizeWarningLimit: 1500,
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
