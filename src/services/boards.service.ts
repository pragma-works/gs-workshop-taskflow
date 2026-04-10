import type { IBoardRepository, BoardWithLists } from '../interfaces/repositories'
import { NotFoundError, ForbiddenError } from '../types'
import type { Board } from '@prisma/client'

export type BoardService = {
  getUserBoards(userId: number): Promise<Board[]>
  getBoard(boardId: number, userId: number): Promise<BoardWithLists>
  createBoard(name: string, userId: number): Promise<Board>
  addMember(boardId: number, memberId: number, requesterId: number): Promise<void>
}

export function createBoardService(repo: IBoardRepository): BoardService {
  return {
    async getUserBoards(userId) {
      return repo.findByUserId(userId)
    },

    async getBoard(boardId, userId) {
      const member = await repo.isMember(userId, boardId)
      if (!member) throw new ForbiddenError('Access denied')

      const board = await repo.findWithLists(boardId)
      if (!board) throw new NotFoundError('Board')

      return board
    },

    async createBoard(name, userId) {
      return repo.create(name, userId)
    },

    async addMember(boardId, memberId, requesterId) {
      const board = await repo.findWithLists(boardId)
      if (!board) throw new NotFoundError('Board')

      const member = await repo.isMember(requesterId, boardId)
      if (!member) throw new ForbiddenError('Access denied')

      await repo.addMember(boardId, memberId)
    },
  }
}
