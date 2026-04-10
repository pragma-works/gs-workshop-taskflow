import { BoardRepository } from '../repositories/boardRepository'
import { HttpError } from '../errors'

const boardRepository = new BoardRepository()

export class BoardService {
  async listBoardsForUser(userId: number) {
    return boardRepository.listForUser(userId)
  }

  async getBoardDetailsForUser(userId: number, boardId: number) {
    const isMember = await boardRepository.isMember(userId, boardId)
    if (!isMember) {
      throw new HttpError(403, 'Not a board member')
    }

    const board = await boardRepository.findBoardDetails(boardId)
    if (!board) {
      throw new HttpError(404, 'Board not found')
    }

    return {
      ...board,
      lists: board.lists.map((list) => ({
        ...list,
        cards: list.cards.map((card) => ({
          ...card,
          labels: card.labels.map((cardLabel) => cardLabel.label),
        })),
      })),
    }
  }

  async createBoard(userId: number, name: string) {
    if (!name || name.trim().length === 0) {
      throw new HttpError(400, 'Board name is required')
    }
    return boardRepository.createWithOwner(name.trim(), userId)
  }

  async addMember(userId: number, boardId: number, memberId: number) {
    const isOwner = await boardRepository.isOwner(userId, boardId)
    if (!isOwner) {
      throw new HttpError(403, 'Only board owner can add members')
    }
    await boardRepository.addMember(boardId, memberId)
    return { ok: true }
  }

  async ensureMember(userId: number, boardId: number) {
    const isMember = await boardRepository.isMember(userId, boardId)
    if (!isMember) {
      throw new HttpError(403, 'Not a board member')
    }
  }
}
