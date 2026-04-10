import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        // Repositories need a live DB; tested via integration tests
        'src/repositories/UserRepository.ts',
        'src/repositories/BoardRepository.ts',
        'src/repositories/CardRepository.ts',
        'src/repositories/ActivityRepository.ts',
        // Wiring-only files — no business logic
        'src/db.ts',
        'src/index.ts',
      ],
    },
  },
})
