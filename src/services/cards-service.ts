import type { Card, Comment, Label, List } from '@prisma/client'
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors/application-error'

export interface CardWithBoard extends Card {
  readonly list: Pick<List, 'boardId' | 'id'>
}

export interface CardDetails extends Card {
  readonly comments: readonly Comment[]
  readonly labels: readonly Label[]
}

export interface CreateCardInput {
  readonly assigneeId?: number
  readonly description?: string
  readonly listId: number
  readonly title: string
}

export interface CreateCardRecord extends CreateCardInput {
  readonly position: number
}

export interface MoveCardInput {
  readonly position: number
  readonly targetListId: number
}

export interface AddCommentInput {
  readonly content: string
}

export interface MoveCardActivity {
  readonly boardId: number
  readonly fromListId: number
  readonly userId: number
}

export interface CardRepository {
  createCard(input: CreateCardRecord): Promise<Card>
  createComment(cardId: number, userId: number, boardId: number, content: string): Promise<Comment>
  deleteCard(cardId: number): Promise<void>
  findCardById(cardId: number): Promise<CardWithBoard | null>
  findCardDetailsById(cardId: number): Promise<CardDetails | null>
  findListById(listId: number): Promise<List | null>
  findMemberRole(userId: number, boardId: number): Promise<'member' | 'owner' | null>
  findNextPosition(listId: number): Promise<number>
  moveCard(
    cardId: number,
    targetListId: number,
    position: number,
    activity: MoveCardActivity,
  ): Promise<void>
}

/** Coordinates card operations with board membership checks. */
export class CardsService {
  /** @param cardRepository Persistence port for cards and lists. */
  public constructor(private readonly cardRepository: CardRepository) {}

  /** Returns a card with comments and labels for a board member. */
  public async getCard(userId: number, cardId: number): Promise<CardDetails> {
    const cardRecord = await this.getCardRecord(cardId)
    await this.assertBoardMember(userId, cardRecord.list.boardId)

    const card = await this.cardRepository.findCardDetailsById(cardId)
    if (card === null) {
      throw new NotFoundError('Not found', { cardId })
    }

    return card
  }

  /** Creates a card in a list the current user can access. */
  public async createCard(userId: number, input: CreateCardInput): Promise<Card> {
    const list = await this.cardRepository.findListById(input.listId)
    if (list === null) {
      throw new NotFoundError('List not found', { listId: input.listId })
    }

    await this.assertBoardMember(userId, list.boardId)

    const position = await this.cardRepository.findNextPosition(input.listId)
    return this.cardRepository.createCard({ ...input, position })
  }

  /** Moves a card within the same board after access checks pass. */
  public async moveCard(userId: number, cardId: number, input: MoveCardInput): Promise<void> {
    if (input.position < 0) {
      throw new BadRequestError('Invalid position', { position: input.position })
    }

    const card = await this.getCardRecord(cardId)
    const targetList = await this.cardRepository.findListById(input.targetListId)
    if (targetList === null) {
      throw new NotFoundError('List not found', { listId: input.targetListId })
    }

    await this.assertBoardMember(userId, card.list.boardId)

    if (targetList.boardId !== card.list.boardId) {
      throw new BadRequestError('Target list must belong to the same board', {
        cardId,
        targetListId: input.targetListId,
      })
    }

    await this.cardRepository.moveCard(cardId, input.targetListId, input.position, {
      boardId: card.list.boardId,
      fromListId: card.list.id,
      userId,
    })
  }

  /** Creates a comment on a card the current user can access. */
  public async addComment(userId: number, cardId: number, input: AddCommentInput): Promise<Comment> {
    const card = await this.getCardRecord(cardId)
    await this.assertBoardMember(userId, card.list.boardId)

    return this.cardRepository.createComment(cardId, userId, card.list.boardId, input.content)
  }

  /** Deletes a card and its dependent records after authorization. */
  public async deleteCard(userId: number, cardId: number): Promise<void> {
    const card = await this.getCardRecord(cardId)
    await this.assertBoardMember(userId, card.list.boardId)

    await this.cardRepository.deleteCard(cardId)
  }

  private async getCardRecord(cardId: number): Promise<CardWithBoard> {
    const card = await this.cardRepository.findCardById(cardId)
    if (card === null) {
      throw new NotFoundError('Not found', { cardId })
    }

    return card
  }

  private async assertBoardMember(userId: number, boardId: number): Promise<void> {
    const role = await this.cardRepository.findMemberRole(userId, boardId)
    if (role === null) {
      throw new ForbiddenError('Not a board member', { boardId, userId })
    }
  }
}
