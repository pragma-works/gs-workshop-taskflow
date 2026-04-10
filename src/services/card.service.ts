import prisma from '../db'
import { CardRepository } from '../repositories/card.repository'
import { ActivityRepository } from '../repositories/activity.repository'
import { CommentRepository } from '../repositories/comment.repository'

/**
 * Service for card operations
 */
export class CardService {
  constructor(
    private cardRepo: CardRepository,
    private activityRepo: ActivityRepository,
    private commentRepo: CommentRepository
  ) {}

  /**
   * Get a card by ID
   * @param cardId Card ID
   * @returns Card with details or null
   */
  async getCard(cardId: number) {
    return await this.cardRepo.findByIdWithDetails(cardId)
  }

  /**
   * Create a new card
   * @param title Card title
   * @param description Card description
   * @param listId List ID
   * @param assigneeId Assignee user ID
   * @returns Created card
   */
  async createCard(
    title: string,
    description: string | undefined,
    listId: number,
    assigneeId?: number
  ) {
    const count = await this.cardRepo.countInList(listId)
    return await this.cardRepo.create({
      title,
      description,
      listId,
      assigneeId,
      position: count,
    })
  }

  /**
   * Move a card to a different list with activity logging
   * @param cardId Card ID
   * @param targetListId Target list ID
   * @param position New position
   * @param userId User ID performing the move
   * @returns true on success
   * @throws Error if card not found
   */
  async moveCard(
    cardId: number,
    targetListId: number,
    position: number,
    userId: number
  ): Promise<boolean> {
    const card = await this.cardRepo.findById(cardId)
    if (!card) {
      throw new Error('Card not found')
    }

    const fromListId = card.listId

    // Get boardId from the card's list
    const list = await prisma.list.findUnique({
      where: { id: card.listId },
      select: { boardId: true },
    })

    if (!list) {
      throw new Error('List not found')
    }

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Update card
      await tx.card.update({
        where: { id: cardId },
        data: { listId: targetListId, position },
      })

      // Log activity
      await tx.activityEvent.create({
        data: {
          boardId: list.boardId,
          cardId,
          userId,
          action: 'card_moved',
          meta: JSON.stringify({ fromListId, toListId: targetListId }),
        },
      })
    })

    return true
  }

  /**
   * Add a comment to a card with activity logging
   * @param cardId Card ID
   * @param content Comment content
   * @param userId User ID adding the comment
   * @returns Created comment
   */
  async addComment(cardId: number, content: string, userId: number) {
    // Get card to find boardId
    const card = await this.cardRepo.findById(cardId)
    if (!card) {
      throw new Error('Card not found')
    }

    const list = await prisma.list.findUnique({
      where: { id: card.listId },
      select: { boardId: true },
    })

    if (!list) {
      throw new Error('List not found')
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Create comment
      const comment = await tx.comment.create({
        data: { content, cardId, userId },
      })

      // Log activity
      await tx.activityEvent.create({
        data: {
          boardId: list.boardId,
          cardId,
          userId,
          action: 'comment_added',
          meta: JSON.stringify({ commentId: comment.id }),
        },
      })

      return comment
    })

    return result
  }

  /**
   * Delete a card
   * @param cardId Card ID
   */
  async deleteCard(cardId: number): Promise<void> {
    await this.cardRepo.delete(cardId)
  }
}
