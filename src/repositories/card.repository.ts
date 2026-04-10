import prisma from '../db'

export async function findCardById(cardId: number) {
  return prisma.card.findUnique({ where: { id: cardId } })
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

export async function findCardWithBoard(cardId: number) {
  return prisma.card.findUnique({
    where: { id: cardId },
    include: { list: { include: { board: true } } },
  })
}

export async function createCard(data: {
  title: string
  description?: string
  listId: number
  assigneeId?: number
  position: number
}) {
  return prisma.card.create({ data })
}

export async function countCardsByListId(listId: number) {
  return prisma.card.count({ where: { listId } })
}

export async function moveCardWithActivity(
  cardId: number,
  targetListId: number,
  position: number,
  activityData: { boardId: number; userId: number; meta?: string }
) {
  return prisma.$transaction(async (tx) => {
    const card = await tx.card.update({
      where: { id: cardId },
      data: { listId: targetListId, position },
    })
    const event = await tx.activityEvent.create({
      data: {
        boardId: activityData.boardId,
        cardId,
        userId: activityData.userId,
        action: 'card_moved',
        meta: activityData.meta,
      },
    })
    return { card, event }
  })
}

export async function deleteCard(cardId: number) {
  return prisma.card.delete({ where: { id: cardId } })
}
