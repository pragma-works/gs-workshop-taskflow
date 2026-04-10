process.env.JWT_SECRET = 'test-secret'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import * as jwt from 'jsonwebtoken'

vi.mock('../services/boardService', () => ({
  getBoardsForUser: vi.fn(),
  getBoardById:     vi.fn(),
  createBoard:      vi.fn(),
  getMembership:    vi.fn(),
  addMember:        vi.fn(),
}))

import app from '../index'
import { getBoardsForUser, getBoardById, createBoard, getMembership, addMember } from '../services/boardService'

function makeToken(userId: number): string {
  return jwt.sign({ userId }, 'test-secret')
}

beforeEach(() => vi.clearAllMocks())

describe('GET /boards', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/boards')
    expect(res.status).toBe(401)
  })

  it('returns 200 with boards array for authenticated user', async () => {
    vi.mocked(getBoardsForUser).mockResolvedValueOnce([
      { id: 1, name: 'Alpha', createdAt: new Date() } as any,
      { id: 2, name: 'Beta',  createdAt: new Date() } as any,
    ])

    const res = await request(app)
      .get('/boards')
      .set('Authorization', `Bearer ${makeToken(7)}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].name).toBe('Alpha')
    expect(getBoardsForUser).toHaveBeenCalledWith(7)
  })
})

describe('GET /boards/:id', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/boards/1')
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is not a board member', async () => {
    vi.mocked(getMembership).mockResolvedValueOnce(null)

    const res = await request(app)
      .get('/boards/5')
      .set('Authorization', `Bearer ${makeToken(7)}`)

    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'Not a board member' })
  })

  it('returns 404 when board does not exist', async () => {
    vi.mocked(getMembership).mockResolvedValueOnce({ userId: 7, boardId: 5, role: 'member' } as any)
    vi.mocked(getBoardById).mockResolvedValueOnce(null)

    const res = await request(app)
      .get('/boards/5')
      .set('Authorization', `Bearer ${makeToken(7)}`)

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Board not found' })
  })

  it('returns 200 with full board for a member', async () => {
    vi.mocked(getMembership).mockResolvedValueOnce({ userId: 7, boardId: 5, role: 'member' } as any)
    vi.mocked(getBoardById).mockResolvedValueOnce(
      { id: 5, name: 'My Board', createdAt: new Date(), members: [], lists: [] } as any,
    )

    const res = await request(app)
      .get('/boards/5')
      .set('Authorization', `Bearer ${makeToken(7)}`)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe(5)
    expect(res.body.name).toBe('My Board')
  })
})

describe('POST /boards', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app).post('/boards').send({ name: 'X' })
    expect(res.status).toBe(401)
  })

  it('returns 201 with created board', async () => {
    vi.mocked(createBoard).mockResolvedValueOnce(
      { id: 10, name: 'New Board', createdAt: new Date() } as any,
    )

    const res = await request(app)
      .post('/boards')
      .set('Authorization', `Bearer ${makeToken(7)}`)
      .send({ name: 'New Board' })

    expect(res.status).toBe(201)
    expect(res.body.name).toBe('New Board')
    expect(createBoard).toHaveBeenCalledWith('New Board', 7)
  })
})

describe('POST /boards/:id/members', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app).post('/boards/1/members').send({ memberId: 2 })
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is not a board member', async () => {
    vi.mocked(getMembership).mockResolvedValueOnce(null)

    const res = await request(app)
      .post('/boards/5/members')
      .set('Authorization', `Bearer ${makeToken(7)}`)
      .send({ memberId: 9 })

    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'Not a board member' })
  })

  it('returns 403 when caller is a member but not owner', async () => {
    vi.mocked(getMembership).mockResolvedValueOnce({ userId: 7, boardId: 5, role: 'member' } as any)
    vi.mocked(addMember).mockRejectedValueOnce(new Error('Forbidden'))

    const res = await request(app)
      .post('/boards/5/members')
      .set('Authorization', `Bearer ${makeToken(7)}`)
      .send({ memberId: 9 })

    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'Forbidden' })
  })

  it('returns 201 with new member when caller is owner', async () => {
    vi.mocked(getMembership).mockResolvedValueOnce({ userId: 7, boardId: 5, role: 'owner' } as any)
    vi.mocked(addMember).mockResolvedValueOnce({ userId: 9, boardId: 5, role: 'member' } as any)

    const res = await request(app)
      .post('/boards/5/members')
      .set('Authorization', `Bearer ${makeToken(7)}`)
      .send({ memberId: 9 })

    expect(res.status).toBe(201)
    expect(res.body.userId).toBe(9)
    expect(res.body.role).toBe('member')
  })

  it('propagates unexpected errors to the global error handler returning 500', async () => {
    vi.mocked(getMembership).mockResolvedValueOnce({ userId: 7, boardId: 5, role: 'owner' } as any)
    vi.mocked(addMember).mockRejectedValueOnce(new Error('DB connection lost'))

    const res = await request(app)
      .post('/boards/5/members')
      .set('Authorization', `Bearer ${makeToken(7)}`)
      .send({ memberId: 9 })

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: 'Internal server error' })
  })
})
