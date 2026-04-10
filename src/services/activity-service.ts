import { ForbiddenError, NotFoundError } from '../errors'
import type { ActivityEventRecord, ActivityRepository } from '../repositories/activity-repository'
import type { BoardsRepository } from '../repositories/boards-repository'

export interface ActivityEventResponse {
  readonly id: number
  readonly boardId: number
  readonly cardId: number | null
  readonly userId: number
  readonly action: string
  readonly meta: Record<string, unknown>
  readonly createdAt: Date
}

export interface ActivityService {
  getBoardActivity(boardId: number, userId: number): Promise<{ events: ReadonlyArray<ActivityEventResponse> }>
  getBoardActivityPreview(boardId: number): Promise<{ events: ReadonlyArray<ActivityEventResponse> }>
}

function parseMeta(rawMeta: string | null): Record<string, unknown> {
  if (!rawMeta) {
    return {}
  }

  return JSON.parse(rawMeta) as Record<string, unknown>
}

function toActivityEventResponse(event: ActivityEventRecord): ActivityEventResponse {
  return {
    id: event.id,
    boardId: event.boardId,
    cardId: event.cardId,
    userId: event.userId,
    action: event.action,
    meta: {
      ...parseMeta(event.meta),
      actorName: event.userName,
      cardTitle: event.cardTitle,
      fromListId: event.fromListId,
      fromListName: event.fromListName,
      toListId: event.toListId,
      toListName: event.toListName,
    },
    createdAt: event.createdAt,
  }
}

export function createActivityService(
  boardsRepository: BoardsRepository,
  activityRepository: ActivityRepository,
): ActivityService {
  return {
    async getBoardActivity(boardId: number, userId: number): Promise<{ events: ReadonlyArray<ActivityEventResponse> }> {
      const board = await boardsRepository.findById(boardId)

      if (!board) {
        throw new NotFoundError('Board not found')
      }

      const membership = await boardsRepository.findMembership(userId, boardId)

      if (!membership) {
        throw new ForbiddenError('Not a board member')
      }

      const events = await activityRepository.listByBoardId(boardId)

      return {
        events: events.map(toActivityEventResponse),
      }
    },

    async getBoardActivityPreview(boardId: number): Promise<{ events: ReadonlyArray<ActivityEventResponse> }> {
      const board = await boardsRepository.findById(boardId)

      if (!board) {
        throw new NotFoundError('Board not found')
      }

      const events = await activityRepository.listByBoardId(boardId, 10)

      return {
        events: events.map(toActivityEventResponse),
      }
    },
  }
}
