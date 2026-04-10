import { EventType } from '../domain/activityEvent'
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors'
import type { IUnitOfWork } from '../repositories/IUnitOfWork'
import type { ICardRepository, IListRepository } from '../repositories/types'

export interface AuthenticatedActor {
  id:   number
  name: string
}

export class CardService {
  constructor(
    private readonly cardRepo: ICardRepository,
    private readonly listRepo: IListRepository,
    private readonly uow:      IUnitOfWork,
  ) {}

  async createCard(
    listId:  number,
    title:   string,
    description: string | null,
    assigneeId:  number | null,
    boardId: number,
    actor:   AuthenticatedActor,
  ) {
    const list = await this.listRepo.findById(listId)
    if (!list)                     throw new NotFoundError('List not found')
    if (list.boardId !== boardId)  throw new ForbiddenError('List does not belong to this board')

    return this.uow.run(async ({ cards, activities }) => {
      const count    = await cards.countInList(listId)
      const position = count + 1

      const card = await cards.create({ title, description, listId, assigneeId, position })

      await activities.create({
        boardId,
        cardId:    card.id,
        userId:    actor.id,
        eventType: EventType.CardCreated,
        cardTitle: title,
      })

      return card
    })
  }

  async moveCard(
    cardId:       number,
    targetListId: number,
    position:     number,
    actor:        AuthenticatedActor,
  ) {
    const card = await this.cardRepo.findById(cardId)
    if (!card) throw new NotFoundError('Card not found')

    const targetList = await this.listRepo.findById(targetListId)
    if (!targetList) throw new BadRequestError('Target list not found')

    // Same-board validation: card.list.boardId must equal targetList.boardId
    if (card.list.boardId !== targetList.boardId) {
      throw new BadRequestError('Target list does not belong to the same board as the card')
    }

    const count = await this.cardRepo.countInList(targetListId)
    const max   = card.listId === targetListId ? count : count + 1
    if (position < 0 || position > max) {
      throw new BadRequestError(`Position must be between 1 and ${max}`)
    }

    const fromListName = card.list.name
    const boardId      = card.list.boardId

    return this.uow.run(async ({ cards, activities }) => {
      await cards.update(cardId, { listId: targetListId, position })

      await activities.create({
        boardId,
        cardId,
        userId:    actor.id,
        eventType: EventType.CardMoved,
        cardTitle: card.title,
        fromListName,
        toListName: targetList.name,
      })

      return { success: true }
    })
  }

  async addComment(
    cardId:  number,
    content: string,
    actor:   AuthenticatedActor,
  ) {
    const card = await this.cardRepo.findById(cardId)
    if (!card) throw new NotFoundError('Card not found')

    return this.uow.run(async ({ comments, activities }) => {
      const comment = await comments.create({ content, cardId, userId: actor.id })

      await activities.create({
        boardId:   card.list.boardId,
        cardId,
        userId:    actor.id,
        eventType: EventType.CardCommented,
        cardTitle: card.title,
      })

      return comment
    })
  }
}
