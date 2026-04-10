import prisma from '../db'

// Single Responsibility: board business logic only
// Fixes N+1 queries using Prisma include (Open/Closed: easy to extend with new includes)

export async function getBoardsForUser(userId: number) {
  const memberships = await prisma.boardMember.findMany({
    where: { userId },
    include: { board: true },
  })
  return memberships.map((m) => m.board)
}

export async function getBoardDetail(boardId: number) {
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

export async function isBoardMember(userId: number, boardId: number): Promise<boolean> {
  const membership = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
  return membership !== null
}

export async function createBoard(userId: number, name: string) {
  const board = await prisma.board.create({ data: { name } })
  await prisma.boardMember.create({ data: { userId, boardId: board.id, role: 'owner' } })
  return board
}

export async function addBoardMember(boardId: number, memberId: number) {
  return prisma.boardMember.create({ data: { userId: memberId, boardId, role: 'member' } })
}
