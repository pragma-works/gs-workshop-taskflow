import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type supertest from 'supertest'

const JWT_SECRET = 'super-secret-key-change-me'

type Statement = {
  get: (...params: unknown[]) => unknown
  all: (...params: unknown[]) => unknown[]
  run: (...params: unknown[]) => unknown
}

type Database = {
  exec: (sql: string) => void
  prepare: (sql: string) => Statement
  close: () => void
}

type UserRow = {
  id: number
  email: string
  password: string
  name: string
  createdAt: string
}

type BoardRow = {
  id: number
  name: string
  createdAt: string
}

type BoardMemberRow = {
  userId: number
  boardId: number
  role: string
}

type ListRow = {
  id: number
  name: string
  position: number
  boardId: number
}

type CardRow = {
  id: number
  title: string
  description: string | null
  position: number
  dueDate: string | null
  listId: number
  assigneeId: number | null
  createdAt: string
}

type ActivityEventRow = {
  id: number
  boardId: number
  actorId: number
  eventType: string
  cardId: number | null
  fromListId: number | null
  toListId: number | null
  createdAt: string
}

type ActivityEventWithRelations = ActivityEventRow & {
  actor?: UserRow
  card?: CardRow | null
  fromList?: ListRow | null
  toList?: ListRow | null
}

type CreateArgs<T> = { data: T }
type WhereId = { where: { id: number } }

const { DatabaseSync } = require('node:sqlite') as { DatabaseSync: new (path: string) => Database }
const db = new DatabaseSync(':memory:')

let app: import('express').Express
let jwt: typeof import('jsonwebtoken')
let request: typeof supertest

function one<T>(sql: string, ...params: unknown[]): T | null {
  return (db.prepare(sql).get(...params) as T | undefined) ?? null
}

function many<T>(sql: string, ...params: unknown[]): T[] {
  return db.prepare(sql).all(...params) as T[]
}

function run(sql: string, ...params: unknown[]) {
  db.prepare(sql).run(...params)
}

