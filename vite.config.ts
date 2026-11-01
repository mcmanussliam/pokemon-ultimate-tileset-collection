import { defineConfig } from 'vite';

export default defineConfig({
  root: 'site',
  base: '/pokemon-ultimate-tileset-collection/',
  publicDir: 'public',
  build: { outDir: '../dist', emptyOutDir: true, sourcemap: false },
});
