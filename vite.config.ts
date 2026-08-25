import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Svampespor',
        short_name: 'Svampespor',
        lang: 'da',
        theme_color: '#14170F',
        background_color: '#14170F',
        display: 'standalone',
      },
    }),
  ],
});
