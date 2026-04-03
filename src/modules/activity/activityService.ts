import { ActivityEvent } from '@prisma/client'
import prisma from '../../db'

/** Shape of data passed when recording a card-move event. */
export interface CardMovedPayload {
  fromListId: number
  toListId: number
  position: number
}

/**
 * Returns all activity events for a board, newest first.
 */
export async function getActivityFeed(boardId: number): Promise<ActivityEvent[]> {
  return prisma.activityEvent.findMany({
    where: { boardId },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Returns the most recent N activity events for a board (default 20).
 */
export async function getActivityPreview(
  boardId: number,
  limit = 20,
): Promise<ActivityEvent[]> {
  return prisma.activityEvent.findMany({
    where: { boardId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/**
 * Moves a card to a new list and atomically records the ActivityEvent.
 * @param fromListId The current list the card is in (for audit payload).
 */
export async function moveCardWithActivity(
  cardId: number,
  fromListId: number,
  targetListId: number,
  position: number,
  userId: number,
  boardId: number,
): Promise<ActivityEvent> {
  const payload: CardMovedPayload = { fromListId, toListId: targetListId, position }
  const [, event] = await prisma.$transaction([
    prisma.card.update({
      where: { id: cardId },
      data: { listId: targetListId, position },
    }),
    prisma.activityEvent.create({
      data: {
        boardId,
        cardId,
        userId,
        type: 'card_moved',
        payload: JSON.stringify(payload),
      },
    }),
  ])
  return event
}
