import prisma from '../db'

export const cardRepository = {
  async findById(id: number) {
    return prisma.card.findUnique({ where: { id } })
  },

  async findByIdWithDetails(id: number) {
    return prisma.card.findUnique({
      where: { id },
      include: {
        comments: true,
        labels: { include: { label: true } },
      },
    })
  },

  async findByIdWithList(id: number) {
    return prisma.card.findUnique({
      where: { id },
      include: { list: true },
    })
  },

  async create(data: { title: string; description?: string; listId: number; assigneeId?: number }) {
    const count = await prisma.card.count({ where: { listId: data.listId } })
    return prisma.card.create({
      data: { ...data, position: count },
    })
  },

  async moveCard(cardId: number, targetListId: number, position: number, userId: number) {
    return prisma.$transaction(async (tx) => {
      const card = await tx.card.findUnique({
        where: { id: cardId },
        include: { list: true },
      })
      if (!card) return null

      const fromListId = card.listId
      const boardId = card.list.boardId

      const updatedCard = await tx.card.update({
        where: { id: cardId },
        data: { listId: targetListId, position },
      })

      const event = await tx.activityEvent.create({
        data: {
          boardId,
          cardId,
          userId,
          action: 'card_moved',
          meta: JSON.stringify({ fromListId, toListId: targetListId }),
        },
      })

      return { card: updatedCard, event }
    })
  },

  async addComment(cardId: number, userId: number, content: string) {
    return prisma.$transaction(async (tx) => {
      const card = await tx.card.findUnique({
        where: { id: cardId },
        include: { list: true },
      })
      if (!card) return null

      const comment = await tx.comment.create({
        data: { content, cardId, userId },
      })

      const event = await tx.activityEvent.create({
        data: {
          boardId: card.list.boardId,
          cardId,
          userId,
          action: 'comment_added',
          meta: JSON.stringify({ commentId: comment.id }),
        },
      })

      return { comment, event }
    })
  },

  async delete(id: number) {
    await prisma.comment.deleteMany({ where: { cardId: id } })
    await prisma.cardLabel.deleteMany({ where: { cardId: id } })
    await prisma.activityEvent.deleteMany({ where: { cardId: id } })
    await prisma.card.delete({ where: { id } })
  },
}
