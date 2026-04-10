import prisma from '../db'

export async function getBoardsForUser(userId: number) {
  const memberships = await prisma.boardMember.findMany({
    where: { userId },
    include: { board: true },
  })
  return memberships.map((m) => m.board)
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

export async function isBoardMember(userId: number, boardId: number): Promise<boolean> {
  const membership = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
  return membership !== null
}

export async function isBoardOwner(userId: number, boardId: number): Promise<boolean> {
  const membership = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
  return membership?.role === 'owner'
}

export async function addBoardMember(userId: number, boardId: number) {
  return prisma.boardMember.create({ data: { userId, boardId, role: 'member' } })
}

export async function addBoardOwner(userId: number, boardId: number) {
  return prisma.boardMember.create({ data: { userId, boardId, role: 'owner' } })
}
