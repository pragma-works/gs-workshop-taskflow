import { boardRepository } from '../repositories/boardRepository'
import { NotFoundError, ForbiddenError } from '../types'

export const boardService = {
  async listForUser(userId: number) {
    return boardRepository.findBoardsByUserId(userId)
  },

  async getWithDetails(userId: number, boardId: number) {
    const isMember = await boardRepository.checkMembership(userId, boardId)
    if (!isMember) throw new ForbiddenError('Not a board member')

    const board = await boardRepository.findWithDetails(boardId)
    if (!board) throw new NotFoundError('Board not found')

    return board
  },

  async create(name: string, ownerId: number) {
    return boardRepository.create(name, ownerId)
  },

  async addMember(userId: number, boardId: number, memberId: number) {
    const role = await boardRepository.getMemberRole(userId, boardId)
    if (role !== 'owner') throw new ForbiddenError('Only owners can add members')

    await boardRepository.addMember(boardId, memberId)
  },
}
