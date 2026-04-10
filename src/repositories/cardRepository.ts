import prisma from '../db'
import { Card, Comment } from '@prisma/client'

/**
 * Finds a card by ID with comments and labels.
 * @param cardId - The card's ID
 * @returns {Promise<object | null>} Card with details or null
 */
export async function getCardWithDetails(cardId: number) {
  return prisma.card.findUnique({
    where: { id: cardId },
    include: {
      comments: true,
      labels: { include: { label: true } },
    },
  })
}

/**
 * Creates a new card in a list.
 * @param data - Card fields: title, description, listId, assigneeId
 * @returns {Promise<Card>} The created card
 */
export async function createCard(data: {
  title: string
  description?: string
  listId: number
  assigneeId?: number
}): Promise<Card> {
  const count = await prisma.card.count({ where: { listId: data.listId } })
  return prisma.card.create({
    data: { ...data, position: count },
  })
}

/**
 * Moves a card to a target list and writes an ActivityEvent atomically.
 * @param cardId - The card's ID
 * @param targetListId - Destination list ID
 * @param position - New position in the list
 * @param userId - User performing the move
 * @param boardId - Board the card belongs to
 * @returns {Promise<Card>} The updated card
 */
export async function moveCard(
  cardId: number,
  targetListId: number,
  position: number,
  userId: number,
  boardId: number,
): Promise<Card> {
  const result = await prisma.$transaction(async (tx) => {
    const card = await tx.card.update({
      where: { id: cardId },
      data: { listId: targetListId, position },
    })
    await tx.activityEvent.create({
      data: { boardId, cardId, userId, action: 'card_moved' },
    })
    return card
  })
  return result
}

/**
 * Adds a comment to a card and writes an ActivityEvent.
 * @param cardId - The card's ID
 * @param userId - User writing the comment
 * @param content - Comment text
 * @param boardId - Board the card belongs to
 * @returns {Promise<Comment>} The created comment
 */
export async function addComment(
  cardId: number,
  userId: number,
  content: string,
  boardId: number,
): Promise<Comment> {
  const result = await prisma.$transaction(async (tx) => {
    const comment = await tx.comment.create({ data: { content, cardId, userId } })
    await tx.activityEvent.create({
      data: { boardId, cardId, userId, action: 'comment_added' },
    })
    return comment
  })
  return result
}

/**
 * Deletes a card by ID.
 * @param cardId - The card's ID
 */
export async function deleteCard(cardId: number): Promise<void> {
  await prisma.card.delete({ where: { id: cardId } })
}

/**
 * Gets the boardId for a given card by traversing list → board.
 * @param cardId - The card's ID
 * @returns {Promise<number | null>} The boardId or null if card not found
 */
export async function getBoardIdForCard(cardId: number): Promise<number | null> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { list: true },
  })
  return card?.list.boardId ?? null
}
