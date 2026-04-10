import { execSync } from 'child_process'
import { mkdirSync, rmSync } from 'fs'
import path from 'path'

import type { Express } from 'express'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
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
  const databaseClient = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  })

  const { createApp } = await import('../../src/app')
  const app = createApp({ databaseClient })

  return {
    app,
    prisma: databaseClient,
    cleanup: async () => {
      await databaseClient.$disconnect()
      rmSync(path.join(process.cwd(), databaseRelativePath), { force: true })
      vi.resetModules()
    },
  }
}

export function createAuthToken(userId: number): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET ?? 'test-secret', { expiresIn: '7d' })
}
