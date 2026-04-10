import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // Set env vars before any test module is imported so Prisma connects to
    // the isolated test DB and auth uses a deterministic secret.
    env: {
      DATABASE_URL: 'file:./prisma/test.db',
      JWT_SECRET: 'test-secret',
    },
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Run suites sequentially — tests mutate shared SQLite state.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    sequence: { shuffle: false },
  },
})
