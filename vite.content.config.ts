import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Content script: one IIFE file with no imports, injected on demand by the popup.
export default defineConfig({
  publicDir: false,
  build: {
    outDir: resolve(import.meta.dirname, 'dist'),
    emptyOutDir: false,
    sourcemap: false,
    lib: {
      entry: resolve(import.meta.dirname, 'src/content/content-script.ts'),
      formats: ['iife'],
      name: 'Fill2FastContent',
      fileName: () => 'content.js',
    },
  },
});
