import { Prisma } from '@prisma/client'
import prisma from '../db'

export class BoardRepository {
  async isMember(userId: number, boardId: number): Promise<boolean> {
    const membership = await prisma.boardMember.findUnique({
      where: { userId_boardId: { userId, boardId } },
    })
    return membership !== null
  }

  async isOwner(userId: number, boardId: number): Promise<boolean> {
    const membership = await prisma.boardMember.findUnique({
      where: { userId_boardId: { userId, boardId } },
    })
    return membership?.role === 'owner'
  }

  async listForUser(userId: number) {
    return prisma.board.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findById(boardId: number) {
    return prisma.board.findUnique({ where: { id: boardId } })
  }

  async findBoardDetails(boardId: number) {
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
                labels: {
                  include: {
                    label: true,
                  },
                },
              },
            },
          },
        },
      },
    })
  }

  async createWithOwner(name: string, userId: number) {
    return prisma.$transaction(async (tx) => {
      const board = await tx.board.create({ data: { name } })
      await tx.boardMember.create({ data: { userId, boardId: board.id, role: 'owner' } })
      return board
    })
  }

  async addMember(boardId: number, memberId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma
    return client.boardMember.create({
      data: { userId: memberId, boardId, role: 'member' },
    })
  }
}
