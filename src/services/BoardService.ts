import boardRepo from '../repositories/BoardRepository'
import prisma from '../db'

export class BoardService {
  async createBoard(name: string, ownerId: number) {
    const board = await boardRepo.create(name)
    await boardRepo.addMember(ownerId, board.id, 'owner')

    // Create default lists for the board
    await prisma.list.createMany({
      data: [
        { name: 'To Do', position: 0, boardId: board.id },
        { name: 'In Progress', position: 1, boardId: board.id },
        { name: 'Done', position: 2, boardId: board.id }
      ]
    })

    return board
  }

  async getBoardsForUser(userId: number) {
    const memberships = await boardRepo.findMembershipsByUserId(userId)
    return memberships.map(m => m.board)
  }

  async getBoardDetails(boardId: number, userId: number) {
    const isMember = await boardRepo.checkMembership(userId, boardId)
    if (!isMember) {
      throw new Error('Not a board member')
    }
    
    const board = await boardRepo.findById(boardId)
    if (!board) {
      throw new Error('Board not found')
    }

    return {
      ...board,
      lists: board.lists.map(list => ({
        ...list,
        cards: list.cards.map(card => ({
          ...card,
          labels: card.labels.map(cl => cl.label)
        }))
      }))
    }
  }

  async addMemberToBoard(boardId: number, memberId: number, currentUserId: number) {
    const role = await boardRepo.getMemberRole(currentUserId, boardId)
    if (role !== 'owner') {
      throw new Error('Only owners can add members')
    }

    return boardRepo.addMember(memberId, boardId)
  }

  async deleteBoard(boardId: number, userId: number) {
    const role = await boardRepo.getMemberRole(userId, boardId)
    if (role !== 'owner') {
      throw new Error('Only owners can delete boards')
    }

    return boardRepo.delete(boardId)
  }
}

export default new BoardService()
