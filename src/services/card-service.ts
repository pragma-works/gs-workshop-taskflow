import { type BoardRepository } from './board-service'
import { ForbiddenError, NotFoundError, ValidationError } from '../shared/errors'

export interface CardLabel {
  id: number
  name: string
  color: string
}

export interface CardComment {
  id: number
  content: string
  createdAt: Date
  cardId: number
  userId: number
}

export interface CardSummary {
  id: number
  title: string
  description: string | null
  position: number
  dueDate: Date | null
  listId: number
  assigneeId: number | null
  createdAt: Date
}

export interface CardDetail extends CardSummary {
  comments: CardComment[]
  labels: CardLabel[]
}

export interface ListContext {
  id: number
  name: string
  boardId: number
}

export interface CardAccessContext {
  id: number
  title: string
  listId: number
  listName: string
  boardId: number
}

export interface ActivityWrite {
  boardId: number
  cardId: number
  userId: number
  action: string
  meta: Record<string, unknown>
}

export interface CreateCardInput {
  userId: number
  title: string
  description?: string | null
  listId: number
  assigneeId?: number | null
}

export interface MoveCardInput {
  userId: number
  cardId: number
  targetListId: number
  position: number
}

export interface AddCommentInput {
  userId: number
  cardId: number
  content: string
}

export interface DeleteCardInput {
  userId: number
  cardId: number
}

export interface CardRepository {
  findCardAccessContext(cardId: number): Promise<CardAccessContext | null>
  findListContext(listId: number): Promise<ListContext | null>
  findCardDetail(cardId: number): Promise<CardDetail | null>
  createCard(input: {
    title: string
    description?: string | null
    listId: number
    assigneeId?: number | null
  }): Promise<CardSummary>
  moveCardWithActivity(input: {
    cardId: number
    targetListId: number
    position: number
    activity: ActivityWrite
  }): Promise<CardDetail>
  addCommentWithActivity(input: {
    cardId: number
    userId: number
    content: string
    activity: ActivityWrite
  }): Promise<CardComment>
  deleteCard(cardId: number): Promise<void>
}

export interface CardService {
  getCard(userId: number, cardId: number): Promise<CardDetail>
  createCard(input: CreateCardInput): Promise<CardSummary>
  moveCard(input: MoveCardInput): Promise<CardDetail>
  addComment(input: AddCommentInput): Promise<CardComment>
  deleteCard(input: DeleteCardInput): Promise<void>
}

interface CardServiceDependencies {
  boardRepository: BoardRepository
  cardRepository: CardRepository
}

function requirePositiveInteger(value: number, fieldName: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ValidationError(`Invalid ${fieldName}`)
  }

  return value
}

function requireNonNegativeInteger(value: number, fieldName: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new ValidationError(`Invalid ${fieldName}`)
  }

  return value
}

