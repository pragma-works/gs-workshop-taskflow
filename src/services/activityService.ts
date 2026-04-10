import { IActivityRepository, IBoardRepository, IActivityService, NotFoundError, ForbiddenError } from '../types'

export function createActivityService(activityRepo: IActivityRepository, boardRepo: IBoardRepository): IActivityService {
  return {
    async getByBoard(userId: number, boardId: number) {
      const board = await boardRepo.findById(boardId)
      if (!board) throw new NotFoundError('Board not found')

      const isMember = await boardRepo.checkMembership(userId, boardId)
      if (!isMember) throw new ForbiddenError('Not a board member')

      return activityRepo.findByBoardId(boardId)
    },

    async getPreview(boardId: number) {
      const board = await boardRepo.findById(boardId)
      if (!board) throw new NotFoundError('Board not found')

      return activityRepo.findByBoardId(boardId, 10)
    },
  }
}
