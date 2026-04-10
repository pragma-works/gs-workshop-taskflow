import prisma from '../db'

/**
 * Repository for comment persistence operations
 */
export class CommentRepository {
  /**
   * Create a new comment
   * @param content Comment content
   * @param cardId Card ID
   * @param userId User ID
   * @returns Created comment
   */
  async create(content: string, cardId: number, userId: number) {
    return await prisma.comment.create({
      data: { content, cardId, userId },
    })
  }

  /**
   * Find comments for a card
   * @param cardId Card ID
   * @returns Array of comments
   */
  async findByCardId(cardId: number) {
    return await prisma.comment.findMany({
      where: { cardId },
      orderBy: { createdAt: 'asc' },
    })
  }

  /**
   * Create comment and log activity atomically
   * @param cardId Card ID
   * @param content Comment content
   * @param userId User creating the comment
   * @param boardId Board ID for activity log
   * @returns Created comment
   */
  async createWithActivity(
    cardId: number,
    content: string,
    userId: number,
    boardId: number
  ) {
    return await prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: { content, cardId, userId },
      })

      await tx.activityEvent.create({
        data: {
          boardId,
          cardId,
          userId,
          action: 'comment_added',
          meta: JSON.stringify({ commentId: comment.id }),
        },
      })

      return comment
    })
  }
}
