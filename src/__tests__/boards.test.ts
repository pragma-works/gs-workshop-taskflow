/**
 * Tests for boards routes using repository layer (no direct prisma in routes).
 */
import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import app from '../index'
import prisma from '../db'
import * as bcrypt from 'bcryptjs'
import { signToken } from '../middleware/auth'

let token: string
let userId: number
let boardId: number

beforeAll(async () => {
  await prisma.activityEvent.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.cardLabel.deleteMany()
  await prisma.card.deleteMany()
  await prisma.list.deleteMany()
  await prisma.boardMember.deleteMany()
  await prisma.board.deleteMany()
  await prisma.user.deleteMany()

  const password = await bcrypt.hash('testpass', 10)
  const user = await prisma.user.create({ data: { email: 'board@example.com', password, name: 'BoardUser' } })
  userId = user.id
  token = signToken(user.id)

  const board = await prisma.board.create({ data: { name: 'My Board' } })
  boardId = board.id
  await prisma.boardMember.create({ data: { userId: user.id, boardId: board.id, role: 'owner' } })
})

describe('GET /boards', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/boards')
    expect(res.status).toBe(401)
  })

  it('returns boards for authenticated user', async () => {
    const res = await request(app).get('/boards').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.some((b: { id: number }) => b.id === boardId)).toBe(true)
  })
})

describe('GET /boards/:id', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get(`/boards/${boardId}`)
    expect(res.status).toBe(401)
  })

  it('returns board details for member', async () => {
    const res = await request(app)
      .get(`/boards/${boardId}`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(boardId)
    expect(res.body).toHaveProperty('lists')
  })

  it('returns 403 for non-member', async () => {
    const pw = await bcrypt.hash('x', 10)
    const other = await prisma.user.create({ data: { email: 'other@x.com', password: pw, name: 'Other' } })
    const otherToken = signToken(other.id)
    const res = await request(app)
      .get(`/boards/${boardId}`)
      .set('Authorization', `Bearer ${otherToken}`)
    expect(res.status).toBe(403)
  })
})

describe('POST /boards', () => {
  it('creates a board and returns 201', async () => {
    const res = await request(app)
      .post('/boards')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Board' })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body.name).toBe('New Board')
  })
})