function requireNonEmptyString(value: string, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${fieldName} is required`)
  }

  return value.trim()
}

async function requireBoardMembership(
  boardRepository: BoardRepository,
  userId: number,
  boardId: number,
): Promise<void> {
  const membershipRole = await boardRepository.findMemberRole(userId, boardId)
  if (!membershipRole) {
    throw new ForbiddenError('Not a board member')
  }
}

/**
 * Creates card use cases backed by board access checks and card persistence.
 *
 * @param {CardServiceDependencies} dependencies - Board and card collaborators.
 * @returns {CardService} Card service API.
 */
export function createCardService({
  boardRepository,
  cardRepository,
}: CardServiceDependencies): CardService {
  return {
    async getCard(userId: number, cardId: number): Promise<CardDetail> {
      const normalizedUserId = requirePositiveInteger(userId, 'user id')
      const normalizedCardId = requirePositiveInteger(cardId, 'card id')
      const cardContext = await cardRepository.findCardAccessContext(normalizedCardId)

      if (!cardContext) {
        throw new NotFoundError('Not found')
      }

      await requireBoardMembership(boardRepository, normalizedUserId, cardContext.boardId)

      const card = await cardRepository.findCardDetail(normalizedCardId)
      if (!card) {
        throw new NotFoundError('Not found')
      }

      return card
    },

    async createCard(input: CreateCardInput): Promise<CardSummary> {
      const normalizedUserId = requirePositiveInteger(input.userId, 'user id')
      const normalizedListId = requirePositiveInteger(input.listId, 'list id')
      const title = requireNonEmptyString(input.title, 'Title')
      const listContext = await cardRepository.findListContext(normalizedListId)

      if (!listContext) {
        throw new NotFoundError('List not found')
      }

      await requireBoardMembership(boardRepository, normalizedUserId, listContext.boardId)

      return cardRepository.createCard({
        title,
        description: input.description ?? null,
        listId: normalizedListId,
        assigneeId: input.assigneeId ?? null,
      })
    },

    async moveCard(input: MoveCardInput): Promise<CardDetail> {
      const normalizedUserId = requirePositiveInteger(input.userId, 'user id')
      const normalizedCardId = requirePositiveInteger(input.cardId, 'card id')
      const normalizedTargetListId = requirePositiveInteger(input.targetListId, 'target list id')
      const normalizedPosition = requireNonNegativeInteger(input.position, 'position')
      const cardContext = await cardRepository.findCardAccessContext(normalizedCardId)

      if (!cardContext) {
        throw new NotFoundError('Not found')
      }

      const targetList = await cardRepository.findListContext(normalizedTargetListId)
      if (!targetList) {
        throw new NotFoundError('Target list not found')
      }

      await requireBoardMembership(boardRepository, normalizedUserId, cardContext.boardId)

      if (cardContext.boardId !== targetList.boardId) {
        throw new ValidationError('Target list must belong to the same board')
      }

      return cardRepository.moveCardWithActivity({
        cardId: normalizedCardId,
        targetListId: normalizedTargetListId,
        position: normalizedPosition,
        activity: {
          boardId: cardContext.boardId,
          cardId: normalizedCardId,
          userId: normalizedUserId,
          action: 'card_moved',
          meta: {
            cardTitle: cardContext.title,
            fromListId: cardContext.listId,
            fromListName: cardContext.listName,
            toListId: targetList.id,
            toListName: targetList.name,
            position: normalizedPosition,
          },
        },
      })
    },

    async addComment(input: AddCommentInput): Promise<CardComment> {
      const normalizedUserId = requirePositiveInteger(input.userId, 'user id')
      const normalizedCardId = requirePositiveInteger(input.cardId, 'card id')
      const content = requireNonEmptyString(input.content, 'Content')
      const cardContext = await cardRepository.findCardAccessContext(normalizedCardId)

      if (!cardContext) {
        throw new NotFoundError('Not found')
      }

      await requireBoardMembership(boardRepository, normalizedUserId, cardContext.boardId)

      return cardRepository.addCommentWithActivity({
        cardId: normalizedCardId,
        userId: normalizedUserId,
        content,
        activity: {
          boardId: cardContext.boardId,
          cardId: normalizedCardId,
          userId: normalizedUserId,
          action: 'comment_added',
          meta: {
            cardTitle: cardContext.title,
            listId: cardContext.listId,
            listName: cardContext.listName,
            contentPreview: content.slice(0, 120),
          },
        },
      })
    },

    async deleteCard(input: DeleteCardInput): Promise<void> {
      const normalizedUserId = requirePositiveInteger(input.userId, 'user id')
      const normalizedCardId = requirePositiveInteger(input.cardId, 'card id')
      const cardContext = await cardRepository.findCardAccessContext(normalizedCardId)

      if (!cardContext) {
        throw new NotFoundError('Not found')
      }

      await requireBoardMembership(boardRepository, normalizedUserId, cardContext.boardId)
      await cardRepository.deleteCard(normalizedCardId)
    },
  }
}
