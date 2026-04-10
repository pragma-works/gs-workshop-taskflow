import prisma from '../db'

export async function findCardById(cardId: number) {
  return prisma.card.findUnique({ where: { id: cardId } })
}

export async function findCardWithList(cardId: number) {
  return prisma.card.findUnique({
    where: { id: cardId },
    include: { list: true },
  })
}

export async function findCardWithDetails(cardId: number) {
  return prisma.card.findUnique({
    where: { id: cardId },
    include: {
      comments: true,
      labels: { include: { label: true } },
    },
  })
}

export async function createCard(data: {
  title: string
  description?: string
  listId: number
  assigneeId?: number
}) {
  const count = await prisma.card.count({ where: { listId: data.listId } })
  return prisma.card.create({
    data: { ...data, position: count },
  })
}

export async function moveCardWithActivity(params: {
  cardId: number
  targetListId: number
  position: number
  userId: number
  boardId: number
  fromListId: number
}) {
  const { cardId, targetListId, position, userId, boardId, fromListId } = params

  return prisma.$transaction(async (tx) => {
    const updatedCard = await tx.card.update({
      where: { id: cardId },
      data: { listId: targetListId, position },
    })

    const event = await tx.activityEvent.create({
      data: {
        boardId,
        userId,
        action: 'card_moved',
        cardId,
        meta: JSON.stringify({ fromListId, toListId: targetListId }),
      },
    })

    return { card: updatedCard, event }
  })
}

export async function deleteCard(cardId: number) {
  return prisma.card.delete({ where: { id: cardId } })
}

export async function createComment(data: {
  content: string
  cardId: number
  userId: number
}) {
  return prisma.comment.create({ data })
}

export async function createCommentWithActivity(params: {
  content: string
  cardId: number
  userId: number
  boardId: number
}) {
  const { content, cardId, userId, boardId } = params

  return prisma.$transaction(async (tx) => {
    const comment = await tx.comment.create({
      data: { content, cardId, userId },
    })

    const event = await tx.activityEvent.create({
      data: {
        boardId,
        userId,
        action: 'comment_added',
        cardId,
      },
    })

    return { comment, event }
  })
}

export async function findListById(listId: number) {
  return prisma.list.findUnique({ where: { id: listId } })
}
