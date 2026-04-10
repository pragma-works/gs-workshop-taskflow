import prisma from '../db'
import { ICardRepository, NotFoundError } from '../types'

export const cardRepository: ICardRepository = {
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

  async updateListAndPosition(cardId: number, listId: number, position: number) {
    return prisma.card.update({
      where: { id: cardId },
      data: { listId, position },
    })
  },

  async delete(id: number) {
    await prisma.comment.deleteMany({ where: { cardId: id } })
    await prisma.cardLabel.deleteMany({ where: { cardId: id } })
    await prisma.activityEvent.deleteMany({ where: { cardId: id } })
    await prisma.card.delete({ where: { id } })
  },

  async countByList(listId: number) {
    return prisma.card.count({ where: { listId } })
  },

  async createComment(data: { content: string; cardId: number; userId: number }) {
    return prisma.comment.create({ data })
  },

  async moveCardWithEvent(cardId: number, targetListId: number, position: number, userId: number) {
    return prisma.$transaction(async (tx) => {
      const card = await tx.card.findUnique({
        where: { id: cardId },
        include: { list: true },
      })
      if (!card) throw new NotFoundError('Card not found')

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

  async addCommentWithEvent(cardId: number, content: string, userId: number) {
    return prisma.$transaction(async (tx) => {
      const card = await tx.card.findUnique({
        where: { id: cardId },
        include: { list: true },
      })
      if (!card) throw new NotFoundError('Card not found')

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
}
