import type { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import type { Express } from 'express'
import * as jwt from 'jsonwebtoken'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const TEST_DATABASE_URL = 'file:taskflow-route-tests?mode=memory&cache=shared'
const JWT_SECRET = 'super-secret-key-change-me'
const LOGIN_PASSWORD = 'password123'

process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = TEST_DATABASE_URL
process.env.JWT_SECRET = JWT_SECRET

type SeedContext = {
  ownerId: number
  memberId: number
  outsiderId: number
  boardId: number
  otherBoardId: number
  backlogListId: number
  doingListId: number
  doneListId: number
  firstCardId: number
  secondCardId: number
  ownerAuthHeader: string
  memberAuthHeader: string
  outsiderAuthHeader: string
}

let app: Express
let prisma: PrismaClient
let seed: SeedContext

beforeAll(async () => {
  const dbModule = await import('../db')
  const indexModule = await import('../index')

  prisma = dbModule.default
  await prisma.$connect()
  await createSchema(prisma)

  app = indexModule.default
})

beforeEach(async () => {
  await prisma.$transaction([
    prisma.activityEvent.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.cardLabel.deleteMany(),
    prisma.card.deleteMany(),
    prisma.label.deleteMany(),
    prisma.list.deleteMany(),
    prisma.boardMember.deleteMany(),
    prisma.board.deleteMany(),
    prisma.user.deleteMany(),
  ])

  seed = await seedData(prisma)
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('taskflow routes', () => {
  it('returns 401 when board activity is requested without authentication', async () => {
    const response = await request(app).get(`/boards/${seed.boardId}/activity`)

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'Unauthorized' })
  })

  it('records a card move and its activity event atomically', async () => {
    const response = await request(app)
      .patch(`/cards/${seed.firstCardId}/move`)
      .set('Authorization', seed.ownerAuthHeader)
      .send({ targetListId: seed.doingListId, position: 2 })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      ok: true,
      event: {
        boardId: seed.boardId,
        actorId: seed.ownerId,
        eventType: 'card_moved',
        cardId: seed.firstCardId,
        fromListId: seed.backlogListId,
        toListId: seed.doingListId,
      },
    })

    const movedCard = await prisma.card.findUnique({ where: { id: seed.firstCardId } })
    const events = await prisma.activityEvent.findMany({ where: { cardId: seed.firstCardId } })

    expect(movedCard).toMatchObject({ listId: seed.doingListId, position: 2 })
    expect(events).toHaveLength(1)
  })

  it('returns preview activity in reverse chronological order', async () => {
    await prisma.activityEvent.create({
      data: {
        boardId: seed.boardId,
        actorId: seed.ownerId,
        eventType: 'older',
        cardId: seed.firstCardId,
        fromListId: seed.backlogListId,
        toListId: seed.doingListId,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
      },
    })
    await prisma.activityEvent.create({
      data: {
        boardId: seed.boardId,
        actorId: seed.ownerId,
        eventType: 'newer',
        cardId: seed.firstCardId,
        fromListId: seed.doingListId,
        toListId: seed.doneListId,
        createdAt: new Date('2024-01-02T00:00:00.000Z'),
      },
    })

    const response = await request(app).get(`/boards/${seed.boardId}/activity/preview`)

    expect(response.status).toBe(200)
    expect(response.body.map((event: { eventType: string }) => event.eventType)).toEqual(['newer', 'older'])
    expect(response.body[0]).toMatchObject({
      actorName: 'Ava Owner',
      cardTitle: 'Ship activity feed',
      fromListName: 'Doing',
      toListName: 'Done',
    })
    expect(response.body[0].timestamp).toBeTruthy()
  })

  it('returns 404 and leaves the card unchanged when the move target list is missing', async () => {
    const response = await request(app)
      .patch(`/cards/${seed.firstCardId}/move`)
      .set('Authorization', seed.ownerAuthHeader)
      .send({ targetListId: 999999, position: 7 })

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'Not found' })

    const card = await prisma.card.findUnique({ where: { id: seed.firstCardId } })
    const events = await prisma.activityEvent.findMany({ where: { cardId: seed.firstCardId } })

    expect(card).toMatchObject({ listId: seed.backlogListId, position: 0 })
    expect(events).toHaveLength(0)
  })

  it('returns a JSON 500 response when a move payload reaches the transaction with invalid data', async () => {
    const response = await request(app)
      .patch(`/cards/${seed.firstCardId}/move`)
      .set('Authorization', seed.ownerAuthHeader)
      .send({ targetListId: seed.doingListId, position: null })

    expect(response.status).toBe(500)
    expect(response.body.error).toBe('Move failed')
  })

  it('returns public user data when a user registers', async () => {
    const response = await request(app).post('/users/register').send({
      email: 'new-user@example.com',
      password: 'new-password',
      name: 'New User',
    })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      email: 'new-user@example.com',
      name: 'New User',
    })
    expect(response.body.password).toBeUndefined()

    const storedUser = await prisma.user.findUnique({ where: { email: 'new-user@example.com' } })
    expect(storedUser?.password).not.toBe('new-password')
  })

  it('issues a JWT when login credentials are valid', async () => {
    const response = await request(app).post('/users/login').send({
      email: 'ava@example.com',
      password: LOGIN_PASSWORD,
    })

    expect(response.status).toBe(200)
    expect(typeof response.body.token).toBe('string')
  })

  it('returns public user data when a user is requested by id', async () => {
    const response = await request(app).get(`/users/${seed.ownerId}`)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      id: seed.ownerId,
      email: 'ava@example.com',
      name: 'Ava Owner',
    })
    expect(response.body.password).toBeUndefined()
  })

  it('lists only the boards that belong to the authenticated user', async () => {
    const response = await request(app)
      .get('/boards')
      .set('Authorization', seed.memberAuthHeader)

    expect(response.status).toBe(200)
    expect(response.body).toHaveLength(1)
    expect(response.body[0]).toMatchObject({
      id: seed.boardId,
      name: 'Workshop Board',
    })
  })

  it('returns board details with ordered lists, comments, and labels for a member', async () => {
    const response = await request(app)
      .get(`/boards/${seed.boardId}`)
      .set('Authorization', seed.memberAuthHeader)

    expect(response.status).toBe(200)
    expect(response.body.id).toBe(seed.boardId)
    expect(response.body.lists.map((list: { name: string }) => list.name)).toEqual([
      'Backlog',
      'Doing',
      'Done',
    ])
    expect(response.body.lists[0].cards[0]).toMatchObject({
      title: 'Ship activity feed',
    })
    expect(response.body.lists[0].cards[0].comments[0]).toMatchObject({
      content: 'Initial comment',
    })
    expect(response.body.lists[0].cards[0].labels[0]).toMatchObject({
      name: 'Backend',
      color: 'blue',
    })
  })

  it('rejects board details for users who are not members', async () => {
    const response = await request(app)
      .get(`/boards/${seed.boardId}`)
      .set('Authorization', seed.outsiderAuthHeader)

    expect(response.status).toBe(403)
    expect(response.body).toEqual({ error: 'Not a board member' })
  })

  it('creates a board and assigns the caller as owner', async () => {
    const response = await request(app)
      .post('/boards')
      .set('Authorization', seed.ownerAuthHeader)
      .send({ name: 'Fresh Board' })

    expect(response.status).toBe(201)
    expect(response.body.name).toBe('Fresh Board')

    const membership = await prisma.boardMember.findUnique({
      where: {
        userId_boardId: {
          userId: seed.ownerId,
          boardId: response.body.id,
        },
      },
    })

    expect(membership?.role).toBe('owner')
  })

  it('allows board owners to add members', async () => {
    const response = await request(app)
      .post(`/boards/${seed.boardId}/members`)
      .set('Authorization', seed.ownerAuthHeader)
      .send({ memberId: seed.outsiderId })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ ok: true })

    const membership = await prisma.boardMember.findUnique({
      where: {
        userId_boardId: {
          userId: seed.outsiderId,
          boardId: seed.boardId,
        },
      },
    })

    expect(membership?.role).toBe('member')
  })

  it('blocks non-owners from adding board members', async () => {
    const response = await request(app)
      .post(`/boards/${seed.boardId}/members`)
      .set('Authorization', seed.memberAuthHeader)
      .send({ memberId: seed.outsiderId })

    expect(response.status).toBe(403)
    expect(response.body).toEqual({ error: 'Only board owners can add members' })
  })

  it('returns card details with comments and labels for authenticated users', async () => {
    const response = await request(app)
      .get(`/cards/${seed.firstCardId}`)
      .set('Authorization', seed.ownerAuthHeader)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      id: seed.firstCardId,
      title: 'Ship activity feed',
    })
    expect(response.body.comments[0]).toMatchObject({ content: 'Initial comment' })
    expect(response.body.labels[0]).toMatchObject({ name: 'Backend' })
  })

  it('creates a new card at the end of the target list', async () => {
    const response = await request(app)
      .post('/cards')
      .set('Authorization', seed.ownerAuthHeader)
      .send({
        title: 'Third backlog card',
        description: 'queued',
        listId: seed.backlogListId,
        assigneeId: seed.ownerId,
      })

    expect(response.status).toBe(201)
    expect(response.body.position).toBe(2)
  })

  it('creates comments on cards for authenticated users', async () => {
    const response = await request(app)
      .post(`/cards/${seed.firstCardId}/comments`)
      .set('Authorization', seed.memberAuthHeader)
      .send({ content: 'Looks ready to ship' })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({
      cardId: seed.firstCardId,
      userId: seed.memberId,
      content: 'Looks ready to ship',
    })
  })

  it('deletes cards for authenticated users', async () => {
    const response = await request(app)
      .delete(`/cards/${seed.secondCardId}`)
      .set('Authorization', seed.ownerAuthHeader)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ ok: true })

    const deletedCard = await prisma.card.findUnique({ where: { id: seed.secondCardId } })
    expect(deletedCard).toBeNull()
  })

  it('returns JSON for unexpected route errors through the global error handler', async () => {
    const response = await request(app)
      .post(`/boards/${seed.boardId}/members`)
      .set('Authorization', seed.ownerAuthHeader)
      .send({ memberId: seed.memberId })

    expect(response.status).toBe(500)
    expect(response.body.error).toBe('Internal server error')
    expect(typeof response.body.details).toBe('string')
  })
})

