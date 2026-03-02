import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: './src', // Корень — папка src
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: '/index.js' // Указываем существующий файл
    }
  }
});