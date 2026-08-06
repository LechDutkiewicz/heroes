import { defineConfig } from 'vite';

export default defineConfig({
  // Ścieżki względne, żeby ten sam build działał i pod adresem w podkatalogu
  // (GitHub Pages serwuje grę z /heroes/), i w korzeniu domeny (Netlify).
  base: './',
});
