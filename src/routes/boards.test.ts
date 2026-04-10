import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { createBoardsRouter } from './boards'
import type { BoardService } from '../services/BoardService'
import * as jwt from 'jsonwebtoken'

const JWT_SECRET = 'super-secret-key-change-me'

function token(userId: number) {
  return `Bearer ${jwt.sign({ userId }, JWT_SECRET)}`
}

function makeMockBoardService(): BoardService {
  return {
    getBoardsForUser: vi.fn(),
    getBoard: vi.fn(),
    createBoard: vi.fn(),
    addMember: vi.fn(),
  } as unknown as BoardService
}

function makeApp(boardService: BoardService) {
  const app = express()
  app.use(express.json())
  app.use('/boards', createBoardsRouter(boardService))
  return app
}

// ---------------------------------------------------------------------------

describe('GET /boards', () => {
  let boardService: BoardService

  beforeEach(() => {
    boardService = makeMockBoardService()
  })

  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(makeApp(boardService)).get('/boards')
    expect(res.status).toBe(401)
  })

  it('returns 200 with boards list for authenticated user', async () => {
    const mockBoards = [
      { id: 1, name: 'Project Alpha', createdAt: new Date() },
      { id: 2, name: 'Project Beta', createdAt: new Date() },
    ]
    vi.mocked(boardService.getBoardsForUser).mockResolvedValueOnce(mockBoards as any)

    const res = await request(makeApp(boardService))
      .get('/boards')
      .set('Authorization', token(1))

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0]).toMatchObject({ name: 'Project Alpha' })
  })
})

// ---------------------------------------------------------------------------

describe('GET /boards/:id', () => {
  let boardService: BoardService

  beforeEach(() => {
    boardService = makeMockBoardService()
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await request(makeApp(boardService)).get('/boards/1')
    expect(res.status).toBe(401)
  })

  it('returns 200 with board details for a member', async () => {
    const mockBoard = { id: 1, name: 'Project Alpha', createdAt: new Date(), lists: [] }
    vi.mocked(boardService.getBoard).mockResolvedValueOnce(mockBoard as any)

    const res = await request(makeApp(boardService))
      .get('/boards/1')
      .set('Authorization', token(1))

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: 1, name: 'Project Alpha' })
  })

  it('returns 403 when caller is not a board member', async () => {
    vi.mocked(boardService.getBoard).mockRejectedValueOnce(
      Object.assign(new Error('Not a board member'), { status: 403 }),
    )

    const res = await request(makeApp(boardService))
      .get('/boards/1')
      .set('Authorization', token(99))

    expect(res.status).toBe(403)
    expect(res.body).toMatchObject({ error: 'Not a board member' })
  })

  it('returns 404 when board does not exist', async () => {
    vi.mocked(boardService.getBoard).mockRejectedValueOnce(
      Object.assign(new Error('Board not found'), { status: 404 }),
    )

    const res = await request(makeApp(boardService))
      .get('/boards/999')
      .set('Authorization', token(1))

    expect(res.status).toBe(404)
    expect(res.body).toMatchObject({ error: 'Board not found' })
  })
})

// ---------------------------------------------------------------------------

describe('POST /boards', () => {
  let boardService: BoardService

  beforeEach(() => {
    boardService = makeMockBoardService()
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await request(makeApp(boardService)).post('/boards').send({ name: 'New Board' })
    expect(res.status).toBe(401)
  })

  it('returns 201 with created board', async () => {
    const mockBoard = { id: 3, name: 'New Board', createdAt: new Date() }
    vi.mocked(boardService.createBoard).mockResolvedValueOnce(mockBoard as any)

    const res = await request(makeApp(boardService))
      .post('/boards')
      .set('Authorization', token(1))
      .send({ name: 'New Board' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ id: 3, name: 'New Board' })
    expect(boardService.createBoard).toHaveBeenCalledWith('New Board', 1)
  })
})
