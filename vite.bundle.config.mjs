// Builds a self-contained browser ESM bundle of the library (with jsonpath-plus
// inlined) for the docs playground. Run via `npm run build:docs`.
// Output: docs/assets/ajsont.browser.js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'ajsont.browser.js',
    },
    outDir: resolve(import.meta.dirname, 'docs/assets'),
    emptyOutDir: false,
    minify: true,
    sourcemap: false,
  },
});
