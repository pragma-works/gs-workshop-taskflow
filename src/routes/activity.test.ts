import * as jwt from 'jsonwebtoken'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'file:activity-feed-tests?mode=memory&cache=shared'

type AppModule = typeof import('../index')
type DbModule = typeof import('../db')

let app: AppModule['default']
let prisma: DbModule['default']

function createToken(userId: number) {
  return jwt.sign({ userId }, 'super-secret-key-change-me', { expiresIn: '7d' })
}

async function executeStatements(statements: string[]) {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement)
  }
}

async function resetDatabase() {
  await executeStatements([
    'PRAGMA foreign_keys = OFF',
    'DROP TABLE IF EXISTS "ActivityEvent"',
    'DROP TABLE IF EXISTS "Comment"',
    'DROP TABLE IF EXISTS "CardLabel"',
    'DROP TABLE IF EXISTS "Label"',
    'DROP TABLE IF EXISTS "Card"',
    'DROP TABLE IF EXISTS "List"',
    'DROP TABLE IF EXISTS "BoardMember"',
    'DROP TABLE IF EXISTS "Board"',
    'DROP TABLE IF EXISTS "User"',
    'PRAGMA foreign_keys = ON',
    'CREATE TABLE "User" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "email" TEXT NOT NULL, "password" TEXT NOT NULL, "name" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)',
    'CREATE UNIQUE INDEX "User_email_key" ON "User"("email")',
    'CREATE TABLE "Board" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "name" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)',
    `CREATE TABLE "BoardMember" ("userId" INTEGER NOT NULL, "boardId" INTEGER NOT NULL, "role" TEXT NOT NULL DEFAULT 'member', PRIMARY KEY ("userId", "boardId"), CONSTRAINT "BoardMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "BoardMember_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board" ("id") ON DELETE RESTRICT ON UPDATE CASCADE)`,
    'CREATE TABLE "List" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "name" TEXT NOT NULL, "position" INTEGER NOT NULL, "boardId" INTEGER NOT NULL, CONSTRAINT "List_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board" ("id") ON DELETE RESTRICT ON UPDATE CASCADE)',
    'CREATE TABLE "Card" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "title" TEXT NOT NULL, "description" TEXT, "position" INTEGER NOT NULL, "dueDate" DATETIME, "listId" INTEGER NOT NULL, "assigneeId" INTEGER, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Card_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List" ("id") ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "Card_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE)',
    'CREATE TABLE "Label" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "name" TEXT NOT NULL, "color" TEXT NOT NULL)',
    'CREATE TABLE "CardLabel" ("cardId" INTEGER NOT NULL, "labelId" INTEGER NOT NULL, PRIMARY KEY ("cardId", "labelId"), CONSTRAINT "CardLabel_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "CardLabel_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label" ("id") ON DELETE RESTRICT ON UPDATE CASCADE)',
    'CREATE TABLE "Comment" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "content" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "cardId" INTEGER NOT NULL, "userId" INTEGER NOT NULL, CONSTRAINT "Comment_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE)',
    'CREATE TABLE "ActivityEvent" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "boardId" INTEGER NOT NULL, "actorId" INTEGER NOT NULL, "eventType" TEXT NOT NULL, "cardId" INTEGER, "fromListId" INTEGER, "toListId" INTEGER, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ActivityEvent_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board" ("id") ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "ActivityEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "ActivityEvent_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT "ActivityEvent_fromListId_fkey" FOREIGN KEY ("fromListId") REFERENCES "List" ("id") ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT "ActivityEvent_toListId_fkey" FOREIGN KEY ("toListId") REFERENCES "List" ("id") ON DELETE SET NULL ON UPDATE CASCADE)'
  ])
}

async function seedBoardFixture() {
  const user = await prisma.user.create({
    data: {
      email: 'alice@test.com',
      password: 'password123',
      name: 'Alice',
    },
  })

  const board = await prisma.board.create({ data: { name: 'Q2 Product Sprint' } })

  await prisma.boardMember.create({
    data: { userId: user.id, boardId: board.id, role: 'owner' },
  })

  const backlog = await prisma.list.create({
    data: { name: 'Backlog', position: 0, boardId: board.id },
  })

  const inProgress = await prisma.list.create({
    data: { name: 'In Progress', position: 1, boardId: board.id },
  })

  const card = await prisma.card.create({
    data: {
      title: 'Fix login redirect',
      position: 0,
      listId: backlog.id,
      assigneeId: user.id,
    },
  })

  return { user, board, backlog, inProgress, card }
}