function createSchema() {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE "User" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "email" TEXT NOT NULL UNIQUE,
      "password" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "Board" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "BoardMember" (
      "userId" INTEGER NOT NULL,
      "boardId" INTEGER NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'member',
      PRIMARY KEY ("userId", "boardId"),
      CONSTRAINT "BoardMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id"),
      CONSTRAINT "BoardMember_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board" ("id")
    );

    CREATE TABLE "List" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL,
      "position" INTEGER NOT NULL,
      "boardId" INTEGER NOT NULL,
      CONSTRAINT "List_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board" ("id")
    );

    CREATE TABLE "Card" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "position" INTEGER NOT NULL,
      "dueDate" DATETIME,
      "listId" INTEGER NOT NULL,
      "assigneeId" INTEGER,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Card_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List" ("id"),
      CONSTRAINT "Card_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id")
    );

    CREATE TABLE "ActivityEvent" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "boardId" INTEGER NOT NULL,
      "actorId" INTEGER NOT NULL,
      "eventType" TEXT NOT NULL,
      "cardId" INTEGER,
      "fromListId" INTEGER,
      "toListId" INTEGER,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ActivityEvent_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board" ("id"),
      CONSTRAINT "ActivityEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id"),
      CONSTRAINT "ActivityEvent_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id"),
      CONSTRAINT "ActivityEvent_fromListId_fkey" FOREIGN KEY ("fromListId") REFERENCES "List" ("id"),
      CONSTRAINT "ActivityEvent_toListId_fkey" FOREIGN KEY ("toListId") REFERENCES "List" ("id")
    );
  `)
}

function clearData() {
  for (const table of ['ActivityEvent', 'Card', 'List', 'BoardMember', 'Board', 'User']) {
    run(`DELETE FROM "${table}"`)
  }
}

function createUser(data: { email: string; password: string; name: string }) {
  return one<UserRow>(
    `INSERT INTO "User" ("email", "password", "name") VALUES (?, ?, ?) RETURNING *`,
    data.email,
    data.password,
    data.name,
  )!
}

function createBoard(data: { name: string }) {
  return one<BoardRow>(`INSERT INTO "Board" ("name") VALUES (?) RETURNING *`, data.name)!
}

function createBoardMember(data: { userId: number; boardId: number; role?: string }) {
  return one<BoardMemberRow>(
    `INSERT INTO "BoardMember" ("userId", "boardId", "role") VALUES (?, ?, ?) RETURNING *`,
    data.userId,
    data.boardId,
    data.role ?? 'member',
  )!
}

function createList(data: { name: string; position: number; boardId: number }) {
  return one<ListRow>(
    `INSERT INTO "List" ("name", "position", "boardId") VALUES (?, ?, ?) RETURNING *`,
    data.name,
    data.position,
    data.boardId,
  )!
}

function createCard(data: {
  title: string
  description?: string | null
  position: number
  listId: number
  assigneeId?: number | null
}) {
  return one<CardRow>(
    `INSERT INTO "Card" ("title", "description", "position", "listId", "assigneeId")
     VALUES (?, ?, ?, ?, ?) RETURNING *`,
    data.title,
    data.description ?? null,
    data.position,
    data.listId,
    data.assigneeId ?? null,
  )!
}

function createActivityEvent(data: {
  boardId: number
  actorId: number
  eventType: string
  cardId?: number | null
  fromListId?: number | null
  toListId?: number | null
  createdAt?: Date
}) {
  return one<ActivityEventRow>(
    `INSERT INTO "ActivityEvent"
       ("boardId", "actorId", "eventType", "cardId", "fromListId", "toListId", "createdAt")
     VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
     RETURNING *`,
    data.boardId,
    data.actorId,
    data.eventType,
    data.cardId ?? null,
    data.fromListId ?? null,
    data.toListId ?? null,
    data.createdAt?.toISOString() ?? null,
  )!
}

function withActivityRelations(event: ActivityEventRow): ActivityEventWithRelations {
  return {
    ...event,
    actor: one<UserRow>(`SELECT * FROM "User" WHERE "id" = ?`, event.actorId) ?? undefined,
    card: event.cardId ? one<CardRow>(`SELECT * FROM "Card" WHERE "id" = ?`, event.cardId) : null,
    fromList: event.fromListId
      ? one<ListRow>(`SELECT * FROM "List" WHERE "id" = ?`, event.fromListId)
      : null,
    toList: event.toListId
      ? one<ListRow>(`SELECT * FROM "List" WHERE "id" = ?`, event.toListId)
      : null,
  }
}

const prisma = {
  user: {
    create: async ({ data }: CreateArgs<{ email: string; password: string; name: string }>) =>
      createUser(data),
  },
  board: {
    create: async ({ data }: CreateArgs<{ name: string }>) => createBoard(data),
  },
  boardMember: {
    create: async ({
      data,
    }: CreateArgs<{ userId: number; boardId: number; role?: string }>) => createBoardMember(data),
    findUnique: async ({
      where,
    }: {
      where: { userId_boardId: { userId: number; boardId: number } }
    }) =>
      one<BoardMemberRow>(
        `SELECT * FROM "BoardMember" WHERE "userId" = ? AND "boardId" = ?`,
        where.userId_boardId.userId,
        where.userId_boardId.boardId,
      ),
  },
  list: {
    create: async ({ data }: CreateArgs<{ name: string; position: number; boardId: number }>) =>
      createList(data),
    findUnique: async ({ where }: WhereId) =>
      one<ListRow>(`SELECT * FROM "List" WHERE "id" = ?`, where.id),
  },
  card: {
    create: async ({
      data,
    }: CreateArgs<{
      title: string
      description?: string | null
      position: number
      listId: number
      assigneeId?: number | null
    }>) => createCard(data),
    findUnique: async ({ where }: WhereId) =>
      one<CardRow>(`SELECT * FROM "Card" WHERE "id" = ?`, where.id),
    findUniqueOrThrow: async ({ where }: WhereId) => {
      const card = one<CardRow>(`SELECT * FROM "Card" WHERE "id" = ?`, where.id)
      if (!card) throw new Error('Card not found')
      return card
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: number }
      data: { listId: number; position: number }
    }) =>
      one<CardRow>(
        `UPDATE "Card" SET "listId" = ?, "position" = ? WHERE "id" = ? RETURNING *`,
        data.listId,
        data.position,
        where.id,
      ),
  },
  activityEvent: {
    create: async ({ data }: CreateArgs<Parameters<typeof createActivityEvent>[0]>) =>
      createActivityEvent(data),
    findMany: async ({
      where,
    }: {
      where?: { boardId?: number; cardId?: number }
      orderBy?: { createdAt: 'desc' | 'asc' }
      include?: unknown
    }) => {
      const clauses: string[] = []
      const params: unknown[] = []

      if (where?.boardId !== undefined) {
        clauses.push(`"boardId" = ?`)
        params.push(where.boardId)
      }

      if (where?.cardId !== undefined) {
        clauses.push(`"cardId" = ?`)
        params.push(where.cardId)
      }

      const rows = many<ActivityEventRow>(
        `SELECT * FROM "ActivityEvent"${clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''}
         ORDER BY "createdAt" DESC, "id" DESC`,
        ...params,
      )

      return rows.map(withActivityRelations)
    },
  },
  $transaction: async <T>(callback: (tx: Record<string, unknown>) => Promise<T>) => {
    db.exec('BEGIN')
    try {
      const result = await callback(prisma)
      db.exec('COMMIT')
      return result
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  },
}

async function createBoardFixture() {
  const actor = await prisma.user.create({
    data: {
      email: `ada-${Date.now()}-${Math.random()}@example.com`,
      password: 'hashed-password',
      name: 'Ada Lovelace',
    },
  })
  const board = await prisma.board.create({ data: { name: 'Launch Plan' } })
  await prisma.boardMember.create({ data: { userId: actor.id, boardId: board.id, role: 'owner' } })
  const fromList = await prisma.list.create({
    data: { name: 'Todo', position: 0, boardId: board.id },
  })
  const toList = await prisma.list.create({
    data: { name: 'Done', position: 1, boardId: board.id },
  })
  const card = await prisma.card.create({
    data: { title: 'Write activity feed', position: 0, listId: fromList.id },
  })
  const token = jwt.sign({ userId: actor.id }, JWT_SECRET, { expiresIn: '7d' })

  return { actor, board, fromList, toList, card, token }
}

beforeAll(async () => {
  createSchema()
  vi.doMock('../db', () => ({ default: prisma }))

  const [expressModule, supertestModule, jwtModule, cardsModule, activityModule] =
    await Promise.all([
      import('express'),
      import('supertest'),
      import('jsonwebtoken'),
      import('./cards'),
      import('./activity'),
    ])

  jwt = jwtModule
  request = supertestModule.default

  app = expressModule.default()
  app.use(expressModule.default.json())
  app.use('/cards', cardsModule.default)
  app.use('/boards', activityModule.default)
})

beforeEach(() => {
  clearData()
})

afterAll(() => {
  db.close()
})

describe('activity feed routes', () => {
  it('requires authentication before returning board activity', async () => {
    const response = await request(app).get('/boards/1/activity')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'Unauthorized' })
  })

  it('moves a card and records the activity event atomically', async () => {
    const { actor, board, fromList, toList, card, token } = await createBoardFixture()

    const response = await request(app)
      .patch(`/cards/${card.id}/move`)
      .set('Authorization', `Bearer ${token}`)
      .send({ targetListId: toList.id, position: 3 })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      ok: true,
      event: {
        boardId: board.id,
        actorId: actor.id,
        eventType: 'card_moved',
        cardId: card.id,
        fromListId: fromList.id,
        toListId: toList.id,
      },
    })

    const movedCard = await prisma.card.findUniqueOrThrow({ where: { id: card.id } })
    const events = await prisma.activityEvent.findMany({ where: { cardId: card.id } })

    expect(movedCard).toMatchObject({ listId: toList.id, position: 3 })
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      boardId: board.id,
      actorId: actor.id,
      eventType: 'card_moved',
      cardId: card.id,
      fromListId: fromList.id,
      toListId: toList.id,
    })
  })

  it('returns preview events newest first with denormalized display names', async () => {
    const { actor, board, fromList, toList, card } = await createBoardFixture()

    await prisma.activityEvent.create({
      data: {
        boardId: board.id,
        actorId: actor.id,
        eventType: 'card_moved',
        cardId: card.id,
        fromListId: fromList.id,
        toListId: toList.id,
        createdAt: new Date('2024-01-01T10:00:00.000Z'),
      },
    })
    await prisma.activityEvent.create({
      data: {
        boardId: board.id,
        actorId: actor.id,
        eventType: 'card_moved',
        cardId: card.id,
        fromListId: toList.id,
        toListId: fromList.id,
        createdAt: new Date('2024-01-01T11:00:00.000Z'),
      },
    })

    const response = await request(app).get(`/boards/${board.id}/activity/preview`)

    expect(response.status).toBe(200)
    expect(response.body).toHaveLength(2)
    expect(response.body.map((event: { createdAt: string }) => event.createdAt)).toEqual([
      '2024-01-01T11:00:00.000Z',
      '2024-01-01T10:00:00.000Z',
    ])
    expect(response.body[0]).toMatchObject({
      actorName: 'Ada Lovelace',
      cardTitle: 'Write activity feed',
      fromListName: 'Done',
      toListName: 'Todo',
    })
    expect(response.body[1]).toMatchObject({
      actorName: 'Ada Lovelace',
      cardTitle: 'Write activity feed',
      fromListName: 'Todo',
      toListName: 'Done',
    })
  })

  it('rolls back a failed move to a missing list without creating activity', async () => {
    const { card, fromList, token } = await createBoardFixture()

    const response = await request(app)
      .patch(`/cards/${card.id}/move`)
      .set('Authorization', `Bearer ${token}`)
      .send({ targetListId: 999_999, position: 2 })

    expect(response.status).toBe(500)
    expect(response.body.error).toBe('Move failed')

    const unchangedCard = await prisma.card.findUniqueOrThrow({ where: { id: card.id } })
    const events = await prisma.activityEvent.findMany({ where: { cardId: card.id } })

    expect(unchangedCard).toMatchObject({ listId: fromList.id, position: 0 })
    expect(events).toHaveLength(0)
  })
})
