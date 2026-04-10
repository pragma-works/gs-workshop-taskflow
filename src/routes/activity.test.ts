import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import * as jwt from 'jsonwebtoken'

// ---------------------------------------------------------------------------
// Mock the db module so tests never touch a real database
// ---------------------------------------------------------------------------
vi.mock('../db', () => {
  const boardMember = { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() }
  const activityEvent = { findMany: vi.fn(), create: vi.fn() }
  const card = { findUnique: vi.fn(), update: vi.fn(), create: vi.fn(), count: vi.fn(), delete: vi.fn() }
  const list = { findUnique: vi.fn(), findMany: vi.fn() }
  const board = { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() }
  const comment = { create: vi.fn() }
  const user = { findUnique: vi.fn(), create: vi.fn() }

  const $transaction = vi.fn(async (ops: unknown[]) => Promise.all(ops))

  return {
    default: { boardMember, activityEvent, card, list, board, comment, user, $transaction },
  }
})

import app from '../index'
import prisma from '../db'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me'
function makeToken(userId: number) { return jwt.sign({ userId }, SECRET) }
const AUTH = () => ({ Authorization: `Bearer ${makeToken(1)}` })

// ---------------------------------------------------------------------------
// Activity feed
// ---------------------------------------------------------------------------

describe('GET /boards/:id/activity', () => {
  it('returns 401 when the request is unauthenticated', async () => {
    const res = await request(app).get('/boards/1/activity')
    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ error: 'Unauthorized' })
  })

  it('returns 403 when the user is not a board member', async () => {
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(null)
    const res = await request(app).get('/boards/1/activity').set(AUTH())
    expect(res.status).toBe(403)
  })

  it('returns activity events in reverse chronological order for authenticated board members', async () => {
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({ userId: 1, boardId: 1, role: 'member' } as never)
    const now = new Date()
    const earlier = new Date(now.getTime() - 60_000)
    vi.mocked(prisma.activityEvent.findMany).mockResolvedValue([
      { id: 2, boardId: 1, actorId: 1, eventType: 'card_moved', cardId: 10, fromListId: 1, toListId: 2, createdAt: now, actor: { name: 'Alice' }, card: { title: 'Fix bug' }, fromList: { name: 'Backlog' }, toList: { name: 'In Progress' } },
      { id: 1, boardId: 1, actorId: 1, eventType: 'card_moved', cardId: 10, fromListId: 2, toListId: 1, createdAt: earlier, actor: { name: 'Alice' }, card: { title: 'Fix bug' }, fromList: { name: 'In Progress' }, toList: { name: 'Backlog' } },
    ] as never)
    const res = await request(app).get('/boards/1/activity').set(AUTH())
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].id).toBe(2)
    expect(res.body[0].actorName).toBe('Alice')
    expect(res.body[0].cardTitle).toBe('Fix bug')
    expect(res.body[0].fromListName).toBe('Backlog')
    expect(res.body[0].toListName).toBe('In Progress')
  })
})

describe('GET /boards/:id/activity/preview', () => {
  it('returns events in reverse chronological order without requiring authentication', async () => {
    const now = new Date()
    const earlier = new Date(now.getTime() - 60_000)
    vi.mocked(prisma.activityEvent.findMany).mockResolvedValue([
      { id: 5, boardId: 2, actorId: 2, eventType: 'card_moved', cardId: 20, fromListId: 3, toListId: 4, createdAt: now, actor: { name: 'Bob' }, card: { title: 'New feature' }, fromList: { name: 'Todo' }, toList: { name: 'Done' } },
      { id: 3, boardId: 2, actorId: 2, eventType: 'card_moved', cardId: 20, fromListId: 4, toListId: 3, createdAt: earlier, actor: { name: 'Bob' }, card: { title: 'New feature' }, fromList: { name: 'Done' }, toList: { name: 'Todo' } },
    ] as never)
    const res = await request(app).get('/boards/2/activity/preview')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].id).toBe(5)
    expect(res.body[1].id).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// Card move
// ---------------------------------------------------------------------------

describe('PATCH /cards/:id/move', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates an ActivityEvent in the same transaction when a card is moved', async () => {
    const fakeCard = { id: 10, listId: 1, list: { id: 1, boardId: 5, name: 'Backlog', position: 0 } }
    const fakeEvent = { id: 99, boardId: 5, actorId: 1, eventType: 'card_moved', cardId: 10, fromListId: 1, toListId: 2, createdAt: new Date() }
    vi.mocked(prisma.card.findUnique).mockResolvedValue(fakeCard as never)
    vi.mocked(prisma.list.findUnique).mockResolvedValue({ id: 2 } as never)
    vi.mocked(prisma.$transaction).mockImplementation(async () => [{ ...fakeCard, listId: 2 }, fakeEvent])

    const res = await request(app).patch('/cards/10/move').set(AUTH()).send({ targetListId: 2, position: 0 })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.event).toMatchObject({ eventType: 'card_moved', cardId: 10 })
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it('returns 404 when the target list does not exist and rolls back cleanly', async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue({ id: 11, listId: 1, list: { id: 1, boardId: 5 } } as never)
    vi.mocked(prisma.list.findUnique).mockResolvedValue(null)

    const res = await request(app).patch('/cards/11/move').set(AUTH()).send({ targetListId: 999, position: 0 })
    expect(res.status).toBe(404)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).patch('/cards/1/move').send({ targetListId: 2, position: 0 })
    expect(res.status).toBe(401)
  })

  it('returns 404 when the card does not exist', async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue(null)
    const res = await request(app).patch('/cards/999/move').set(AUTH()).send({ targetListId: 2, position: 0 })
    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// Cards CRUD
// ---------------------------------------------------------------------------

describe('GET /cards/:id', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/cards/1')
    expect(res.status).toBe(401)
  })

  it('returns 404 when card not found', async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue(null)
    const res = await request(app).get('/cards/999').set(AUTH())
    expect(res.status).toBe(404)
  })

  it('returns card with comments and labels', async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue({ id: 1, title: 'My card', comments: [], labels: [] } as never)
    const res = await request(app).get('/cards/1').set(AUTH())
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('My card')
  })
})

