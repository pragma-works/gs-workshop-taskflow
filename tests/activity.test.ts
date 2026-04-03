import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import * as jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import app from '../src/app'

const prisma = new PrismaClient()
const JWT_SECRET = 'super-secret-key-change-me'

function makeToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET)
}

let boardId: number
let listAId: number
let listBId: number
let cardId: number
let userId: number

beforeAll(async () => {
  // Create isolated test data
  const user = await prisma.user.create({
    data: { email: `test-activity-${Date.now()}@test.com`, password: 'hashed', name: 'Tester' },
  })
  userId = user.id

  const board = await prisma.board.create({ data: { name: 'Test Activity Board' } })
  boardId = board.id

  await prisma.boardMember.create({ data: { userId, boardId, role: 'owner' } })

  const listA = await prisma.list.create({ data: { name: 'Backlog', position: 0, boardId } })
  listAId = listA.id
  const listB = await prisma.list.create({ data: { name: 'In Progress', position: 1, boardId } })
  listBId = listB.id

  const card = await prisma.card.create({
    data: { title: 'Test Card', position: 0, listId: listAId },
  })
  cardId = card.id
})

afterAll(async () => {
  // Clean up test data
  await prisma.activityEvent.deleteMany({ where: { boardId } })
  await prisma.card.deleteMany({ where: { listId: { in: [listAId, listBId] } } })
  await prisma.list.deleteMany({ where: { boardId } })
  await prisma.boardMember.deleteMany({ where: { boardId } })
  await prisma.board.delete({ where: { id: boardId } })
  await prisma.user.delete({ where: { id: userId } })
  await prisma.$disconnect()
})

beforeEach(async () => {
  // Reset card position and clear activity events before each test
  await prisma.activityEvent.deleteMany({ where: { boardId } })
  await prisma.card.update({ where: { id: cardId }, data: { listId: listAId, position: 0 } })
})

describe('GET /boards/:id/activity/preview', () => {
  it('returns empty array when no events exist', async () => {
    const res = await request(app).get(`/boards/${boardId}/activity/preview`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('returns activity events after a card move', async () => {
    const token = makeToken(userId)
    await request(app)
      .patch(`/cards/${cardId}/move`)
      .set('Authorization', `Bearer ${token}`)
      .send({ targetListId: listBId, position: 0 })
      .expect(200)

    const res = await request(app).get(`/boards/${boardId}/activity/preview`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)

    const event = res.body[0]
    expect(event.eventType).toBe('card_moved')
    expect(event.actorName).toBe('Tester')
    expect(event.cardTitle).toBe('Test Card')
    expect(event.fromListName).toBe('Backlog')
    expect(event.toListName).toBe('In Progress')
    expect(event.boardId).toBe(boardId)
    expect(event.cardId).toBe(cardId)
    expect(event.timestamp).toBeDefined()
  })
})

describe('GET /boards/:id/activity', () => {
  it('returns 401 without auth token', async () => {
    const res = await request(app).get(`/boards/${boardId}/activity`)
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-member', async () => {
    const otherUser = await prisma.user.create({
      data: { email: `outsider-${Date.now()}@test.com`, password: 'x', name: 'Outsider' },
    })
    const token = makeToken(otherUser.id)
    const res = await request(app)
      .get(`/boards/${boardId}/activity`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)
    await prisma.user.delete({ where: { id: otherUser.id } })
  })

  it('returns activity events for board members', async () => {
    const token = makeToken(userId)

    // Move card first to generate an event
    await request(app)
      .patch(`/cards/${cardId}/move`)
      .set('Authorization', `Bearer ${token}`)
      .send({ targetListId: listBId, position: 0 })
      .expect(200)

    const res = await request(app)
      .get(`/boards/${boardId}/activity`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].eventType).toBe('card_moved')
    expect(res.body[0].actorName).toBe('Tester')
  })

  it('returns events in chronological order', async () => {
    const token = makeToken(userId)

    // Two moves: Backlog → In Progress, then In Progress → Backlog
    await request(app)
      .patch(`/cards/${cardId}/move`)
      .set('Authorization', `Bearer ${token}`)
      .send({ targetListId: listBId, position: 0 })
      .expect(200)

    await request(app)
      .patch(`/cards/${cardId}/move`)
      .set('Authorization', `Bearer ${token}`)
      .send({ targetListId: listAId, position: 0 })
      .expect(200)

    const res = await request(app)
      .get(`/boards/${boardId}/activity`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].toListName).toBe('In Progress')
    expect(res.body[1].toListName).toBe('Backlog')

    const t0 = new Date(res.body[0].timestamp).getTime()
    const t1 = new Date(res.body[1].timestamp).getTime()
    expect(t0).toBeLessThanOrEqual(t1)
  })
})

describe('PATCH /cards/:id/move', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .patch(`/cards/${cardId}/move`)
      .send({ targetListId: listBId, position: 0 })
    expect(res.status).toBe(401)
  })

  it('returns 404 for non-existent card', async () => {
    const token = makeToken(userId)
    const res = await request(app)
      .patch('/cards/999999/move')
      .set('Authorization', `Bearer ${token}`)
      .send({ targetListId: listBId, position: 0 })
    expect(res.status).toBe(404)
  })

  it('atomically moves card and logs activity', async () => {
    const token = makeToken(userId)
    const res = await request(app)
      .patch(`/cards/${cardId}/move`)
      .set('Authorization', `Bearer ${token}`)
      .send({ targetListId: listBId, position: 0 })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)

    // Verify card was moved
    const updatedCard = await prisma.card.findUnique({ where: { id: cardId } })
    expect(updatedCard?.listId).toBe(listBId)

    // Verify activity event was written
    const events = await prisma.activityEvent.findMany({ where: { boardId, cardId } })
    expect(events).toHaveLength(1)
    expect(events[0].eventType).toBe('card_moved')
    expect(events[0].fromListName).toBe('Backlog')
    expect(events[0].toListName).toBe('In Progress')
  })
})
