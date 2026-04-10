import prisma from '../db'

export async function findBoardMemberByUserAndBoard(userId: number, boardId: number): Promise<any> {
  return prisma.boardMember.findUnique({ where: { userId_boardId: { userId, boardId } } })
}

export async function findBoardMembersByUser(userId: number): Promise<any[]> {
  return prisma.boardMember.findMany({ where: { userId } })
}

export async function findBoardById(boardId: number): Promise<any> {
  return prisma.board.findUnique({ where: { id: boardId } })
}

export async function findListsByBoard(boardId: number): Promise<any[]> {
  return prisma.list.findMany({ where: { boardId }, orderBy: { position: 'asc' } })
}

export async function findCardsByList(listId: number): Promise<any[]> {
  return prisma.card.findMany({ where: { listId }, orderBy: { position: 'asc' } })
}

export async function findBoardWithDetails(boardId: number): Promise<any> {
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
      members: true,
      activity: { orderBy: { createdAt: 'desc' } },
    },
  })
}

export async function findCardById(cardId: number): Promise<any> {
  return prisma.card.findUnique({ where: { id: cardId } })
}

export async function findCommentsByCard(cardId: number): Promise<any[]> {
  return prisma.comment.findMany({ where: { cardId } })
}

export async function findCardLabelsByCard(cardId: number): Promise<any[]> {
  return prisma.cardLabel.findMany({ where: { cardId } })
}

export async function findLabelById(labelId: number): Promise<any> {
  return prisma.label.findUnique({ where: { id: labelId } })
}

export async function createBoard(name: string): Promise<any> {
  return prisma.board.create({ data: { name } })
}

export async function createBoardMember(data: { userId: number; boardId: number; role: string }): Promise<any> {
  return prisma.boardMember.create({ data })
}

export async function createUser(data: { email: string; password: string; name?: string }): Promise<any> {
  // Ensure name is always a string because Prisma schema requires it
  const payload = { email: data.email, password: data.password, name: data.name ?? '' }
  return prisma.user.create({ data: payload })
}

export async function findUserByEmail(email: string): Promise<any> {
  return prisma.user.findUnique({ where: { email } })
}

export async function findUserById(id: number): Promise<any> {
  return prisma.user.findUnique({ where: { id } })
}

export async function countCardsInList(listId: number): Promise<number> {
  return prisma.card.count({ where: { listId } })
}

export async function createCard(data: any): Promise<any> {
  return prisma.card.create({ data })
}

export async function updateCard(where: any, data: any): Promise<any> {
  return prisma.card.update({ where, data })
}

export async function deleteCard(where: any): Promise<any> {
  return prisma.card.delete({ where })
}

export async function createComment(data: any): Promise<any> {
  return prisma.comment.create({ data })
}

export async function createActivityEvent(data: { boardId: number; cardId?: number; userId?: number; action: string; meta?: any }) {
  const payload: any = { boardId: data.boardId, cardId: data.cardId, userId: data.userId, action: data.action }
  if (data.meta !== undefined) payload.meta = typeof data.meta === 'string' ? data.meta : JSON.stringify(data.meta)
  return prisma.activityEvent.create({ data: payload })
}

export async function findActivityEventsByBoard(boardId: number) {
  return prisma.activityEvent.findMany({ where: { boardId }, orderBy: { createdAt: 'desc' } })
}

export async function findActivityEventsPreview(boardId: number) {
  return prisma.activityEvent.findMany({ where: { boardId }, orderBy: { createdAt: 'desc' }, take: 10 })
}

export async function moveCardWithActivity(cardId: number, targetListId: number, position: number, userId?: number) {
  return prisma.$transaction(async (tx) => {
    const card = await tx.card.findUnique({ where: { id: cardId }, include: { list: true } })
    if (!card) throw new Error('Card not found')
    const fromListId = card.listId
    const boardId = card.list.boardId
    const updated = await tx.card.update({ where: { id: cardId }, data: { listId: targetListId, position } })
    await tx.activityEvent.create({ data: { boardId, cardId, userId, action: 'card_moved', meta: JSON.stringify({ fromListId, toListId: targetListId }) } })
    return updated
  })
}

export async function createCommentWithActivity(data: { content: string; cardId: number; userId: number }) {
  return prisma.$transaction(async (tx) => {
    const comment = await tx.comment.create({ data })
    const card = await tx.card.findUnique({ where: { id: data.cardId }, include: { list: true } })
    if (!card) throw new Error('Card not found')
    await tx.activityEvent.create({ data: { boardId: card.list.boardId, cardId: data.cardId, userId: data.userId, action: 'comment_added', meta: JSON.stringify({ commentId: comment.id }) } })
    return comment
  })
}
