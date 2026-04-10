import prisma from '../db'

export async function listBoardsForUser(userId: number) {
  const memberships = await prisma.boardMember.findMany({ where: { userId } })
  const boardIds = memberships.map(m => m.boardId)
  return prisma.board.findMany({ where: { id: { in: boardIds } } })
}

export async function checkMembership(userId: number, boardId: number) {
  return prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
  })
}

/** Returns the board with nested lists → cards → comments + labels, preserving
 *  the original response shape. Returns null when the board does not exist. */
export async function findBoardWithDetails(boardId: number) {
  const board = await prisma.board.findUnique({ where: { id: boardId } })
  if (!board) return null

  const lists = await prisma.list.findMany({
    where: { boardId },
    orderBy: { position: 'asc' },
  })

  const result = []
  for (const list of lists) {
    const cards = await prisma.card.findMany({
      where: { listId: list.id },
      orderBy: { position: 'asc' },
    })
    const cardsWithDetails = []
    for (const card of cards) {
      const comments = await prisma.comment.findMany({ where: { cardId: card.id } })
      const cardLabels = await prisma.cardLabel.findMany({ where: { cardId: card.id } })
      const labels = []
      for (const cl of cardLabels) {
        const label = await prisma.label.findUnique({ where: { id: cl.labelId } })
        labels.push(label)
      }
      cardsWithDetails.push({ ...card, comments, labels })
    }
    result.push({ ...list, cards: cardsWithDetails })
  }

  return { ...board, lists: result }
}

export async function createBoard(name: string, ownerId: number) {
  const board = await prisma.board.create({ data: { name } })
  await prisma.boardMember.create({ data: { userId: ownerId, boardId: board.id, role: 'owner' } })
  return board
}

export async function addBoardMember(boardId: number, memberId: number) {
  return prisma.boardMember.create({ data: { userId: memberId, boardId, role: 'member' } })
}
