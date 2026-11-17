import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/musviz/',
  plugins: [react()],
  worker: {
    format: 'es',
  },
  build: {
    target: 'es2022',
    assetsInlineLimit: 4096,
    // Mediabunny's read/write/muxer code is the bulk of the main chunk.
    chunkSizeWarningLimit: 900,
  },
});