describe('POST /cards', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).post('/cards').send({ title: 'X', listId: 1 })
    expect(res.status).toBe(401)
  })

  it('creates a card and returns 201', async () => {
    vi.mocked(prisma.card.count).mockResolvedValue(2)
    vi.mocked(prisma.card.create).mockResolvedValue({ id: 5, title: 'New', position: 2, listId: 1 } as never)
    const res = await request(app).post('/cards').set(AUTH()).send({ title: 'New', listId: 1 })
    expect(res.status).toBe(201)
    expect(res.body.title).toBe('New')
  })
})

describe('DELETE /cards/:id', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).delete('/cards/1')
    expect(res.status).toBe(401)
  })

  it('deletes a card and returns ok', async () => {
    vi.mocked(prisma.card.delete).mockResolvedValue({} as never)
    const res = await request(app).delete('/cards/1').set(AUTH())
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})

describe('POST /cards/:id/comments', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).post('/cards/1/comments').send({ content: 'hi' })
    expect(res.status).toBe(401)
  })

  it('creates a comment and returns 201', async () => {
    vi.mocked(prisma.comment.create).mockResolvedValue({ id: 1, content: 'hi', cardId: 1, userId: 1 } as never)
    const res = await request(app).post('/cards/1/comments').set(AUTH()).send({ content: 'hi' })
    expect(res.status).toBe(201)
    expect(res.body.content).toBe('hi')
  })
})

// ---------------------------------------------------------------------------
// Boards
// ---------------------------------------------------------------------------

describe('GET /boards', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/boards')
    expect(res.status).toBe(401)
  })

  it('returns boards for the authenticated user', async () => {
    vi.mocked(prisma.board.findMany).mockResolvedValue([{ id: 1, name: 'My Board' }] as never)
    const res = await request(app).get('/boards').set(AUTH())
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })
})

describe('GET /boards/:id', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/boards/1')
    expect(res.status).toBe(401)
  })

  it('returns 403 when not a board member', async () => {
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(null)
    const res = await request(app).get('/boards/1').set(AUTH())
    expect(res.status).toBe(403)
  })

  it('returns 404 when board not found', async () => {
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({ userId: 1, boardId: 1 } as never)
    vi.mocked(prisma.board.findUnique).mockResolvedValue(null)
    const res = await request(app).get('/boards/1').set(AUTH())
    expect(res.status).toBe(404)
  })

  it('returns board with lists and cards', async () => {
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({ userId: 1, boardId: 1 } as never)
    vi.mocked(prisma.board.findUnique).mockResolvedValue({ id: 1, name: 'Board', lists: [] } as never)
    const res = await request(app).get('/boards/1').set(AUTH())
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Board')
  })
})

describe('POST /boards', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).post('/boards').send({ name: 'X' })
    expect(res.status).toBe(401)
  })

  it('creates a board and adds creator as owner', async () => {
    vi.mocked(prisma.board.create).mockResolvedValue({ id: 1, name: 'Dev Board' } as never)
    vi.mocked(prisma.boardMember.create).mockResolvedValue({} as never)
    const res = await request(app).post('/boards').set(AUTH()).send({ name: 'Dev Board' })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Dev Board')
  })
})

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

describe('POST /users/register', () => {
  it('creates a user and does not expose the password', async () => {
    vi.mocked(prisma.user.create).mockResolvedValue({ id: 1, email: 'a@b.com', password: 'hashed', name: 'Alice', createdAt: new Date() } as never)
    const res = await request(app).post('/users/register').send({ email: 'a@b.com', password: 'pass', name: 'Alice' })
    expect(res.status).toBe(200)
    expect(res.body.password).toBeUndefined()
    expect(res.body.name).toBe('Alice')
  })
})

describe('POST /users/login', () => {
  it('returns 401 for unknown email', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    const res = await request(app).post('/users/login').send({ email: 'x@y.com', password: 'wrong' })
    expect(res.status).toBe(401)
  })

  it('returns a JWT token on valid credentials', async () => {
    const bcrypt = await import('bcryptjs')
    const hashed = await bcrypt.hash('correct', 10)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1, email: 'a@b.com', password: hashed, name: 'Alice' } as never)
    const res = await request(app).post('/users/login').send({ email: 'a@b.com', password: 'correct' })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeDefined()
  })
})

describe('GET /users/:id', () => {
  it('returns 404 when user not found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    const res = await request(app).get('/users/999')
    expect(res.status).toBe(404)
  })

  it('returns user without password field', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1, email: 'a@b.com', password: 'hashed', name: 'Alice', createdAt: new Date() } as never)
    const res = await request(app).get('/users/1')
    expect(res.status).toBe(200)
    expect(res.body.password).toBeUndefined()
    expect(res.body.name).toBe('Alice')
  })
})

