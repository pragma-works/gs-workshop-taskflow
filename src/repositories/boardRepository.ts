import prisma from '../db'

export async function findBoardById(boardId: number) {
  return prisma.board.findUnique({ where: { id: boardId } })
}

export async function findBoardsForUser(userId: number) {
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

export async function checkMembership(userId: number, boardId: number) {
  const membership = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
  return membership !== null
}

export async function createBoard(name: string, ownerId: number) {
  const board = await prisma.board.create({ data: { name } })
  await prisma.boardMember.create({
    data: { userId: ownerId, boardId: board.id, role: 'owner' },
  })
  return board
}

export async function addMember(boardId: number, memberId: number) {
  return prisma.boardMember.create({
    data: { userId: memberId, boardId, role: 'member' },
  })
}