beforeAll(async () => {
  const dbModule = await import('../db')
  prisma = dbModule.default

  const appModule = await import('../index')
  app = appModule.default
})

beforeEach(async () => {
  await resetDatabase()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('activity feed', () => {
  it('rejects unauthenticated board activity requests', async () => {
    const { board } = await seedBoardFixture()

    const response = await request(app).get(`/boards/${board.id}/activity`)

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'Unauthorized' })
  })

  it('persists the activity event when a card move succeeds', async () => {
    const fixture = await seedBoardFixture()
    const token = createToken(fixture.user.id)

    const response = await request(app)
      .patch(`/cards/${fixture.card.id}/move`)
      .set('Authorization', `Bearer ${token}`)
      .send({ targetListId: fixture.inProgress.id, position: 0 })

    expect(response.status).toBe(200)
    expect(response.body.ok).toBe(true)
    expect(response.body.event.eventType).toBe('card_moved')
    expect(response.body.event.cardId).toBe(fixture.card.id)
    expect(response.body.event.fromListId).toBe(fixture.backlog.id)
    expect(response.body.event.toListId).toBe(fixture.inProgress.id)
    expect(response.body.event.boardId).toBe(fixture.board.id)
    expect(response.body.event.actorId).toBe(fixture.user.id)

    const movedCard = await prisma.card.findUniqueOrThrow({ where: { id: fixture.card.id } })
    const events = await prisma.activityEvent.findMany({ where: { boardId: fixture.board.id } })

    expect(movedCard.listId).toBe(fixture.inProgress.id)
    expect(movedCard.position).toBe(0)
    expect(events).toHaveLength(1)
    expect(events[0].eventType).toBe('card_moved')
  })

  it('returns preview events in reverse chronological order', async () => {
    const fixture = await seedBoardFixture()

    await prisma.activityEvent.create({
      data: {
        boardId: fixture.board.id,
        actorId: fixture.user.id,
        eventType: 'card_created',
        cardId: fixture.card.id,
        toListId: fixture.backlog.id,
        createdAt: new Date('2026-04-07T10:00:00.000Z'),
      },
    })

    await prisma.activityEvent.create({
      data: {
        boardId: fixture.board.id,
        actorId: fixture.user.id,
        eventType: 'card_moved',
        cardId: fixture.card.id,
        fromListId: fixture.backlog.id,
        toListId: fixture.inProgress.id,
        createdAt: new Date('2026-04-07T11:00:00.000Z'),
      },
    })

    const response = await request(app).get(`/boards/${fixture.board.id}/activity/preview`)

    expect(response.status).toBe(200)
    expect(response.body).toHaveLength(2)
    expect(response.body[0].eventType).toBe('card_moved')
    expect(response.body[0].actorName).toBe('Alice')
    expect(response.body[0].cardTitle).toBe('Fix login redirect')
    expect(response.body[0].fromListName).toBe('Backlog')
    expect(response.body[0].toListName).toBe('In Progress')
    expect(response.body[1].eventType).toBe('card_created')
  })

  it('rolls back the move when the target list does not exist', async () => {
    const fixture = await seedBoardFixture()
    const token = createToken(fixture.user.id)

    const response = await request(app)
      .patch(`/cards/${fixture.card.id}/move`)
      .set('Authorization', `Bearer ${token}`)
      .send({ targetListId: 999999, position: 0 })

    expect(response.status).toBe(500)
    expect(response.body.error).toBe('Move failed')

    const unchangedCard = await prisma.card.findUniqueOrThrow({ where: { id: fixture.card.id } })
    const events = await prisma.activityEvent.findMany({ where: { boardId: fixture.board.id } })

    expect(unchangedCard.listId).toBe(fixture.backlog.id)
    expect(unchangedCard.position).toBe(0)
    expect(events).toHaveLength(0)
  })
})