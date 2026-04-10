import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import jwt from 'jsonwebtoken'

const prismaMock = vi.hoisted(() => ({
  board: {
    findUnique: vi.fn(),
    create:     vi.fn(),
  },
  boardMember: {
    findUnique: vi.fn(),
    findMany:   vi.fn(),
    create:     vi.fn(),
  },
  list: {
    findMany: vi.fn(),
  },
  card: {
    findMany: vi.fn(),
  },
  comment: {
    findMany: vi.fn(),
  },
  cardLabel: {
    findMany: vi.fn(),
  },
  label: {
    findUnique: vi.fn(),
  },
}))

vi.mock('../db', () => ({ default: prismaMock }))

import boardsRouter from './boards'

const JWT_SECRET = 'super-secret-key-change-me'
const makeToken = (userId: number) => jwt.sign({ userId }, JWT_SECRET)

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/boards', boardsRouter)
  return app
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Boards routes', () => {
  const app = buildApp()

  beforeEach(() => vi.resetAllMocks())

  // ── GET /boards ──────────────────────────────────────────────────────────

  it('returns 401 for GET /boards when the request has no auth token', async () => {
    const res = await request(app).get('/boards')
    expect(res.status).toBe(401)
  })

  it('returns the list of boards the authenticated user belongs to on GET /boards', async () => {
    prismaMock.boardMember.findMany.mockResolvedValue([{ boardId: 1 }, { boardId: 2 }])
    prismaMock.board.findUnique
      .mockResolvedValueOnce({ id: 1, name: 'Alpha', createdAt: new Date() })
      .mockResolvedValueOnce({ id: 2, name: 'Beta',  createdAt: new Date() })

    const res = await request(app)
      .get('/boards')
      .set('Authorization', `Bearer ${makeToken(5)}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0]).toMatchObject({ id: 1, name: 'Alpha' })
    expect(res.body[1]).toMatchObject({ id: 2, name: 'Beta' })
  })

  // ── GET /boards/:id ──────────────────────────────────────────────────────

  it('returns 401 for GET /boards/:id when the request has no auth token', async () => {
    const res = await request(app).get('/boards/1')
    expect(res.status).toBe(401)
  })

  it('returns 403 for GET /boards/:id when the caller is not a board member', async () => {
    prismaMock.boardMember.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .get('/boards/1')
      .set('Authorization', `Bearer ${makeToken(5)}`)

    expect(res.status).toBe(403)
    expect(res.body).toMatchObject({ error: 'Not a board member' })
  })

  it('returns 404 for GET /boards/:id when the board does not exist', async () => {
    prismaMock.boardMember.findUnique.mockResolvedValue({ userId: 5, boardId: 1 })
    prismaMock.board.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .get('/boards/1')
      .set('Authorization', `Bearer ${makeToken(5)}`)

    expect(res.status).toBe(404)
    expect(res.body).toMatchObject({ error: 'Board not found' })
  })

  it('returns the full board with nested lists and cards for GET /boards/:id', async () => {
    prismaMock.boardMember.findUnique.mockResolvedValue({ userId: 5, boardId: 1 })
    prismaMock.board.findUnique.mockResolvedValue({ id: 1, name: 'Alpha', createdAt: new Date() })
    prismaMock.list.findMany.mockResolvedValue([{ id: 10, name: 'To Do', position: 0, boardId: 1 }])
    prismaMock.card.findMany.mockResolvedValue([{ id: 100, title: 'Task A', position: 0, listId: 10 }])
    prismaMock.comment.findMany.mockResolvedValue([])
    prismaMock.cardLabel.findMany.mockResolvedValue([])

    const res = await request(app)
      .get('/boards/1')
      .set('Authorization', `Bearer ${makeToken(5)}`)

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: 1, name: 'Alpha' })
    expect(res.body.lists).toHaveLength(1)
    expect(res.body.lists[0].cards).toHaveLength(1)
    expect(res.body.lists[0].cards[0]).toMatchObject({ id: 100, title: 'Task A', comments: [], labels: [] })
  })

  // ── POST /boards ─────────────────────────────────────────────────────────

  it('returns 401 for POST /boards when the request has no auth token', async () => {
    const res = await request(app).post('/boards').send({ name: 'New Board' })
    expect(res.status).toBe(401)
  })

  it('creates a board and adds the creator as owner on POST /boards', async () => {
    const board = { id: 7, name: 'My Board', createdAt: new Date().toISOString() }
    prismaMock.board.create.mockResolvedValue(board)
    prismaMock.boardMember.create.mockResolvedValue({})

    const res = await request(app)
      .post('/boards')
      .set('Authorization', `Bearer ${makeToken(5)}`)
      .send({ name: 'My Board' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ id: 7, name: 'My Board' })
    expect(prismaMock.boardMember.create).toHaveBeenCalledWith({
      data: { userId: 5, boardId: 7, role: 'owner' },
    })
  })

  // ── POST /boards/:id/members ─────────────────────────────────────────────

  it('returns 401 for POST /boards/:id/members when the request has no auth token', async () => {
    const res = await request(app).post('/boards/1/members').send({ memberId: 9 })
    expect(res.status).toBe(401)
  })

  it('adds a member to the board on POST /boards/:id/members', async () => {
    prismaMock.boardMember.create.mockResolvedValue({})

    const res = await request(app)
      .post('/boards/1/members')
      .set('Authorization', `Bearer ${makeToken(5)}`)
      .send({ memberId: 9 })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ ok: true })
    expect(prismaMock.boardMember.create).toHaveBeenCalledWith({
      data: { userId: 9, boardId: 1, role: 'member' },
    })
  })
})
