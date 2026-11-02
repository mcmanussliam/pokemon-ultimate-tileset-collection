import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./site/src', import.meta.url)) } },
  root: 'site',
  base: '/pokemon-ultimate-tileset-collection/',
  publicDir: 'public',
  build: { outDir: '../dist', emptyOutDir: true, sourcemap: false },
});
