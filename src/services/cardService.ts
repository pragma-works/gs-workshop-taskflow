import { cardRepository } from '../repositories/cardRepository'

export const cardService = {
  async moveCard(input: { cardId: number; targetListId: number; position: number; userId: number }) {
    const card = await cardRepository.findCardWithList(input.cardId)
    if (!card) {
      return { type: 'not_found' as const, message: 'Card not found' }
    }

    const targetList = await cardRepository.findList(input.targetListId)
    if (!targetList) {
      return { type: 'not_found' as const, message: 'Target list not found' }
    }

    const event = await cardRepository.moveCardWithActivity({
      cardId: input.cardId,
      targetListId: input.targetListId,
      position: input.position,
      userId: input.userId,
      boardId: card.list.boardId,
      fromListId: card.listId,
    })

    return { type: 'ok' as const, event }
  },
}
