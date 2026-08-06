import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      input: {
        main: 'index.html',
        viewer: 'viewer.html',
      },
      output: {
        manualChunks: { three: ['three'] },
      },
    },
  },
  server: { port: 5173, host: true },
  preview: { port: 4173, host: true },
});
