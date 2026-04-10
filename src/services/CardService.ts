import { ICardRepository } from '../repositories/ICardRepository'

export class CardService {
  constructor(private readonly cards: ICardRepository) {}

  async getCard(id: number) {
    const card = await this.cards.findById(id)
    if (!card) throw Object.assign(new Error('Not found'), { status: 404 })
    return card
  }

  async createCard(data: {
    title: string
    description?: string
    listId: number
    assigneeId?: number
  }) {
    return this.cards.create(data)
  }

  async moveCard(cardId: number, targetListId: number, position: number, actorId: number) {
    const card = await this.cards.findById(cardId)
    if (!card) throw Object.assign(new Error('Not found'), { status: 404 })
    const fromListId = card.listId
    const boardId = card.list.boardId
    return this.cards.moveWithActivity(cardId, targetListId, position, actorId, boardId, fromListId)
  }

  addComment(cardId: number, userId: number, content: string) {
    return this.cards.addComment(cardId, userId, content)
  }

  deleteCard(id: number) {
    return this.cards.delete(id)
  }
}
