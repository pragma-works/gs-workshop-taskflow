import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import type { Express } from 'express'
import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { TokenService } from '../../src/auth/token-service'
import { createApp } from '../../src/app'
import { createApplicationServicesFromDatabase } from '../../src/repositories/create-application-services'

const TEST_JWT_SECRET = 'test-secret'
const REPOSITORY_ROOT = process.cwd()

export interface TestApplication {
  readonly app: Express
  readonly cleanup: () => Promise<void>
  readonly ids: {
    readonly backlogListId: number
    readonly boardId: number
    readonly cardId: number
    readonly foreignListId: number
    readonly inProgressListId: number
    readonly outsiderUserId: number
  }
  readonly tokens: {
    readonly alice: string
    readonly bob: string
    readonly outsider: string
  }
}

/** Creates an isolated app instance backed by a temporary SQLite database. */
export async function createTestApplication(): Promise<TestApplication> {
  const previousDatabaseUrl = process.env.DATABASE_URL
  const databaseDirectory = join(REPOSITORY_ROOT, 'tests', '.tmp', randomUUID())
  const databaseFilePath = join(databaseDirectory, 'taskflow.db')

  mkdirSync(databaseDirectory, { recursive: true })

  const relativeDatabasePath = relative(REPOSITORY_ROOT, databaseFilePath).split(sep).join('/')
  const databaseUrl = `file:./${relativeDatabasePath}`
  pushSchema(databaseUrl)
  process.env.DATABASE_URL = databaseUrl

  const prismaClient = new PrismaClient()
  const tokenService = new TokenService(TEST_JWT_SECRET)
  const app = createApp(createApplicationServicesFromDatabase(prismaClient, TEST_JWT_SECRET))

  const seededData = await seedTestData(prismaClient, tokenService)

  return {
    app,
    cleanup: async () => {
      await prismaClient.$disconnect()
      process.env.DATABASE_URL = previousDatabaseUrl
      rmSync(databaseDirectory, { force: true, recursive: true })
    },
    ids: seededData.ids,
    tokens: seededData.tokens,
  }
}

function pushSchema(databaseUrl: string): void {
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  const result = spawnSync(command, ['prisma', 'db', 'push', '--skip-generate'], {
    cwd: REPOSITORY_ROOT,
    encoding: 'utf-8',
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  })

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'Failed to prepare test database')
  }
}

async function seedTestData(prismaClient: PrismaClient, tokenService: TokenService) {
  const passwordHash = await bcrypt.hash('password123', 10)

  const alice = await prismaClient.user.create({
    data: { email: 'alice@test.com', name: 'Alice', password: passwordHash },
  })
  const bob = await prismaClient.user.create({
    data: { email: 'bob@test.com', name: 'Bob', password: passwordHash },
  })
  const outsider = await prismaClient.user.create({
    data: { email: 'outsider@test.com', name: 'Outsider', password: passwordHash },
  })

  const board = await prismaClient.board.create({ data: { name: 'Engineering Board' } })
  const outsiderBoard = await prismaClient.board.create({ data: { name: 'Secret Board' } })

  await prismaClient.boardMember.createMany({
    data: [
      { boardId: board.id, role: 'owner', userId: alice.id },
      { boardId: board.id, role: 'member', userId: bob.id },
      { boardId: outsiderBoard.id, role: 'owner', userId: outsider.id },
    ],
  })

  const backlog = await prismaClient.list.create({
    data: { boardId: board.id, name: 'Backlog', position: 0 },
  })
  const inProgress = await prismaClient.list.create({
    data: { boardId: board.id, name: 'In Progress', position: 1 },
  })
  await prismaClient.list.create({
    data: { boardId: board.id, name: 'Done', position: 2 },
  })
  const foreignList = await prismaClient.list.create({
    data: { boardId: outsiderBoard.id, name: 'Outsider', position: 0 },
  })

  const featureLabel = await prismaClient.label.create({
    data: { color: '#7c3aed', name: 'feature' },
  })

  const backlogCard = await prismaClient.card.create({
    data: {
      assigneeId: alice.id,
      description: 'Build the new auth flow',
      listId: backlog.id,
      position: 0,
      title: 'User auth flow',
    },
  })
  await prismaClient.card.create({
    data: {
      assigneeId: bob.id,
      description: 'Update charts',
      listId: inProgress.id,
      position: 0,
      title: 'Dashboard widget',
    },
  })

  await prismaClient.cardLabel.create({
    data: {
      cardId: backlogCard.id,
      labelId: featureLabel.id,
    },
  })
  await prismaClient.comment.create({
    data: {
      cardId: backlogCard.id,
      content: 'We should keep this simple.',
      userId: alice.id,
    },
  })

  return {
    ids: {
      backlogListId: backlog.id,
      boardId: board.id,
      cardId: backlogCard.id,
      foreignListId: foreignList.id,
      inProgressListId: inProgress.id,
      outsiderUserId: outsider.id,
    },
    tokens: {
      alice: tokenService.sign(alice.id),
      bob: tokenService.sign(bob.id),
      outsider: tokenService.sign(outsider.id),
    },
  }
}
