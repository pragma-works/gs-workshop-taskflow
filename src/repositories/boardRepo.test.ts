import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as boardRepo from './boardRepo'
import prisma from '../db'

vi.mock('../db', () => ({
  default: {
    boardMember: {
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
    },
    board: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  }
}))

describe('boardRepo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('findMembership calls prisma.boardMember.findUnique', async () => {
    await boardRepo.findMembership(1, 2)
    expect(prisma.boardMember.findUnique).toHaveBeenCalledWith({ where: { userId_boardId: { userId: 1, boardId: 2 } } })
  })

  it('findBoardsByUser calls prisma.board.findMany', async () => {
    await boardRepo.findBoardsByUser(3)
    expect(prisma.board.findMany).toHaveBeenCalledWith({ where: { members: { some: { userId: 3 } } } })
  })

  it('findBoardById calls prisma.board.findUnique', async () => {
    await boardRepo.findBoardById(4)
    expect(prisma.board.findUnique).toHaveBeenCalledWith({ where: { id: 4 } })
  })

  it('findBoardWithDetails calls prisma.board.findUnique with include', async () => {
    await boardRepo.findBoardWithDetails(5)
    expect(prisma.board.findUnique).toHaveBeenCalledWith({
      where: { id: 5 },
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

  it('createBoard calls prisma.board.create', async () => {
    await boardRepo.createBoard('Test')
    expect(prisma.board.create).toHaveBeenCalledWith({ data: { name: 'Test' } })
  })

  it('addBoardMember calls prisma.boardMember.create', async () => {
    await boardRepo.addBoardMember(1, 2, 'owner')
    expect(prisma.boardMember.create).toHaveBeenCalledWith({ data: { userId: 1, boardId: 2, role: 'owner' } })
  })
})
