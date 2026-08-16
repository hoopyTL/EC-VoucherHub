/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET ?? process.env.BACKEND_URL ?? 'http://localhost:4000'
const apiProxy = {
  '/api': {
    target: apiProxyTarget,
    changeOrigin: true,
    secure: false
  },
  '/uploads': {
    target: apiProxyTarget,
    changeOrigin: true,
    secure: false
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // UI-only compatibility layer. Backend integration will replace this
      // alias with canonical contracts from the shared workspace.
      '@ui-contracts': fileURLToPath(new URL('./src/types/ui-contracts.ts', import.meta.url))
    }
  },
  server: {
    port: 5173,
    proxy: apiProxy
  },
  preview: {
    host: '0.0.0.0',
    port: Number.parseInt(process.env.PORT ?? '4173', 10),
    proxy: apiProxy
  },
  build: {
    rollupOptions: {
      output: {
        // Split large, rarely-changing vendor libraries into their own chunk so
        // the app chunk stays small and the vendor chunk caches across deploys.
        // (Addresses the >500 KB single-chunk warning without code changes.)
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'data-vendor': ['@tanstack/react-query', 'axios'],
          'i18n-vendor': ['i18next', 'react-i18next'],
          qrcode: ['qrcode']
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    css: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}']
  }
})
