import { BadRequestError, NotFoundError } from '../errors'
import type {
  ICardRepository,
  IListRepository,
  ICommentRepository,
  CreatedCardRow,
  CommentRow,
} from '../repositories/types'

export class CardService {
  constructor(
    private readonly cardRepo:    ICardRepository,
    private readonly listRepo:    IListRepository,
    private readonly commentRepo: ICommentRepository,
  ) {}

  /**
   * Creates a card and a card_created activity event atomically.
   * Throws BadRequestError if the target list does not exist.
   */
  async createCard(
    {
      title,
      description,
      listId,
      assigneeId,
    }: { title: string; description?: string | null; listId: number; assigneeId?: number | null },
    userId: number,
  ): Promise<CreatedCardRow> {
    const list = await this.listRepo.findById(listId)
    if (!list) throw new BadRequestError('List not found')

    const position = await this.cardRepo.countInList(listId)

    return this.cardRepo.createWithEvent(
      { title, description, listId, assigneeId, position },
      {
        boardId:    list.boardId,
        userId,
        eventType:  'card_created',
        cardTitle:  title,
        toListName: list.name,
      },
    )
  }

  /**
   * Moves a card to a different list and records a card_moved event atomically.
   * Throws NotFoundError if the card does not exist.
   * Throws BadRequestError if the target list does not exist.
   */
  async moveCard(
    cardId:       number,
    targetListId: number,
    position:     number,
    userId:       number,
  ): Promise<void> {
    const card = await this.cardRepo.findById(cardId)
    if (!card) throw new NotFoundError('Card not found')

    const [fromList, toList] = await Promise.all([
      this.listRepo.findById(card.listId),
      this.listRepo.findById(targetListId),
    ])
    if (!toList) throw new BadRequestError('Target list not found')

    await this.cardRepo.moveWithEvent({
      cardId,
      targetListId,
      position,
      activityEvent: {
        boardId:      toList.boardId,
        cardId,
        userId,
        eventType:    'card_moved',
        cardTitle:    card.title,
        fromListName: fromList?.name ?? null,
        toListName:   toList.name,
      },
    })
  }

  /**
   * Adds a comment to a card and records a card_commented event atomically.
   * Throws NotFoundError if the card does not exist.
   */
  async addComment(
    cardId:  number,
    content: string,
    userId:  number,
  ): Promise<CommentRow> {
    const card = await this.cardRepo.findById(cardId)
    if (!card) throw new NotFoundError('Card not found')

    return this.commentRepo.createWithEvent(
      { content, cardId, userId },
      {
        boardId:   card.list.boardId,
        cardId,
        userId,
        eventType: 'card_commented',
        cardTitle: card.title,
      },
    )
  }
}
