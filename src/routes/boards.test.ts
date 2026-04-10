import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import * as jwt from 'jsonwebtoken'

vi.mock('../db', () => ({
  default: {
    boardMember: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    board:       { findUnique: vi.fn(), create: vi.fn() },
    list:        { findMany: vi.fn() },
    card:        { findMany: vi.fn() },
    comment:     { findMany: vi.fn() },
    cardLabel:   { findMany: vi.fn() },
    label:       { findUnique: vi.fn() },
  },
}))

import prisma from '../db'
import boardsRouter from './boards'

const app = express()
app.use(express.json())
app.use('/boards', boardsRouter)

const SECRET = 'super-secret-key-change-me'
const token = (userId = 1) => jwt.sign({ userId }, SECRET)

beforeEach(() => vi.clearAllMocks())

// ---------------------------------------------------------------------------

describe('GET /boards', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/boards')
    expect(res.status).toBe(401)
  })

  it('returns the list of boards the user belongs to', async () => {
    vi.mocked(prisma.boardMember.findMany).mockResolvedValue([
      { userId: 1, boardId: 1, role: 'owner' },
    ] as any)
    vi.mocked(prisma.board.findUnique).mockResolvedValue(
      { id: 1, name: 'Q2 Sprint', createdAt: new Date() } as any,
    )

    const res = await request(app)
      .get('/boards')
      .set('Authorization', `Bearer ${token()}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('Q2 Sprint')
  })
})

// ---------------------------------------------------------------------------

describe('GET /boards/:id', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/boards/1')
    expect(res.status).toBe(401)
  })

  it('returns 403 when the user is not a board member', async () => {
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(null)

    const res = await request(app)
      .get('/boards/1')
      .set('Authorization', `Bearer ${token()}`)

    expect(res.status).toBe(403)
  })

  it('returns 404 when the board does not exist', async () => {
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({ userId: 1, boardId: 1, role: 'member' } as any)
    vi.mocked(prisma.board.findUnique).mockResolvedValue(null)

    const res = await request(app)
      .get('/boards/1')
      .set('Authorization', `Bearer ${token()}`)

    expect(res.status).toBe(404)
  })

  it('returns the full board with empty lists for a member', async () => {
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({ userId: 1, boardId: 1, role: 'member' } as any)
    vi.mocked(prisma.board.findUnique).mockResolvedValue({ id: 1, name: 'Q2 Sprint', createdAt: new Date() } as any)
    vi.mocked(prisma.list.findMany).mockResolvedValue([])

    const res = await request(app)
      .get('/boards/1')
      .set('Authorization', `Bearer ${token()}`)

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Q2 Sprint')
    expect(res.body.lists).toEqual([])
  })
})

// ---------------------------------------------------------------------------

describe('POST /boards', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).post('/boards').send({ name: 'My Board' })
    expect(res.status).toBe(401)
  })

  it('creates a board and adds the creator as owner', async () => {
    const mockBoard = { id: 5, name: 'New Board', createdAt: new Date() }
    vi.mocked(prisma.board.create).mockResolvedValue(mockBoard as any)
    vi.mocked(prisma.boardMember.create).mockResolvedValue({} as any)

    const res = await request(app)
      .post('/boards')
      .set('Authorization', `Bearer ${token()}`)
      .send({ name: 'New Board' })

    expect(res.status).toBe(201)
    expect(res.body.name).toBe('New Board')
    expect(vi.mocked(prisma.boardMember.create)).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'owner' }) }),
    )
  })
})

// ---------------------------------------------------------------------------

describe('POST /boards/:id/members', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).post('/boards/1/members').send({ memberId: 2 })
    expect(res.status).toBe(401)
  })

  it('adds a new member to the board', async () => {
    vi.mocked(prisma.boardMember.create).mockResolvedValue({} as any)

    const res = await request(app)
      .post('/boards/1/members')
      .set('Authorization', `Bearer ${token()}`)
      .send({ memberId: 2 })

    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
    expect(vi.mocked(prisma.boardMember.create)).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 2, boardId: 1 }) }),
    )
  })
})
