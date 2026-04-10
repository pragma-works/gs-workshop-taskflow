import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      include: ['src/routes/**/*.ts'],
      exclude: ['src/routes/**/*.test.ts'],
    },
  },
})
