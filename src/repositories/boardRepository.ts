import prisma from '../db'
import { IBoardRepository } from '../types'

export const boardRepository: IBoardRepository = {
  async findBoardsByUserId(userId: number) {
    return prisma.board.findMany({
      where: { members: { some: { userId } } },
    })
  },

  async findById(boardId: number) {
    return prisma.board.findUnique({ where: { id: boardId } })
  },

  async findWithDetails(boardId: number) {
    return prisma.board.findUnique({
      where: { id: boardId },
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
  },

  async checkMembership(userId: number, boardId: number) {
    const membership = await prisma.boardMember.findUnique({
      where: { userId_boardId: { userId, boardId } },
    })
    return membership !== null
  },

  async getMemberRole(userId: number, boardId: number) {
    const membership = await prisma.boardMember.findUnique({
      where: { userId_boardId: { userId, boardId } },
    })
    return membership?.role ?? null
  },

  async create(name: string, ownerId: number) {
    const board = await prisma.board.create({ data: { name } })
    await prisma.boardMember.create({
      data: { userId: ownerId, boardId: board.id, role: 'owner' },
    })
    return board
  },

  async addMember(boardId: number, memberId: number) {
    await prisma.boardMember.create({
      data: { userId: memberId, boardId, role: 'member' },
    })
  },
}
