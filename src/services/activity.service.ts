import { ActivityRepository, ActivityEventData } from '../repositories/activity.repository'
import { BoardRepository } from '../repositories/board.repository'

/**
 * Service for activity feed operations
 */
export class ActivityService {
  constructor(
    private activityRepo: ActivityRepository,
    private boardRepo: BoardRepository
  ) {}

  /**
   * Get all activity events for a board
   * Verifies user is a board member first
   * @param boardId Board ID
   * @param userId User ID making the request
   * @returns Activity events, newest first
   * @throws Error if board not found or user not a member
   */
  async getBoardActivity(boardId: number, userId: number): Promise<{ events: ActivityEventData[] }> {
    const board = await this.boardRepo.findById(boardId)
    if (!board) {
      throw new Error('Board not found')
    }

    const isMember = await this.boardRepo.isMember(userId, boardId)
    if (!isMember) {
      throw new Error('Not a board member')
    }

    const events = await this.activityRepo.findByBoardId(boardId)
    return { events }
  }

  /**
   * Get preview of activity events for a board (no auth required)
   * @param boardId Board ID
   * @returns Last 10 activity events, newest first
   * @throws Error if board not found
   */
  async getBoardActivityPreview(boardId: number): Promise<{ events: ActivityEventData[] }> {
    const board = await this.boardRepo.findById(boardId)
    if (!board) {
      throw new Error('Board not found')
    }

    const events = await this.activityRepo.findByBoardIdWithLimit(boardId, 10)
    return { events }
  }

  /**
   * Log an activity event
   * @param boardId Board ID
   * @param userId User ID performing the action
   * @param action Action type (e.g., "card_moved", "comment_added")
   * @param cardId Optional card ID
   * @param meta Optional metadata as JSON string
   * @returns Created activity event
   */
  async logActivity(
    boardId: number,
    userId: number,
    action: string,
    cardId?: number,
    meta?: string
  ): Promise<ActivityEventData> {
    return await this.activityRepo.create({
      boardId,
      userId,
      action,
      cardId,
      meta,
    })
  }
}
