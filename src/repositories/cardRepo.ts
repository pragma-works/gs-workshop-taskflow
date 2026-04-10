import prisma from '../db'

export async function findCardWithList(id: number) {
  return prisma.card.findUnique({ where: { id }, include: { list: true } })
}

/** Fetches a card with its comments and labels, preserving the original response
 *  shape. Returns null when the card does not exist. */
export async function findCardDetails(id: number) {
  const card = await prisma.card.findUnique({ where: { id } })
  if (!card) return null

  const comments = await prisma.comment.findMany({ where: { cardId: id } })
  const cardLabels = await prisma.cardLabel.findMany({ where: { cardId: id } })
  const labels = []
  for (const cl of cardLabels) {
    const label = await prisma.label.findUnique({ where: { id: cl.labelId } })
    labels.push(label)
  }

  return { ...card, comments, labels }
}

export async function createCard(data: {
  title: string
  description?: string
  listId: number
  assigneeId?: number
}) {
  const count = await prisma.card.count({ where: { listId: data.listId } })
  return prisma.card.create({ data: { ...data, position: count } })
}

/** Updates the card's list/position and writes an ActivityEvent atomically. */
export async function moveCard(
  cardId: number,
  targetListId: number,
  position: number,
  actorId: number,
  boardId: number,
  fromListId: number,
) {
  const [updatedCard, event] = await prisma.$transaction([
    prisma.card.update({
      where: { id: cardId },
      data:  { listId: targetListId, position },
    }),
    prisma.activityEvent.create({
      data: {
        eventType:  'card_moved',
        boardId,
        actorId,
        cardId,
        fromListId,
        toListId: targetListId,
      },
    }),
  ])
  return { updatedCard, event }
}

export async function createComment(content: string, cardId: number, userId: number) {
  return prisma.comment.create({ data: { content, cardId, userId } })
}

export async function deleteCard(id: number) {
  return prisma.card.delete({ where: { id } })
}
