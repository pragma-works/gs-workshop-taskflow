import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import * as jwt from 'jsonwebtoken'
import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'
import { existsSync, unlinkSync } from 'fs'
import { join } from 'path'
import { seedTestDatabase } from '../test-utils'

// ── File-based test DB (isolated from dev.db, deleted after suite) ────────────

const ROOT       = process.cwd()
const TEST_DB    = join(ROOT, 'prisma', 'test.db')
const TEST_DB_URL = `file:${TEST_DB}`
const SECRET      = 'test-secret'

process.env.JWT_SECRET   = SECRET
process.env.DATABASE_URL = TEST_DB_URL
process.env.NODE_ENV     = 'test'

let prisma: PrismaClient
let app: Express

type Express = ReturnType<typeof import('express')>

beforeAll(async () => {
  // Apply schema to the isolated test DB
  execSync('npx prisma db push --skip-generate --force-reset', {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: 'pipe',
  })
  prisma = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } })
  app = (await import('../index')).default as any
})

afterAll(async () => {
  await prisma?.$disconnect()
  // On Windows the SQLite file may still be held briefly — ignore EBUSY
  for (const f of [TEST_DB, TEST_DB + '-wal', TEST_DB + '-shm']) {
    try { if (existsSync(f)) unlinkSync(f) } catch { /* ignore lock on Windows */ }
  }
})

let seed: Awaited<ReturnType<typeof seedTestDatabase>>

beforeEach(async () => {
  // Clean slate between tests
  await prisma.activityEvent.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.cardLabel.deleteMany()
  await prisma.card.deleteMany()
  await prisma.list.deleteMany()
  await prisma.boardMember.deleteMany()
  await prisma.board.deleteMany()
  await prisma.user.deleteMany()
  seed = await seedTestDatabase(prisma)
})

function makeToken(userId: number) {
  return jwt.sign({ userId }, SECRET)
}


beforeEach(async () => {
  // Clean slate between tests
  await prisma.activityEvent.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.cardLabel.deleteMany()
  await prisma.card.deleteMany()
  await prisma.list.deleteMany()
  await prisma.boardMember.deleteMany()
  await prisma.board.deleteMany()
  await prisma.user.deleteMany()
  seed = await seedTestDatabase(prisma)
})

