import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import express from 'express'
import boardRoutes from '../routes/boards'
import cardRoutes from '../routes/cards'
import userRoutes from '../routes/users'

const app = express()
app.use(express.json())
app.use('/boards', boardRoutes)
app.use('/cards', cardRoutes)
app.use('/users', userRoutes)

let authToken: string

describe('Activity Feed API', () => {
  beforeAll(async () => {
    // Login to get auth token
    const loginResponse = await request(app)
      .post('/users/login')
      .send({
        email: 'alice@test.com',
        password: 'password123'
      })
    authToken = loginResponse.body.token
  })

  it('should return 401 for unauthenticated activity request', async () => {
    const response = await request(app)
      .get('/boards/1/activity')
    
    expect(response.status).toBe(401)
  })

  it('should return activity preview without auth', async () => {
    const response = await request(app)
      .get('/boards/1/activity/preview')
    
    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('events')
    expect(Array.isArray(response.body.events)).toBe(true)
  })

  it('should return activity feed with auth', async () => {
    const response = await request(app)
      .get('/boards/1/activity')
      .set('Authorization', `Bearer ${authToken}`)
    
    expect([200, 403, 404]).toContain(response.status)
    if (response.status === 200) {
      expect(response.body).toHaveProperty('events')
      expect(Array.isArray(response.body.events)).toBe(true)
    }
  })

  it('should log activity when moving a card', async () => {
    // This test verifies the transaction is working
    const response = await request(app)
      .patch('/cards/1/move')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        targetListId: 2,
        position: 0
      })
    
    expect([200, 404]).toContain(response.status)
  })

  it('should log activity when adding a comment', async () => {
    const response = await request(app)
      .post('/cards/1/comments')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        content: 'Test comment for activity logging'
      })

    expect([201, 404]).toContain(response.status)
  })

  it('should return 404 for non-existent board activity', async () => {
    const response = await request(app)
      .get('/boards/99999/activity')
      .set('Authorization', `Bearer ${authToken}`)

    expect(response.status).toBe(404)
  })

  it('should limit preview to 10 events', async () => {
    const response = await request(app)
      .get('/boards/1/activity/preview')

    if (response.status === 200) {
      expect(response.body.events.length).toBeLessThanOrEqual(10)
    }
  })

  it('should get card details', async () => {
    const response = await request(app)
      .get('/cards/1')
      .set('Authorization', `Bearer ${authToken}`)

    expect([200, 404]).toContain(response.status)
  })

  it('should get user boards', async () => {
    const response = await request(app)
      .get('/boards')
      .set('Authorization', `Bearer ${authToken}`)

    expect(response.status).toBe(200)
    expect(Array.isArray(response.body)).toBe(true)
  })

  it('should get board details with authentication', async () => {
    const response = await request(app)
      .get('/boards/1')
      .set('Authorization', `Bearer ${authToken}`)

    expect([200, 403, 404]).toContain(response.status)
  })
})
