import type { Prisma, PrismaClient } from '@prisma/client'
import {
  ActivityActionType,
  createCardMovedActivityMeta,
  createCommentAddedActivityMeta,
  serializeActivityMeta,
} from '../domain/activity-events'
import type {
  CardDetailsRecord,
  CardRecord,
  CardWithBoardRecord,
  CommentRecord,
  ListRecord,
} from '../domain/models'
import type {
  CardRepository,
  CreateCardRecord,
  MoveCardActivity,
} from '../services/cards-service'

type CardRecordWithDetails = Prisma.CardGetPayload<{
  include: {
    comments: true
    labels: {
      include: {
        label: true
      }
    }
  }
}>

/** Prisma implementation of card and list persistence operations. */
export class PrismaCardRepository implements CardRepository {
  /** @param prismaClient Prisma client instance for database access. */
  public constructor(private readonly prismaClient: PrismaClient) {}

  /** Finds a card together with the owning board id. */
  public async findCardById(cardId: number): Promise<CardWithBoardRecord | null> {
    const card = await this.prismaClient.card.findUnique({
      include: {
        list: {
          select: {
            boardId: true,
            id: true,
          },
        },
      },
      where: { id: cardId },
    })

    return card
  }

  /** Finds a card with comments and labels. */
  public async findCardDetailsById(cardId: number): Promise<CardDetailsRecord | null> {
    const card = await this.prismaClient.card.findUnique({
      include: {
        comments: {
          orderBy: { createdAt: 'asc' },
        },
        labels: {
          include: { label: true },
          orderBy: { labelId: 'asc' },
        },
      },
      where: { id: cardId },
    })

    return card === null ? null : mapCardDetails(card)
  }

  /** Finds a list by id. */
  public async findListById(listId: number): Promise<ListRecord | null> {
    return this.prismaClient.list.findUnique({ where: { id: listId } })
  }

  /** Returns the next append position for a list. */
  public async findNextPosition(listId: number): Promise<number> {
    const aggregate = await this.prismaClient.card.aggregate({
      _max: { position: true },
      where: { listId },
    })

    return (aggregate._max.position ?? -1) + 1
  }

  /** Creates a card. */
  public async createCard(input: CreateCardRecord): Promise<CardRecord> {
    return this.prismaClient.card.create({ data: input })
  }

  /** Updates card location data. */
  public async moveCard(
    cardId: number,
    targetListId: number,
    position: number,
    activity: MoveCardActivity,
  ): Promise<void> {
    const meta = serializeActivityMeta(
      createCardMovedActivityMeta(activity.fromListId, targetListId, position),
    )

    await this.prismaClient.$transaction(async (transaction) => {
      await transaction.card.update({
        data: { listId: targetListId, position },
        where: { id: cardId },
      })

      await transaction.activityEvent.create({
        data: {
          action: ActivityActionType.CARD_MOVED,
          boardId: activity.boardId,
          cardId,
          meta,
          userId: activity.userId,
        },
      })
    })
  }

  /** Creates a comment attached to a card. */
  public async createComment(
    cardId: number,
    userId: number,
    boardId: number,
    content: string,
  ): Promise<CommentRecord> {
    return this.prismaClient.$transaction(async (transaction) => {
      const comment = await transaction.comment.create({
        data: {
          cardId,
          content,
          userId,
        },
      })

      await transaction.activityEvent.create({
        data: {
          action: ActivityActionType.COMMENT_ADDED,
          boardId,
          cardId,
          meta: serializeActivityMeta(createCommentAddedActivityMeta(comment.id)),
          userId,
        },
      })

      return comment
    })
  }

  /** Deletes a card and its dependent records atomically. */
  public async deleteCard(cardId: number): Promise<void> {
    await this.prismaClient.$transaction([
      this.prismaClient.comment.deleteMany({ where: { cardId } }),
      this.prismaClient.cardLabel.deleteMany({ where: { cardId } }),
      this.prismaClient.card.delete({ where: { id: cardId } }),
    ])
  }

}

function mapCardDetails(card: CardRecordWithDetails): CardDetailsRecord {
  return {
    assigneeId: card.assigneeId,
    comments: card.comments,
    createdAt: card.createdAt,
    description: card.description,
    dueDate: card.dueDate,
    id: card.id,
    labels: card.labels.map((labelRecord) => labelRecord.label),
    listId: card.listId,
    position: card.position,
    title: card.title,
  }
}
