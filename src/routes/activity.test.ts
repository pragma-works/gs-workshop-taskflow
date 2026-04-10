import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import * as jwt from 'jsonwebtoken'
import prisma from '../db'
import activityRouter from './activity'
import cardsRouter from './cards'
import boardsRouter from './boards'
import usersRouter from './users'

// Build an Express app identical to index.ts but without app.listen()
const app = express()
app.use(express.json())
app.use('/users', usersRouter)
app.use('/boards', boardsRouter)
app.use('/boards', activityRouter)
app.use('/cards', cardsRouter)

// Test state
let userId: number
let otherUserId: number
let boardId: number
let listId1: number
let listId2: number
let cardId: number
let token: string
let otherToken: string

beforeAll(async () => {
  // Seed test data using the same prisma instance the routes use
  const user = await prisma.user.create({
    data: { email: 'test-act@test.com', password: 'hashed', name: 'Actor' },
  })
  userId = user.id
  token = jwt.sign({ userId: user.id }, 'super-secret-key-change-me', { expiresIn: '1h' })

  const other = await prisma.user.create({
    data: { email: 'other-act@test.com', password: 'hashed', name: 'Outsider' },
  })
  otherUserId = other.id
  otherToken = jwt.sign({ userId: other.id }, 'super-secret-key-change-me', { expiresIn: '1h' })

  const board = await prisma.board.create({ data: { name: 'Test Board Activity' } })
  boardId = board.id

  await prisma.boardMember.create({
    data: { userId: user.id, boardId: board.id, role: 'owner' },
  })

  const list1 = await prisma.list.create({
    data: { name: 'Backlog', position: 0, boardId: board.id },
  })
  listId1 = list1.id

  const list2 = await prisma.list.create({
    data: { name: 'Done', position: 1, boardId: board.id },
  })
  listId2 = list2.id

  const card = await prisma.card.create({
    data: { title: 'Seed Card', position: 0, listId: list1.id },
  })
  cardId = card.id
})

afterAll(async () => {
  // Clean up test data in correct order (foreign key constraints)
  await prisma.activityEvent.deleteMany({ where: { boardId } })
  await prisma.comment.deleteMany({ where: { card: { list: { boardId } } } })
  await prisma.cardLabel.deleteMany({ where: { card: { list: { boardId } } } })
  await prisma.card.deleteMany({ where: { list: { boardId } } })
  await prisma.list.deleteMany({ where: { boardId } })
  await prisma.boardMember.deleteMany({ where: { boardId } })
  await prisma.board.delete({ where: { id: boardId } })
  await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } })
  await prisma.$disconnect()
})

describe('Activity Feed API', () => {
  describe('GET /boards/:id/activity', () => {
    it('Unauthenticated request to GET /boards/:id/activity returns 401', async () => {
      const res = await request(app).get(`/boards/${boardId}/activity`)
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('Unauthorized')
    })

    it('Non-member authenticated request returns 403', async () => {
      const res = await request(app)
        .get(`/boards/${boardId}/activity`)
        .set('Authorization', `Bearer ${otherToken}`)
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('Not a board member')
    })
  })

  describe('PATCH /cards/:id/move', () => {
    it('Moving a card creates an ActivityEvent in the same transaction', async () => {
      // Create a fresh card for this test
      const card = await prisma.card.create({
        data: { title: 'Move Test Card', position: 0, listId: listId1 },
      })

      const res = await request(app)
        .patch(`/cards/${card.id}/move`)
        .set('Authorization', `Bearer ${token}`)
        .send({ targetListId: listId2, position: 0 })

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(res.body.event).toBeDefined()
      expect(res.body.event.eventType).toBe('card_moved')
      expect(res.body.event.cardId).toBe(card.id)
      expect(res.body.event.fromListId).toBe(listId1)
      expect(res.body.event.toListId).toBe(listId2)

      // Verify card was actually moved
      const updated = await prisma.card.findUnique({ where: { id: card.id } })
      expect(updated?.listId).toBe(listId2)

      // Verify event persisted in database
      const event = await prisma.activityEvent.findUnique({
        where: { id: res.body.event.id },
      })
      expect(event).toBeDefined()
      expect(event?.eventType).toBe('card_moved')
    })

    it('Moving a card to a non-existent list returns 404 and card stays in original list', async () => {
      const card = await prisma.card.create({
        data: { title: 'Rollback Test Card', position: 1, listId: listId1 },
      })

      const res = await request(app)
        .patch(`/cards/${card.id}/move`)
        .set('Authorization', `Bearer ${token}`)
        .send({ targetListId: 99999, position: 0 })

      expect(res.status).toBe(404)
      expect(res.body.error).toBe('Target list not found')

      // Verify card was NOT moved
      const unchanged = await prisma.card.findUnique({ where: { id: card.id } })
      expect(unchanged?.listId).toBe(listId1)

      // Verify no orphaned activity event was created
      const events = await prisma.activityEvent.findMany({
        where: { cardId: card.id },
      })
      expect(events.length).toBe(0)
    })
  })

  describe('GET /boards/:id/activity/preview', () => {
    it('Returns events in reverse chronological order without authentication', async () => {
      // Ensure at least 2 events exist by moving a card
      const card = await prisma.card.create({
        data: { title: 'Preview Test Card', position: 2, listId: listId1 },
      })

      await request(app)
        .patch(`/cards/${card.id}/move`)
        .set('Authorization', `Bearer ${token}`)
        .send({ targetListId: listId2, position: 0 })

      // Now hit the preview endpoint — no auth header
      const res = await request(app).get(`/boards/${boardId}/activity/preview`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThanOrEqual(1)

      // Verify reverse chronological order
      for (let i = 1; i < res.body.length; i++) {
        const newer = new Date(res.body[i - 1].createdAt).getTime()
        const older = new Date(res.body[i].createdAt).getTime()
        expect(newer).toBeGreaterThanOrEqual(older)
      }

      // Verify enriched response shape
      const event = res.body[0]
      expect(event).toHaveProperty('actorName')
      expect(event).toHaveProperty('eventType')
      expect(event).toHaveProperty('cardTitle')
      expect(event).toHaveProperty('fromListName')
      expect(event).toHaveProperty('toListName')
      expect(event).toHaveProperty('createdAt')
    })
  })
})
