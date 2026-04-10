import { IBoardRepository } from '../repositories/IBoardRepository'

export class BoardService {
  constructor(private readonly boards: IBoardRepository) {}

  getBoardsForUser(userId: number) {
    return this.boards.findAllForUser(userId)
  }

  async getBoard(userId: number, boardId: number) {
    const member = await this.boards.getMembership(userId, boardId)
    if (!member) throw Object.assign(new Error('Not a board member'), { status: 403 })
    const board = await this.boards.findById(boardId)
    if (!board) throw Object.assign(new Error('Board not found'), { status: 404 })
    return board
  }

  async createBoard(name: string, ownerUserId: number) {
    return this.boards.create(name, ownerUserId)
  }

  async addMember(requesterId: number, boardId: number, memberId: number) {
    return this.boards.addMember(memberId, boardId, 'member')
  }
}
