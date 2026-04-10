import prisma from '../db'

export async function findCardWithDetails(id: number) {
  return prisma.card.findUnique({
    where: { id },
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
  return prisma.card.create({ data: { ...data, position: count } })
}

export async function moveCardWithActivity(
  cardId: number,
  targetListId: number,
  position: number,
  actorId: number
) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { list: { select: { boardId: true } } },
  })
  if (!card) return null

  const fromListId = card.listId
  const boardId = card.list.boardId

  const [updatedCard, event] = await prisma.$transaction([
    prisma.card.update({
      where: { id: cardId },
      data: { listId: targetListId, position },
    }),
    prisma.activityEvent.create({
      data: {
        boardId,
        actorId,
        eventType: 'card_moved',
        cardId,
        fromListId,
        toListId: targetListId,
      },
    }),
  ])

  return { card: updatedCard, event }
}

export async function addComment(data: {
  content: string
  cardId: number
  userId: number
}) {
  return prisma.comment.create({ data })
}

export async function deleteCard(id: number) {
  return prisma.card.delete({ where: { id } })
}
