import prisma from '../db'

export const cardRepository = {
  findCardDetails(cardId: number) {
    return prisma.card.findUnique({
      where: { id: cardId },
      include: {
        list: true,
        comments: true,
        labels: {
          include: { label: true },
        },
      },
    })
  },

  findCardWithList(cardId: number) {
    return prisma.card.findUnique({
      where: { id: cardId },
      include: { list: true },
    })
  },

  findListById(listId: number) {
    return prisma.list.findUnique({ where: { id: listId } })
  },

  countCardsInList(listId: number) {
    return prisma.card.count({ where: { listId } })
  },

  createCard(data: {
    title: string
    description?: string
    listId: number
    assigneeId?: number
    position: number
  }) {
    return prisma.card.create({ data })
  },

  moveCardAndCreateActivity(data: {
    cardId: number
    position: number
    targetListId: number
    boardId: number
    actorId: number
    fromListId: number
  }) {
    return prisma.$transaction(async (tx) => {
      await tx.card.update({
        where: { id: data.cardId },
        data: { listId: data.targetListId, position: data.position },
      })

      return tx.activityEvent.create({
        data: {
          boardId: data.boardId,
          actorId: data.actorId,
          eventType: 'card_moved',
          cardId: data.cardId,
          fromListId: data.fromListId,
          toListId: data.targetListId,
        },
      })
    })
  },

  createComment(data: { content: string; cardId: number; userId: number }) {
    return prisma.comment.create({ data })
  },

  deleteCard(cardId: number) {
    return prisma.card.delete({ where: { id: cardId } })
  },
}

export type CardRepository = typeof cardRepository