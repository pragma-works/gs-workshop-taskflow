import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      NODE_ENV:     'test',
      JWT_SECRET:   'test-secret',
      DATABASE_URL: 'file::memory:?cache=shared',
    },
    // Run test files serially so they share the same in-memory SQLite instance
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/test-*.ts'],
    },
  },
})
