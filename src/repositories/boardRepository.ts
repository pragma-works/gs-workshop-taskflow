import prisma from '../db'

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

export async function createBoard(name: string, userId: number) {
  const board = await prisma.board.create({ data: { name } })
  await prisma.boardMember.create({ data: { userId, boardId: board.id, role: 'owner' } })
  return board
}

export async function addBoardMember(boardId: number, memberId: number) {
  return prisma.boardMember.create({ data: { userId: memberId, boardId, role: 'member' } })
}

export async function isBoardMember(userId: number, boardId: number): Promise<boolean> {
  const m = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
  return m !== null
}
