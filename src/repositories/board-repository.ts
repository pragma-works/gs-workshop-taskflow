import prisma from '../db'

export const boardRepository = {
  findMembership(userId: number, boardId: number) {
    return prisma.boardMember.findUnique({
      where: { userId_boardId: { userId, boardId } },
    })
  },

  findBoardsForUser(userId: number) {
    return prisma.boardMember.findMany({
      where: { userId },
      include: { board: true },
    })
  },

  findBoardDetails(boardId: number) {
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
                  include: { label: true },
                },
              },
            },
          },
        },
      },
    })
  },

  createBoardWithOwner(userId: number, name: string) {
    return prisma.$transaction(async (tx) => {
      const board = await tx.board.create({ data: { name } })
      await tx.boardMember.create({ data: { userId, boardId: board.id, role: 'owner' } })
      return board
    })
  },

  addMember(boardId: number, memberId: number) {
    return prisma.boardMember.create({ data: { userId: memberId, boardId, role: 'member' } })
  },
}

export type BoardRepository = typeof boardRepository