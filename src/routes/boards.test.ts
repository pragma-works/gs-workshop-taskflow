import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import * as jwt from 'jsonwebtoken'

vi.mock('../db', () => ({
  default: {
    boardMember: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    board:       { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    list:        { findMany: vi.fn() },
    card:        { findMany: vi.fn() },
    comment:     { findMany: vi.fn() },
    cardLabel:   { findMany: vi.fn() },
    label:       { findUnique: vi.fn() },
  },
}))

import prisma from '../db'
import boardsRouter from './boards'

// ── helpers ────────────────────────────────────────────────────────────────────

const TOKEN_SECRET = 'super-secret-key-change-me'
const ACTOR_ID     = 7
const AUTH_HEADER  = `Bearer ${jwt.sign({ userId: ACTOR_ID }, TOKEN_SECRET)}`

const MOCK_BOARD      = { id: 1, name: 'Sprint Board', createdAt: new Date() }
const MOCK_MEMBERSHIP = { userId: ACTOR_ID, boardId: 1, role: 'member' }

const app = express()
app.use(express.json())
app.use('/boards', boardsRouter)

beforeEach(() => vi.clearAllMocks())

// ── GET /boards ────────────────────────────────────────────────────────────────

describe('GET /boards', () => {
  it('returns 401 when no Authorization header is supplied', async () => {
    const res = await request(app).get('/boards')

    expect(res.status).toBe(401)
    expect(prisma.boardMember.findMany).not.toHaveBeenCalled()
  })

  it('returns the boards the authenticated user belongs to', async () => {
    vi.mocked(prisma.boardMember.findMany).mockResolvedValue([MOCK_MEMBERSHIP] as any)
    vi.mocked(prisma.board.findMany).mockResolvedValue([MOCK_BOARD] as any)

    const res = await request(app)
      .get('/boards')
      .set('Authorization', AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({ id: 1, name: 'Sprint Board' })
  })

  it('returns an empty array when the user has no board memberships', async () => {
    vi.mocked(prisma.boardMember.findMany).mockResolvedValue([])
    vi.mocked(prisma.board.findMany).mockResolvedValue([])

    const res = await request(app)
      .get('/boards')
      .set('Authorization', AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

// ── GET /boards/:id ────────────────────────────────────────────────────────────

describe('GET /boards/:id', () => {
  it('returns 401 when no Authorization header is supplied', async () => {
    const res = await request(app).get('/boards/1')

    expect(res.status).toBe(401)
  })

  it('returns 403 when the caller is not a member of the board', async () => {
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(null)

    const res = await request(app)
      .get('/boards/1')
      .set('Authorization', AUTH_HEADER)

    expect(res.status).toBe(403)
    expect(res.body).toMatchObject({ error: 'Not a board member' })
  })

  it('returns 404 when the board does not exist', async () => {
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(MOCK_MEMBERSHIP as any)
    vi.mocked(prisma.board.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.list.findMany).mockResolvedValue([])

    const res = await request(app)
      .get('/boards/1')
      .set('Authorization', AUTH_HEADER)

    expect(res.status).toBe(404)
    expect(res.body).toMatchObject({ error: 'Board not found' })
  })

  it('returns the full board with nested lists and cards', async () => {
    const mockCard    = { id: 10, title: 'Task', description: null, position: 0,
                          dueDate: null, listId: 5, assigneeId: null, createdAt: new Date() }
    const mockList    = { id: 5, name: 'Backlog', position: 0, boardId: 1 }

    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(MOCK_MEMBERSHIP as any)
    vi.mocked(prisma.board.findUnique).mockResolvedValue(MOCK_BOARD as any)
    vi.mocked(prisma.list.findMany).mockResolvedValue([mockList] as any)
    vi.mocked(prisma.card.findMany).mockResolvedValue([mockCard] as any)
    vi.mocked(prisma.comment.findMany).mockResolvedValue([])
    vi.mocked(prisma.cardLabel.findMany).mockResolvedValue([])

    const res = await request(app)
      .get('/boards/1')
      .set('Authorization', AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: 1, name: 'Sprint Board' })
    expect(res.body.lists).toHaveLength(1)
    expect(res.body.lists[0].cards).toHaveLength(1)
    expect(res.body.lists[0].cards[0]).toMatchObject({ title: 'Task', comments: [], labels: [] })
  })

  it('resolves label details for cards that have labels attached', async () => {
    const mockCard      = { id: 10, title: 'Task', description: null, position: 0,
                            dueDate: null, listId: 5, assigneeId: null, createdAt: new Date() }
    const mockList      = { id: 5, name: 'Backlog', position: 0, boardId: 1 }
    const mockCardLabel = { cardId: 10, labelId: 2 }
    const mockLabel     = { id: 2, name: 'urgent', color: '#f00' }

    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(MOCK_MEMBERSHIP as any)
    vi.mocked(prisma.board.findUnique).mockResolvedValue(MOCK_BOARD as any)
    vi.mocked(prisma.list.findMany).mockResolvedValue([mockList] as any)
    vi.mocked(prisma.card.findMany).mockResolvedValue([mockCard] as any)
    vi.mocked(prisma.comment.findMany).mockResolvedValue([])
    vi.mocked(prisma.cardLabel.findMany).mockResolvedValue([mockCardLabel] as any)
    vi.mocked(prisma.label.findUnique).mockResolvedValue(mockLabel as any)

    const res = await request(app)
      .get('/boards/1')
      .set('Authorization', AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body.lists[0].cards[0].labels).toHaveLength(1)
    expect(res.body.lists[0].cards[0].labels[0]).toMatchObject({ name: 'urgent' })
  })
})

// ── POST /boards ───────────────────────────────────────────────────────────────

describe('POST /boards', () => {
  it('returns 401 when no Authorization header is supplied', async () => {
    const res = await request(app)
      .post('/boards')
      .send({ name: 'New Board' })

    expect(res.status).toBe(401)
  })

  it('creates the board and records the caller as owner, returning 201', async () => {
    vi.mocked(prisma.board.create).mockResolvedValue(MOCK_BOARD as any)
    vi.mocked(prisma.boardMember.create).mockResolvedValue(MOCK_MEMBERSHIP as any)

    const res = await request(app)
      .post('/boards')
      .set('Authorization', AUTH_HEADER)
      .send({ name: 'Sprint Board' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ id: 1, name: 'Sprint Board' })
    expect(prisma.boardMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: ACTOR_ID, role: 'owner' }),
      })
    )
  })
})

// ── POST /boards/:id/members ───────────────────────────────────────────────────

describe('POST /boards/:id/members', () => {
  it('returns 401 when no Authorization header is supplied', async () => {
    const res = await request(app)
      .post('/boards/1/members')
      .send({ memberId: 99 })

    expect(res.status).toBe(401)
  })

  it('adds the specified user as a board member and returns 201', async () => {
    vi.mocked(prisma.boardMember.create).mockResolvedValue(
      { userId: 99, boardId: 1, role: 'member' } as any
    )

    const res = await request(app)
      .post('/boards/1/members')
      .set('Authorization', AUTH_HEADER)
      .send({ memberId: 99 })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ ok: true })
    expect(prisma.boardMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 99, boardId: 1, role: 'member' }),
      })
    )
  })
})
