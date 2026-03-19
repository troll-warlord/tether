import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // GitHub Pages: deploy to <username>.github.io/tether/
  // The VITE_BASE_URL env var lets the deploy workflow inject "/tether/" at build time.
  // Locally (npm run dev) it falls back to "/" so dev proxy still works.
  base: process.env.VITE_BASE_URL ?? '/',
  build: {
    target: 'esnext',
    sourcemap: false,
  },
  server: {
    cors: true,
    // Proxy Kubernetes API paths to kubectl proxy during development.
    // This avoids CORS errors because the browser sees all requests as
    // same-origin (localhost:5173). The proxy rewrites them server-side.
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['access-control-allow-origin'] = '*'
          })
        },
      },
      '/apis': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['access-control-allow-origin'] = '*'
          })
        },
      },
      '/version': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['access-control-allow-origin'] = '*'
          })
        },
      },
    },
  },
})
