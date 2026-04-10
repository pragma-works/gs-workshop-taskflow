import prisma from '../db'

/**
 * Card update data
 */
export interface CardUpdate {
  listId?: number
  position?: number
}

/**
 * Repository for card persistence operations
 */
export class CardRepository {
  /**
   * Find a card by ID
   * @param cardId Card ID
   * @returns Card or null
   */
  async findById(cardId: number) {
    return await prisma.card.findUnique({ where: { id: cardId } })
  }

  /**
   * Find a card by ID with details (comments and labels)
   * @param cardId Card ID
   * @returns Card with nested data or null
   */
  async findByIdWithDetails(cardId: number) {
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        comments: true,
        labels: {
          include: { label: true },
        },
      },
    })

    if (!card) return null

    return {
      ...card,
      labels: card.labels.map((cl) => cl.label),
    }
  }

  /**
   * Update a card
   * @param cardId Card ID
   * @param data Update data
   * @returns Updated card
   */
  async update(cardId: number, data: CardUpdate) {
    return await prisma.card.update({
      where: { id: cardId },
      data,
    })
  }

  /**
   * Count cards in a list
   * @param listId List ID
   * @returns Number of cards
   */
  async countInList(listId: number): Promise<number> {
    return await prisma.card.count({ where: { listId } })
  }

  /**
   * Create a new card
   * @param data Card data
   * @returns Created card
   */
  async create(data: {
    title: string
    description?: string
    listId: number
    assigneeId?: number
    position: number
  }) {
    return await prisma.card.create({ data })
  }

  /**
   * Delete a card
   * @param cardId Card ID
   */
  async delete(cardId: number): Promise<void> {
    await prisma.card.delete({ where: { id: cardId } })
  }

  /**
   * Get the boardId for a card
   * @param cardId Card ID
   * @returns Board ID or null
   */
  async getBoardIdFromCard(cardId: number): Promise<number | null> {
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      select: {
        list: {
          select: { boardId: true },
        },
      },
    })
    return card?.list.boardId ?? null
  }

  /**
   * Move card and log activity atomically
   * @param cardId Card ID
   * @param targetListId Target list ID
   * @param position New position
   * @param userId User performing the move
   * @param boardId Board ID for activity log
   * @param fromListId Original list ID
   */
  async moveCardWithActivity(
    cardId: number,
    targetListId: number,
    position: number,
    userId: number,
    boardId: number,
    fromListId: number
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.card.update({
        where: { id: cardId },
        data: { listId: targetListId, position },
      })

      await tx.activityEvent.create({
        data: {
          boardId,
          cardId,
          userId,
          action: 'card_moved',
          meta: JSON.stringify({ fromListId, toListId: targetListId }),
        },
      })
    })
  }
}
