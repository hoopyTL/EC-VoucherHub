import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test/setup.ts'],
    fileParallelism: false,
    env: {
      DATABASE_URL: 'mysql://test:test@localhost:3306/test',
      JWT_SECRET: 'test-secret',
      JWT_REFRESH_SECRET: 'test-secret'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/index.ts'],
      thresholds: {
        statements: 85,
        branches: 65,
        functions: 90,
        lines: 85
      }
    }
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'src')
    }
  }
})
