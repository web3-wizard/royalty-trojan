import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

const shared = {
  plugins: [react()],
  resolve: {
    alias: {
      '@shared-types': resolve(__dirname, '../../packages/shared-types'),
    },
  },
};

export default defineConfig([
  {
    ...shared,
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
  },
  {
    ...shared,
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      minify: true,
      target: 'ES2020',
      rollupOptions: {
        input: resolve(__dirname, 'src/background/service-worker.ts'),
        output: {
          format: 'iife',
          entryFileNames: 'background.js',
          assetFileNames: 'assets/[name].[ext]',
          inlineDynamicImports: true,
        },
      },
    },
  },
]);