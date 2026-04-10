import prisma from '../db'

export async function getCardWithDetails(cardId: number) {
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

export async function deleteCard(cardId: number) {
  return prisma.card.delete({ where: { id: cardId } })
}

export async function addComment(cardId: number, userId: number, content: string) {
  return prisma.comment.create({ data: { content, cardId, userId } })
}

export async function getList(listId: number) {
  return prisma.list.findUnique({ where: { id: listId } })
}

export async function moveCardAtomic(params: {
  cardId: number
  targetListId: number
  position: number
  fromListId: number
  boardId: number
  actorId: number
}) {
  const { cardId, targetListId, position, fromListId, boardId, actorId } = params
  return prisma.$transaction([
    prisma.card.update({
      where: { id: cardId },
      data: { listId: targetListId, position },
    }),
    prisma.activityEvent.create({
      data: {
        eventType: 'card_moved',
        cardId,
        fromListId,
        toListId: targetListId,
        boardId,
        actorId,
      },
    }),
  ])
}
