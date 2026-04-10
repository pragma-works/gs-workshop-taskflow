import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import * as jwt from 'jsonwebtoken'

vi.mock('../db', () => ({
  default: {
    boardMember: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
    board:       { create: vi.fn(), findUnique: vi.fn() },
  },
}))

import app from '../index'
import prisma from '../db'
import { JWT_SECRET } from '../lib/auth'

const db = prisma as any
const bearerToken = (userId: number) => `Bearer ${jwt.sign({ userId }, JWT_SECRET)}`

const mockBoard      = { id: 1, name: 'Q2 Sprint', createdAt: new Date() }
const ownerShip      = { userId: 1, boardId: 1, role: 'owner' }
const memberShip     = { userId: 2, boardId: 1, role: 'member' }

beforeEach(() => vi.clearAllMocks())

// ── GET /boards ───────────────────────────────────────────────────────────

describe('GET /boards', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/boards')
    expect(res.status).toBe(401)
  })

  it('returns the boards the user belongs to', async () => {
    db.boardMember.findMany.mockResolvedValue([{ ...ownerShip, board: mockBoard }])
    const res = await request(app)
      .get('/boards')
      .set('Authorization', bearerToken(1))
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].id).toBe(1)
    expect(res.body[0].name).toBe('Q2 Sprint')
  })

  it('loads boards in a single query with include — not a per-row loop', async () => {
    db.boardMember.findMany.mockResolvedValue([{ ...ownerShip, board: mockBoard }])
    await request(app).get('/boards').set('Authorization', bearerToken(1))
    expect(db.boardMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include: { board: true } })
    )
    expect(db.board.findUnique).not.toHaveBeenCalled()
  })
})

// ── GET /boards/:id ───────────────────────────────────────────────────────

describe('GET /boards/:id', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/boards/1')
    expect(res.status).toBe(401)
  })

  it('returns 403 for users who are not board members', async () => {
    db.boardMember.findUnique.mockResolvedValue(null)
    const res = await request(app)
      .get('/boards/1')
      .set('Authorization', bearerToken(99))
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'Not a board member' })
  })

  it('returns 404 when the board does not exist', async () => {
    db.boardMember.findUnique.mockResolvedValue(ownerShip)
    db.board.findUnique.mockResolvedValue(null)
    const res = await request(app)
      .get('/boards/1')
      .set('Authorization', bearerToken(1))
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Board not found' })
  })

  it('fetches the full board in a single nested include query — no loops', async () => {
    db.boardMember.findUnique.mockResolvedValue(ownerShip)
    db.board.findUnique.mockResolvedValue({ ...mockBoard, lists: [] })
    const res = await request(app)
      .get('/boards/1')
      .set('Authorization', bearerToken(1))
    expect(res.status).toBe(200)
    expect(db.board.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          lists: expect.objectContaining({
            include: expect.objectContaining({ cards: expect.anything() }),
          }),
        }),
      })
    )
  })
})

// ── POST /boards ──────────────────────────────────────────────────────────

describe('POST /boards', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/boards').send({ name: 'My Board' })
    expect(res.status).toBe(401)
  })

  it('creates the board and assigns the caller as owner', async () => {
    db.board.create.mockResolvedValue(mockBoard)
    db.boardMember.create.mockResolvedValue(ownerShip)
    const res = await request(app)
      .post('/boards')
      .set('Authorization', bearerToken(1))
      .send({ name: 'Q2 Sprint' })
    expect(res.status).toBe(201)
    expect(res.body.id).toBe(1)
    expect(db.boardMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 1, boardId: 1, role: 'owner' }),
      })
    )
  })
})

// ── Targeted: kill error-body and where-clause survivors ─────────────────

describe('GET /boards — response body and query precision', () => {
  it('returns { error: "Unauthorized" } as the body on 401', async () => {
    const res = await request(app).get('/boards')
    expect(res.body).toEqual({ error: 'Unauthorized' })
  })

  it('queries memberships with the exact authenticated userId in the where clause', async () => {
    db.boardMember.findMany.mockResolvedValue([])
    await request(app).get('/boards').set('Authorization', bearerToken(42))
    expect(db.boardMember.findMany).toHaveBeenCalledWith({
      where: { userId: 42 },
      include: { board: true },
    })
  })
})

