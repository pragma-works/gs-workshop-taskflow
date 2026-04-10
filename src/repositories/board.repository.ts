import prisma from '../db'

export async function findBoardById(boardId: number) {
  return prisma.board.findUnique({ where: { id: boardId } })
}

export async function findBoardsByUserId(userId: number) {
  return prisma.board.findMany({
    where: { members: { some: { userId } } },
  })
}

export async function findBoardWithDetails(boardId: number) {
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

export async function findMembership(userId: number, boardId: number) {
  return prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
}

export async function createMembership(userId: number, boardId: number, role: string) {
  return prisma.boardMember.create({ data: { userId, boardId, role } })
}
