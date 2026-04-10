import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest'
import { execSync } from 'node:child_process'
import request from 'supertest'
import * as jwt from 'jsonwebtoken'
import type { PrismaClient } from '@prisma/client'

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-secret'
process.env.DATABASE_URL = 'file:./test.db'

let app: import('express').Express
let prisma: PrismaClient

beforeAll(async () => {
  execSync('npx prisma db push --skip-generate', {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'pipe',
  })

  const appModule = await import('../app')
  const dbModule = await import('../db')
  app = appModule.default
  prisma = dbModule.default
})

afterAll(async () => {
  await prisma.$disconnect()
})

beforeEach(async () => {
  await prisma.activityEvent.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.cardLabel.deleteMany()
  await prisma.card.deleteMany()
  await prisma.list.deleteMany()
  await prisma.boardMember.deleteMany()
  await prisma.board.deleteMany()
  await prisma.label.deleteMany()
  await prisma.user.deleteMany()
})

async function createFixture() {
  const user = await prisma.user.create({
    data: {
      email: 'user@test.com',
      password: 'hashed',
      name: 'User',
    },
  })

  const board = await prisma.board.create({ data: { name: 'Board A' } })
  await prisma.boardMember.create({
    data: { userId: user.id, boardId: board.id, role: 'owner' },
  })

  const listA = await prisma.list.create({ data: { name: 'Backlog', position: 0, boardId: board.id } })
  const listB = await prisma.list.create({ data: { name: 'Done', position: 1, boardId: board.id } })

  const card = await prisma.card.create({
    data: { title: 'Card 1', position: 0, listId: listA.id, assigneeId: user.id },
  })

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string)

  return { user, board, listA, listB, card, token }
}

describe('activity feed routes', () => {
  it('rejects unauthenticated requests to board activity feed', async () => {
    const fixture = await createFixture()

    const response = await request(app).get(`/boards/${fixture.board.id}/activity`)

    expect(response.status).toBe(401)
    expect(response.body).toMatchObject({ error: 'Unauthorized' })
  })

  it('creates an activity event in the same transaction when moving a card', async () => {
    const fixture = await createFixture()

    const response = await request(app)
      .patch(`/cards/${fixture.card.id}/move`)
      .set('Authorization', `Bearer ${fixture.token}`)
      .send({ targetListId: fixture.listB.id, position: 2 })

    expect(response.status).toBe(200)
    expect(response.body.ok).toBe(true)
    expect(response.body.event).toMatchObject({
      eventType: 'card_moved',
      cardId: fixture.card.id,
      fromListId: fixture.listA.id,
      toListId: fixture.listB.id,
      actorId: fixture.user.id,
      boardId: fixture.board.id,
    })

    const updatedCard = await prisma.card.findUnique({ where: { id: fixture.card.id } })
    expect(updatedCard?.listId).toBe(fixture.listB.id)

    const eventCount = await prisma.activityEvent.count({ where: { cardId: fixture.card.id } })
    expect(eventCount).toBe(1)
  })

  it('returns preview events in reverse chronological order', async () => {
    const fixture = await createFixture()

    const first = await prisma.activityEvent.create({
      data: {
        boardId: fixture.board.id,
        actorId: fixture.user.id,
        eventType: 'card_moved',
        cardId: fixture.card.id,
        fromListId: fixture.listA.id,
        toListId: fixture.listB.id,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    })

    const second = await prisma.activityEvent.create({
      data: {
        boardId: fixture.board.id,
        actorId: fixture.user.id,
        eventType: 'card_moved',
        cardId: fixture.card.id,
        fromListId: fixture.listB.id,
        toListId: fixture.listA.id,
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    })

    const response = await request(app).get(`/boards/${fixture.board.id}/activity/preview`)

    expect(response.status).toBe(200)
    expect(response.body).toHaveLength(2)
    expect(response.body[0].id).toBe(second.id)
    expect(response.body[1].id).toBe(first.id)
    expect(response.body[0]).toMatchObject({
      actorName: fixture.user.name,
      cardTitle: fixture.card.title,
    })
  })

  it('returns 404 and preserves card state when target list does not exist', async () => {
    const fixture = await createFixture()

    const response = await request(app)
      .patch(`/cards/${fixture.card.id}/move`)
      .set('Authorization', `Bearer ${fixture.token}`)
      .send({ targetListId: 999999, position: 1 })

    expect(response.status).toBe(404)
    expect(response.body.error).toBe('Target list not found')

    const unchangedCard = await prisma.card.findUnique({ where: { id: fixture.card.id } })
    expect(unchangedCard?.listId).toBe(fixture.listA.id)

    const events = await prisma.activityEvent.findMany({ where: { cardId: fixture.card.id } })
    expect(events).toHaveLength(0)
  })
})
