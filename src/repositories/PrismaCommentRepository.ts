import prisma from '../db'
import type {
  ICommentRepository,
  CreateCommentInput,
  CreateActivityEventInput,
  CommentRow,
} from './types'

export class PrismaCommentRepository implements ICommentRepository {
  async createWithEvent(
    data:      CreateCommentInput,
    eventData: CreateActivityEventInput,
  ): Promise<CommentRow> {
    return prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({ data })
      await tx.activityEvent.create({
        data: {
          boardId:      eventData.boardId,
          cardId:       eventData.cardId,
          userId:       eventData.userId,
          eventType:    eventData.eventType,
          cardTitle:    eventData.cardTitle,
          fromListName: null,
          toListName:   null,
        },
      })
      return comment
    })
  }
}
