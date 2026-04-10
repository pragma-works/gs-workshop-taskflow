import prisma from '../db'
import { ActivityEvent } from '@prisma/client'

/**
 * Gets all activity events for a board, newest first.
 * @param boardId - The board's ID
 * @returns {Promise<ActivityEvent[]>} Array of activity events
 */
export async function getActivityForBoard(boardId: number): Promise<ActivityEvent[]> {
  return prisma.activityEvent.findMany({
    where: { boardId },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Gets the latest N activity events for a board (for preview).
 * @param boardId - The board's ID
 * @param limit - Maximum number of events to return (default 10)
 * @returns {Promise<ActivityEvent[]>} Array of activity events
 */
export async function getActivityPreview(
  boardId: number,
  limit = 10,
): Promise<ActivityEvent[]> {
  return prisma.activityEvent.findMany({
    where: { boardId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}
