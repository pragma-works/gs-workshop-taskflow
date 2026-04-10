import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import express, { Express, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

let app: Express
let prisma: PrismaClient
const testDbPath = path.join(__dirname, '../../test.db')

let testData: {
  users: { alice: any; bob: any }
  board: any
  lists: { backlog: any; inProgress: any; done: any }
  cards: { card1: any; card2: any }
  tokens: { alice: string; bob: string }
}

/**
 * Create test app with handlers that use provided Prisma instance
 */
function createTestApp(prismaInstance: PrismaClient): Express {
  const testApp = express()
  testApp.use(express.json())

  const verifyToken = (req: Request): number => {
    const header = req.headers.authorization
    if (!header) throw new Error('No auth header')
    const token = header.replace('Bearer ', '')
    const payload = jwt.verify(token, 'super-secret-key-change-me') as { userId: number }
    return payload.userId
  }

  // GET /boards/:id/activity
  testApp.get('/boards/:id/activity', async (req: Request, res: Response) => {
    let userId: number
    try {
      userId = verifyToken(req)
    } catch {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const boardId = parseInt(req.params.id)

    try {
      const isMember = await prismaInstance.boardMember.findUnique({
        where: { userId_boardId: { userId, boardId } },
      })
      if (!isMember) {
        res.status(403).json({ error: 'Not a board member' })
        return
      }

      const events = await prismaInstance.activityEvent.findMany({
        where: { boardId },
        include: {
          actor: { select: { id: true, name: true } },
          card: { select: { id: true, title: true } },
          fromList: { select: { id: true, name: true } },
          toList: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      })

      const result = events.map((event: any) => ({
        id: event.id,
        boardId: event.boardId,
        actorId: event.actorId,
        actorName: event.actor.name,
        eventType: event.eventType,
        cardId: event.cardId,
        cardTitle: event.card?.title ?? null,
        fromListName: event.fromList?.name ?? null,
        toListName: event.toList?.name ?? null,
        timestamp: event.createdAt,
      }))

      res.json(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      res.status(500).json({ error: 'Failed to fetch activity', details: message })
    }
  })

  // GET /boards/:id/activity/preview
  testApp.get('/boards/:id/activity/preview', async (req: Request, res: Response) => {
    const boardId = parseInt(req.params.id)

    try {
      const events = await prismaInstance.activityEvent.findMany({
        where: { boardId },
        include: {
          actor: { select: { id: true, name: true } },
          card: { select: { id: true, title: true } },
          fromList: { select: { id: true, name: true } },
          toList: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      })

      const result = events.map((event: any) => ({
        id: event.id,
        boardId: event.boardId,
        actorId: event.actorId,
        actorName: event.actor.name,
        eventType: event.eventType,
        cardId: event.cardId,
        cardTitle: event.card?.title ?? null,
        fromListName: event.fromList?.name ?? null,
        toListName: event.toList?.name ?? null,
        timestamp: event.createdAt,
      }))

      res.json(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      res.status(500).json({ error: 'Failed to fetch activity', details: message })
    }
  })

  // PATCH /cards/:id/move
  testApp.patch('/cards/:id/move', async (req: Request, res: Response) => {
    let userId: number
    try {
      userId = verifyToken(req)
    } catch {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const cardId = parseInt(req.params.id)
    const { targetListId, position } = req.body

    try {
      const card = await prismaInstance.card.findUnique({ where: { id: cardId } })
      if (!card) {
        res.status(404).json({ error: 'Not found' })
        return
      }

      const targetList = await prismaInstance.list.findUnique({ where: { id: targetListId } })
      if (!targetList) {
        res.status(404).json({ error: 'Target list not found' })
        return
      }

      const boardId = targetList.boardId
      const fromListId = card.listId

      const isMember = await prismaInstance.boardMember.findUnique({
        where: { userId_boardId: { userId, boardId } },
      })
      if (!isMember) {
        res.status(403).json({ error: 'Not a board member' })
        return
      }

      const result = await prismaInstance.$transaction(async (tx: any) => {
        const updatedCard = await tx.card.update({
          where: { id: cardId },
          data: { listId: targetListId, position },
        })

        const event = await tx.activityEvent.create({
          data: {
            boardId,
            actorId: userId,
            eventType: 'card_moved',
            cardId,
            fromListId,
            toListId: targetListId,
          },
        })

        return { updatedCard, event }
      })

      res.json({ ok: true, event: result.event })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      res.status(500).json({ error: 'Move failed', details: message })
    }
  })

  return testApp
}

/**
 * Test setup and teardown
 */
beforeAll(async () => {
  // Clean up any existing test database
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath)
  }

  // Create Prisma client for test database (file-based)
  process.env.DATABASE_URL = `file:${testDbPath}`
  
  prisma = new PrismaClient()

  // Create schema directly with rawSQL
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "User" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "email" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "Board" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "BoardMember" (
        "userId" INTEGER NOT NULL,
        "boardId" INTEGER NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'member',
        PRIMARY KEY ("userId", "boardId"),
        FOREIGN KEY ("userId") REFERENCES "User"("id"),
        FOREIGN KEY ("boardId") REFERENCES "Board"("id")
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "List" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "position" INTEGER NOT NULL,
        "boardId" INTEGER NOT NULL,
        FOREIGN KEY ("boardId") REFERENCES "Board"("id")
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "Card" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "position" INTEGER NOT NULL,
        "dueDate" DATETIME,
        "listId" INTEGER NOT NULL,
        "assigneeId" INTEGER,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("listId") REFERENCES "List"("id"),
        FOREIGN KEY ("assigneeId") REFERENCES "User"("id")
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "Label" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "color" TEXT NOT NULL
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "CardLabel" (
        "cardId" INTEGER NOT NULL,
        "labelId" INTEGER NOT NULL,
        PRIMARY KEY ("cardId", "labelId"),
        FOREIGN KEY ("cardId") REFERENCES "Card"("id"),
        FOREIGN KEY ("labelId") REFERENCES "Label"("id")
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "Comment" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "content" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "cardId" INTEGER NOT NULL,
        "userId" INTEGER NOT NULL,
        FOREIGN KEY ("cardId") REFERENCES "Card"("id"),
        FOREIGN KEY ("userId") REFERENCES "User"("id")
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "ActivityEvent" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "boardId" INTEGER NOT NULL,
        "actorId" INTEGER NOT NULL,
        "eventType" TEXT NOT NULL,
        "cardId" INTEGER,
        "fromListId" INTEGER,
        "toListId" INTEGER,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("boardId") REFERENCES "Board"("id"),
        FOREIGN KEY ("actorId") REFERENCES "User"("id"),
        FOREIGN KEY ("cardId") REFERENCES "Card"("id"),
        FOREIGN KEY ("fromListId") REFERENCES "List"("id"),
        FOREIGN KEY ("toListId") REFERENCES "List"("id")
      )
    `)
  } catch (error: any) {
    console.error('Failed to create schema:', error.message)
    throw error
  }

  // Create test app
  app = createTestApp(prisma)
})

afterAll(async () => {
  await prisma.$disconnect()
  // Clean up test database file
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath)
  }
})

beforeEach(async () => {
  const password = await bcrypt.hash('password123', 10)

  // Create users
  const alice = await prisma.user.create({
    data: { email: 'alice@test.com', password, name: 'Alice' },
  })
  const bob = await prisma.user.create({
    data: { email: 'bob@test.com', password, name: 'Bob' },
  })

  // Create board
  const board = await prisma.board.create({
    data: { name: 'Test Board' },
  })

  // Add members
  await prisma.boardMember.createMany({
    data: [
      { userId: alice.id, boardId: board.id, role: 'owner' },
      { userId: bob.id, boardId: board.id, role: 'member' },
    ],
  })

  // Create lists
  const backlog = await prisma.list.create({
    data: { name: 'Backlog', position: 0, boardId: board.id },
  })
  const inProgress = await prisma.list.create({
    data: { name: 'In Progress', position: 1, boardId: board.id },
  })
  const done = await prisma.list.create({
    data: { name: 'Done', position: 2, boardId: board.id },
  })

  // Create cards
  const card1 = await prisma.card.create({
    data: {
      title: 'First card',
      position: 0,
      listId: backlog.id,
      assigneeId: alice.id,
    },
  })
  const card2 = await prisma.card.create({
    data: {
      title: 'Second card',
      position: 1,
      listId: backlog.id,
      assigneeId: bob.id,
    },
  })

  // Create JWT tokens
  const aliceToken = jwt.sign({ userId: alice.id }, 'super-secret-key-change-me', {
    expiresIn: '7d',
  })
  const bobToken = jwt.sign({ userId: bob.id }, 'super-secret-key-change-me', {
    expiresIn: '7d',
  })

  testData = {
    users: { alice, bob },
    board,
    lists: { backlog, inProgress, done },
    cards: { card1, card2 },
    tokens: { alice: aliceToken, bob: bobToken },
  }
})

afterEach(async () => {
  // Clean up all data after each test
  await prisma.activityEvent.deleteMany({})
  await prisma.comment.deleteMany({})
  await prisma.cardLabel.deleteMany({})
  await prisma.card.deleteMany({})
  await prisma.list.deleteMany({})
  await prisma.boardMember.deleteMany({})
  await prisma.board.deleteMany({})
  await prisma.user.deleteMany({})
})

// ============================================================================
// TEST SUITE: Activity Feed Feature
// ============================================================================

describe('Activity Feed Feature', () => {
  // =========================================================================
  // TEST 1: Authentication and authorization for activity feed
  // =========================================================================
  describe('GET /boards/:id/activity endpoint authentication', () => {
    it('Unauthenticated request returns 401 Unauthorized', async () => {
      const res = await request(app).get(`/boards/${testData.board.id}/activity`)

      expect(res.status).toBe(401)
      expect(res.body).toEqual({ error: 'Unauthorized' })
    })

    it('Authenticated non-member returns 403 Forbidden', async () => {
      const outsider = await prisma.user.create({
        data: {
          email: 'outsider@test.com',
          password: await bcrypt.hash('password123', 10),
          name: 'Outsider',
        },
      })
      const token = jwt.sign({ userId: outsider.id }, 'super-secret-key-change-me', {
        expiresIn: '7d',
      })

      const res = await request(app)
        .get(`/boards/${testData.board.id}/activity`)
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(403)
      expect(res.body).toEqual({ error: 'Not a board member' })
    })

    it('Authenticated board member receives activity feed in reverse chronological order', async () => {
      // Create activity events with specific timestamps
      const event1 = await prisma.activityEvent.create({
        data: {
          boardId: testData.board.id,
          actorId: testData.users.alice.id,
          eventType: 'card_moved',
          cardId: testData.cards.card1.id,
          fromListId: testData.lists.backlog.id,
          toListId: testData.lists.inProgress.id,
          createdAt: new Date('2026-04-10T10:00:00Z'),
        },
      })
      const event2 = await prisma.activityEvent.create({
        data: {
          boardId: testData.board.id,
          actorId: testData.users.bob.id,
          eventType: 'card_moved',
          cardId: testData.cards.card2.id,
          fromListId: testData.lists.backlog.id,
          toListId: testData.lists.done.id,
          createdAt: new Date('2026-04-10T11:00:00Z'),
        },
      })

      const res = await request(app)
        .get(`/boards/${testData.board.id}/activity`)
        .set('Authorization', `Bearer ${testData.tokens.alice}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(2)
      // Latest first
      expect(res.body[0].id).toBe(event2.id)
      expect(res.body[1].id).toBe(event1.id)
    })
  })

  // =========================================================================
  // TEST 2: GET /boards/:id/activity/preview returns events in reverse chronological order
  // =========================================================================
  describe('GET /boards/:id/activity/preview endpoint', () => {
    it('No authentication required for preview endpoint', async () => {
      const event = await prisma.activityEvent.create({
        data: {
          boardId: testData.board.id,
          actorId: testData.users.alice.id,
          eventType: 'card_moved',
          cardId: testData.cards.card1.id,
          fromListId: testData.lists.backlog.id,
          toListId: testData.lists.inProgress.id,
        },
      })

      const res = await request(app).get(`/boards/${testData.board.id}/activity/preview`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(1)
      expect(res.body[0].id).toBe(event.id)
      expect(res.body[0].actorName).toBe('Alice')
      expect(res.body[0].cardTitle).toBe('First card')
      expect(res.body[0].fromListName).toBe('Backlog')
      expect(res.body[0].toListName).toBe('In Progress')
    })

    it('Preview returns events in reverse chronological order (latest first)', async () => {
      const event1 = await prisma.activityEvent.create({
        data: {
          boardId: testData.board.id,
          actorId: testData.users.alice.id,
          eventType: 'card_moved',
          cardId: testData.cards.card1.id,
          fromListId: testData.lists.backlog.id,
          toListId: testData.lists.inProgress.id,
          createdAt: new Date('2026-04-10T08:00:00Z'),
        },
      })
      const event2 = await prisma.activityEvent.create({
        data: {
          boardId: testData.board.id,
          actorId: testData.users.bob.id,
          eventType: 'card_moved',
          cardId: testData.cards.card2.id,
          fromListId: testData.lists.backlog.id,
          toListId: testData.lists.done.id,
          createdAt: new Date('2026-04-10T09:30:00Z'),
        },
      })
      const event3 = await prisma.activityEvent.create({
        data: {
          boardId: testData.board.id,
          actorId: testData.users.alice.id,
          eventType: 'card_moved',
          cardId: testData.cards.card1.id,
          fromListId: testData.lists.inProgress.id,
          toListId: testData.lists.done.id,
          createdAt: new Date('2026-04-10T10:45:00Z'),
        },
      })

      const res = await request(app).get(`/boards/${testData.board.id}/activity/preview`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(3)
      expect(res.body[0].id).toBe(event3.id)
      expect(res.body[1].id).toBe(event2.id)
      expect(res.body[2].id).toBe(event1.id)
    })

    it('Preview returns null for nullable event fields', async () => {
      const event = await prisma.activityEvent.create({
        data: {
          boardId: testData.board.id,
          actorId: testData.users.alice.id,
          eventType: 'board_created',
          // cardId, fromListId, toListId are nullable and not provided
        },
      })

      const res = await request(app).get(`/boards/${testData.board.id}/activity/preview`)

      expect(res.status).toBe(200)
      expect(res.body[0].cardTitle).toBeNull()
      expect(res.body[0].fromListName).toBeNull()
      expect(res.body[0].toListName).toBeNull()
    })
  })

  // =========================================================================
  // TEST 3: PATCH /cards/:id/move creates ActivityEvent in same transaction
  // =========================================================================
  describe('PATCH /cards/:id/move with Activity Logging', () => {
    it('Card move creates an ActivityEvent in the same transaction', async () => {
      const res = await request(app)
        .patch(`/cards/${testData.cards.card1.id}/move`)
        .set('Authorization', `Bearer ${testData.tokens.alice}`)
        .send({
          targetListId: testData.lists.inProgress.id,
          position: 0,
        })

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('ok', true)
      expect(res.body).toHaveProperty('event')

      const event = res.body.event
      expect(event).toHaveProperty('id')
      expect(event.boardId).toBe(testData.board.id)
      expect(event.actorId).toBe(testData.users.alice.id)
      expect(event.eventType).toBe('card_moved')
      expect(event.cardId).toBe(testData.cards.card1.id)
      expect(event.fromListId).toBe(testData.lists.backlog.id)
      expect(event.toListId).toBe(testData.lists.inProgress.id)

      // Verify card was moved
      const updatedCard = await prisma.card.findUnique({
        where: { id: testData.cards.card1.id },
      })
      expect(updatedCard?.listId).toBe(testData.lists.inProgress.id)
      expect(updatedCard?.position).toBe(0)

      // Verify event persisted in database
      const storedEvent = await prisma.activityEvent.findUnique({
        where: { id: event.id },
      })
      expect(storedEvent).not.toBeNull()
      expect(storedEvent?.eventType).toBe('card_moved')
    })

    it('Unauthenticated card move returns 401', async () => {
      const res = await request(app)
        .patch(`/cards/${testData.cards.card1.id}/move`)
        .send({
          targetListId: testData.lists.inProgress.id,
          position: 0,
        })

      expect(res.status).toBe(401)
    })

    it('Card move by non-member returns 403 Forbidden', async () => {
      const outsider = await prisma.user.create({
        data: {
          email: 'outsider2@test.com',
          password: await bcrypt.hash('password123', 10),
          name: 'Outsider2',
        },
      })
      const token = jwt.sign({ userId: outsider.id }, 'super-secret-key-change-me', {
        expiresIn: '7d',
      })

      const res = await request(app)
        .patch(`/cards/${testData.cards.card1.id}/move`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          targetListId: testData.lists.inProgress.id,
          position: 0,
        })

      expect(res.status).toBe(403)
    })
  })

  // =========================================================================
  // TEST 4: Moving to non-existent list returns 404 and rolls back cleanly
  // =========================================================================
  describe('Moving card to non-existent list', () => {
    it('Moving a card to a non-existent list returns 404 and does not create ActivityEvent', async () => {
      const originalListId = testData.cards.card1.listId

      const res = await request(app)
        .patch(`/cards/${testData.cards.card1.id}/move`)
        .set('Authorization', `Bearer ${testData.tokens.alice}`)
        .send({
          targetListId: 999, // Non-existent
          position: 0,
        })

      expect(res.status).toBe(404)
      expect(res.body).toEqual({ error: 'Target list not found' })

      // Verify card was NOT moved
      const card = await prisma.card.findUnique({
        where: { id: testData.cards.card1.id },
      })
      expect(card?.listId).toBe(originalListId)

      // Verify no activity event was created
      const events = await prisma.activityEvent.findMany({
        where: { cardId: testData.cards.card1.id },
      })
      expect(events).toHaveLength(0)
    })

    it('Moving non-existent card returns 404', async () => {
      const res = await request(app)
        .patch('/cards/999/move')
        .set('Authorization', `Bearer ${testData.tokens.alice}`)
        .send({
          targetListId: testData.lists.inProgress.id,
          position: 0,
        })

      expect(res.status).toBe(404)
    })
  })

  // =========================================================================
  // INTEGRATION TEST: Multiple moves with correct ordering and metadata
  // =========================================================================
  describe('Full activity feed integration scenario', () => {
    it('Multiple card moves create correct activity history with metadata', async () => {
      // Alice moves card1 to In Progress
      const move1 = await request(app)
        .patch(`/cards/${testData.cards.card1.id}/move`)
        .set('Authorization', `Bearer ${testData.tokens.alice}`)
        .send({
          targetListId: testData.lists.inProgress.id,
          position: 0,
        })
      expect(move1.status).toBe(200)

      // Bob moves card2 to Done
      const move2 = await request(app)
        .patch(`/cards/${testData.cards.card2.id}/move`)
        .set('Authorization', `Bearer ${testData.tokens.bob}`)
        .send({
          targetListId: testData.lists.done.id,
          position: 0,
        })
      expect(move2.status).toBe(200)

      // Alice moves card1 from In Progress to Done
      const move3 = await request(app)
        .patch(`/cards/${testData.cards.card1.id}/move`)
        .set('Authorization', `Bearer ${testData.tokens.alice}`)
        .send({
          targetListId: testData.lists.done.id,
          position: 1,
        })
      expect(move3.status).toBe(200)

      // Fetch activity feed
      const feed = await request(app)
        .get(`/boards/${testData.board.id}/activity`)
        .set('Authorization', `Bearer ${testData.tokens.alice}`)

      expect(feed.status).toBe(200)
      expect(feed.body).toHaveLength(3)

      // Verify reverse chronological order and correct metadata
      expect(feed.body[0].actorName).toBe('Alice')
      expect(feed.body[0].cardTitle).toBe('First card')
      expect(feed.body[0].fromListName).toBe('In Progress')
      expect(feed.body[0].toListName).toBe('Done')

      expect(feed.body[1].actorName).toBe('Bob')
      expect(feed.body[1].cardTitle).toBe('Second card')
      expect(feed.body[1].fromListName).toBe('Backlog')
      expect(feed.body[1].toListName).toBe('Done')

      expect(feed.body[2].actorName).toBe('Alice')
      expect(feed.body[2].cardTitle).toBe('First card')
      expect(feed.body[2].fromListName).toBe('Backlog')
      expect(feed.body[2].toListName).toBe('In Progress')
    })
  })
})
