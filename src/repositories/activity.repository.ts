import prisma from '../db'

/**
 * Activity event data for creation
 */
export interface ActivityEventCreate {
  boardId: number
  cardId?: number
  userId: number
  action: string
  meta?: string
}

/**
 * Activity event returned from repository
 */
export interface ActivityEventData {
  id: number
  boardId: number
  cardId: number | null
  userId: number
  action: string
  meta: string | null
  createdAt: Date
}

/**
 * Repository for activity event persistence operations
 */
export class ActivityRepository {
  /**
   * Create a new activity event
   * @param data Activity event data
   * @returns Created activity event
   */
  async create(data: ActivityEventCreate): Promise<ActivityEventData> {
    return await prisma.activityEvent.create({
      data: {
        boardId: data.boardId,
        cardId: data.cardId,
        userId: data.userId,
        action: data.action,
        meta: data.meta,
      },
    })
  }

  /**
   * Get all activity events for a board
   * @param boardId Board ID
   * @returns Activity events, newest first
   */
  async findByBoardId(boardId: number): Promise<ActivityEventData[]> {
    return await prisma.activityEvent.findMany({
      where: { boardId },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Get last N activity events for a board
   * @param boardId Board ID
   * @param limit Maximum number of events to return
   * @returns Activity events, newest first
   */
  async findByBoardIdWithLimit(boardId: number, limit: number): Promise<ActivityEventData[]> {
    return await prisma.activityEvent.findMany({
      where: { boardId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }
}
