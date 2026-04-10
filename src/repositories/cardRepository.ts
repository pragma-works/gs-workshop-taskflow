import prisma from '../db'

export const cardRepository = {
  async findCardWithList(cardId: number) {
    return prisma.card.findUnique({
      where: { id: cardId },
      include: { list: true },
    })
  },

  async findList(targetListId: number) {
    return prisma.list.findUnique({ where: { id: targetListId } })
  },

  async moveCardWithActivity(input: {
    cardId: number
    targetListId: number
    position: number
    userId: number
    boardId: number
    fromListId: number
  }) {
    return prisma.$transaction(async (tx) => {
      await tx.card.update({
        where: { id: input.cardId },
        data: { listId: input.targetListId, position: input.position },
      })

      return tx.activityEvent.create({
        data: {
          boardId: input.boardId,
          actorId: input.userId,
          eventType: 'card_moved',
          cardId: input.cardId,
          fromListId: input.fromListId,
          toListId: input.targetListId,
        },
      })
    })
  },
}
