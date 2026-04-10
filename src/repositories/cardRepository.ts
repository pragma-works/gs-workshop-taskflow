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

export async function createCard(
  title: string,
  listId: number,
  description?: string,
  assigneeId?: number,
) {
  const agg = await prisma.card.aggregate({ where: { listId }, _max: { position: true } })
  const position = (agg._max.position ?? -1) + 1
  return prisma.card.create({ data: { title, description, listId, assigneeId, position } })
}

export async function moveCard(
  cardId: number,
  targetListId: number,
  position: number,
  actorId: number,
) {
  const card = await prisma.card.findUnique({ where: { id: cardId } })
  if (!card) return null

  const fromList = await prisma.list.findUnique({ where: { id: card.listId } })
  if (!fromList) return null

  const [updatedCard, event] = await prisma.$transaction([
    prisma.card.update({
      where: { id: cardId },
      data: { listId: targetListId, position },
    }),
    prisma.activityEvent.create({
      data: {
        eventType: 'card_moved',
        cardId,
        fromListId: card.listId,
        toListId: targetListId,
        actorId,
        boardId: fromList.boardId,
      },
    }),
  ])

  return { card: updatedCard, event }
}

export async function addComment(cardId: number, userId: number, content: string) {
  return prisma.comment.create({ data: { content, cardId, userId } })
}

export async function getCardById(cardId: number) {
  return prisma.card.findUnique({ where: { id: cardId } })
}

export async function deleteCard(cardId: number) {
  return prisma.card.delete({ where: { id: cardId } })
}
