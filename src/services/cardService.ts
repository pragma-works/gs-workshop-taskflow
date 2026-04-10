import { cardRepository } from '../repositories/cardRepository'
import { NotFoundError } from '../types'

export const cardService = {
  async getById(id: number) {
    const card = await cardRepository.findByIdWithDetails(id)
    if (!card) throw new NotFoundError('Card not found')
    return card
  },

  async create(data: { title: string; description?: string; listId: number; assigneeId?: number }) {
    return cardRepository.create(data)
  },

  async moveCard(userId: number, cardId: number, targetListId: number, position: number) {
    const result = await cardRepository.moveCard(cardId, targetListId, position, userId)
    if (!result) throw new NotFoundError('Card not found')
    return result
  },

  async addComment(userId: number, cardId: number, content: string) {
    const result = await cardRepository.addComment(cardId, userId, content)
    if (!result) throw new NotFoundError('Card not found')
    return result
  },

  async delete(cardId: number) {
    const card = await cardRepository.findById(cardId)
    if (!card) throw new NotFoundError('Card not found')
    await cardRepository.delete(cardId)
  },
}
