import prisma from '../db'

/** Find all boards a user is a member of */
export async function findBoardsByUser(userId: number) {
  return prisma.board.findMany({
    where: { members: { some: { userId } } },
  })
}

/** Find a board by id with full nested data (lists → cards → comments + labels) */
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

/** Check if a user is a member of a board */
export async function isBoardMember(userId: number, boardId: number): Promise<boolean> {
  const membership = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
  return membership !== null
}

/** Create a new board with the creator as owner */
export async function createBoard(name: string, ownerId: number) {
  const board = await prisma.board.create({ data: { name } })
  await prisma.boardMember.create({ data: { userId: ownerId, boardId: board.id, role: 'owner' } })
  return board
}

/** Add a member to a board */
export async function addBoardMember(boardId: number, memberId: number) {
  return prisma.boardMember.create({ data: { userId: memberId, boardId, role: 'member' } })
}
