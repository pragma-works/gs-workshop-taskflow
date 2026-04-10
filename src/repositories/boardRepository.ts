import prisma from '../db'

export const boardRepository = {
  async isMember(userId: number, boardId: number): Promise<boolean> {
    const membership = await prisma.boardMember.findUnique({
      where: { userId_boardId: { userId, boardId } },
    })
    return membership !== null
  },

  async listUserBoards(userId: number) {
    return prisma.board.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  },

  async getBoardWithDetails(boardId: number) {
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
  },
}
