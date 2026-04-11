import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared-types': resolve(__dirname, '../../packages/shared-types'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: true,
    target: 'ES2020',
    rollupOptions: {
      input: resolve(__dirname, 'src/content/index.tsx'),
      output: {
        format: 'iife',
        entryFileNames: 'content.js',
        assetFileNames: 'assets/[name].[ext]',
        inlineDynamicImports: true,
      },
    },
  },
});
