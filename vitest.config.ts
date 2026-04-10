import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    fileParallelism: false,
    globalSetup: ['./test-setup.ts'],
    env: {
      DATABASE_URL: 'file:./test.db',
      JWT_SECRET: 'test-secret',
    },
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
    },
  },
})