describe('GET /boards/:id — response body and query precision', () => {
  it('returns { error: "Unauthorized" } as the body on 401', async () => {
    const res = await request(app).get('/boards/1')
    expect(res.body).toEqual({ error: 'Unauthorized' })
  })

  it('calls checkMember with the exact userId and boardId from the request', async () => {
    db.boardMember.findUnique.mockResolvedValue(null)
    await request(app).get('/boards/7').set('Authorization', bearerToken(42))
    expect(db.boardMember.findUnique).toHaveBeenCalledWith({
      where: { userId_boardId: { userId: 42, boardId: 7 } },
    })
  })

  it('fetches the board by exact id with the full nested include structure', async () => {
    db.boardMember.findUnique.mockResolvedValue(ownerShip)
    db.board.findUnique.mockResolvedValue({ ...mockBoard, lists: [] })
    await request(app).get('/boards/1').set('Authorization', bearerToken(1))
    expect(db.board.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: {
        lists: {
          orderBy: { position: 'asc' },
          include: {
            cards: {
              orderBy: { position: 'asc' },
              include: {
                comments: true,
                labels: { include: { label: true } },
              },
            },
          },
        },
      },
    })
  })
})

describe('POST /boards — response body and query precision', () => {
  it('returns { error: "Unauthorized" } as the body on 401', async () => {
    const res = await request(app).post('/boards').send({ name: 'x' })
    expect(res.body).toEqual({ error: 'Unauthorized' })
  })

  it('passes the board name into board.create data', async () => {
    db.board.create.mockResolvedValue(mockBoard)
    db.boardMember.create.mockResolvedValue(ownerShip)
    await request(app)
      .post('/boards')
      .set('Authorization', bearerToken(1))
      .send({ name: 'Q2 Sprint' })
    expect(db.board.create).toHaveBeenCalledWith({ data: { name: 'Q2 Sprint' } })
  })
})

describe('POST /boards/:id/members — response body and query precision', () => {
  it('returns { error: "Unauthorized" } as the body on 401', async () => {
    const res = await request(app).post('/boards/1/members').send({ memberId: 2 })
    expect(res.body).toEqual({ error: 'Unauthorized' })
  })

  it('checks ownership with the exact userId and boardId', async () => {
    db.boardMember.findUnique.mockResolvedValue(null)
    await request(app)
      .post('/boards/5/members')
      .set('Authorization', bearerToken(42))
      .send({ memberId: 3 })
    expect(db.boardMember.findUnique).toHaveBeenCalledWith({
      where: { userId_boardId: { userId: 42, boardId: 5 } },
    })
  })
})

describe('POST /boards/:id/members', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/boards/1/members').send({ memberId: 2 })
    expect(res.status).toBe(401)
  })

  it('returns 403 and does not add the member when caller is a regular member', async () => {
    db.boardMember.findUnique.mockResolvedValue(memberShip) // role: 'member'
    const res = await request(app)
      .post('/boards/1/members')
      .set('Authorization', bearerToken(2))
      .send({ memberId: 3 })
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'Only the board owner can add members' })
    expect(db.boardMember.create).not.toHaveBeenCalled()
  })

  it('returns 403 and does not add the member when caller has no membership at all', async () => {
    db.boardMember.findUnique.mockResolvedValue(null)
    const res = await request(app)
      .post('/boards/1/members')
      .set('Authorization', bearerToken(99))
      .send({ memberId: 3 })
    expect(res.status).toBe(403)
    expect(db.boardMember.create).not.toHaveBeenCalled()
  })

  it('adds the member with role "member" when the caller is the owner', async () => {
    db.boardMember.findUnique.mockResolvedValue(ownerShip)
    db.boardMember.create.mockResolvedValue({ userId: 3, boardId: 1, role: 'member' })
    const res = await request(app)
      .post('/boards/1/members')
      .set('Authorization', bearerToken(1))
      .send({ memberId: 3 })
    expect(res.status).toBe(201)
    expect(res.body).toEqual({ ok: true })
    expect(db.boardMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 3, boardId: 1, role: 'member' }),
      })
    )
  })
})
