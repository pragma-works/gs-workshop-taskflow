import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

export default function setup() {
  const isStryker = process.cwd().includes('.stryker-tmp')
  if (isStryker) return

  execSync('npm run db:push -- --force-reset --skip-generate', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: 'file:./dev.db' },
  })
  execSync('npm run db:seed', { stdio: 'inherit' })
}
