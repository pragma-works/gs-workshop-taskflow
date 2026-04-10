import prisma from '../db'

export class ActivityRepository {
  /**
   * Get all activity events for a board (newest first)
   */
  static async getByBoardId(boardId: number, limit?: number) {
    return prisma.activityEvent.findMany({
      where: { boardId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: true, card: true },
    })
  }

  /**
   * Get recent activity events (for preview endpoints)
   */
  static async getRecent(boardId: number, limit = 10) {
    return this.getByBoardId(boardId, limit)
  }

  /**
   * Create an activity event (use within transaction)
   */
  static async create(
    data: {
      boardId: number
      cardId?: number | null
      userId: number
      action: string
      meta?: string | null
    },
    tx?: any
  ) {
    const client = tx || prisma
    return client.activityEvent.create({
      data,
      include: { user: true, card: true },
    })
  }

  /**
   * Log a card move event
   */
  static async logCardMove(
    boardId: number,
    cardId: number,
    userId: number,
    fromListId: number,
    toListId: number,
    position: number,
    tx?: any
  ) {
    return this.create(
      {
        boardId,
        cardId,
        userId,
        action: 'card_moved',
        meta: JSON.stringify({ fromListId, toListId, position }),
      },
      tx
    )
  }

  /**
   * Log a comment added event
   */
  static async logCommentAdded(
    boardId: number,
    cardId: number,
    userId: number,
    commentId: number,
    tx?: any
  ) {
    return this.create(
      {
        boardId,
        cardId,
        userId,
        action: 'comment_added',
        meta: JSON.stringify({ commentId }),
      },
      tx
    )
  }
}
