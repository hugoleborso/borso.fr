import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { OPENINGS_CACHE_VERSION } from './site/src/config/openingsCacheVersion';
import { STOCKFISH_DISTRIBUTION } from './site/src/opponent/stockfish-distribution.core';

const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url));

const openingsCacheName = `openings-cache-${OPENINGS_CACHE_VERSION}`;
const stockfishCacheName = `stockfish-${STOCKFISH_DISTRIBUTION.version}`;

export default defineConfig({
  root: fromHere('./site'),
  publicDir: fromHere('./site/public'),
  resolve: {
    alias: {
      '@': fromHere('./site/src'),
      '@domain': fromHere('./domain'),
    },
  },
  build: {
    outDir: fromHere('./dist'),
    emptyOutDir: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'decks.json'],
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
        globIgnores: ['**/stockfish/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/stockfish/'),
            handler: 'CacheFirst',
            options: {
              cacheName: stockfishCacheName,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
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
