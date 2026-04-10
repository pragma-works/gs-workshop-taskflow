import prisma from '../db'

export async function listBoardsByUserId(userId: number) {
  return prisma.board.findMany({
    where: { members: { some: { userId } } },
    orderBy: { id: 'asc' },
  })
}

export async function isBoardMember(userId: number, boardId: number) {
  const membership = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })

  return membership !== null
}

export async function isBoardOwner(userId: number, boardId: number) {
  const membership = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })

  return membership?.role === 'owner'
}

export async function findBoardDetails(boardId: number) {
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

export async function createBoard(name: string) {
  return prisma.board.create({ data: { name } })
}

export async function addBoardMember(userId: number, boardId: number, role: 'owner' | 'member' = 'member') {
  return prisma.boardMember.create({ data: { userId, boardId, role } })
}
