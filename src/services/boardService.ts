import { IBoardRepository, IBoardService, NotFoundError, ForbiddenError } from '../types'

export function createBoardService(boardRepo: IBoardRepository): IBoardService {
  return {
    async listForUser(userId: number) {
      return boardRepo.findBoardsByUserId(userId)
    },

    async getWithDetails(userId: number, boardId: number) {
      const isMember = await boardRepo.checkMembership(userId, boardId)
      if (!isMember) throw new ForbiddenError('Not a board member')

      const board = await boardRepo.findWithDetails(boardId)
      if (!board) throw new NotFoundError('Board not found')

      return board
    },

    async create(name: string, ownerId: number) {
      return boardRepo.create(name, ownerId)
    },

    async addMember(userId: number, boardId: number, memberId: number) {
      const role = await boardRepo.getMemberRole(userId, boardId)
      if (role !== 'owner') throw new ForbiddenError('Only owners can add members')

      await boardRepo.addMember(boardId, memberId)
    },
  }
}
