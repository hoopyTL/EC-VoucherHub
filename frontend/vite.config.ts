import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query', 'axios'],
          i18n: ['i18next', 'react-i18next']
        }
      },
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('use client')) return

        if (warning.code === 'MODULE_NAME_CONFLICT' || warning.message.includes('dynamically imported')) return

        warn(warning)
      }
    }
  },

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts']
  },

  resolve: {
    alias: {
      '@ui-contracts': fileURLToPath(new URL('./src/types/ui-contracts.ts', import.meta.url)),

      '@voucher/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url))
    }
  },

  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:4000',
        changeOrigin: true
      },

      '/uploads': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:4000',
        changeOrigin: true
      }
    }
  }
})
