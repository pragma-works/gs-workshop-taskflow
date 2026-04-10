import { boardRepository } from '../repositories/boardRepository'

export const boardService = {
  async listBoardsForUser(userId: number) {
    return boardRepository.listUserBoards(userId)
  },

  async getBoardForMember(userId: number, boardId: number) {
    const isMember = await boardRepository.isMember(userId, boardId)
    if (!isMember) {
      return { type: 'forbidden' as const }
    }

    const board = await boardRepository.getBoardWithDetails(boardId)
    if (!board) {
      return { type: 'not_found' as const }
    }

    return {
      type: 'ok' as const,
      board: {
        id: board.id,
        name: board.name,
        createdAt: board.createdAt,
        lists: board.lists.map((list) => ({
          id: list.id,
          name: list.name,
          position: list.position,
          boardId: list.boardId,
          cards: list.cards.map((card) => ({
            ...card,
            labels: card.labels.map((cardLabel) => cardLabel.label),
          })),
        })),
      },
    }
  },
}
