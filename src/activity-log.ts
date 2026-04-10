import { Prisma } from '@prisma/client'

type ActivityWriter = Pick<Prisma.TransactionClient, 'activityEvent'>

type ActivityEventType = 'card_created' | 'card_moved' | 'card_commented'

type CreateActivityInput = {
  boardId: number
  actorId: number
  actorName: string
  eventType: ActivityEventType
  cardId: number
  cardTitle: string
  fromListName?: string | null
  toListName?: string | null
  commentPreview?: string | null
}

export async function createActivityEvent(activityWriter: ActivityWriter, input: CreateActivityInput) {
  return activityWriter.activityEvent.create({
    data: {
      boardId: input.boardId,
      actorId: input.actorId,
      actorName: input.actorName,
      eventType: input.eventType,
      cardId: input.cardId,
      cardTitle: input.cardTitle,
      fromListName: input.fromListName ?? null,
      toListName: input.toListName ?? null,
      commentPreview: input.commentPreview ?? null,
    },
  })
}