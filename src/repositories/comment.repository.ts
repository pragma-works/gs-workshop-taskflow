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
}
