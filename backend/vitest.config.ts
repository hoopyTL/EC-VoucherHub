import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    env: {
      DATABASE_URL: 'mysql://test:test@localhost:3306/test',
      JWT_SECRET: 'test-secret',
      JWT_REFRESH_SECRET: 'test-secret'
    }
  },
})