// ─────────────────────────────────────────────────────────────────────────────
// Activity feed — GET /boards/:id/activity
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /boards/:id/activity', () => {
  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(app).get(`/boards/${seed.board.id}/activity`)
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is not a board member', async () => {
    // Create a stranger not in the board
    const stranger = await prisma.user.create({
      data: { email: 'stranger@test.com', password: 'x', name: 'Stranger' },
    })
    const res = await request(app)
      .get(`/boards/${seed.board.id}/activity`)
      .set('Authorization', `Bearer ${makeToken(stranger.id)}`)
    expect(res.status).toBe(403)
  })

  it('returns activity events in reverse chronological order for a board member', async () => {
    const { board, cards, lists, users } = seed
    // Create two activity events with explicit timestamps
    await prisma.activityEvent.create({
      data: { eventType: 'card_moved', boardId: board.id, actorId: users.alice.id,
              cardId: cards.card1.id, fromListId: lists.backlog.id, toListId: lists.inProgress.id,
              createdAt: new Date('2024-01-01T10:00:00Z') },
    })
    await prisma.activityEvent.create({
      data: { eventType: 'card_moved', boardId: board.id, actorId: users.bob.id,
              cardId: cards.card2.id, fromListId: lists.backlog.id, toListId: lists.done.id,
              createdAt: new Date('2024-01-02T10:00:00Z') },
    })

    const res = await request(app)
      .get(`/boards/${board.id}/activity`)
      .set('Authorization', `Bearer ${makeToken(users.alice.id)}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    // Latest first (reverse chronological)
    expect(res.body[0].actorName).toBe('Bob')
    expect(res.body[1].actorName).toBe('Alice')
    // Verify flat field names per API contract
    expect(res.body[0]).toHaveProperty('actorName')
    expect(res.body[0]).toHaveProperty('cardTitle')
    expect(res.body[0]).toHaveProperty('fromListName')
    expect(res.body[0]).toHaveProperty('toListName')
    expect(res.body[0]).toHaveProperty('timestamp')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Activity preview — GET /boards/:id/activity/preview (no auth)
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /boards/:id/activity/preview', () => {
  it('returns events without requiring authentication', async () => {
    const { board, cards, lists, users } = seed
    await prisma.activityEvent.create({
      data: { eventType: 'card_moved', boardId: board.id, actorId: users.alice.id,
              cardId: cards.card1.id, fromListId: lists.backlog.id, toListId: lists.done.id },
    })
    const res = await request(app).get(`/boards/${board.id}/activity/preview`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].actorName).toBe('Alice')
  })

  it('returns events in reverse chronological order', async () => {
    const { board, cards, lists, users } = seed
    await prisma.activityEvent.create({
      data: { eventType: 'card_moved', boardId: board.id, actorId: users.alice.id,
              cardId: cards.card1.id, fromListId: lists.backlog.id, toListId: lists.inProgress.id,
              createdAt: new Date('2024-01-01T09:00:00Z') },
    })
    await prisma.activityEvent.create({
      data: { eventType: 'card_moved', boardId: board.id, actorId: users.bob.id,
              cardId: cards.card2.id, fromListId: lists.backlog.id, toListId: lists.done.id,
              createdAt: new Date('2024-01-01T11:00:00Z') },
    })
    const res = await request(app).get(`/boards/${board.id}/activity/preview`)
    expect(res.status).toBe(200)
    expect(new Date(res.body[0].timestamp).getTime())
      .toBeGreaterThan(new Date(res.body[1].timestamp).getTime())
  })

  it('returns null for optional fields when relations are absent', async () => {
    const { board, users } = seed
    // Event without cardId/fromListId/toListId
    await prisma.activityEvent.create({
      data: { eventType: 'card_created', boardId: board.id, actorId: users.alice.id },
    })
    const res = await request(app).get(`/boards/${board.id}/activity/preview`)
    expect(res.status).toBe(200)
    expect(res.body[0].cardTitle).toBeNull()
    expect(res.body[0].fromListName).toBeNull()
    expect(res.body[0].toListName).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Card move — PATCH /cards/:id/move
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /cards/:id/move', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app)
      .patch(`/cards/${seed.cards.card1.id}/move`)
      .send({ targetListId: seed.lists.inProgress.id, position: 0 })
    expect(res.status).toBe(401)
  })

  it('returns 404 when card does not exist', async () => {
    const res = await request(app)
      .patch('/cards/99999/move')
      .set('Authorization', `Bearer ${makeToken(seed.users.alice.id)}`)
      .send({ targetListId: seed.lists.inProgress.id, position: 0 })
    expect(res.status).toBe(404)
  })

  it('returns 403 when caller is not a board member', async () => {
    const stranger = await prisma.user.create({
      data: { email: 'stranger2@test.com', password: 'x', name: 'Stranger2' },
    })
    const res = await request(app)
      .patch(`/cards/${seed.cards.card1.id}/move`)
      .set('Authorization', `Bearer ${makeToken(stranger.id)}`)
      .send({ targetListId: seed.lists.inProgress.id, position: 0 })
    expect(res.status).toBe(403)
  })

  it('creates an ActivityEvent in the same transaction when move succeeds', async () => {
    const { cards, lists, users, board } = seed
    const res = await request(app)
      .patch(`/cards/${cards.card1.id}/move`)
      .set('Authorization', `Bearer ${makeToken(users.alice.id)}`)
      .send({ targetListId: lists.inProgress.id, position: 0 })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.event.eventType).toBe('card_moved')
    expect(res.body.event.cardId).toBe(cards.card1.id)
    expect(res.body.event.fromListId).toBe(lists.backlog.id)
    expect(res.body.event.toListId).toBe(lists.inProgress.id)

    // Verify the event is persisted in the DB
    const persisted = await prisma.activityEvent.findMany({ where: { boardId: board.id } })
    expect(persisted).toHaveLength(1)
    expect(persisted[0].actorId).toBe(users.alice.id)

    // Verify the card was actually moved
    const moved = await prisma.card.findUnique({ where: { id: cards.card1.id } })
    expect(moved?.listId).toBe(lists.inProgress.id)
  })

  it('returns 404 when the target list does not exist and the transaction rolls back', async () => {
    const { cards, users, board } = seed
    const res = await request(app)
      .patch(`/cards/${cards.card1.id}/move`)
      .set('Authorization', `Bearer ${makeToken(users.alice.id)}`)
      .send({ targetListId: 99999, position: 0 })

    // Either 404 (list not found) or 500 (DB constraint) — both valid per spec
    expect([404, 500]).toContain(res.status)

    // Card must NOT have moved
    const unchanged = await prisma.card.findUnique({ where: { id: cards.card1.id } })
    expect(unchanged?.listId).toBe(seed.lists.backlog.id)

    // No ActivityEvent must have been created
    const events = await prisma.activityEvent.findMany({ where: { boardId: board.id } })
    expect(events).toHaveLength(0)
  })

  it('tracks multiple sequential moves correctly', async () => {
    const { cards, lists, users, board } = seed

    // Move 1: backlog → in progress
    await request(app)
      .patch(`/cards/${cards.card1.id}/move`)
      .set('Authorization', `Bearer ${makeToken(users.alice.id)}`)
      .send({ targetListId: lists.inProgress.id, position: 0 })

    // Move 2: in progress → done
    await request(app)
      .patch(`/cards/${cards.card1.id}/move`)
      .set('Authorization', `Bearer ${makeToken(users.alice.id)}`)
      .send({ targetListId: lists.done.id, position: 0 })

    const events = await prisma.activityEvent.findMany({
      where: { boardId: board.id },
      orderBy: { createdAt: 'asc' },
    })
    expect(events).toHaveLength(2)
    expect(events[0].fromListId).toBe(lists.backlog.id)
    expect(events[0].toListId).toBe(lists.inProgress.id)
    expect(events[1].fromListId).toBe(lists.inProgress.id)
    expect(events[1].toListId).toBe(lists.done.id)
  })
})
