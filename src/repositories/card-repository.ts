import { type PrismaClient } from '@prisma/client'
import {
  type ActivityWrite,
  type CardComment,
  type CardDetail,
  type CardRepository,
  type CardSummary,
  type ListContext,
} from '../services/card-service'

function mapCardDetail(card: {
  id: number
  title: string
  description: string | null
  position: number
  dueDate: Date | null
  listId: number
  assigneeId: number | null
  createdAt: Date
  comments: Array<{
    id: number
    content: string
    createdAt: Date
    cardId: number
    userId: number
  }>
  labels: Array<{
    label: {
      id: number
      name: string
      color: string
    }
  }>
}): CardDetail {
  return {
    id: card.id,
    title: card.title,
    description: card.description,
    position: card.position,
    dueDate: card.dueDate,
    listId: card.listId,
    assigneeId: card.assigneeId,
    createdAt: card.createdAt,
    comments: card.comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      cardId: comment.cardId,
      userId: comment.userId,
    })),
    labels: card.labels.map((cardLabel) => ({
      id: cardLabel.label.id,
      name: cardLabel.label.name,
      color: cardLabel.label.color,
    })),
  }
}

function serializeActivityMeta(meta: Record<string, unknown>): string {
  return JSON.stringify(meta)
}

/**
 * Creates a Prisma-backed implementation of the card repository port.
 *
 * @param {PrismaClient} databaseClient - Database client used for persistence.
 * @returns {CardRepository} Card repository implementation.
 */
export function createCardRepository(databaseClient: PrismaClient): CardRepository {
  return {
    async findCardAccessContext(cardId: number) {
      const card = await databaseClient.card.findUnique({
        where: { id: cardId },
        include: { list: true },
      })

      if (!card) {
        return null
      }

      return {
        id: card.id,
        title: card.title,
        listId: card.listId,
        listName: card.list.name,
        boardId: card.list.boardId,
      }
    },

    async findListContext(listId: number): Promise<ListContext | null> {
      const list = await databaseClient.list.findUnique({ where: { id: listId } })

      if (!list) {
        return null
      }

      return {
        id: list.id,
        name: list.name,
        boardId: list.boardId,
      }
    },

    async findCardDetail(cardId: number): Promise<CardDetail | null> {
      const card = await databaseClient.card.findUnique({
        where: { id: cardId },
        include: {
          comments: {
            orderBy: { createdAt: 'asc' },
          },
          labels: {
            include: { label: true },
          },
        },
      })

      return card ? mapCardDetail(card) : null
    },

    async createCard(input): Promise<CardSummary> {
      const position = await databaseClient.card.count({ where: { listId: input.listId } })
      const card = await databaseClient.card.create({
        data: {
          title: input.title,
          description: input.description ?? null,
          listId: input.listId,
          assigneeId: input.assigneeId ?? null,
          position,
        },
      })

      return {
        id: card.id,
        title: card.title,
        description: card.description,
        position: card.position,
        dueDate: card.dueDate,
        listId: card.listId,
        assigneeId: card.assigneeId,
        createdAt: card.createdAt,
      }
    },

    async moveCardWithActivity(input: {
      cardId: number
      targetListId: number
      position: number
      activity: ActivityWrite
    }): Promise<CardDetail> {
      const updatedCard = await databaseClient.$transaction(async (transaction) => {
        await transaction.card.update({
          where: { id: input.cardId },
          data: { listId: input.targetListId, position: input.position },
        })

        await transaction.activityEvent.create({
          data: {
            boardId: input.activity.boardId,
            cardId: input.activity.cardId,
            userId: input.activity.userId,
            action: input.activity.action,
            meta: serializeActivityMeta(input.activity.meta),
          },
        })

        return transaction.card.findUnique({
          where: { id: input.cardId },
          include: {
            comments: {
              orderBy: { createdAt: 'asc' },
            },
            labels: {
              include: { label: true },
            },
          },
        })
      })

      if (!updatedCard) {
        throw new Error('Moved card could not be reloaded')
      }

      return mapCardDetail(updatedCard)
    },

    async addCommentWithActivity(input: {
      cardId: number
      userId: number
      content: string
      activity: ActivityWrite
    }): Promise<CardComment> {
      const comment = await databaseClient.$transaction(async (transaction) => {
        const createdComment = await transaction.comment.create({
          data: {
            content: input.content,
            cardId: input.cardId,
            userId: input.userId,
          },
        })

        await transaction.activityEvent.create({
          data: {
            boardId: input.activity.boardId,
            cardId: input.activity.cardId,
            userId: input.activity.userId,
            action: input.activity.action,
            meta: serializeActivityMeta(input.activity.meta),
          },
        })

        return createdComment
      })

      return {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        cardId: comment.cardId,
        userId: comment.userId,
      }
    },

    async deleteCard(cardId: number): Promise<void> {
      await databaseClient.card.delete({ where: { id: cardId } })
    },
  }
}
