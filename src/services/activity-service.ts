import type { ActivityEvent } from '../domain/activity-events'
import type { BoardAccessAuthorizer } from './board-access-service'

export interface BoardActivityRepository {
  findEventsForBoard(boardId: number): Promise<readonly ActivityEvent[]>
}

export interface ActivityPreviewRepository {
  findLatestEventsForBoard(boardId: number, limit: number): Promise<readonly ActivityEvent[]>
}

/** Reads board activity feeds with the required access checks. */
export class ActivityService {
  /**
   * @param boardAccessAuthorizer Shared board authorization policy.
   * @param boardActivityRepository Repository for member-only activity history.
   * @param activityPreviewRepository Repository for public activity previews.
   */
  public constructor(
    private readonly boardAccessAuthorizer: BoardAccessAuthorizer,
    private readonly boardActivityRepository: BoardActivityRepository,
    private readonly activityPreviewRepository: ActivityPreviewRepository,
  ) {}

  /** Returns all activity events for a board, newest first. */
  public async getBoardActivity(
    userId: number,
    boardId: number,
  ): Promise<readonly ActivityEvent[]> {
    await this.boardAccessAuthorizer.assertBoardMember(userId, boardId)
    return this.boardActivityRepository.findEventsForBoard(boardId)
  }

  /** Returns the public activity preview for a board limited to the latest ten events. */
  public async getBoardActivityPreview(boardId: number): Promise<readonly ActivityEvent[]> {
    await this.boardAccessAuthorizer.assertBoardExists(boardId)
    return this.activityPreviewRepository.findLatestEventsForBoard(boardId, 10)
  }
}
