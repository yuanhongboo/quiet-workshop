import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  server: { strictPort: true },
  preview: { strictPort: true },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: { manualChunks: { graphics: ['three'], physics: ['@dimforge/rapier3d-compat'] } },
    },
  },
});
