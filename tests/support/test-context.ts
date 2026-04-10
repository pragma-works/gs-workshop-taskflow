import { execSync } from 'child_process'
import { mkdirSync, rmSync } from 'fs'
import path from 'path'

import type { Express } from 'express'
import type { PrismaClient } from '@prisma/client'
import { vi } from 'vitest'

const temporaryDatabaseDirectory = path.join(process.cwd(), 'tests', 'tmp')

export interface TestContext {
  app: Express
  prisma: PrismaClient
  cleanup: () => Promise<void>
}

export async function createTestContext(name: string): Promise<TestContext> {
  mkdirSync(temporaryDatabaseDirectory, { recursive: true })

  const databaseRelativePath = path.join('tests', 'tmp', `${name}-${Date.now()}.db`)
  const databaseUrl = `file:./${databaseRelativePath.replace(/\\/g, '/')}`

  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = databaseUrl
  process.env.JWT_SECRET = 'test-secret'

  execSync('npx prisma db push --skip-generate', {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'pipe',
  })

  vi.resetModules()

  const [{ default: app }, { default: prisma }] = await Promise.all([
    import('../../src/index'),
    import('../../src/db'),
  ])

  return {
    app,
    prisma,
    cleanup: async () => {
      await prisma.$disconnect()
      rmSync(path.join(process.cwd(), databaseRelativePath), { force: true })
      vi.resetModules()
    },
  }
}
