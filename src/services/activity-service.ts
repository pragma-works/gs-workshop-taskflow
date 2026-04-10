import { ForbiddenError, NotFoundError } from '../errors/application-error'
import type { BoardRepository } from './boards-service'

export type ActivityAction = 'card_moved' | 'comment_added'

export interface ActivityEvent {
  readonly action: ActivityAction
  readonly boardId: number
  readonly cardId?: number
  readonly createdAt: Date
  readonly id: number
  readonly meta?: Record<string, unknown>
  readonly userId: number
}

export interface ActivityRepository {
  findEventsForBoard(boardId: number, limit?: number): Promise<readonly ActivityEvent[]>
}

/** Reads board activity feeds with the required access checks. */
export class ActivityService {
  /** @param boardRepository Board access port. @param activityRepository Activity read port. */
  public constructor(
    private readonly boardRepository: Pick<BoardRepository, 'findBoardById' | 'findMemberRole'>,
    private readonly activityRepository: ActivityRepository,
  ) {}

  /** Returns all activity events for a board, newest first. */
  public async getBoardActivity(
    userId: number,
    boardId: number,
  ): Promise<readonly ActivityEvent[]> {
    await this.assertBoardExists(boardId)

    const role = await this.boardRepository.findMemberRole(userId, boardId)
    if (role === null) {
      throw new ForbiddenError('Not a board member', { boardId, userId })
    }

    return this.activityRepository.findEventsForBoard(boardId)
  }

  /** Returns the public activity preview for a board limited to the latest ten events. */
  public async getBoardActivityPreview(boardId: number): Promise<readonly ActivityEvent[]> {
    await this.assertBoardExists(boardId)
    return this.activityRepository.findEventsForBoard(boardId, 10)
  }

  private async assertBoardExists(boardId: number): Promise<void> {
    const board = await this.boardRepository.findBoardById(boardId)
    if (board === null) {
      throw new NotFoundError('Board not found', { boardId })
    }
  }
}
