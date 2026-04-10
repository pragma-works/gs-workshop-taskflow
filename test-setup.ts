import { execSync } from 'child_process'
import { unlinkSync } from 'fs'

export function setup() {
  process.env.DATABASE_URL = 'file:./test.db'
  process.env.NODE_ENV = 'test'
  execSync('npx prisma db push --skip-generate --force-reset', {
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'inherit',
  })
}

export function teardown() {
  try { unlinkSync('./test.db') } catch {}
}
