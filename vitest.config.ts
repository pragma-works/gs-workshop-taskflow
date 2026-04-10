import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    globalSetup: 'src/__tests__/globalSetup.ts',
    exclude: ['node_modules', '.stryker-tmp', 'dist'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/server.ts', 'src/__tests__/globalSetup.ts'],
    },
  },
})
