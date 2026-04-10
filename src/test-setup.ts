import { execSync } from 'child_process'

export default function setup() {
  const env = { ...process.env, DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db' }

  // Ensure schema is up to date
  execSync('npx prisma db push --skip-generate', { env, stdio: 'pipe' })

  // Seed — ignore errors if data already exists
  try {
    execSync('npx ts-node prisma/seed.ts', { env, stdio: 'pipe' })
  } catch {
    // Already seeded — safe to continue
  }
}
