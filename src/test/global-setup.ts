import { execSync } from 'child_process'
import path from 'path'

export function setup() {
  execSync('npx prisma db push', {
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    cwd: path.resolve(__dirname, '../..'),
    stdio: 'ignore',
  })
}
