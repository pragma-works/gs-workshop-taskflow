import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../db', () => ({
  default: {
    boardMember: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    board: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import prisma from '../db'
import { getBoardsForUser, getBoardById, createBoard, getMembership, addMember } from './boardService'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getBoardsForUser', () => {
  it('returns array of boards from memberships', async () => {
    const boards = [
      { id: 1, name: 'Board A', createdAt: new Date() },
      { id: 2, name: 'Board B', createdAt: new Date() },
    ]
    vi.mocked(prisma.boardMember.findMany).mockResolvedValueOnce([
      { userId: 1, boardId: 1, role: 'owner', board: boards[0] } as any,
      { userId: 1, boardId: 2, role: 'member', board: boards[1] } as any,
    ])

    const result = await getBoardsForUser(1)

    expect(prisma.boardMember.findMany).toHaveBeenCalledWith({
      where: { userId: 1 },
      include: { board: true },
    })
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Board A')
    expect(result[1].name).toBe('Board B')
  })

  it('returns empty array when user has no memberships', async () => {
    vi.mocked(prisma.boardMember.findMany).mockResolvedValueOnce([])

    const result = await getBoardsForUser(99)

    expect(result).toEqual([])
  })
})

describe('createBoard', () => {
  it('creates board and owner membership in a transaction', async () => {
    const board = { id: 10, name: 'New Board', createdAt: new Date() }
    vi.mocked(prisma.$transaction).mockImplementationOnce(async (fn: unknown) => {
      const txMock = {
        board: { create: vi.fn().mockResolvedValue(board) },
        boardMember: { create: vi.fn().mockResolvedValue({ userId: 5, boardId: 10, role: 'owner' }) },
      }
      return (fn as (tx: typeof txMock) => Promise<typeof board>)(txMock)
    })

    const result = await createBoard('New Board', 5)

    expect(result).toEqual(board)
    expect(result.name).toBe('New Board')
    expect(result.id).toBe(10)
  })
})

describe('getBoardById', () => {
  it('returns board with deep relations when found', async () => {
    const board = { id: 5, name: 'Test Board', createdAt: new Date(), members: [], lists: [] }
    vi.mocked(prisma.board.findUnique).mockResolvedValueOnce(board as any)

    const result = await getBoardById(5)

    expect(prisma.board.findUnique).toHaveBeenCalledWith({
      where: { id: 5 },
      include: expect.objectContaining({ members: true, lists: expect.any(Object) }),
    })
    expect(result).toEqual(board)
  })

  it('returns null when board does not exist', async () => {
    vi.mocked(prisma.board.findUnique).mockResolvedValueOnce(null)

    const result = await getBoardById(999)

    expect(result).toBeNull()
  })
})


describe('getMembership', () => {
  it('returns membership when user is a member', async () => {
    const membership = { userId: 3, boardId: 7, role: 'member' }
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValueOnce(membership as any)

    const result = await getMembership(3, 7)

    expect(prisma.boardMember.findUnique).toHaveBeenCalledWith({
      where: { userId_boardId: { userId: 3, boardId: 7 } },
    })
    expect(result).toEqual(membership)
  })

  it('returns null when user is not a member', async () => {
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValueOnce(null)

    const result = await getMembership(3, 99)

    expect(result).toBeNull()
  })
})

describe('addMember', () => {
  it('throws Forbidden when caller is not owner', async () => {
    await expect(addMember(10, 5, 'member')).rejects.toThrow('Forbidden')
    expect(prisma.boardMember.create).not.toHaveBeenCalled()
  })

  it('throws Forbidden with exact message when role is empty string', async () => {
    await expect(addMember(10, 5, '')).rejects.toThrow('Forbidden')
  })

  it('creates boardMember with role member when caller is owner', async () => {
    const newMember = { userId: 5, boardId: 10, role: 'member' }
    vi.mocked(prisma.boardMember.create).mockResolvedValueOnce(newMember as any)

    const result = await addMember(10, 5, 'owner')

    expect(prisma.boardMember.create).toHaveBeenCalledWith({
      data: { userId: 5, boardId: 10, role: 'member' },
    })
    expect(result).toEqual(newMember)
    expect(result.role).toBe('member')
  })
})
