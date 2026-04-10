import type { IActivityRepository, IBoardRepository, ActivityEventFormatted } from '../interfaces/repositories'
import { ForbiddenError } from '../types'
import type { PaginationQuery } from '../types'

export type ActivityService = {
  getBoardActivity(boardId: number, userId: number, pagination?: PaginationQuery): Promise<ActivityEventFormatted[]>
  getPreview(boardId: number): Promise<ActivityEventFormatted[]>
}

export function createActivityService(
  activityRepo: IActivityRepository,
  boardRepo: IBoardRepository
): ActivityService {
  return {
    async getBoardActivity(boardId, userId, pagination) {
      const member = await boardRepo.isMember(userId, boardId)
      if (!member) throw new ForbiddenError('Access denied')

      return activityRepo.getByBoard(boardId, pagination)
    },

    async getPreview(boardId) {
      return activityRepo.getByBoard(boardId, { page: 1, limit: 5 })
    },
  }
}
