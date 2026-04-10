import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createToken, loadTestContext, resetDatabase, seedBoardFixture } from '../test/integration-helpers'

let app: Awaited<ReturnType<typeof loadTestContext>>['app']
let prisma: Awaited<ReturnType<typeof loadTestContext>>['prisma']

beforeAll(async () => {
  const context = await loadTestContext()
  app = context.app
  prisma = context.prisma
})

beforeEach(async () => {
  await resetDatabase(prisma)
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('activity feed', () => {
  it('rejects unauthenticated board activity requests', async () => {
    const { board } = await seedBoardFixture(prisma)

    const response = await request(app).get(`/boards/${board.id}/activity`)

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'Unauthorized' })
  })

  it('persists the activity event when a card move succeeds', async () => {
    const fixture = await seedBoardFixture(prisma)
    const token = createToken(fixture.user.id)

    const response = await request(app)
      .patch(`/cards/${fixture.card.id}/move`)
      .set('Authorization', `Bearer ${token}`)
      .send({ targetListId: fixture.inProgress.id, position: 0 })

    expect(response.status).toBe(200)
    expect(response.body.ok).toBe(true)
    expect(response.body.event.eventType).toBe('card_moved')
    expect(response.body.event.cardId).toBe(fixture.card.id)
    expect(response.body.event.fromListId).toBe(fixture.backlog.id)
    expect(response.body.event.toListId).toBe(fixture.inProgress.id)
    expect(response.body.event.boardId).toBe(fixture.board.id)
    expect(response.body.event.actorId).toBe(fixture.user.id)

    const movedCard = await prisma.card.findUniqueOrThrow({ where: { id: fixture.card.id } })
    const events = await prisma.activityEvent.findMany({ where: { boardId: fixture.board.id } })

    expect(movedCard.listId).toBe(fixture.inProgress.id)
    expect(movedCard.position).toBe(0)
    expect(events).toHaveLength(1)
    expect(events[0].eventType).toBe('card_moved')
  })

  it('returns preview events in reverse chronological order', async () => {
    const fixture = await seedBoardFixture(prisma)

    await prisma.activityEvent.create({
      data: {
        boardId: fixture.board.id,
        actorId: fixture.user.id,
        eventType: 'card_created',
        cardId: fixture.card.id,
        toListId: fixture.backlog.id,
        createdAt: new Date('2026-04-07T10:00:00.000Z'),
      },
    })

    await prisma.activityEvent.create({
      data: {
        boardId: fixture.board.id,
        actorId: fixture.user.id,
        eventType: 'card_moved',
        cardId: fixture.card.id,
        fromListId: fixture.backlog.id,
        toListId: fixture.inProgress.id,
        createdAt: new Date('2026-04-07T11:00:00.000Z'),
      },
    })

    const response = await request(app).get(`/boards/${fixture.board.id}/activity/preview`)

    expect(response.status).toBe(200)
    expect(response.body).toHaveLength(2)
    expect(response.body[0].eventType).toBe('card_moved')
    expect(response.body[0].actorName).toBe('Alice')
    expect(response.body[0].cardTitle).toBe('Fix login redirect')
    expect(response.body[0].fromListName).toBe('Backlog')
    expect(response.body[0].toListName).toBe('In Progress')
    expect(response.body[1].eventType).toBe('card_created')
  })

  it('rolls back the move when the target list does not exist', async () => {
    const fixture = await seedBoardFixture(prisma)
    const token = createToken(fixture.user.id)

    const response = await request(app)
      .patch(`/cards/${fixture.card.id}/move`)
      .set('Authorization', `Bearer ${token}`)
      .send({ targetListId: 999999, position: 0 })

    expect(response.status).toBe(404)
    expect(response.body.error).toBe('Target list not found')

    const unchangedCard = await prisma.card.findUniqueOrThrow({ where: { id: fixture.card.id } })
    const events = await prisma.activityEvent.findMany({ where: { boardId: fixture.board.id } })

    expect(unchangedCard.listId).toBe(fixture.backlog.id)
    expect(unchangedCard.position).toBe(0)
    expect(events).toHaveLength(0)
  })

  it('rejects authenticated activity requests for users outside the board', async () => {
    const fixture = await seedBoardFixture(prisma)
    const outsider = await prisma.user.create({
      data: {
        email: 'bob@test.com',
        password: 'password123',
        name: 'Bob',
      },
    })

    const token = createToken(outsider.id)

    const response = await request(app)
      .get(`/boards/${fixture.board.id}/activity`)
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(403)
    expect(response.body).toEqual({ error: 'Not a board member' })
  })
})