import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import * as jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

import app from '../index'

const prisma = new PrismaClient()

function makeToken(userId: number) {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '1h' })
}

async function setupBoard() {
  const user = await prisma.user.create({
    data: { email: `u${Date.now()}@test.com`, password: 'x', name: 'Tester' },
  })
  const board = await prisma.board.create({ data: { name: 'Test Board' } })
  await prisma.boardMember.create({ data: { userId: user.id, boardId: board.id, role: 'owner' } })
  const listA = await prisma.list.create({ data: { name: 'Backlog', position: 0, boardId: board.id } })
  const listB = await prisma.list.create({ data: { name: 'Done', position: 1, boardId: board.id } })
  const card = await prisma.card.create({ data: { title: 'My Card', position: 0, listId: listA.id } })
  return { user, board, listA, listB, card }
}

describe('Activity Feed', () => {
  beforeEach(async () => {
    // Reset DB state by deleting records in dependency order
    await prisma.activityEvent.deleteMany()
    await prisma.comment.deleteMany()
    await prisma.cardLabel.deleteMany()
    await prisma.card.deleteMany()
    await prisma.list.deleteMany()
    await prisma.boardMember.deleteMany()
    await prisma.board.deleteMany()
    await prisma.user.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('returns 401 when unauthenticated request hits GET /boards/:id/activity', async () => {
    const res = await request(app).get('/boards/1/activity')
    expect(res.status).toBe(401)
  })

  it('creates an ActivityEvent in the same transaction when a card is moved', async () => {
    const { user, listA, listB, card } = await setupBoard()
    const token = makeToken(user.id)

    const res = await request(app)
      .patch(`/cards/${card.id}/move`)
      .set('Authorization', `Bearer ${token}`)
      .send({ targetListId: listB.id, position: 0 })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.event).toBeDefined()
    expect(res.body.event.eventType).toBe('card_moved')
    expect(res.body.event.fromListId).toBe(listA.id)
    expect(res.body.event.toListId).toBe(listB.id)

    const events = await prisma.activityEvent.findMany({ where: { cardId: card.id } })
    expect(events).toHaveLength(1)
  })

  it('returns activity events in reverse chronological order from GET /boards/:id/activity/preview', async () => {
    const { board, user, listA, listB, card } = await setupBoard()

    // Create two events with different timestamps
    await prisma.activityEvent.create({
      data: { eventType: 'card_moved', boardId: board.id, actorId: user.id, cardId: card.id, fromListId: listA.id, toListId: listB.id, createdAt: new Date('2024-01-01') },
    })
    await prisma.activityEvent.create({
      data: { eventType: 'card_moved', boardId: board.id, actorId: user.id, cardId: card.id, fromListId: listB.id, toListId: listA.id, createdAt: new Date('2024-01-02') },
    })

    const res = await request(app).get(`/boards/${board.id}/activity/preview`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(new Date(res.body[0].createdAt).getTime()).toBeGreaterThan(new Date(res.body[1].createdAt).getTime())
  })

  it('returns 404 when moving a card to a non-existent list', async () => {
    const { user, card } = await setupBoard()
    const token = makeToken(user.id)

    const res = await request(app)
      .patch(`/cards/${card.id}/move`)
      .set('Authorization', `Bearer ${token}`)
      .send({ targetListId: 99999, position: 0 })

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Target list not found')
  })
})
