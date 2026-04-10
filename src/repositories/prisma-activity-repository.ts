import type { ActivityEvent as PrismaActivityEvent, PrismaClient } from '@prisma/client'
import type { ActivityAction, ActivityEvent, ActivityRepository } from '../services/activity-service'

/** Prisma implementation of activity feed queries. */
export class PrismaActivityRepository implements ActivityRepository {
  /** @param prismaClient Prisma client instance for database access. */
  public constructor(private readonly prismaClient: PrismaClient) {}

  /** Lists board activity events newest first with an optional limit. */
  public async findEventsForBoard(
    boardId: number,
    limit?: number,
  ): Promise<readonly ActivityEvent[]> {
    const events = await this.prismaClient.activityEvent.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      where: { boardId },
    })

    return events.map(mapActivityEvent)
  }
}

function mapActivityEvent(event: PrismaActivityEvent): ActivityEvent {
  return {
    action: parseActivityAction(event.action),
    boardId: event.boardId,
    cardId: event.cardId ?? undefined,
    createdAt: event.createdAt,
    id: event.id,
    meta: parseActivityMeta(event.meta),
    userId: event.userId,
  }
}

function parseActivityAction(action: string): ActivityAction {
  if (action === 'card_moved' || action === 'comment_added') {
    return action
  }

  throw new Error(`Unsupported activity action: ${action}`)
}

function parseActivityMeta(meta: string | null): Record<string, unknown> | undefined {
  if (meta === null) {
    return undefined
  }

  return JSON.parse(meta) as Record<string, unknown>
}
