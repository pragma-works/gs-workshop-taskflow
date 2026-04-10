import { type PrismaClient } from '@prisma/client'
import {
  type ActivityEvent,
  type ActivityMeta,
  type ActivityRepository,
} from '../services/activity-service'

function isActivityMeta(value: unknown): value is ActivityMeta {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseActivityMeta(storedMeta: string | null): ActivityMeta | null {
  if (!storedMeta) {
    return null
  }

  try {
    const parsedMeta: unknown = JSON.parse(storedMeta)
    return isActivityMeta(parsedMeta) ? parsedMeta : null
  } catch {
    return null
  }
}

/**
 * Creates a Prisma-backed implementation of the activity repository port.
 *
 * @param {PrismaClient} databaseClient - Database client used for persistence.
 * @returns {ActivityRepository} Activity repository implementation.
 */
export function createActivityRepository(databaseClient: PrismaClient): ActivityRepository {
  return {
    async listBoardActivity(boardId: number, limit?: number): Promise<ActivityEvent[]> {
      const activityEvents = await databaseClient.activityEvent.findMany({
        where: { boardId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...(typeof limit === 'number' ? { take: limit } : {}),
      })

      return activityEvents.map((activityEvent) => {
        const meta = parseActivityMeta(activityEvent.meta)

        return {
          id: activityEvent.id,
          boardId: activityEvent.boardId,
          ...(activityEvent.cardId === null ? {} : { cardId: activityEvent.cardId }),
          userId: activityEvent.userId,
          action: activityEvent.action,
          ...(meta === null ? {} : { meta }),
          createdAt: activityEvent.createdAt,
        }
      })
    },
  }
}
