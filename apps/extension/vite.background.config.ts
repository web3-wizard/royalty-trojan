import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '@shared-types': resolve(__dirname, '../../packages/shared-types'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    minify: true,
    target: 'ES2020',
    rollupOptions: {
      input: resolve(__dirname, 'src/background/service-worker.ts'),
      output: {
        format: 'es',
        entryFileNames: 'background.js',
        assetFileNames: 'assets/[name].[ext]',
        inlineDynamicImports: true,
      },
    },
  },
});
