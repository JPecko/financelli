import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { readFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string }

// Emits dist/version.json — fetched by the FE to detect outdated builds
const versionJsonPlugin = (): Plugin => ({
  name: 'version-json',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify({ version }),
    })
  },
})

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    react(),
    versionJsonPlugin(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',

      // Assets to cache on install
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png'],

      // Web App Manifest
      manifest: {
        name: 'Financelli',
        short_name: 'Financelli',
        description: 'Personal finance dashboard',
        theme_color: '#1DB954',
        background_color: '#121212',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'favicon-96x96.png',             sizes: '96x96',   type: 'image/png' },
          { src: 'web-app-manifest-192x192.png',  sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'web-app-manifest-512x512.png',  sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'favicon.svg',                   sizes: 'any',     type: 'image/svg+xml', purpose: 'any' },
        ],
      },

      workbox: {
        // Cache all build output (js, css, html, images)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // pdf-export chunk is large and only needed when generating a report — don't block install precache on it
        globIgnores: ['**/pdf-export-*.js'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,

        runtimeCaching: [
          // pdf-export chunk — cached on first use instead of at install time
          {
            urlPattern: /\/pdf-export-.*\.js$/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'pdf-export-chunk' },
          },
          // Google Fonts — cache-first, 1 year TTL
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Supabase API — network-first (fresh data), 5 min stale fallback
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      // Show update prompt in dev so you can test the SW
      devOptions: {
        enabled: false,
      },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf-export': ['@react-pdf/renderer'],
        },
      },
    },
  },
})
