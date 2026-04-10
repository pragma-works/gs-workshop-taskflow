import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import jwt from 'jsonwebtoken'

// vi.hoisted ensures the mock object is available inside the vi.mock factory,
// which is hoisted above all imports by Vitest at compile time.
const prismaMock = vi.hoisted(() => ({
  card: {
    findUnique: vi.fn(),
    update:     vi.fn(),
    create:     vi.fn(),
    count:      vi.fn(),
    delete:     vi.fn(),
  },
  comment: {
    findMany: vi.fn(),
    create:   vi.fn(),
  },
  cardLabel: {
    findMany: vi.fn(),
  },
  label: {
    findUnique: vi.fn(),
  },
  activityEvent: {
    create:   vi.fn(),
    findMany: vi.fn(),
  },
  boardMember: {
    findUnique: vi.fn(),
    findMany:   vi.fn(),
    create:     vi.fn(),
  },
  $transaction: vi.fn(),
}))

vi.mock('../db', () => ({ default: prismaMock }))

// Imported AFTER vi.mock so they receive the mocked prisma singleton.
import cardsRouter    from './cards'
import activityRouter from './activity'

// ─── Helpers ────────────────────────────────────────────────────────────────

const JWT_SECRET = 'super-secret-key-change-me'

function makeToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET)
}

/** Minimal Express app that mirrors the production mount points. */
function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/cards',  cardsRouter)
  app.use('/boards', activityRouter)
  return app
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Activity feed', () => {
  const app = buildApp()

  beforeEach(() => {
    vi.resetAllMocks()
  })

  // ── 1. Authentication guard ──────────────────────────────────────────────

  it('rejects unauthenticated requests to GET /boards/:id/activity with 401', async () => {
    const res = await request(app).get('/boards/1/activity')

    expect(res.status).toBe(401)
  })

  // ── 2. Transactional write on card move ──────────────────────────────────

  it('creates an ActivityEvent atomically with the card update when a card is moved', async () => {
    const cardId     = 1
    const fromListId = 10
    const toListId   = 20
    const boardId    = 5
    const actorId    = 3

    prismaMock.card.findUnique.mockResolvedValue({
      id:     cardId,
      listId: fromListId,
      list:   { id: fromListId, boardId },
    })

    prismaMock.card.update.mockResolvedValue({
      id:       cardId,
      listId:   toListId,
      position: 1,
    })

    const fakeEvent = {
      id:        99,
      eventType: 'card_moved',
      boardId,
      actorId,
      cardId,
      fromListId,
      toListId,
      createdAt: new Date().toISOString(),
    }
    prismaMock.activityEvent.create.mockResolvedValue(fakeEvent)

    // Simulate the sequential array transaction Prisma uses:
    // each element is an already-evaluated PrismaPromise, so
    // Promise.all resolves them in order → [updatedCard, createdEvent].
    prismaMock.$transaction.mockImplementation(
      (ops: Promise<unknown>[]) => Promise.all(ops),
    )

    const res = await request(app)
      .patch(`/cards/${cardId}/move`)
      .set('Authorization', `Bearer ${makeToken(actorId)}`)
      .send({ targetListId: toListId, position: 1 })

    expect(res.status).toBe(200)

    // Both writes must be issued inside a single $transaction call.
    expect(prismaMock.$transaction).toHaveBeenCalledOnce()

    // The ActivityEvent must carry the full move context.
    expect(prismaMock.activityEvent.create).toHaveBeenCalledWith({
      data: {
        eventType: 'card_moved',
        boardId,
        actorId,
        cardId,
        fromListId,
        toListId,
      },
    })

    expect(res.body).toMatchObject({
      ok:    true,
      event: { id: 99, eventType: 'card_moved' },
    })
  })

  // ── 3. Reverse-chronological ordering ────────────────────────────────────

  it('returns activity events newest-first for GET /boards/:id/activity/preview', async () => {
    const boardId = 1
    const base    = Date.now()

    // Simulate the DB returning rows already sorted descending (orderBy createdAt desc).
    const newestFirst = [
      { id: 3, boardId, eventType: 'comment_added', createdAt: new Date(base).toISOString() },
      { id: 2, boardId, eventType: 'card_moved',    createdAt: new Date(base - 1000).toISOString() },
      { id: 1, boardId, eventType: 'card_moved',    createdAt: new Date(base - 2000).toISOString() },
    ]
    prismaMock.activityEvent.findMany.mockResolvedValue(newestFirst)

    const res = await request(app).get(`/boards/${boardId}/activity/preview`)

    expect(res.status).toBe(200)

    const ids: number[] = res.body.map((e: { id: number }) => e.id)
    expect(ids).toEqual([3, 2, 1])

    // Must query only this board's events.
    expect(prismaMock.activityEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ boardId }),
      }),
    )
  })

  // ── 4. Non-existent target list rolls back cleanly ───────────────────────

  it('returns 500 and does not persist the card update when the target list does not exist', async () => {
    const cardId  = 1
    const actorId = 3

    prismaMock.card.findUnique.mockResolvedValue({
      id:     cardId,
      listId: 10,
      list:   { id: 10, boardId: 5 },
    })

    // The DB rejects the transaction because the foreign key for listId is invalid.
    prismaMock.$transaction.mockRejectedValue(
      new Error('Foreign key constraint failed on the field: `listId`'),
    )

    const res = await request(app)
      .patch(`/cards/${cardId}/move`)
      .set('Authorization', `Bearer ${makeToken(actorId)}`)
      .send({ targetListId: 9999, position: 0 })

    expect(res.status).toBe(500)
    expect(res.body).toMatchObject({
      error:   'Move failed',
      details: expect.stringContaining('Foreign key constraint'),
    })

    // Atomicity guarantee: the failed write must have been attempted via $transaction,
    // not as a bare card.update outside any transaction.
    expect(prismaMock.$transaction).toHaveBeenCalledOnce()
  })
})
