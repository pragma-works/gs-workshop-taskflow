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

    // Get boardId from the card
    const boardId = await this.cardRepo.getBoardIdFromCard(cardId)
    if (!boardId) {
      throw new Error('List not found')
    }

    // Move card and log activity atomically
    await this.cardRepo.moveCardWithActivity(
      cardId,
      targetListId,
      position,
      userId,
      boardId,
      fromListId
    )

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
    // Get boardId from the card
    const boardId = await this.cardRepo.getBoardIdFromCard(cardId)
    if (!boardId) {
      throw new Error('Card not found')
    }

    // Create comment and log activity atomically
    const result = await this.commentRepo.createWithActivity(
      cardId,
      content,
      userId,
      boardId
    )

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
