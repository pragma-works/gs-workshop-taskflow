const DATABASE_URL = process.env.DATABASE_URL || 'file:memory:?cache=shared'
process.env.DATABASE_URL = DATABASE_URL

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import * as jwt from 'jsonwebtoken'
import type { Express } from 'express'
import type { PrismaClient } from '@prisma/client'

const JWT_SECRET = 'super-secret-key-change-me'
let app: Express
let prisma: PrismaClient

async function createSchema() {
  await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = ON;`)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "User" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Board" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "BoardMember" (
      userId INTEGER NOT NULL,
      boardId INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      PRIMARY KEY (userId, boardId),
      FOREIGN KEY (userId) REFERENCES "User"(id),
      FOREIGN KEY (boardId) REFERENCES "Board"(id)
    );
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "List" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      position INTEGER NOT NULL,
      boardId INTEGER NOT NULL,
      FOREIGN KEY (boardId) REFERENCES "Board"(id)
    );
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Card" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      position INTEGER NOT NULL,
      dueDate DATETIME,
      listId INTEGER NOT NULL,
      assigneeId INTEGER,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (listId) REFERENCES "List"(id),
      FOREIGN KEY (assigneeId) REFERENCES "User"(id)
    );
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Label" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL
    );
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CardLabel" (
      cardId INTEGER NOT NULL,
      labelId INTEGER NOT NULL,
      PRIMARY KEY (cardId, labelId),
      FOREIGN KEY (cardId) REFERENCES "Card"(id),
      FOREIGN KEY (labelId) REFERENCES "Label"(id)
    );
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Comment" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      cardId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      FOREIGN KEY (cardId) REFERENCES "Card"(id),
      FOREIGN KEY (userId) REFERENCES "User"(id)
    );
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ActivityEvent" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      boardId INTEGER NOT NULL,
      actorId INTEGER NOT NULL,
      eventType TEXT NOT NULL,
      cardId INTEGER,
      fromListId INTEGER,
      toListId INTEGER,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (boardId) REFERENCES "Board"(id),
      FOREIGN KEY (actorId) REFERENCES "User"(id),
      FOREIGN KEY (cardId) REFERENCES "Card"(id),
      FOREIGN KEY (fromListId) REFERENCES "List"(id),
      FOREIGN KEY (toListId) REFERENCES "List"(id)
    );
  `)
}

async function clearTables() {
  await prisma.$executeRawUnsafe(`DELETE FROM "ActivityEvent";`)
  await prisma.$executeRawUnsafe(`DELETE FROM "Comment";`)
  await prisma.$executeRawUnsafe(`DELETE FROM "CardLabel";`)
  await prisma.$executeRawUnsafe(`DELETE FROM "Card";`)
  await prisma.$executeRawUnsafe(`DELETE FROM "List";`)
  await prisma.$executeRawUnsafe(`DELETE FROM "BoardMember";`)
  await prisma.$executeRawUnsafe(`DELETE FROM "Board";`)
  await prisma.$executeRawUnsafe(`DELETE FROM "User";`)
}

describe('activity feed', () => {
  beforeAll(async () => {
    const dbModule = await import('../db')
    prisma = dbModule.default
    const appModule = await import('../index')
    app = appModule.default

    await prisma.$connect()
    await createSchema()
  })

  beforeEach(async () => {
    await clearTables()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('returns 401 for unauthenticated board activity access', async () => {
    const res = await request(app).get('/boards/1/activity')
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'Unauthorized' })
  })

  it('creates an ActivityEvent when a card is moved', async () => {
    const user = await prisma.user.create({ data: { email: 'owner@example.com', password: 'secret', name: 'Owner' } })
    const board = await prisma.board.create({ data: { name: 'Team board' } })
    await prisma.boardMember.create({ data: { userId: user.id, boardId: board.id, role: 'owner' } })
    const sourceList = await prisma.list.create({ data: { name: 'Backlog', position: 0, boardId: board.id } })
    const targetList = await prisma.list.create({ data: { name: 'Done', position: 1, boardId: board.id } })
    const card = await prisma.card.create({ data: { title: 'Task', description: 'Move me', position: 0, listId: sourceList.id } })
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })

    const res = await request(app)
      .patch(`/cards/${card.id}/move`)
      .set('Authorization', `Bearer ${token}`)
      .send({ targetListId: targetList.id, position: 0 })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.event).toMatchObject({
      boardId: board.id,
      actorId: user.id,
      eventType: 'card_moved',
      cardId: card.id,
      fromListId: sourceList.id,
      toListId: targetList.id,
    })

    const eventCount = await prisma.activityEvent.count({ where: { boardId: board.id } })
    expect(eventCount).toBe(1)

    const updatedCard = await prisma.card.findUnique({ where: { id: card.id } })
    expect(updatedCard?.listId).toBe(targetList.id)
  })

  it('returns preview activity events in reverse chronological order', async () => {
    const user = await prisma.user.create({ data: { email: 'actor@example.com', password: 'secret', name: 'Actor' } })
    const board = await prisma.board.create({ data: { name: 'Project board' } })
    await prisma.boardMember.create({ data: { userId: user.id, boardId: board.id, role: 'owner' } })
    const listA = await prisma.list.create({ data: { name: 'Todo', position: 0, boardId: board.id } })
    const listB = await prisma.list.create({ data: { name: 'Doing', position: 1, boardId: board.id } })
    const card = await prisma.card.create({ data: { title: 'Review', description: 'Check this', position: 0, listId: listA.id } })

    const olderEvent = await prisma.activityEvent.create({
      data: {
        boardId: board.id,
        actorId: user.id,
        eventType: 'card_moved',
        cardId: card.id,
        fromListId: listA.id,
        toListId: listB.id,
        createdAt: new Date(Date.now() - 10000),
      },
    })

    const newerEvent = await prisma.activityEvent.create({
      data: {
        boardId: board.id,
        actorId: user.id,
        eventType: 'card_moved',
        cardId: card.id,
        fromListId: listB.id,
        toListId: listA.id,
        createdAt: new Date(Date.now() - 1000),
      },
    })

    const res = await request(app).get(`/boards/${board.id}/activity/preview`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].id).toBe(newerEvent.id)
    expect(res.body[1].id).toBe(olderEvent.id)
    expect(res.body[0]).toMatchObject({
      actorName: 'Actor',
      cardTitle: 'Review',
      fromListName: 'Doing',
      toListName: 'Todo',
    })
  })

  it('rolls back the move when the target list does not exist', async () => {
    const user = await prisma.user.create({ data: { email: 'rollback@example.com', password: 'secret', name: 'Rollback' } })
    const board = await prisma.board.create({ data: { name: 'Rollback board' } })
    await prisma.boardMember.create({ data: { userId: user.id, boardId: board.id, role: 'owner' } })
    const sourceList = await prisma.list.create({ data: { name: 'Start', position: 0, boardId: board.id } })
    const card = await prisma.card.create({ data: { title: 'Safe task', description: 'Should not move', position: 0, listId: sourceList.id } })
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })

    const res = await request(app)
      .patch(`/cards/${card.id}/move`)
      .set('Authorization', `Bearer ${token}`)
      .send({ targetListId: 9999, position: 0 })

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Move failed')
    expect(await prisma.activityEvent.count()).toBe(0)

    const unchangedCard = await prisma.card.findUnique({ where: { id: card.id } })
    expect(unchangedCard?.listId).toBe(sourceList.id)
  })
})
