import prisma from '../db'

export class CardRepository {
  /**
   * Get card by ID with comments and labels
   */
  static async getById(cardId: number) {
    return prisma.card.findUnique({
      where: { id: cardId },
      include: {
        comments: { include: { user: true } },
        labels: { include: { label: true } },
        assignee: true,
        list: true,
      },
    })
  }

  /**
   * Get all cards in a list
   */
  static async getByListId(listId: number) {
    return prisma.card.findMany({
      where: { listId },
      orderBy: { position: 'asc' },
      include: {
        comments: { include: { user: true } },
        labels: { include: { label: true } },
        assignee: true,
      },
    })
  }

  /**
   * Move card to a different list (use within transaction)
   */
  static async move(
    cardId: number,
    targetListId: number,
    position: number,
    tx?: any
  ) {
    const client = tx || prisma
    return client.card.update({
      where: { id: cardId },
      data: { listId: targetListId, position },
    })
  }

  /**
   * Create a new card
   */
  static async create(data: {
    title: string
    description?: string
    listId: number
    assigneeId?: number
  }) {
    const count = await prisma.card.count({ where: { listId: data.listId } })
    return prisma.card.create({
      data: {
        ...data,
        position: count,
      },
      include: {
        comments: true,
        labels: true,
        assignee: true,
      },
    })
  }

  /**
   * Add a comment to a card (use within transaction)
   */
  static async addComment(
    cardId: number,
    userId: number,
    content: string,
    tx?: any
  ) {
    const client = tx || prisma
    return client.comment.create({
      data: { cardId, userId, content },
      include: { user: true },
    })
  }
}
