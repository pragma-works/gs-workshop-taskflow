import { execSync } from 'child_process'

export default function setup() {
  execSync('npx prisma db push --force-reset --skip-generate', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: 'file:./dev.db' },
  })
  execSync('npm run db:seed', { stdio: 'inherit' })
}
