import prisma from '../db'

export async function isBoardMember(userId: number, boardId: number): Promise<boolean> {
  const membership = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
  return membership !== null
}

export async function getBoardsForUser(userId: number) {
  return prisma.board.findMany({
    where: { members: { some: { userId } } },
  })
}

export async function getBoardWithDetails(boardId: number) {
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
}

export async function createBoard(name: string) {
  return prisma.board.create({ data: { name } })
}

export async function addBoardMember(userId: number, boardId: number, role: string) {
  return prisma.boardMember.create({ data: { userId, boardId, role } })
}
