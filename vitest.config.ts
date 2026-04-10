import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/auth/token.ts', 'src/services/http-input.ts'],
      reporter: ['text', 'json-summary'],
    },
  },
})
