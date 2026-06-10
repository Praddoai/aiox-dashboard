import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Check if running in Storybook
const isStorybook = process.argv[1]?.includes('storybook');

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    !isStorybook && VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'AIOX - AI Agent Platform',
        short_name: 'AIOX',
        description: 'Interface para orquestração de agentes de IA',
        theme_color: '#0F0F11',
        background_color: '#050505',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // Disable in dev - component handles this manually
      },
    }),
  ].filter(Boolean),
  server: {
    port: 5173,
    allowedHosts: ['host.docker.internal'],
    proxy: {
      '/edge-tts': {
        target: 'http://127.0.0.1:5174',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/edge-tts/, ''),
      },
      '/fal-proxy': {
        target: 'https://fal.run',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fal-proxy/, ''),
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        // Configure for SSE streaming
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Disable buffering for SSE
            if (req.headers.accept === 'text/event-stream') {
              proxyReq.setHeader('Cache-Control', 'no-cache');
              proxyReq.setHeader('Connection', 'keep-alive');
            }
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            // Ensure SSE responses are not buffered
            if (req.headers.accept === 'text/event-stream') {
              proxyRes.headers['cache-control'] = 'no-cache';
              proxyRes.headers['connection'] = 'keep-alive';
            }
          });
        },
      },
      '/engine': {
        target: 'http://localhost:4002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/engine/, ''),
        ws: true,
        // Let HTML navigation requests fall through to the SPA
        bypass(req) {
          if (req.headers.accept?.includes('text/html')) {
            return '/index.html';
          }
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 600, // Slightly increase limit
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor';
          }
          // Animation library
          if (id.includes('node_modules/framer-motion/')) {
            return 'motion';
          }
          // Data fetching
          if (id.includes('node_modules/@tanstack/')) {
            return 'query';
          }
          // State management
          if (id.includes('node_modules/zustand/')) {
            return 'state';
          }
          // Markdown rendering (heavy)
          if (
            id.includes('node_modules/react-markdown/') ||
            id.includes('node_modules/react-syntax-highlighter/') ||
            id.includes('node_modules/remark-') ||
            id.includes('node_modules/rehype-') ||
            id.includes('node_modules/unified/') ||
            id.includes('node_modules/highlight.js/') ||
            id.includes('node_modules/refractor/')
          ) {
            return 'markdown';
          }
          // Icons (stable, cache-friendly)
          if (id.includes('node_modules/lucide-react/')) {
            return 'icons';
          }
          // Chart libraries (if any)
          if (id.includes('node_modules/recharts/') || id.includes('node_modules/d3')) {
            return 'charts';
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react', 'framer-motion', '@tanstack/react-query', 'zustand'],
  },
});
