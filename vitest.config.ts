import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: 'file:./test.db',
      PORT: '3099',
      JWT_SECRET: 'test-secret',
    },
    globalSetup: ['./src/test/global-setup.ts'],
    setupFiles: ['./src/test/setup.ts'],
    fileParallelism: false,
  },
})
