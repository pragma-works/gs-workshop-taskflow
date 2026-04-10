import prisma from '../db'

/** Find a card by id with comments, labels, and list (for boardId) */
export async function findCardWithDetails(cardId: number) {
  return prisma.card.findUnique({
    where: { id: cardId },
    include: {
      comments: true,
      labels: { include: { label: true } },
      list: true,
    },
  })
}

/** Create a card, auto-calculating position */
export async function createCard(data: { title: string; description?: string; listId: number; assigneeId?: number }) {
  const count = await prisma.card.count({ where: { listId: data.listId } })
  return prisma.card.create({
    data: { ...data, position: count },
  })
}

/** Move a card to a target list+position and log an activity event atomically */
export async function moveCard(cardId: number, targetListId: number, position: number, userId: number, boardId: number) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.card.findUniqueOrThrow({ where: { id: cardId } })
    const fromListId = existing.listId
    const card = await tx.card.update({
      where: { id: cardId },
      data: { listId: targetListId, position },
    })
    await tx.activityEvent.create({
      data: {
        boardId,
        cardId,
        userId,
        action: 'card_moved',
        meta: JSON.stringify({ fromListId, toListId: targetListId }),
      },
    })
    return card
  })
}

/** Add a comment and log an activity event atomically */
export async function addComment(cardId: number, userId: number, content: string, boardId: number) {
  return prisma.$transaction(async (tx) => {
    const comment = await tx.comment.create({ data: { content, cardId, userId } })
    await tx.activityEvent.create({
      data: {
        boardId,
        cardId,
        userId,
        action: 'comment_added',
        meta: JSON.stringify({ commentId: comment.id }),
      },
    })
    return comment
  })
}

/** Find a card by id (plain, no includes) */
export async function findCard(cardId: number) {
  return prisma.card.findUnique({ where: { id: cardId } })
}

/** Delete a card by id */
export async function deleteCard(cardId: number) {
  return prisma.card.delete({ where: { id: cardId } })
}
