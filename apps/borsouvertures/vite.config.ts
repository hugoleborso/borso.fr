import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { OPENINGS_CACHE_VERSION } from './site/config/openingsCacheVersion';

const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url));

const openingsCacheName = `openings-cache-${OPENINGS_CACHE_VERSION}`;

export default defineConfig({
  root: fromHere('./site'),
  publicDir: fromHere('./site/public'),
  resolve: {
    alias: {
      '@': fromHere('./site'),
    },
  },
  build: {
    outDir: fromHere('./dist'),
    emptyOutDir: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Borsouvertures',
        short_name: 'Borsouvertures',
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('/openings.json'),
            handler: 'CacheFirst',
            options: {
              cacheName: openingsCacheName,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ request }) =>
              request.destination === 'script' ||
              request.destination === 'style' ||
              request.destination === 'document',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'app-shell' },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
