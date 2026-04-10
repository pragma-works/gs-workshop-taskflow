import commentRepo from '../repositories/CommentRepository'
import cardRepo from '../repositories/CardRepository'
import boardRepo from '../repositories/BoardRepository'

export class CommentService {
  async addComment(content: string, cardId: number, userId: number) {
    const card = await cardRepo.findById(cardId)
    if (!card) {
      throw new Error('Card not found')
    }

    const isMember = await boardRepo.checkMembership(userId, card.list.board.id)
    if (!isMember) {
      throw new Error('Not authorized')
    }

    return commentRepo.create(content, cardId, userId)
  }
}

export default new CommentService()
