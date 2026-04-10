import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import request from 'supertest'
import prisma from '../db'
import * as jwt from 'jsonwebtoken'
import express from 'express'
import boardsRouter from './boards'
import cardsRouter from './cards'
import activityRouter from './activity'

const app = express()
app.use(express.json())
app.use('/boards', boardsRouter)
app.use('/boards', activityRouter)
app.use('/cards', cardsRouter)

let testUserId: number
let testBoardId: number
let testListId: number
let testTargetListId: number
let testCardId: number
let authToken: string

beforeAll(async () => {
  await prisma.activityEvent.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.cardLabel.deleteMany()
  await prisma.card.deleteMany()
  await prisma.list.deleteMany()
  await prisma.boardMember.deleteMany()
  await prisma.board.deleteMany()
  await prisma.user.deleteMany()

  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      password: 'hashed_password',
      name: 'Test User'
    }
  })
  testUserId = user.id

  const board = await prisma.board.create({
    data: { name: 'Test Board' }
  })
  testBoardId = board.id

  await prisma.boardMember.create({
    data: {
      userId: testUserId,
      boardId: testBoardId,
      role: 'owner'
    }
  })

  const list = await prisma.list.create({
    data: {
      name: 'Todo',
      position: 0,
      boardId: testBoardId
    }
  })
  testListId = list.id

  const targetList = await prisma.list.create({
    data: {
      name: 'Done',
      position: 1,
      boardId: testBoardId
    }
  })
  testTargetListId = targetList.id

  const card = await prisma.card.create({
    data: {
      title: 'Test Card',
      position: 0,
      listId: testListId
    }
  })
  testCardId = card.id

  authToken = jwt.sign({ userId: testUserId }, 'super-secret-key-change-me', { expiresIn: '7d' })
})

afterEach(async () => {
  await prisma.activityEvent.deleteMany()
})

describe('Activity Feed', () => {
  it('returns 401 when an unauthenticated request is made to GET /boards/:id/activity', async () => {
    const response = await request(app)
      .get(`/boards/${testBoardId}/activity`)
      .expect(401)

    expect(response.body).toEqual({ error: 'Unauthorized' })
  })

  it('creates an ActivityEvent in the same transaction when a card is moved', async () => {
    const eventsBefore = await prisma.activityEvent.count()
    expect(eventsBefore).toBe(0)

    const response = await request(app)
      .patch(`/cards/${testCardId}/move`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        targetListId: testTargetListId,
        position: 0
      })
      .expect(200)

    expect(response.body.ok).toBe(true)
    expect(response.body.event).toBeDefined()
    expect(response.body.event.eventType).toBe('card_moved')
    expect(response.body.event.cardId).toBe(testCardId)
    expect(response.body.event.fromListId).toBe(testListId)
    expect(response.body.event.toListId).toBe(testTargetListId)
    expect(response.body.event.actorId).toBe(testUserId)
    expect(response.body.event.boardId).toBe(testBoardId)

    const eventsAfter = await prisma.activityEvent.count()
    expect(eventsAfter).toBe(1)

    const updatedCard = await prisma.card.findUnique({ where: { id: testCardId } })
    expect(updatedCard?.listId).toBe(testTargetListId)
  })

  it('returns events in reverse chronological order when GET /boards/:id/activity/preview is called', async () => {
    await prisma.activityEvent.create({
      data: {
        boardId: testBoardId,
        actorId: testUserId,
        eventType: 'card_moved',
        cardId: testCardId,
        fromListId: testListId,
        toListId: testTargetListId,
        createdAt: new Date('2024-01-01T10:00:00Z')
      }
    })

    await prisma.activityEvent.create({
      data: {
        boardId: testBoardId,
        actorId: testUserId,
        eventType: 'card_moved',
        cardId: testCardId,
        fromListId: testTargetListId,
        toListId: testListId,
        createdAt: new Date('2024-01-01T11:00:00Z')
      }
    })

    await prisma.activityEvent.create({
      data: {
        boardId: testBoardId,
        actorId: testUserId,
        eventType: 'card_moved',
        cardId: testCardId,
        fromListId: testListId,
        toListId: testTargetListId,
        createdAt: new Date('2024-01-01T12:00:00Z')
      }
    })

    const response = await request(app)
      .get(`/boards/${testBoardId}/activity/preview`)
      .expect(200)

    expect(response.body).toHaveLength(3)
    expect(response.body[0].actorName).toBe('Test User')
    expect(response.body[0].cardTitle).toBe('Test Card')
    expect(response.body[0].fromListName).toBe('Todo')
    expect(response.body[0].toListName).toBe('Done')

    const timestamps = response.body.map((event: any) => new Date(event.createdAt).getTime())
    for (let i = 0; i < timestamps.length - 1; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1])
    }
  })

  it('rolls back the transaction cleanly when attempting to move a card to a non-existent list', async () => {
    const nonExistentListId = 99999
    const cardBefore = await prisma.card.findUnique({ where: { id: testCardId } })
    const eventsBefore = await prisma.activityEvent.count()

    const response = await request(app)
      .patch(`/cards/${testCardId}/move`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        targetListId: nonExistentListId,
        position: 0
      })
      .expect(500)

    expect(response.body.error).toBe('Move failed')
    expect(response.body.details).toBeDefined()

    const cardAfter = await prisma.card.findUnique({ where: { id: testCardId } })
    expect(cardAfter?.listId).toBe(cardBefore?.listId)
    expect(cardAfter?.position).toBe(cardBefore?.position)

    const eventsAfter = await prisma.activityEvent.count()
    expect(eventsAfter).toBe(eventsBefore)
  })
})
