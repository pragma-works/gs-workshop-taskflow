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

export async function createBoard(name: string, ownerId: number) {
  const board = await prisma.board.create({ data: { name } })
  await prisma.boardMember.create({ data: { userId: ownerId, boardId: board.id, role: 'owner' } })
  return board
}

export async function isMember(userId: number, boardId: number): Promise<boolean> {
  const membership = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
  return membership !== null
}

export async function isOwner(userId: number, boardId: number): Promise<boolean> {
  const membership = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
  return membership?.role === 'owner'
}

export async function addMember(boardId: number, memberId: number) {
  return prisma.boardMember.create({ data: { userId: memberId, boardId, role: 'member' } })
}