async function seedData(prismaClient: PrismaClient): Promise<SeedContext> {
  const hashedPassword = await bcrypt.hash(LOGIN_PASSWORD, 10)

  const owner = await prismaClient.user.create({
    data: {
      email: 'ava@example.com',
      password: hashedPassword,
      name: 'Ava Owner',
    },
  })
  const member = await prismaClient.user.create({
    data: {
      email: 'ben@example.com',
      password: hashedPassword,
      name: 'Ben Member',
    },
  })
  const outsider = await prismaClient.user.create({
    data: {
      email: 'cara@example.com',
      password: hashedPassword,
      name: 'Cara Outsider',
    },
  })

  const board = await prismaClient.board.create({
    data: { name: 'Workshop Board' },
  })
  const otherBoard = await prismaClient.board.create({
    data: { name: 'Other Board' },
  })

  await prismaClient.boardMember.createMany({
    data: [
      { userId: owner.id, boardId: board.id, role: 'owner' },
      { userId: member.id, boardId: board.id, role: 'member' },
      { userId: outsider.id, boardId: otherBoard.id, role: 'owner' },
    ],
  })

  const backlog = await prismaClient.list.create({
    data: { name: 'Backlog', position: 0, boardId: board.id },
  })
  const doing = await prismaClient.list.create({
    data: { name: 'Doing', position: 1, boardId: board.id },
  })
  const done = await prismaClient.list.create({
    data: { name: 'Done', position: 2, boardId: board.id },
  })

  const firstCard = await prismaClient.card.create({
    data: {
      title: 'Ship activity feed',
      description: 'Build the event timeline',
      position: 0,
      listId: backlog.id,
      assigneeId: owner.id,
    },
  })
  const secondCard = await prismaClient.card.create({
    data: {
      title: 'Write docs',
      position: 1,
      listId: backlog.id,
      assigneeId: member.id,
    },
  })

  const backendLabel = await prismaClient.label.create({
    data: {
      name: 'Backend',
      color: 'blue',
    },
  })
  await prismaClient.cardLabel.create({
    data: {
      cardId: firstCard.id,
      labelId: backendLabel.id,
    },
  })

  await prismaClient.comment.create({
    data: {
      content: 'Initial comment',
      cardId: firstCard.id,
      userId: owner.id,
    },
  })

  return {
    ownerId: owner.id,
    memberId: member.id,
    outsiderId: outsider.id,
    boardId: board.id,
    otherBoardId: otherBoard.id,
    backlogListId: backlog.id,
    doingListId: doing.id,
    doneListId: done.id,
    firstCardId: firstCard.id,
    secondCardId: secondCard.id,
    ownerAuthHeader: createAuthHeader(owner.id),
    memberAuthHeader: createAuthHeader(member.id),
    outsiderAuthHeader: createAuthHeader(outsider.id),
  }
}

