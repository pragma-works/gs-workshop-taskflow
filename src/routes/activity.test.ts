import type { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import type { Express } from 'express'
import * as jwt from 'jsonwebtoken'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

type SeedData = {
  aliceId: number
  boardId: number
  backlogId: number
  doneId: number
  cardId: number
}

const schemaStatements = [
  'PRAGMA foreign_keys = ON',
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  'CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")',
  `CREATE TABLE IF NOT EXISTS "Board" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS "BoardMember" (
    "userId" INTEGER NOT NULL,
    "boardId" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    PRIMARY KEY ("userId", "boardId"),
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "List" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "boardId" INTEGER NOT NULL,
    FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "Card" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL,
    "dueDate" DATETIME,
    "listId" INTEGER NOT NULL,
    "assigneeId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "Label" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "CardLabel" (
    "cardId" INTEGER NOT NULL,
    "labelId" INTEGER NOT NULL,
    PRIMARY KEY ("cardId", "labelId"),
    FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("labelId") REFERENCES "Label"("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "Comment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cardId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "ActivityEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "boardId" INTEGER NOT NULL,
    "actorId" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "cardId" INTEGER,
    "fromListId" INTEGER,
    "toListId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("fromListId") REFERENCES "List"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("toListId") REFERENCES "List"("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
]

let app: Express
let prisma: PrismaClient
let seed: SeedData

function authHeader(userId: number) {
  return `Bearer ${jwt.sign({ userId }, 'super-secret-key-change-me', { expiresIn: '7d' })}`
}

async function createSchema(client: PrismaClient) {
  for (const statement of schemaStatements) {
    await client.$executeRawUnsafe(statement)
  }
}

async function resetDatabase(client: PrismaClient) {
  await client.activityEvent.deleteMany()
  await client.comment.deleteMany()
  await client.cardLabel.deleteMany()
  await client.label.deleteMany()
  await client.card.deleteMany()
  await client.list.deleteMany()
  await client.boardMember.deleteMany()
  await client.board.deleteMany()
  await client.user.deleteMany()
}

async function seedDatabase(client: PrismaClient): Promise<SeedData> {
  const password = await bcrypt.hash('password123', 10)
  const alice = await client.user.create({
    data: { email: 'alice@test.com', password, name: 'Alice' },
  })

  const bob = await client.user.create({
    data: { email: 'bob@test.com', password, name: 'Bob' },
  })

  const board = await client.board.create({
    data: { name: 'Q2 Product Sprint' },
  })

  await client.boardMember.createMany({
    data: [
      { userId: alice.id, boardId: board.id, role: 'owner' },
      { userId: bob.id, boardId: board.id, role: 'member' },
    ],
  })

  const backlog = await client.list.create({
    data: { name: 'Backlog', position: 0, boardId: board.id },
  })

  const done = await client.list.create({
    data: { name: 'Done', position: 1, boardId: board.id },
  })

  const card = await client.card.create({
    data: {
      title: 'User auth flow',
      position: 0,
      listId: backlog.id,
      assigneeId: alice.id,
    },
  })

  return {
    aliceId: alice.id,
    boardId: board.id,
    backlogId: backlog.id,
    doneId: done.id,
    cardId: card.id,
  }
}

describe('activity feed routes', () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = 'file:activity-feed-test?mode=memory&cache=shared'
    process.env.PORT = '0'
    vi.resetModules()

    ;({ default: app } = await import('../index'))
    ;({ default: prisma } = await import('../db'))

    await createSchema(prisma)
  })

  beforeEach(async () => {
    await resetDatabase(prisma)
    seed = await seedDatabase(prisma)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('returns 401 when board activity is requested without authentication', async () => {
    const response = await request(app).get(`/boards/${seed.boardId}/activity`)

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'Unauthorized' })
  })

  it('creates an activity event when a card move succeeds', async () => {
    const response = await request(app)
      .patch(`/cards/${seed.cardId}/move`)
      .set('Authorization', authHeader(seed.aliceId))
      .send({ targetListId: seed.doneId, position: 2 })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      ok: true,
      event: {
        boardId: seed.boardId,
        actorId: seed.aliceId,
        eventType: 'card_moved',
        cardId: seed.cardId,
        fromListId: seed.backlogId,
        toListId: seed.doneId,
      },
    })

    const updatedCard = await prisma.card.findUnique({ where: { id: seed.cardId } })
    const events = await prisma.activityEvent.findMany({
      where: { cardId: seed.cardId },
    })

    expect(updatedCard).toMatchObject({ listId: seed.doneId, position: 2 })
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      boardId: seed.boardId,
      actorId: seed.aliceId,
      eventType: 'card_moved',
      cardId: seed.cardId,
      fromListId: seed.backlogId,
      toListId: seed.doneId,
    })
  })

  it('returns board activity preview in reverse chronological order', async () => {
    const older = await prisma.activityEvent.create({
      data: {
        boardId: seed.boardId,
        actorId: seed.aliceId,
        eventType: 'card_moved',
        cardId: seed.cardId,
        fromListId: seed.backlogId,
        toListId: seed.doneId,
        createdAt: new Date('2026-01-01T10:00:00.000Z'),
      },
    })

    const newer = await prisma.activityEvent.create({
      data: {
        boardId: seed.boardId,
        actorId: seed.aliceId,
        eventType: 'card_moved',
        cardId: seed.cardId,
        fromListId: seed.doneId,
        toListId: seed.backlogId,
        createdAt: new Date('2026-01-02T10:00:00.000Z'),
      },
    })

    const response = await request(app).get(`/boards/${seed.boardId}/activity/preview`)

    expect(response.status).toBe(200)
    expect(response.body.events).toHaveLength(2)
    expect(response.body.events.map((event: { id: number }) => event.id)).toEqual([
      newer.id,
      older.id,
    ])
    expect(response.body.events[0]).toMatchObject({
      actorName: 'Alice',
      cardTitle: 'User auth flow',
      fromListName: 'Done',
      toListName: 'Backlog',
    })
  })

  it('returns 404 and leaves the card untouched when the target list does not exist', async () => {
    const response = await request(app)
      .patch(`/cards/${seed.cardId}/move`)
      .set('Authorization', authHeader(seed.aliceId))
      .send({ targetListId: 99999, position: 4 })

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'Target list not found' })

    const card = await prisma.card.findUnique({ where: { id: seed.cardId } })
    const eventCount = await prisma.activityEvent.count()

    expect(card).toMatchObject({ listId: seed.backlogId, position: 0 })
    expect(eventCount).toBe(0)
  })
})
