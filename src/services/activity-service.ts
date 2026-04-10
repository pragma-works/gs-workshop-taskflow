import { ForbiddenError, NotFoundError, ValidationError } from '../shared/errors'
import { type BoardRepository } from './board-service'

export interface ActivityMeta extends Record<string, unknown> {}

export interface ActivityEvent {
  id: number
  boardId: number
  cardId?: number
  userId: number
  action: string
  meta?: ActivityMeta
  createdAt: Date
}

export interface ActivityRepository {
  listBoardActivity(boardId: number, limit?: number): Promise<ActivityEvent[]>
}

export interface ActivityService {
  getBoardActivity(userId: number, boardId: number): Promise<{ events: ActivityEvent[] }>
  getBoardActivityPreview(boardId: number): Promise<{ events: ActivityEvent[] }>
}

interface ActivityServiceDependencies {
  activityRepository: ActivityRepository
  boardRepository: BoardRepository
}

function requirePositiveInteger(value: number, fieldName: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ValidationError(`Invalid ${fieldName}`)
  }

  return value
}

/**
 * Creates activity feed use cases backed by repository ports.
 *
 * @param {ActivityServiceDependencies} dependencies - Activity and board repository collaborators.
 * @returns {ActivityService} Activity service API.
 */
export function createActivityService({
  activityRepository,
  boardRepository,
}: ActivityServiceDependencies): ActivityService {
  return {
    async getBoardActivity(userId: number, boardId: number): Promise<{ events: ActivityEvent[] }> {
      const normalizedUserId = requirePositiveInteger(userId, 'user id')
      const normalizedBoardId = requirePositiveInteger(boardId, 'board id')
      const board = await boardRepository.findBoardById(normalizedBoardId)

      if (!board) {
        throw new NotFoundError('Board not found')
      }

      const membershipRole = await boardRepository.findMemberRole(normalizedUserId, normalizedBoardId)
      if (!membershipRole) {
        throw new ForbiddenError('Not a board member')
      }

      return {
        events: await activityRepository.listBoardActivity(normalizedBoardId),
      }
    },

    async getBoardActivityPreview(boardId: number): Promise<{ events: ActivityEvent[] }> {
      const normalizedBoardId = requirePositiveInteger(boardId, 'board id')
      const board = await boardRepository.findBoardById(normalizedBoardId)

      if (!board) {
        throw new NotFoundError('Board not found')
      }

      return {
        events: await activityRepository.listBoardActivity(normalizedBoardId, 10),
      }
    },
  }
}
