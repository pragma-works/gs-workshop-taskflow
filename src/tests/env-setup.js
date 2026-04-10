// Loaded via --require before any TypeScript module is imported.
// Sets env vars so Prisma and auth use the isolated test database.
process.env.DATABASE_URL = 'file:./prisma/test.db'
process.env.JWT_SECRET = 'test-secret'
