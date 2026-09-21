import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'logo.jpg'],
      manifest: {
        name: 'Mura Manager',
        short_name: 'Mura',
        description: 'Gerenciamento profissional de aves e lotes',
        theme_color: '#f59e0b',
        background_color: '#121218',
        display: 'standalone',
        start_url: '/',
        orientation: 'portrait-primary',
        lang: 'pt-BR',
        icons: [
          {
            src: '/logo.jpg',
            sizes: '192x192',
            type: 'image/jpeg',
            purpose: 'any maskable'
          },
          {
            src: '/logo.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Cache all static assets for 1 year
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Aggressive caching of assets (immutable hashed files)
        runtimeCaching: [
          {
            urlPattern: /^\/assets\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mura-assets-v1',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // Supabase API - NetworkFirst so data is always fresh
            urlPattern: /supabase\.co/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'mura-api-v1',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 minutes fallback
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },
      devOptions: {
        // Disable SW in dev mode to avoid caching issues during development
        enabled: false
      }
    })
  ],
  base: '/',
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-ui';
            }
            if (id.includes('localforage')) {
              return 'vendor-storage';
            }
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('purify') || id.includes('fflate')) {
              return 'vendor-pdf';
            }
            if (id.includes('@sentry')) {
              return 'vendor-sentry';
            }
          }
        }
      }
    }
  }
})
