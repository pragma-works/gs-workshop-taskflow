import { ForbiddenError, NotFoundError, ValidationError } from '../errors'
import type { BoardsService } from './boards-service'
import type {
  CardCommentRecord,
  CardDetailsRecord,
  CardsRepository,
  StoredActivityEvent,
} from '../repositories/cards-repository'

export interface CreateCardRequest {
  readonly title: string
  readonly description?: string
  readonly listId: number
  readonly assigneeId?: number
}

export interface MoveCardRequest {
  readonly cardId: number
  readonly targetListId: number
  readonly position: number
}

export interface AddCommentRequest {
  readonly cardId: number
  readonly content: string
}

function toCardResponse(card: CardDetailsRecord) {
  return {
    id: card.id,
    title: card.title,
    description: card.description,
    position: card.position,
    dueDate: card.dueDate,
    listId: card.listId,
    assigneeId: card.assigneeId,
    createdAt: card.createdAt,
    comments: card.comments,
    labels: card.labels,
  }
}

function toActivityResponse(event: StoredActivityEvent) {
  return {
    id: event.id,
    boardId: event.boardId,
    cardId: event.cardId,
    userId: event.userId,
    action: event.action,
    meta: event.meta ? (JSON.parse(event.meta) as Record<string, unknown>) : {},
    createdAt: event.createdAt,
  }
}

export interface CardsService {
  getById(cardId: number, userId: number): Promise<ReturnType<typeof toCardResponse>>
  create(input: CreateCardRequest, userId: number): Promise<ReturnType<typeof toCardResponse>>
  move(input: MoveCardRequest, userId: number): Promise<{ ok: true; event: ReturnType<typeof toActivityResponse> }>
  addComment(input: AddCommentRequest, userId: number): Promise<CardCommentRecord>
  delete(cardId: number, userId: number): Promise<void>
}

export function createCardsService(
  cardsRepository: CardsRepository,
  boardsService: BoardsService,
): CardsService {
  return {
    async getById(cardId: number, userId: number): Promise<ReturnType<typeof toCardResponse>> {
      const card = await cardsRepository.findCardDetails(cardId)

      if (!card) {
        throw new NotFoundError('Not found')
      }

      await boardsService.assertBoardMember(userId, card.boardId)

      return toCardResponse(card)
    },

    async create(input: CreateCardRequest, userId: number): Promise<ReturnType<typeof toCardResponse>> {
      if (!input.title) {
        throw new ValidationError('title is required')
      }

      if (!Number.isInteger(input.listId) || input.listId <= 0) {
        throw new ValidationError('listId is required')
      }

      const list = await cardsRepository.findListById(input.listId)

      if (!list) {
        throw new NotFoundError('List not found')
      }

      await boardsService.assertBoardMember(userId, list.boardId)

      const card = await cardsRepository.createCard({
        title: input.title,
        description: input.description ?? null,
        listId: input.listId,
        assigneeId: input.assigneeId ?? null,
      })

      return toCardResponse(card)
    },

    async move(input: MoveCardRequest, userId: number): Promise<{ ok: true; event: ReturnType<typeof toActivityResponse> }> {
      if (!Number.isInteger(input.targetListId) || input.targetListId <= 0) {
        throw new ValidationError('targetListId is required')
      }

      if (!Number.isInteger(input.position) || input.position < 0) {
        throw new ValidationError('position is required')
      }

      const card = await cardsRepository.findCardLocation(input.cardId)

      if (!card) {
        throw new NotFoundError('Not found')
      }

      await boardsService.assertBoardMember(userId, card.boardId)

      const targetList = await cardsRepository.findListById(input.targetListId)

      if (!targetList) {
        throw new NotFoundError('Target list not found')
      }

      if (targetList.boardId !== card.boardId) {
        throw new ForbiddenError('Target list belongs to another board')
      }

      const event = await cardsRepository.moveCardAndCreateActivity(
        input.cardId,
        input.targetListId,
        input.position,
        userId,
        card.boardId,
        card.listId,
      )

      return { ok: true, event: toActivityResponse(event) }
    },

    async addComment(input: AddCommentRequest, userId: number): Promise<CardCommentRecord> {
      if (!input.content.trim()) {
        throw new ValidationError('content is required')
      }

      const card = await cardsRepository.findCardLocation(input.cardId)

      if (!card) {
        throw new NotFoundError('Not found')
      }

      await boardsService.assertBoardMember(userId, card.boardId)

      return cardsRepository.addCommentAndCreateActivity(
        input.cardId,
        userId,
        input.content,
        card.boardId,
      )
    },

    async delete(cardId: number, userId: number): Promise<void> {
      const card = await cardsRepository.findCardLocation(cardId)

      if (!card) {
        throw new NotFoundError('Not found')
      }

      await boardsService.assertBoardMember(userId, card.boardId)
      await cardsRepository.deleteCard(cardId)
    },
  }
}
