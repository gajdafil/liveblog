import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relativní cesta zajišťuje bezproblémový běh na GitHub Pages v podadresáři repozitáře
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
