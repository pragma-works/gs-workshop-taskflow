import prisma from '../db'

export async function findMembership(userId: number, boardId: number) {
  return prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
}

export async function findBoardsByUser(userId: number) {
  return prisma.board.findMany({
    where: { members: { some: { userId } } },
  })
}

export async function findBoardById(id: number) {
  return prisma.board.findUnique({ where: { id } })
}

export async function findBoardWithDetails(boardId: number) {
  const board = await prisma.board.findUnique({
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

  if (!board) return null

  return {
    ...board,
    lists: board.lists.map(list => ({
      ...list,
      cards: list.cards.map(card => ({
        ...card,
        labels: card.labels.map(cl => cl.label),
      })),
    })),
  }
}

export async function createBoard(name: string) {
  return prisma.board.create({ data: { name } })
}

export async function addBoardMember(userId: number, boardId: number, role: string = 'member') {
  return prisma.boardMember.create({ data: { userId, boardId, role } })
}
