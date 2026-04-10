import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import express, { Express } from 'express'
import * as jwt from 'jsonwebtoken'
import { config } from '../config'

// Dynamic imports to avoid module resolution issues
let app: Express
let prisma: PrismaClient

// Helper to generate test token
function generateToken(userId: number): string {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: '1h' })
}

describe('Activity Feed', () => {
  let testUserId: number
  let testBoardId: number
  let testListId1: number
  let testListId2: number
  let testCardId: number
  let authToken: string

  beforeAll(async () => {
    // Initialize prisma
    prisma = new PrismaClient()
    
    // Setup express app with routers
    const cardsRouter = (await import('./cards')).default
    const activityRouter = (await import('./activity')).default
    
    app = express()
    app.use(express.json())
    app.use('/cards', cardsRouter)
    app.use('/boards', activityRouter)

    // Create test user
    const user = await prisma.user.create({
      data: { email: `test-${Date.now()}@test.com`, password: 'hashed', name: 'Test User' }
    })
    testUserId = user.id
    authToken = generateToken(testUserId)

    // Create test board
    const board = await prisma.board.create({ data: { name: 'Test Board' } })
    testBoardId = board.id

    // Add user as board member
    await prisma.boardMember.create({
      data: { userId: testUserId, boardId: testBoardId, role: 'owner' }
    })

    // Create two lists
    const list1 = await prisma.list.create({
      data: { name: 'Backlog', position: 0, boardId: testBoardId }
    })
    testListId1 = list1.id

    const list2 = await prisma.list.create({
      data: { name: 'In Progress', position: 1, boardId: testBoardId }
    })
    testListId2 = list2.id

    // Create test card
    const card = await prisma.card.create({
      data: { title: 'Test Card', position: 0, listId: testListId1 }
    })
    testCardId = card.id
  })

  afterAll(async () => {
    // Clean up test data
    await prisma.activityEvent.deleteMany({ where: { boardId: testBoardId } })
    await prisma.card.deleteMany({ where: { listId: { in: [testListId1, testListId2] } } })
    await prisma.list.deleteMany({ where: { boardId: testBoardId } })
    await prisma.boardMember.deleteMany({ where: { boardId: testBoardId } })
    await prisma.board.delete({ where: { id: testBoardId } })
    await prisma.user.delete({ where: { id: testUserId } })
    await prisma.$disconnect()
  })

  describe('GET /boards/:id/activity', () => {
    it('returns 401 when request is unauthenticated', async () => {
      const supertest = (await import('supertest')).default
      const response = await supertest(app)
        .get(`/boards/${testBoardId}/activity`)
      
      expect(response.status).toBe(401)
      expect(response.body.error).toBe('Unauthorized')
    })

    it('returns 403 when user is not a board member', async () => {
      // Create a different user who is not a member
      const otherUser = await prisma.user.create({
        data: { email: `other-${Date.now()}@test.com`, password: 'hashed', name: 'Other User' }
      })
      const otherToken = generateToken(otherUser.id)

      const supertest = (await import('supertest')).default
      const response = await supertest(app)
        .get(`/boards/${testBoardId}/activity`)
        .set('Authorization', `Bearer ${otherToken}`)
      
      expect(response.status).toBe(403)
      expect(response.body.error).toBe('Not a board member')

      // Cleanup
      await prisma.user.delete({ where: { id: otherUser.id } })
    })
  })

  describe('PATCH /cards/:id/move', () => {
    it('creates an ActivityEvent atomically when moving a card', async () => {
      const supertest = (await import('supertest')).default
      const response = await supertest(app)
        .patch(`/cards/${testCardId}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ targetListId: testListId2, position: 0 })
      
      expect(response.status).toBe(200)
      expect(response.body.ok).toBe(true)
      expect(response.body.event).toBeDefined()
      expect(response.body.event.eventType).toBe('card_moved')
      expect(response.body.event.cardId).toBe(testCardId)
      expect(response.body.event.fromListId).toBe(testListId1)
      expect(response.body.event.toListId).toBe(testListId2)
    })

    it('returns 404 when moving a card to a non-existent list', async () => {
      const supertest = (await import('supertest')).default
      const response = await supertest(app)
        .patch(`/cards/${testCardId}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ targetListId: 99999, position: 0 })
      
      expect(response.status).toBe(404)
      expect(response.body.error).toBe('Target list not found')
    })

    it('returns 404 when card does not exist', async () => {
      const supertest = (await import('supertest')).default
      const response = await supertest(app)
        .patch('/cards/99999/move')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ targetListId: testListId1, position: 0 })
      
      expect(response.status).toBe(404)
      expect(response.body.error).toBe('Card not found')
    })
  })

  describe('GET /boards/:id/activity/preview', () => {
    it('returns events in reverse chronological order without authentication', async () => {
      const supertest = (await import('supertest')).default
      
      // First, create multiple events by moving the card back
      await supertest(app)
        .patch(`/cards/${testCardId}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ targetListId: testListId1, position: 0 })

      const response = await supertest(app)
        .get(`/boards/${testBoardId}/activity/preview`)
      
      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeGreaterThan(0)
      
      // Verify response includes expected fields
      const event = response.body[0]
      expect(event).toHaveProperty('id')
      expect(event).toHaveProperty('boardId')
      expect(event).toHaveProperty('actorName')
      expect(event).toHaveProperty('eventType')
      expect(event).toHaveProperty('cardTitle')
      expect(event).toHaveProperty('fromListName')
      expect(event).toHaveProperty('toListName')
      expect(event).toHaveProperty('timestamp')

      // Verify chronological order (newest first)
      if (response.body.length > 1) {
        const timestamps = response.body.map((e: any) => new Date(e.timestamp).getTime())
        for (let i = 0; i < timestamps.length - 1; i++) {
          expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1])
        }
      }
    })
  })
})
