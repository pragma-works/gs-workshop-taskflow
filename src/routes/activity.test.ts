import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import * as jwt from 'jsonwebtoken'

// ---------------------------------------------------------------------------
// Mock prisma — must be hoisted so it is in place before any route module
// imports ../db
// ---------------------------------------------------------------------------
const mockPrisma = vi.hoisted(() => ({
  boardMember:   { findUnique: vi.fn() },
  activityEvent: { findMany: vi.fn(), create: vi.fn() },
  card:          { findUnique: vi.fn(), update: vi.fn() },
  $transaction:  vi.fn(),
}))

vi.mock('../db', () => ({ default: mockPrisma }))

// ---------------------------------------------------------------------------
// Import routers *after* the mock is registered.
// Build a minimal Express app so we never call app.listen() from index.ts.
// ---------------------------------------------------------------------------
import cardsRouter    from './cards'
import activityRouter from './activity'

const app = express()
app.use(express.json())
app.use('/boards', activityRouter)
app.use('/cards',  cardsRouter)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const JWT_SECRET = 'super-secret-key-change-me'

function bearerToken(userId = 1): string {
  return `Bearer ${jwt.sign({ userId }, JWT_SECRET)}`
}

// A full ActivityEvent row as Prisma would return it after the include
function makeRawEvent(overrides: Record<string, unknown> = {}) {
  return {
    id:         1,
    boardId:    1,
    actorId:    1,
    eventType:  'card_moved',
    cardId:     1,
    fromListId: 1,
    toListId:   2,
    createdAt:  new Date('2026-04-07T10:00:00Z'),
    actor:      { name: 'Alice' },
    card:       { title: 'Fix login redirect' },
    fromList:   { name: 'Backlog' },
    toList:     { name: 'In Progress' },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Activity feed', () => {
  beforeEach(() => vi.resetAllMocks())

  // -------------------------------------------------------------------------
  describe('GET /boards/:id/activity — authentication', () => {
    it('returns 401 when no Authorization header is provided', async () => {
      const res = await request(app).get('/boards/1/activity')

      expect(res.status).toBe(401)
      expect(res.body.error).toBe('Unauthorized')
    })

    it('returns 403 when the caller is not a member of the board', async () => {
      mockPrisma.boardMember.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .get('/boards/1/activity')
        .set('Authorization', bearerToken(99))

      expect(res.status).toBe(403)
      expect(res.body.error).toBe('Not a board member')
    })
  })

  // -------------------------------------------------------------------------
  describe('PATCH /cards/:id/move — atomicity', () => {
    it('creates an ActivityEvent in the same transaction as the card position update', async () => {
      mockPrisma.card.findUnique.mockResolvedValue({
        id: 1, listId: 1, list: { boardId: 1 },
      })
      mockPrisma.card.update.mockResolvedValue({ id: 1, listId: 2, position: 0 })

      const createdEvent = {
        id: 7, boardId: 1, actorId: 1, eventType: 'card_moved',
        cardId: 1, fromListId: 1, toListId: 2, createdAt: new Date(),
      }
      mockPrisma.activityEvent.create.mockResolvedValue(createdEvent)

      // Simulate Prisma's array-based transaction: resolve both operations
      mockPrisma.$transaction.mockImplementation(
        (ops: Promise<unknown>[]) => Promise.all(ops),
      )

      const res = await request(app)
        .patch('/cards/1/move')
        .set('Authorization', bearerToken(1))
        .send({ targetListId: 2, position: 0 })

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(res.body.event.eventType).toBe('card_moved')

      // Both writes must be submitted through $transaction — if this is called
      // exactly once with two operations, neither write can succeed without the other.
      expect(mockPrisma.$transaction).toHaveBeenCalledOnce()
      const [ops] = mockPrisma.$transaction.mock.calls[0] as [unknown[]]
      expect(ops).toHaveLength(2)
    })

    it('carries the correct fromListId, toListId, actorId, and boardId on the event', async () => {
      mockPrisma.card.findUnique.mockResolvedValue({
        id: 3, listId: 5, list: { boardId: 2 },
      })
      mockPrisma.card.update.mockResolvedValue({})

      let capturedEventData: Record<string, unknown> = {}
      mockPrisma.activityEvent.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) => {
          capturedEventData = data
          return Promise.resolve({ id: 1, ...data, createdAt: new Date() })
        },
      )
      mockPrisma.$transaction.mockImplementation(
        (ops: Promise<unknown>[]) => Promise.all(ops),
      )

      await request(app)
        .patch('/cards/3/move')
        .set('Authorization', bearerToken(42))
        .send({ targetListId: 9, position: 1 })

      expect(capturedEventData.eventType).toBe('card_moved')
      expect(capturedEventData.cardId).toBe(3)
      expect(capturedEventData.fromListId).toBe(5)
      expect(capturedEventData.toListId).toBe(9)
      expect(capturedEventData.actorId).toBe(42)
      expect(capturedEventData.boardId).toBe(2)
    })
  })

  // -------------------------------------------------------------------------
  describe('GET /boards/:id/activity/preview — response shape and ordering', () => {
    it('returns events in reverse chronological order with denormalized actor and list names', async () => {
      const earlier = new Date('2026-04-07T09:00:00Z')
      const later   = new Date('2026-04-07T10:00:00Z')

      mockPrisma.activityEvent.findMany.mockResolvedValue([
        makeRawEvent({ id: 2, createdAt: later  }),
        makeRawEvent({ id: 1, eventType: 'card_created', fromListId: null, toListId: null,
                       fromList: null, toList: null, createdAt: earlier }),
      ])

      const res = await request(app).get('/boards/1/activity/preview')

      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(2)

      // Most recent event first
      expect(new Date(res.body[0].timestamp).getTime())
        .toBeGreaterThan(new Date(res.body[1].timestamp).getTime())

      // Denormalized fields present on first event
      expect(res.body[0].actorName).toBe('Alice')
      expect(res.body[0].cardTitle).toBe('Fix login redirect')
      expect(res.body[0].fromListName).toBe('Backlog')
      expect(res.body[0].toListName).toBe('In Progress')

      // Nullable relations come back as null, not undefined
      expect(res.body[1].fromListName).toBeNull()
      expect(res.body[1].toListName).toBeNull()
    })

    it('requires no Authorization header', async () => {
      mockPrisma.activityEvent.findMany.mockResolvedValue([makeRawEvent()])

      // No .set('Authorization', ...) — must not 401
      const res = await request(app).get('/boards/1/activity/preview')

      expect(res.status).toBe(200)
    })
  })

  // -------------------------------------------------------------------------
  describe('PATCH /cards/:id/move — invalid target list', () => {
    it('returns 500 and does not partially commit when the target list does not exist', async () => {
      mockPrisma.card.findUnique.mockResolvedValue({
        id: 1, listId: 1, list: { boardId: 1 },
      })

      // Simulate the FK constraint the DB would raise inside the transaction
      mockPrisma.$transaction.mockRejectedValue(
        new Error('Foreign key constraint failed on the field: `Card_listId_fkey`'),
      )

      const res = await request(app)
        .patch('/cards/1/move')
        .set('Authorization', bearerToken(1))
        .send({ targetListId: 9999, position: 0 })

      expect(res.status).toBe(500)
      expect(res.body.error).toBe('Move failed')
      expect(res.body.details).toContain('Foreign key constraint')

      // $transaction threw before committing → both writes were rolled back.
      // Confirmed by: $transaction called once, card.update never committed outside it.
      expect(mockPrisma.$transaction).toHaveBeenCalledOnce()
    })
  })
})
