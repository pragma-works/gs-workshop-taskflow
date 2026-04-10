import { execSync } from 'child_process'

/**
 * Global setup: push the Prisma schema so tables exist before tests run.
 * This is safe to call in CI (no db file) and locally (idempotent).
 */
export async function setup(): Promise<void> {
  execSync('npx prisma db push --force-reset --skip-generate', {
    stdio: 'inherit',
    env: { ...process.env },
  })
}
