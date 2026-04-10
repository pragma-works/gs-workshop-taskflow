import type { ICardRepository, IBoardRepository, CardWithDetails, MoveCardResult } from '../interfaces/repositories'
import { NotFoundError } from '../types'
import type { MoveCardDto, CreateCardDto, AddCommentDto } from '../types'
import type { Comment } from '@prisma/client'

export type CardService = {
  getCard(cardId: number, userId: number): Promise<CardWithDetails>
  createCard(dto: CreateCardDto & { assigneeId?: number }, userId: number): Promise<any>
  moveCard(cardId: number, dto: MoveCardDto, userId: number): Promise<MoveCardResult>
  addComment(data: AddCommentDto & { cardId: number; userId: number }): Promise<Comment>
  deleteCard(cardId: number, userId: number): Promise<void>
}

export function createCardService(
  cardRepo: ICardRepository,
  _boardRepo: IBoardRepository
): CardService {
  return {
    async getCard(cardId) {
      const card = await cardRepo.findWithDetails(cardId)
      if (!card) throw new NotFoundError('Card')
      return card
    },

    async createCard(dto, _userId) {
      return cardRepo.create({
        title: dto.title,
        description: dto.description,
        listId: dto.listId,
        assigneeId: dto.assigneeId,
      })
    },

    async moveCard(cardId, dto, userId) {
      const result = await cardRepo.moveWithActivity(
        cardId,
        dto.targetListId,
        dto.position,
        userId
      )
      if (!result) throw new NotFoundError('Card')
      return result
    },

    async addComment(data) {
      return cardRepo.addComment(data)
    },

    async deleteCard(cardId, _userId) {
      await cardRepo.delete(cardId)
    },
  }
}
