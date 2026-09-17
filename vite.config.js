import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './', // Essential for Itch.io HTML5 iframe & subdirectory hosting
  plugins: [react()],
  server: {
    host: true,
    port: 3000
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
});
