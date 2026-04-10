import type { PrismaClient } from '@prisma/client'

export interface CardLabelRecord {
  readonly id: number
  readonly name: string
  readonly color: string
}

export interface CardCommentRecord {
  readonly id: number
  readonly content: string
  readonly createdAt: Date
  readonly cardId: number
  readonly userId: number
}

export interface CardDetailsRecord {
  readonly id: number
  readonly title: string
  readonly description: string | null
  readonly position: number
  readonly dueDate: Date | null
  readonly listId: number
  readonly assigneeId: number | null
  readonly createdAt: Date
  readonly boardId: number
  readonly comments: ReadonlyArray<CardCommentRecord>
  readonly labels: ReadonlyArray<CardLabelRecord>
}

export interface CardLocationRecord {
  readonly id: number
  readonly title: string
  readonly listId: number
  readonly boardId: number
}

export interface ListRecord {
  readonly id: number
  readonly name: string
  readonly position: number
  readonly boardId: number
}

export interface CreateCardInput {
  readonly title: string
  readonly description: string | null
  readonly listId: number
  readonly assigneeId: number | null
}

export interface StoredActivityEvent {
  readonly id: number
  readonly boardId: number
  readonly cardId: number | null
  readonly userId: number
  readonly action: string
  readonly meta: string | null
  readonly createdAt: Date
}

export interface CardsRepository {
  findCardDetails(cardId: number): Promise<CardDetailsRecord | null>
  findCardLocation(cardId: number): Promise<CardLocationRecord | null>
  findListById(listId: number): Promise<ListRecord | null>
  createCard(input: CreateCardInput): Promise<CardDetailsRecord>
  moveCardAndCreateActivity(cardId: number, targetListId: number, position: number, userId: number, boardId: number, fromListId: number): Promise<StoredActivityEvent>
  addCommentAndCreateActivity(cardId: number, userId: number, content: string, boardId: number): Promise<CardCommentRecord>
  deleteCard(cardId: number): Promise<void>
}

function toCardDetailsRecord(card: {
  id: number
  title: string
  description: string | null
  position: number
  dueDate: Date | null
  listId: number
  assigneeId: number | null
  createdAt: Date
  list: { boardId: number }
  comments: ReadonlyArray<CardCommentRecord>
  labels: ReadonlyArray<{ label: CardLabelRecord }>
}): CardDetailsRecord {
  return {
    id: card.id,
    title: card.title,
    description: card.description,
    position: card.position,
    dueDate: card.dueDate,
    listId: card.listId,
    assigneeId: card.assigneeId,
    createdAt: card.createdAt,
    boardId: card.list.boardId,
    comments: card.comments,
    labels: card.labels.map(({ label }) => ({
      id: label.id,
      name: label.name,
      color: label.color,
    })),
  }
}

export function createCardsRepository(databaseClient: PrismaClient): CardsRepository {
  return {
    async findCardDetails(cardId: number): Promise<CardDetailsRecord | null> {
      const card = await databaseClient.card.findUnique({
        where: { id: cardId },
        include: {
          list: true,
          comments: {
            orderBy: { createdAt: 'asc' },
          },
          labels: {
            include: {
              label: true,
            },
          },
        },
      })

      return card ? toCardDetailsRecord(card) : null
    },

    async findCardLocation(cardId: number): Promise<CardLocationRecord | null> {
      const card = await databaseClient.card.findUnique({
        where: { id: cardId },
        include: {
          list: true,
        },
      })

      if (!card) {
        return null
      }

      return {
        id: card.id,
        title: card.title,
        listId: card.listId,
        boardId: card.list.boardId,
      }
    },

    findListById(listId: number): Promise<ListRecord | null> {
      return databaseClient.list.findUnique({ where: { id: listId } })
    },

    async createCard(input: CreateCardInput): Promise<CardDetailsRecord> {
      const position = await databaseClient.card.count({
        where: { listId: input.listId },
      })

      const card = await databaseClient.card.create({
        data: {
          title: input.title,
          description: input.description,
          listId: input.listId,
          assigneeId: input.assigneeId,
          position,
        },
        include: {
          list: true,
          comments: true,
          labels: {
            include: {
              label: true,
            },
          },
        },
      })

      return toCardDetailsRecord(card)
    },

    async moveCardAndCreateActivity(
      cardId: number,
      targetListId: number,
      position: number,
      userId: number,
      boardId: number,
      fromListId: number,
    ): Promise<StoredActivityEvent> {
      return databaseClient.$transaction(async (transactionClient) => {
        await transactionClient.card.update({
          where: { id: cardId },
          data: { listId: targetListId, position },
        })

        return transactionClient.activityEvent.create({
          data: {
            boardId,
            cardId,
            userId,
            action: 'card_moved',
            fromListId,
            toListId: targetListId,
            meta: JSON.stringify({
              fromListId,
              toListId: targetListId,
            }),
          },
        })
      })
    },

    async addCommentAndCreateActivity(
      cardId: number,
      userId: number,
      content: string,
      boardId: number,
    ): Promise<CardCommentRecord> {
      return databaseClient.$transaction(async (transactionClient) => {
        const comment = await transactionClient.comment.create({
          data: { content, cardId, userId },
        })

        await transactionClient.activityEvent.create({
          data: {
            boardId,
            cardId,
            userId,
            action: 'comment_added',
            meta: JSON.stringify({
              commentId: comment.id,
            }),
          },
        })

        return comment
      })
    },

    async deleteCard(cardId: number): Promise<void> {
      await databaseClient.card.delete({ where: { id: cardId } })
    },
  }
}