function createAuthHeader(userId: number): string {
  return `Bearer ${jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })}`
}

async function createSchema(prismaClient: PrismaClient) {
  const statements = [
    'PRAGMA foreign_keys = ON',
    `
      CREATE TABLE IF NOT EXISTS "User" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "email" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `,
    'CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")',
    `
      CREATE TABLE IF NOT EXISTS "Board" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS "BoardMember" (
        "userId" INTEGER NOT NULL,
        "boardId" INTEGER NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'member',
        CONSTRAINT "BoardMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "BoardMember_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        PRIMARY KEY ("userId", "boardId")
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS "List" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "position" INTEGER NOT NULL,
        "boardId" INTEGER NOT NULL,
        CONSTRAINT "List_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS "Card" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "position" INTEGER NOT NULL,
        "dueDate" DATETIME,
        "listId" INTEGER NOT NULL,
        "assigneeId" INTEGER,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Card_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "Card_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS "Label" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "color" TEXT NOT NULL
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS "CardLabel" (
        "cardId" INTEGER NOT NULL,
        "labelId" INTEGER NOT NULL,
        CONSTRAINT "CardLabel_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "CardLabel_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        PRIMARY KEY ("cardId", "labelId")
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS "Comment" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "content" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "cardId" INTEGER NOT NULL,
        "userId" INTEGER NOT NULL,
        CONSTRAINT "Comment_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS "ActivityEvent" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "boardId" INTEGER NOT NULL,
        "actorId" INTEGER NOT NULL,
        "eventType" TEXT NOT NULL,
        "cardId" INTEGER,
        "fromListId" INTEGER,
        "toListId" INTEGER,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ActivityEvent_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "ActivityEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "ActivityEvent_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "ActivityEvent_fromListId_fkey" FOREIGN KEY ("fromListId") REFERENCES "List" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "ActivityEvent_toListId_fkey" FOREIGN KEY ("toListId") REFERENCES "List" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `,
  ]

  for (const statement of statements) {
    await prismaClient.$executeRawUnsafe(statement)
  }
}
