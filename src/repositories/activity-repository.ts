import type { PrismaClient } from '@prisma/client'

export interface ActivityEventRecord {
  readonly id: number
  readonly boardId: number
  readonly cardId: number | null
  readonly userId: number
  readonly action: string
  readonly meta: string | null
  readonly createdAt: Date
  readonly userName: string
  readonly cardTitle: string | null
  readonly fromListId: number | null
  readonly fromListName: string | null
  readonly toListId: number | null
  readonly toListName: string | null
}

export interface ActivityRepository {
  listByBoardId(boardId: number, limit?: number): Promise<ReadonlyArray<ActivityEventRecord>>
}

export function createActivityRepository(databaseClient: PrismaClient): ActivityRepository {
  return {
    async listByBoardId(boardId: number, limit?: number): Promise<ReadonlyArray<ActivityEventRecord>> {
      const events = await databaseClient.activityEvent.findMany({
        where: { boardId },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          card: true,
          fromList: true,
          toList: true,
        },
      })

      return events.map((event) => ({
        id: event.id,
        boardId: event.boardId,
        cardId: event.cardId,
        userId: event.userId,
        action: event.action,
        meta: event.meta,
        createdAt: event.createdAt,
        userName: event.user.name,
        cardTitle: event.card?.title ?? null,
        fromListId: event.fromListId,
        fromListName: event.fromList?.name ?? null,
        toListId: event.toListId,
        toListName: event.toList?.name ?? null,
      }))
    },
  }
}
