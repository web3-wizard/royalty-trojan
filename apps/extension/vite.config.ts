import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default {
  plugins: [react()],
  resolve: {
    alias: {
      '@shared-types': resolve(__dirname, '../../packages/shared-types'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content/index.tsx'),
        background: resolve(__dirname, 'src/background/service-worker.ts'),
      },
      output: [
        {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].[hash].js',
        assetFileNames: 'assets/[name].[ext]',
          format: 'iife',
          name: 'royaltyTrojan',
        },
      ],
      },
    },
  },
};