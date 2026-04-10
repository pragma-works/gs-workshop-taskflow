import { ICardRepository, IActivityRepository, ICardService, NotFoundError } from '../types'

export function createCardService(cardRepo: ICardRepository, activityRepo: IActivityRepository): ICardService {
  return {
    async getById(id: number) {
      const card = await cardRepo.findByIdWithDetails(id)
      if (!card) throw new NotFoundError('Card not found')
      return card
    },

    async create(data: { title: string; description?: string; listId: number; assigneeId?: number }) {
      return cardRepo.create(data)
    },

    async moveCard(userId: number, cardId: number, targetListId: number, position: number) {
      return cardRepo.moveCardWithEvent(cardId, targetListId, position, userId)
    },

    async addComment(userId: number, cardId: number, content: string) {
      return cardRepo.addCommentWithEvent(cardId, content, userId)
    },

    async delete(cardId: number) {
      const card = await cardRepo.findById(cardId)
      if (!card) throw new NotFoundError('Card not found')
      await cardRepo.delete(cardId)
    },
  }
}
