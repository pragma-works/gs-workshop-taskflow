import { activityRepository } from '../repositories/activityRepository'
import { boardRepository } from '../repositories/boardRepository'
import { NotFoundError, ForbiddenError } from '../types'

export const activityService = {
  async getByBoard(userId: number, boardId: number) {
    const board = await boardRepository.findById(boardId)
    if (!board) throw new NotFoundError('Board not found')

    const isMember = await boardRepository.checkMembership(userId, boardId)
    if (!isMember) throw new ForbiddenError('Not a board member')

    return activityRepository.findByBoardId(boardId)
  },

  async getPreview(boardId: number) {
    const board = await boardRepository.findById(boardId)
    if (!board) throw new NotFoundError('Board not found')

    return activityRepository.findByBoardId(boardId, 10)
  },
}
